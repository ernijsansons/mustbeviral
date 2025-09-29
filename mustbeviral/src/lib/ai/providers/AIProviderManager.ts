import { AIProvider, AIProviderType, AIRequest, AIResponse, ProviderConfig, ProviderMetrics } from './types';
import { CloudflareAdapter } from './CloudflareAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import { AnthropicAdapter } from './AnthropicAdapter';
import { ResponseCache } from '../cache/ResponseCache';
import { CircuitBreaker, CircuitBreakerState } from './CircuitBreaker';
import { CostTracker } from './CostTracker';
import { RetryHandler, ProviderRetryPolicies } from './RetryHandler';

export interface ProviderHealthStatus {
  provider: AIProviderType;
  isHealthy: boolean;
  responseTime: number;
  errorRate: number;
  lastError?: string;
  lastSuccessfulRequest?: Date;
  circuitBreakerState: CircuitBreakerState;
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'weighted' | 'least-latency' | 'cost-optimized';
  weights?: Record<AIProviderType, number>;
}

export class AIProviderManager {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private circuitBreakers: Map<AIProviderType, CircuitBreaker> = new Map();
  private cache: ResponseCache;
  private costTracker: CostTracker;
  private metrics: Map<AIProviderType, ProviderMetrics> = new Map();
  private loadBalancingStrategy: LoadBalancingStrategy = { type: 'round-robin' };
  private lastUsedProviderIndex = 0;

  constructor(
    private config: Record<AIProviderType, ProviderConfig>,
    private env: Record<string, any>
  ) {
    this.cache = new ResponseCache();
    this.costTracker = new CostTracker();
    this.initializeProviders();
    this.initializeCircuitBreakers();
    this.initializeMetrics();
  }

  private initializeProviders(): void {
    // Initialize Cloudflare provider (primary)
    if (this.config.cloudflare?.enabled) {
      this.providers.set('cloudflare', new CloudflareAdapter(
        this.config.cloudflare,
        this.env,
        this.env.AI // Pass the Cloudflare AI service
      ));
    }

    // Initialize OpenAI provider (fallback)
    if (this.config.openai?.enabled && this.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIAdapter(
        this.config.openai,
        this.env.OPENAI_API_KEY
      ));
    }

    // Initialize Anthropic provider (fallback)
    if (this.config.anthropic?.enabled && this.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new AnthropicAdapter(
        this.config.anthropic,
        this.env.ANTHROPIC_API_KEY
      ));
    }
  }

  private initializeCircuitBreakers(): void {
    for (const [providerType] of this.providers) {
      this.circuitBreakers.set(providerType, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringInterval: 10000 // 10 seconds
      }));
    }
  }

  private initializeMetrics(): void {
    for (const [providerType] of this.providers) {
      this.metrics.set(providerType, {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        totalLatency: 0,
        averageLatency: 0,
        totalCost: 0,
        lastRequestTime: new Date(),
        lastErrorTime: null,
        consecutiveErrors: 0
      });
    }
  }

  async generateContent(request: AIRequest): Promise<AIResponse> {
    const cacheKey = this.generateCacheKey(request);

    // Try cache first
    const cachedResponse = await this.cache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const providersToTry = this.getProvidersInOrder();
    let lastError: Error | null = null;

    for (const providerType of providersToTry) {
      const provider = this.providers.get(providerType);
      const circuitBreaker = this.circuitBreakers.get(providerType);

      if (!provider || !circuitBreaker) {
        continue;
      }

      // Skip if circuit breaker is open
      if (circuitBreaker.getState() === CircuitBreakerState.OPEN) {
        console.log(`Skipping ${providerType} - circuit breaker is open`);
        continue;
      }

      try {
        const startTime = Date.now();

        // Execute request through circuit breaker with retry logic
        const retryConfig = ProviderRetryPolicies.getPolicy(providerType);
        const retryHandler = new RetryHandler(retryConfig);

        const response = await circuitBreaker.execute(async () => {
          return await retryHandler.execute(async () => {
            return await provider.generateContent(request);
          }).then(result => {
            if (result.success && result.result) {
              return result.result;
            }
            throw result.lastError || new Error('Retry failed');
          });
        });

        const endTime = Date.now();
        const latency = endTime - startTime;

        // Update metrics
        this.updateMetrics(providerType, true, latency, response.cost || 0);

        // Cache successful response
        await this.cache.set(cacheKey, response, this.getCacheTTL(request));

        // Track cost
        await this.costTracker.trackUsage(providerType, response.cost || 0, response.tokensUsed || 0);

        return response;

      } catch (error) {
        lastError = error as Error;
        const latency = Date.now() - Date.now(); // This would be calculated properly

        this.updateMetrics(providerType, false, latency, 0);

        console.error(`Provider ${providerType} failed:`, error);

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  private getProvidersInOrder(): AIProviderType[] {
    const availableProviders = Array.from(this.providers.keys());

    switch (this.loadBalancingStrategy.type) {
      case 'round-robin':
        return this.getRoundRobinOrder(availableProviders);

      case 'weighted':
        return this.getWeightedOrder(availableProviders);

      case 'least-latency':
        return this.getLeastLatencyOrder(availableProviders);

      case 'cost-optimized':
        return this.getCostOptimizedOrder(availableProviders);

      default:
        return availableProviders;
    }
  }

  private getRoundRobinOrder(providers: AIProviderType[]): AIProviderType[] {
    const result = [...providers];

    // Rotate based on last used index
    this.lastUsedProviderIndex = (this.lastUsedProviderIndex + 1) % providers.length;

    // Move the selected provider to front
    const selectedProvider = result.splice(this.lastUsedProviderIndex, 1)[0];
    result.unshift(selectedProvider);

    return result;
  }

  private getWeightedOrder(providers: AIProviderType[]): AIProviderType[] {
    if (!this.loadBalancingStrategy.weights) {
      return providers;
    }

    return providers.sort((a, b) => {
      const weightA = this.loadBalancingStrategy.weights![a] || 0;
      const weightB = this.loadBalancingStrategy.weights![b] || 0;
      return weightB - weightA; // Higher weight first
    });
  }

  private getLeastLatencyOrder(providers: AIProviderType[]): AIProviderType[] {
    return providers.sort((a, b) => {
      const metricsA = this.metrics.get(a);
      const metricsB = this.metrics.get(b);

      if (!metricsA || !metricsB) return 0;

      return metricsA.averageLatency - metricsB.averageLatency;
    });
  }

  private getCostOptimizedOrder(providers: AIProviderType[]): AIProviderType[] {
    return providers.sort((a, b) => {
      const costA = this.getCostPerToken(a);
      const costB = this.getCostPerToken(b);

      return costA - costB; // Lower cost first
    });
  }

  private getCostPerToken(providerType: AIProviderType): number {
    const metrics = this.metrics.get(providerType);
    const config = this.config[providerType];

    if (!metrics || !config) return Infinity;

    return config.costPerToken || 0;
  }

  private updateMetrics(
    providerType: AIProviderType,
    success: boolean,
    latency: number,
    cost: number
  ): void {
    const metrics = this.metrics.get(providerType);
    if (!metrics) return;

    metrics.requestCount++;
    metrics.lastRequestTime = new Date();

    if (success) {
      metrics.successCount++;
      metrics.consecutiveErrors = 0;
      metrics.totalLatency += latency;
      metrics.averageLatency = metrics.totalLatency / metrics.successCount;
      metrics.totalCost += cost;
    } else {
      metrics.errorCount++;
      metrics.consecutiveErrors++;
      metrics.lastErrorTime = new Date();
    }
  }

  private generateCacheKey(request: AIRequest): string {
    const keyData = {
      model: request.model,
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      temperature: request.temperature
    };

    return `ai_request_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private getCacheTTL(request: AIRequest): number {
    // Longer TTL for stable content, shorter for dynamic content
    if (request.prompt.includes('current') || request.prompt.includes('today')) {
      return 300; // 5 minutes for time-sensitive content
    }

    return 3600; // 1 hour for general content
  }

  async getHealthStatus(): Promise<ProviderHealthStatus[]> {
    const healthStatuses: ProviderHealthStatus[] = [];

    for (const [providerType, provider] of this.providers) {
      const metrics = this.metrics.get(providerType);
      const circuitBreaker = this.circuitBreakers.get(providerType);

      if (!metrics || !circuitBreaker) continue;

      const errorRate = metrics.requestCount > 0
        ? metrics.errorCount / metrics.requestCount
        : 0;

      const isHealthy = errorRate < 0.1 && // Less than 10% error rate
                       circuitBreaker.getState() !== CircuitBreakerState.OPEN;

      healthStatuses.push({
        provider: providerType,
        isHealthy,
        responseTime: metrics.averageLatency,
        errorRate,
        lastError: metrics.lastErrorTime?.toISOString(),
        lastSuccessfulRequest: metrics.successCount > 0 ? metrics.lastRequestTime : undefined,
        circuitBreakerState: circuitBreaker.getState()
      });
    }

    return healthStatuses;
  }

  async getMetrics(): Promise<Record<AIProviderType, ProviderMetrics>> {
    const result: Record<string, ProviderMetrics> = {};

    for (const [providerType, metrics] of this.metrics) {
      result[providerType] = { ...metrics };
    }

    return result as Record<AIProviderType, ProviderMetrics>;
  }

  async getCostSummary(): Promise<Record<AIProviderType, { totalCost: number; totalTokens: number }>> {
    return await this.costTracker.getCostSummary();
  }

  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.loadBalancingStrategy = strategy;
  }

  async testProvider(providerType: AIProviderType): Promise<boolean> {
    const provider = this.providers.get(providerType);
    if (!provider) return false;

    try {
      const testRequest: AIRequest = {
        model: 'test',
        prompt: 'Hello, this is a health check.',
        maxTokens: 10,
        temperature: 0.1
      };

      await provider.generateContent(testRequest);
      return true;
    } catch (error) {
      console.error(`Health check failed for ${providerType}:`, error);
      return false;
    }
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  async resetMetrics(): Promise<void> {
    this.initializeMetrics();
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    // Close all circuit breakers
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.destroy();
    }

    // Clear cache
    await this.cache.clear();

    // Clear providers
    this.providers.clear();
    this.circuitBreakers.clear();
    this.metrics.clear();
  }
}