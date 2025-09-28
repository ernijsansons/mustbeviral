import { AIProvider, AIProviderType, AIRequest, AIResponse, ProviderConfig, AIProviderError, RateLimitError, TokenLimitError, ModelNotFoundError, AuthenticationError } from './types';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicAdapter implements AIProvider {
  readonly type: AIProviderType = 'anthropic';

  private readonly baseURL = 'https://api.anthropic.com/v1';
  private readonly modelPricing: Record<string, { input: number; output: number }> = {
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 }, // per 1M tokens
    'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-2.1': { input: 8.0, output: 24.0 },
    'claude-2.0': { input: 8.0, output: 24.0 },
    'claude-instant-1.2': { input: 0.8, output: 2.4 }
  };

  constructor(
    private config: ProviderConfig,
    private apiKey: string
  ) {}

  get isAvailable(): boolean {
    return this.config.enabled && !!this.apiKey;
  }

  async generateContent(request: AIRequest): Promise<AIResponse> {
    if (!this.isAvailable) {
      throw new AIProviderError('Anthropic service not available', 'anthropic', 503, true);
    }

    this.validateRequest(request);

    const startTime = Date.now();
    const model = this.resolveModel(request.model);

    try {
      const response = await this.makeAPICall(model, request);
      const content = this.extractContent(response);
      const cost = this.calculateCost(model, response.usage);

      return {
        content,
        model,
        provider: 'anthropic',
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        cost,
        metadata: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          finishReason: response.stop_reason,
          latency: Date.now() - startTime,
          requestId: response.id
        }
      };

    } catch (error: any) {
      const latency = Date.now() - startTime;
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Anthropic doesn't have a models endpoint, so we make a minimal request
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [
            {
              role: 'user',
              content: 'Hi'
            }
          ]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    // Anthropic doesn't provide a models endpoint, return known models
    return Object.keys(this.modelPricing);
  }

  getCostEstimate(request: AIRequest): number {
    const model = this.resolveModel(request.model);
    const pricing = this.modelPricing[model];

    if (!pricing) {
      return 0;
    }

    const promptTokens = this.estimateTokens(request.prompt);
    const completionTokens = request.maxTokens;

    const inputCost = (promptTokens / 1000000) * pricing.input;
    const outputCost = (completionTokens / 1000000) * pricing.output;

    return inputCost + outputCost;
  }

  validateRequest(request: AIRequest): boolean {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new AIProviderError('Prompt cannot be empty', 'anthropic', 400, false);
    }

    if (request.maxTokens > this.config.maxTokensPerRequest) {
      throw new TokenLimitError(
        'anthropic',
        request.maxTokens,
        this.config.maxTokensPerRequest
      );
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 1)) {
      throw new AIProviderError(
        'Temperature must be between 0 and 1 for Anthropic',
        'anthropic',
        400,
        false
      );
    }

    return true;
  }

  private async makeAPICall(model: string, request: AIRequest): Promise<AnthropicResponse> {
    const body = this.prepareRequest(model, request);

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'User-Agent': 'MustBeViral/2.0'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  private prepareRequest(model: string, request: AIRequest): any {
    const body: any = {
      model,
      max_tokens: request.maxTokens,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ]
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    if (request.stop && request.stop.length > 0) {
      body.stop_sequences = request.stop;
    }

    if (request.stream !== undefined) {
      body.stream = request.stream;
    }

    return body;
  }

  private resolveModel(model: string): string {
    // Map common model names to Anthropic models
    const modelMap: Record<string, string> = {
      'claude-3-opus': 'claude-3-opus-20240229',
      'claude-3-sonnet': 'claude-3-sonnet-20240229',
      'claude-3-haiku': 'claude-3-haiku-20240307',
      'claude-2': 'claude-2.1',
      'claude-instant': 'claude-instant-1.2',
      'opus': 'claude-3-opus-20240229',
      'sonnet': 'claude-3-sonnet-20240229',
      'haiku': 'claude-3-haiku-20240307'
    };

    return modelMap[model] || model || 'claude-3-haiku-20240307';
  }

  private extractContent(response: AnthropicResponse): string {
    if (!response.content || response.content.length === 0) {
      throw new AIProviderError('No content in response', 'anthropic', 500, true);
    }

    const textContent = response.content.find(item => item.type === 'text');
    if (!textContent) {
      throw new AIProviderError('No text content in response', 'anthropic', 500, true);
    }

    return textContent.text.trim();
  }

  private calculateCost(model: string, usage: { input_tokens: number; output_tokens: number }): number {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      return 0;
    }

    const inputCost = (usage.input_tokens / 1000000) * pricing.input;
    const outputCost = (usage.output_tokens / 1000000) * pricing.output;

    return inputCost + outputCost;
  }

  private estimateTokens(text: string): number {
    // Anthropic's tokenization is similar to OpenAI's
    // Roughly 0.75 tokens per word for English text
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 0.75);
  }

  private handleError(error: any): AIProviderError {
    const message = error.message || 'Unknown error';

    // Parse Anthropic error response
    if (message.includes('401') || message.includes('authentication')) {
      return new AuthenticationError('anthropic');
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return new RateLimitError('anthropic');
    }

    if (message.includes('404') || message.includes('model')) {
      return new ModelNotFoundError('anthropic', 'unknown');
    }

    if (message.includes('400') && (message.includes('token') || message.includes('max_tokens'))) {
      return new TokenLimitError('anthropic', 0, this.config.maxTokensPerRequest);
    }

    // Determine if error is retryable
    const retryableStatuses = [429, 500, 502, 503, 504];
    const isRetryable = retryableStatuses.some(status => message.includes(status.toString())) ||
                       message.includes('timeout') ||
                       message.includes('network') ||
                       message.includes('overloaded');

    return new AIProviderError(
      `Anthropic API error: ${message}`,
      'anthropic',
      this.extractStatusCode(message),
      isRetryable
    );
  }

  private extractStatusCode(message: string): number | undefined {
    const match = message.match(/(\d{3})/);
    return match ? parseInt(match[1]) : undefined;
  }
}