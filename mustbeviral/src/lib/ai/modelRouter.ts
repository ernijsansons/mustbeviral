/**
 * AI Model Router with Intelligent Fallback Chain
 * Implements resilient AI request routing with automatic failover
 * Fortune 50-grade AI infrastructure patterns
 */

import { AICostOptimizer, type ModelConfig, type RequestContext, type OptimizationResult} from './costOptimizer';

export interface ModelProvider {
  name: string;
  executeRequest(model: string, prompt: string, options?: ModelRequestOptions): Promise<ModelResponse>;
  isHealthy(): Promise<boolean>;
  getLatency(): number;
}

export interface ModelRequestOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeout?: number;
  retries?: number;
}

export interface ModelResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
  model: string;
  provider: string;
  cost: number;
  quality?: number;
}

export interface RoutingResult {
  response: ModelResponse;
  selectedModel: string;
  attemptedModels: string[];
  fallbacksUsed: number;
  totalLatency: number;
  optimization: OptimizationResult;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt: number;
}

/**
 * Intelligent AI Model Router
 */
export class ModelRouter {
  private costOptimizer: AICostOptimizer;
  private providers: Map<string, ModelProvider> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthCache: Map<string, { healthy: boolean; timestamp: number }> = new Map();
  private readonly CIRCUITBREAKERTHRESHOLD = 5;
  private readonly CIRCUITBREAKERTIMEOUT = 60000; // 1 minute
  private readonly HEALTHCACHETTL = 30000; // 30 seconds

  constructor(costOptimizer: AICostOptimizer) {
    this.costOptimizer = costOptimizer;
    this.initializeProviders();
  }

  /**
   * Route request to optimal model with fallback chain
   */
  async routeRequest(
    prompt: string,
    context: RequestContext,
    options?: ModelRequestOptions
  ): Promise<RoutingResult> {
    const startTime = Date.now();
    const optimization = await this.costOptimizer.optimizeRequest(context);
    
    const attemptedModels: string[] = [];
    let fallbacksUsed = 0;
    
    // Build execution chain: primary + fallbacks
    const executionChain = [optimization.selectedModel, ...optimization.fallbackChain];
    
    for (const model of executionChain) {
      attemptedModels.push(model.name);
      
      try {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen(model.name)) {
          console.log(`Circuit breaker open for ${model.name}, skipping`);
          continue;
        }
        
        // Check provider health
        const provider = this.getProvider(model.provider);
        if (!provider) {
          console.log(`No provider available for ${model.provider}`);
          continue;
        }
        
        const isHealthy = await this.checkProviderHealth(provider);
        if (!isHealthy) {
          console.log(`Provider ${model.provider} is unhealthy, skipping`);
          continue;
        }
        
        // Execute request
        const response = await this.executeWithTimeout(
          provider,
          model.name,
          prompt,
          options,
          context.maxLatency
        );
        
        // Record success
        this.recordSuccess(model.name);
        this.costOptimizer.recordRequest(
          model.name,
          context.taskType,
          response.cost,
          response.latency,
          true,
          response.quality ?? 0.8
        );
        
        return {
          response,
          selectedModel: model.name,
          attemptedModels,
          fallbacksUsed,
          totalLatency: Date.now() - startTime,
          optimization,
        };
        
      } catch (error) {
        console.error(`Model ${model.name} failed:`, error);
        
        // Record failure
        this.recordFailure(model.name);
        this.costOptimizer.recordRequest(
          model.name,
          context.taskType,
          0,
          Date.now() - startTime,
          false,
          0
        );
        
        fallbacksUsed++;
        
        // Continue to next model in chain
        continue;
      }
    }
    
    // All models failed
    throw new Error(`All models failed: ${attemptedModels.join(', ')}`);
  }

  /**
   * Execute request with timeout and retries
   */
  private async executeWithTimeout(
    provider: ModelProvider,
    model: string,
    prompt: string,
    options?: ModelRequestOptions,
    maxLatency?: number
  ): Promise<ModelResponse> {
    const timeout = Math.min(options?.timeout ?? 30000, maxLatency ?? 30000);
    const retries = options?.retries ?? 2;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const promise = provider.executeRequest(model, prompt, options);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });
        
        const response = await Promise.race([promise, timeoutPromise]);
        return response;
        
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Get provider for model type
   */
  private getProvider(providerName: string): ModelProvider | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Check provider health with caching
   */
  private async checkProviderHealth(provider: ModelProvider): Promise<boolean> {
    const cached = this.healthCache.get(provider.name);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < this.HEALTHCACHETTL) {
      return cached.healthy;
    }
    
    try {
      const healthy = await provider.isHealthy();
      this.healthCache.set(provider.name, { healthy, timestamp: now });
      return healthy;
    } catch (error) {
      console.error(`Health check failed for ${provider.name}:`, error);
      this.healthCache.set(provider.name, { healthy: false, timestamp: now });
      return false;
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(modelName: string): boolean {
    const breaker = this.circuitBreakers.get(modelName);
    if (!breaker) {
    return false;
  }
    
    const now = Date.now();
    
    switch (breaker.state) {
      case 'closed':
        return false;
      case 'open':
        if (now >= breaker.nextAttempt) {
          breaker.state = 'half-open';
          return false;
        }
        return true;
      case 'half-open':
        return false;
      default:
        return false;
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(modelName: string): void {
    const breaker = this.circuitBreakers.get(modelName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(modelName: string): void {
    const now = Date.now();
    let breaker = this.circuitBreakers.get(modelName);
    
    if (!breaker) {
      breaker = {
        failures: 0,
        lastFailure: 0,
        state: 'closed',
        nextAttempt: 0,
      };
      this.circuitBreakers.set(modelName, breaker);
    }
    
    breaker.failures++;
    breaker.lastFailure = now;
    
    if (breaker.failures >= this.CIRCUITBREAKERTHRESHOLD) {
      breaker.state = 'open';
      breaker.nextAttempt = now + this.CIRCUITBREAKERTIMEOUT;
      console.log(`Circuit breaker opened for ${modelName}`);
    }
  }

  /**
   * Initialize model providers
   */
  private initializeProviders(): void {
    // OpenAI Provider
    this.providers.set('openai', new OpenAIProvider());
    
    // Anthropic Provider
    this.providers.set('anthropic', new AnthropicProvider());
    
    // Google Provider
    this.providers.set('google', new GoogleProvider());
    
    // Local Provider (for local models)
    this.providers.set('local', new LocalProvider());
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    circuitBreakers: Array<{ model: string; state: string; failures: number }>;
    providerHealth: Array<{ provider: string; healthy: boolean; lastCheck: number }>;
    totalRequests: number;
    failoverRate: number;
  } {
    const circuitBreakers = Array.from(this.circuitBreakers.entries())
      .map(([model, breaker]) => ({
        model,
        state: breaker.state,
        failures: breaker.failures,
      }));
    
    const providerHealth = Array.from(this.healthCache.entries())
      .map(([provider, health]) => ({
        provider,
        healthy: health.healthy,
        lastCheck: health.timestamp,
      }));
    
    const metrics = this.costOptimizer.getMetrics();
    
    return {
      circuitBreakers,
      providerHealth,
      totalRequests: metrics.requestCount,
      failoverRate: 0, // Would need to track this separately
    };
  }

  /**
   * Reset circuit breaker for model
   */
  resetCircuitBreaker(modelName: string): void {
    const breaker = this.circuitBreakers.get(modelName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      breaker.nextAttempt = 0;
    }
  }

  /**
   * Clear health cache
   */
  clearHealthCache(): void {
    this.healthCache.clear();
  }
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider implements ModelProvider {
  name = 'openai';

  async executeRequest(
    model: string,
    prompt: string,
    options?: ModelRequestOptions
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    // Simulate OpenAI API call
    const response = await this.mockOpenAIRequest(model, prompt, options);
    
    const latency = Date.now() - startTime;
    const cost = this.calculateCost(model, response.usage.totalTokens);
    
    return {
      content: response.content,
      usage: response.usage,
      latency,
      model,
      provider: this.name,
      cost,
      quality: 0.9,
    };
  }

  async isHealthy(): Promise<boolean> {
    // Simulate health check
    return Math.random() > 0.1; // 90% healthy
  }

  getLatency(): number {
    return 2000; // 2 seconds average
  }

  private async mockOpenAIRequest(
    model: string,
    prompt: string,
    options?: ModelRequestOptions
  ): Promise<{ content: string; usage: any }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) {
      throw new Error('OpenAI API error');
    }
    
    return {
      content: `OpenAI ${model} response to: ${prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: 100,
        totalTokens: Math.floor(prompt.length / 4) + 100,
      },
    };
  }

  private calculateCost(model: string, tokens: number): number {
    const rates: Record<string, number> = {
      'gpt-4o': 0.00003,
      'gpt-4o-mini': 0.00000015,
    };
    return tokens * (rates[model]  ?? 0.00001);
  }
}

/**
 * Anthropic Provider Implementation
 */
class AnthropicProvider implements ModelProvider {
  name = 'anthropic';

  async executeRequest(
    model: string,
    prompt: string,
    options?: ModelRequestOptions
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const response = await this.mockAnthropicRequest(model, prompt, options);
    
    const latency = Date.now() - startTime;
    const cost = this.calculateCost(model, response.usage.totalTokens);
    
    return {
      content: response.content,
      usage: response.usage,
      latency,
      model,
      provider: this.name,
      cost,
      quality: 0.93,
    };
  }

  async isHealthy(): Promise<boolean> {
    return Math.random() > 0.08; // 92% healthy
  }

  getLatency(): number {
    return 2500;
  }

  private async mockAnthropicRequest(
    model: string,
    prompt: string,
    options?: ModelRequestOptions
  ): Promise<{ content: string; usage: any }> {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    if (Math.random() < 0.03) {
      throw new Error('Anthropic API error');
    }
    
    return {
      content: `Anthropic ${model} response to: ${prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: 120,
        totalTokens: Math.floor(prompt.length / 4) + 120,
      },
    };
  }

  private calculateCost(model: string, tokens: number): number {
    const rates: Record<string, number> = {
      'claude-3-5-sonnet': 0.000015,
      'claude-3-haiku': 0.00000025,
    };
    return tokens * (rates[model]  ?? 0.000005);
  }
}

/**
 * Google Provider Implementation
 */
class GoogleProvider implements ModelProvider {
  name = 'google';

  async executeRequest(
    model: string,
    prompt: string,
    options?: ModelRequestOptions
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const response = await this.mockGoogleRequest(model, prompt, options);
    
    const latency = Date.now() - startTime;
    const cost = this.calculateCost(model, response.usage.totalTokens);
    
    return {
      content: response.content,
      usage: response.usage,
      latency,
      model,
      provider: this.name,
      cost,
      quality: 0.85,
    };
  }

  async isHealthy(): Promise<boolean> {
    return Math.random() > 0.12; // 88% healthy
  }

  getLatency(): number {
    return 1800;
  }

  private async mockGoogleRequest(
    model: string,
    prompt: string,
    options?: ModelRequestOptions
  ): Promise<{ content: string; usage: any }> {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 2000));
    
    if (Math.random() < 0.07) {
      throw new Error('Google API error');
    }
    
    return {
      content: `Google ${model} response to: ${prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: 90,
        totalTokens: Math.floor(prompt.length / 4) + 90,
      },
    };
  }

  private calculateCost(model: string, tokens: number): number {
    const rates: Record<string, number> = {
      'gemini-1.5-pro': 0.00000125,
      'gemini-1.5-flash': 0.000000075,
    };
    return tokens * (rates[model]  ?? 0.000001);
  }
}

/**
 * Local Provider Implementation
 */
class LocalProvider implements ModelProvider {
  name = 'local';

  async executeRequest(
    model: string,
    prompt: string,
    options?: ModelRequestOptions
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const response = await this.mockLocalRequest(model, prompt, options);
    
    const latency = Date.now() - startTime;
    
    return {
      content: response.content,
      usage: response.usage,
      latency,
      model,
      provider: this.name,
      cost: 0, // Local models are free
      quality: 0.7,
    };
  }

  async isHealthy(): Promise<boolean> {
    return Math.random() > 0.05; // 95% healthy (local is more reliable)
  }

  getLatency(): number {
    return 5000; // Slower but free
  }

  private async mockLocalRequest(
    model: string,
    prompt: string,
    options?: ModelRequestOptions
  ): Promise<{ content: string; usage: any }> {
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));
    
    if (Math.random() < 0.02) {
      throw new Error('Local model error');
    }
    
    return {
      content: `Local ${model} response to: ${prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: 80,
        totalTokens: Math.floor(prompt.length / 4) + 80,
      },
    };
  }
}

export default ModelRouter;