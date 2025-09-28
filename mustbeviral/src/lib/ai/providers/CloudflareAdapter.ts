import { AIProvider, AIProviderType, AIRequest, AIResponse, ProviderConfig, AIProviderError, TokenLimitError, ModelNotFoundError } from './types';

interface CloudflareAIService {
  run(model: string, input: Record<string, any>): Promise<any>;
}

export class CloudflareAdapter implements AIProvider {
  readonly type: AIProviderType = 'cloudflare';

  private readonly modelMap: Record<string, string> = {
    'llama-2-7b': '@cf/meta/llama-2-7b-chat-int8',
    'llama-2-13b': '@cf/meta/llama-2-13b-chat-int8',
    'mistral-7b': '@cf/mistral/mistral-7b-instruct-v0.1',
    'phi-2': '@cf/microsoft/phi-2',
    'gemma-2b': '@cf/google/gemma-2b-it-lora',
    'gemma-7b': '@cf/google/gemma-7b-it-lora'
  };

  private readonly costPerToken = 0.0001; // Cloudflare AI pricing

  constructor(
    private config: ProviderConfig,
    private env: Record<string, any>,
    private ai?: CloudflareAIService
  ) {}

  get isAvailable(): boolean {
    return this.config.enabled && !!this.ai;
  }

  async generateContent(request: AIRequest): Promise<AIResponse> {
    if (!this.ai) {
      throw new AIProviderError('Cloudflare AI service not available', 'cloudflare', 503, true);
    }

    this.validateRequest(request);

    const startTime = Date.now();
    const model = this.resolveModel(request.model);

    try {
      // Prepare Cloudflare AI input
      const input = this.prepareInput(request);

      // Make the API call
      const result = await this.ai.run(model, input);

      // Process the response
      const content = this.extractContent(result);
      const tokensUsed = this.estimateTokens(request.prompt, content);
      const cost = tokensUsed * this.costPerToken;

      return {
        content,
        model,
        provider: 'cloudflare',
        tokensUsed,
        cost,
        metadata: {
          promptTokens: this.estimateTokens(request.prompt),
          completionTokens: this.estimateTokens(content),
          totalTokens: tokensUsed,
          finishReason: this.getFinishReason(result),
          latency: Date.now() - startTime,
          requestId: this.generateRequestId()
        }
      };

    } catch (error: any) {
      const latency = Date.now() - startTime;

      // Handle specific Cloudflare errors
      if (error.message?.includes('rate limit')) {
        throw new AIProviderError(
          'Rate limit exceeded',
          'cloudflare',
          429,
          true
        );
      }

      if (error.message?.includes('model not found')) {
        throw new ModelNotFoundError('cloudflare', model);
      }

      if (error.message?.includes('token limit')) {
        throw new TokenLimitError(
          'cloudflare',
          request.maxTokens,
          this.config.maxTokensPerRequest
        );
      }

      throw new AIProviderError(
        `Cloudflare AI request failed: ${error.message}`,
        'cloudflare',
        error.status || 500,
        this.isRetryableError(error),
        0
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.ai) {
      return false;
    }

    try {
      await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
        prompt: 'Hello',
        max_tokens: 5
      });
      return true;
    } catch (error) {
      console.error('Cloudflare connection test failed:', error);
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    return Object.keys(this.modelMap);
  }

  getCostEstimate(request: AIRequest): number {
    const estimatedTokens = this.estimateTokens(request.prompt) + request.maxTokens;
    return estimatedTokens * this.costPerToken;
  }

  validateRequest(request: AIRequest): boolean {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new AIProviderError('Prompt cannot be empty', 'cloudflare', 400, false);
    }

    if (request.maxTokens > this.config.maxTokensPerRequest) {
      throw new TokenLimitError(
        'cloudflare',
        request.maxTokens,
        this.config.maxTokensPerRequest
      );
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new AIProviderError(
        'Temperature must be between 0 and 2',
        'cloudflare',
        400,
        false
      );
    }

    return true;
  }

  private resolveModel(model: string): string {
    // If already a Cloudflare model, use as-is
    if (model.startsWith('@cf/')) {
      return model;
    }

    // Map common model names to Cloudflare models
    const mapped = this.modelMap[model];
    if (mapped) {
      return mapped;
    }

    // Default fallback
    return '@cf/meta/llama-2-7b-chat-int8';
  }

  private prepareInput(request: AIRequest): Record<string, any> {
    const input: Record<string, any> = {
      prompt: request.prompt,
      max_tokens: request.maxTokens
    };

    // Add optional parameters if specified
    if (request.temperature !== undefined) {
      input.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      input.top_p = request.topP;
    }

    if (request.stop && request.stop.length > 0) {
      input.stop = request.stop;
    }

    return input;
  }

  private extractContent(result: any): string {
    if (typeof result === 'string') {
      return result.trim();
    }

    if (typeof result === 'object' && result !== null) {
      // Try different possible response formats
      if (result.response && typeof result.response === 'string') {
        return result.response.trim();
      }

      if (result.content && typeof result.content === 'string') {
        return result.content.trim();
      }

      if (result.text && typeof result.text === 'string') {
        return result.text.trim();
      }

      if (result.choices && Array.isArray(result.choices) && result.choices[0]) {
        const choice = result.choices[0];
        if (choice.message && choice.message.content) {
          return choice.message.content.trim();
        }
        if (choice.text) {
          return choice.text.trim();
        }
      }

      // If result has a direct text property
      if (typeof result === 'object' && 'text' in result) {
        return String(result.text).trim();
      }
    }

    // Fallback - convert to string
    return String(result).trim();
  }

  private estimateTokens(text: string, additionalText = ''): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    const totalText = text + additionalText;
    return Math.ceil(totalText.length / 4);
  }

  private getFinishReason(result: any): string {
    if (result && typeof result === 'object') {
      if (result.finish_reason) {
        return result.finish_reason;
      }
      if (result.choices && result.choices[0] && result.choices[0].finish_reason) {
        return result.choices[0].finish_reason;
      }
    }
    return 'stop';
  }

  private generateRequestId(): string {
    return `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isRetryableError(error: any): boolean {
    // Retryable errors are typically temporary issues
    const retryableStatuses = [429, 500, 502, 503, 504];
    const retryableMessages = [
      'rate limit',
      'timeout',
      'internal error',
      'service unavailable',
      'bad gateway'
    ];

    if (error.status && retryableStatuses.includes(error.status)) {
      return true;
    }

    if (error.message) {
      const message = error.message.toLowerCase();
      return retryableMessages.some(msg => message.includes(msg));
    }

    return false;
  }

  // Helper method to set AI service (for dependency injection)
  setAIService(ai: CloudflareAIService): void {
    (this as any).ai = ai;
  }
}