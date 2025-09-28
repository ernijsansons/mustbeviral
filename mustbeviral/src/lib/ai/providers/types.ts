export type AIProviderType = 'cloudflare' | 'openai' | 'anthropic';

export interface AIRequest {
  model: string;
  prompt: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: AIProviderType;
  tokensUsed?: number;
  cost?: number;
  metadata?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string;
    latency?: number;
    requestId?: string;
  };
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  maxTokensPerRequest: number;
  costPerToken: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  models: string[];
  capabilities: string[];
}

export interface ProviderMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalLatency: number;
  averageLatency: number;
  totalCost: number;
  lastRequestTime: Date;
  lastErrorTime: Date | null;
  consecutiveErrors: number;
}

export interface AIProvider {
  readonly type: AIProviderType;
  readonly isAvailable: boolean;

  generateContent(request: AIRequest): Promise<AIResponse>;
  testConnection(): Promise<boolean>;
  getModels(): Promise<string[]>;
  getCostEstimate(request: AIRequest): number;
  validateRequest(request: AIRequest): boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringInterval: number;
}

export interface RateLimitConfig {
  windowSize: number; // milliseconds
  maxRequests: number;
  maxTokens?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProviderType,
    public statusCode?: number,
    public retryable: boolean = false,
    public cost?: number
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class RateLimitError extends AIProviderError {
  constructor(
    provider: AIProviderType,
    public resetTime?: Date
  ) {
    super(`Rate limit exceeded for provider ${provider}`, provider, 429, true);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends AIProviderError {
  constructor(provider: AIProviderType) {
    super(`Authentication failed for provider ${provider}`, provider, 401, false);
    this.name = 'AuthenticationError';
  }
}

export class ModelNotFoundError extends AIProviderError {
  constructor(provider: AIProviderType, model: string) {
    super(`Model ${model} not found for provider ${provider}`, provider, 404, false);
    this.name = 'ModelNotFoundError';
  }
}

export class TokenLimitError extends AIProviderError {
  constructor(provider: AIProviderType, requestedTokens: number, maxTokens: number) {
    super(
      `Token limit exceeded: requested ${requestedTokens}, max ${maxTokens}`,
      provider,
      400,
      false
    );
    this.name = 'TokenLimitError';
  }
}