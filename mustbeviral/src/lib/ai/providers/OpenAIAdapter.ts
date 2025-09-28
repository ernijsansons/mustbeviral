import { AIProvider, AIProviderType, AIRequest, AIResponse, ProviderConfig, AIProviderError, RateLimitError, TokenLimitError, ModelNotFoundError, AuthenticationError } from './types';

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    text?: string;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIAdapter implements AIProvider {
  readonly type: AIProviderType = 'openai';

  private readonly baseURL = 'https://api.openai.com/v1';
  private readonly modelPricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
    'gpt-4-32k': { input: 0.06, output: 0.12 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
    'text-davinci-003': { input: 0.02, output: 0.02 },
    'text-curie-001': { input: 0.002, output: 0.002 },
    'text-babbage-001': { input: 0.0005, output: 0.0005 },
    'text-ada-001': { input: 0.0004, output: 0.0004 }
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
      throw new AIProviderError('OpenAI service not available', 'openai', 503, true);
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
        provider: 'openai',
        tokensUsed: response.usage.total_tokens,
        cost,
        metadata: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
          finishReason: response.choices[0]?.finish_reason || 'stop',
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
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((model: any) => model.id);
    } catch (error) {
      console.error('Failed to fetch OpenAI models:', error);
      return Object.keys(this.modelPricing);
    }
  }

  getCostEstimate(request: AIRequest): number {
    const model = this.resolveModel(request.model);
    const pricing = this.modelPricing[model];

    if (!pricing) {
      return 0;
    }

    const promptTokens = this.estimateTokens(request.prompt);
    const completionTokens = request.maxTokens;

    const inputCost = (promptTokens / 1000) * pricing.input;
    const outputCost = (completionTokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  validateRequest(request: AIRequest): boolean {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new AIProviderError('Prompt cannot be empty', 'openai', 400, false);
    }

    if (request.maxTokens > this.config.maxTokensPerRequest) {
      throw new TokenLimitError(
        'openai',
        request.maxTokens,
        this.config.maxTokensPerRequest
      );
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new AIProviderError(
        'Temperature must be between 0 and 2',
        'openai',
        400,
        false
      );
    }

    return true;
  }

  private async makeAPICall(model: string, request: AIRequest): Promise<OpenAICompletionResponse> {
    const isChat = this.isChatModel(model);
    const endpoint = isChat ? '/chat/completions' : '/completions';

    const body = isChat
      ? this.prepareChatRequest(model, request)
      : this.prepareCompletionRequest(model, request);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MustBeViral/2.0'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  private isChatModel(model: string): boolean {
    return model.includes('gpt-4') || model.includes('gpt-3.5-turbo');
  }

  private prepareChatRequest(model: string, request: AIRequest): any {
    const body: any = {
      model,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
      max_tokens: request.maxTokens
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    if (request.frequencyPenalty !== undefined) {
      body.frequency_penalty = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      body.presence_penalty = request.presencePenalty;
    }

    if (request.stop && request.stop.length > 0) {
      body.stop = request.stop;
    }

    if (request.stream !== undefined) {
      body.stream = request.stream;
    }

    return body;
  }

  private prepareCompletionRequest(model: string, request: AIRequest): any {
    const body: any = {
      model,
      prompt: request.prompt,
      max_tokens: request.maxTokens
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    if (request.frequencyPenalty !== undefined) {
      body.frequency_penalty = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      body.presence_penalty = request.presencePenalty;
    }

    if (request.stop && request.stop.length > 0) {
      body.stop = request.stop;
    }

    if (request.stream !== undefined) {
      body.stream = request.stream;
    }

    return body;
  }

  private resolveModel(model: string): string {
    // Map common model names to OpenAI models
    const modelMap: Record<string, string> = {
      'gpt4': 'gpt-4',
      'gpt-4-turbo': 'gpt-4-turbo',
      'gpt3.5': 'gpt-3.5-turbo',
      'gpt-3.5': 'gpt-3.5-turbo',
      'davinci': 'text-davinci-003',
      'curie': 'text-curie-001',
      'babbage': 'text-babbage-001',
      'ada': 'text-ada-001'
    };

    return modelMap[model] || model || 'gpt-3.5-turbo';
  }

  private extractContent(response: OpenAICompletionResponse): string {
    const choice = response.choices[0];
    if (!choice) {
      throw new AIProviderError('No response choices returned', 'openai', 500, true);
    }

    // Chat completion format
    if (choice.message && choice.message.content) {
      return choice.message.content.trim();
    }

    // Text completion format
    if (choice.text) {
      return choice.text.trim();
    }

    throw new AIProviderError('Invalid response format', 'openai', 500, true);
  }

  private calculateCost(model: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      return 0;
    }

    const inputCost = (usage.prompt_tokens / 1000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  private estimateTokens(text: string): number {
    // More accurate estimation for OpenAI: ~0.75 tokens per word
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 0.75);
  }

  private handleError(error: any): AIProviderError {
    const message = error.message || 'Unknown error';

    // Parse OpenAI error response
    if (message.includes('401')) {
      return new AuthenticationError('openai');
    }

    if (message.includes('429')) {
      return new RateLimitError('openai');
    }

    if (message.includes('404') || message.includes('model')) {
      return new ModelNotFoundError('openai', 'unknown');
    }

    if (message.includes('400') && message.includes('token')) {
      return new TokenLimitError('openai', 0, this.config.maxTokensPerRequest);
    }

    // Determine if error is retryable
    const retryableStatuses = [429, 500, 502, 503, 504];
    const isRetryable = retryableStatuses.some(status => message.includes(status.toString())) ||
                       message.includes('timeout') ||
                       message.includes('network');

    return new AIProviderError(
      `OpenAI API error: ${message}`,
      'openai',
      this.extractStatusCode(message),
      isRetryable
    );
  }

  private extractStatusCode(message: string): number | undefined {
    const match = message.match(/(\d{3})/);
    return match ? parseInt(match[1]) : undefined;
  }
}