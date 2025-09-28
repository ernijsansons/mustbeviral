// AI Provider System - Comprehensive Fallback and Load Balancing
export { AIProviderManager } from './AIProviderManager';
export { CloudflareAdapter } from './CloudflareAdapter';
export { OpenAIAdapter } from './OpenAIAdapter';
export { AnthropicAdapter } from './AnthropicAdapter';
export { CircuitBreaker, CircuitBreakerState } from './CircuitBreaker';
export { RetryHandler, ProviderRetryPolicies, retry } from './RetryHandler';
export { CostTracker } from './CostTracker';
export { ResponseCache } from '../cache/ResponseCache';

export type {
  AIProvider,
  AIProviderType,
  AIRequest,
  AIResponse,
  ProviderConfig,
  ProviderMetrics,
  CacheEntry,
  CircuitBreakerConfig,
  RateLimitConfig,
  RetryConfig,
  AIProviderError,
  RateLimitError,
  AuthenticationError,
  ModelNotFoundError,
  TokenLimitError
} from './types';

// Example usage configurations
export const DEFAULT_PROVIDER_CONFIGS = {
  development: {
    cloudflare: {
      enabled: true,
      priority: 1,
      maxTokensPerRequest: 2048,
      costPerToken: 0.0001,
      rateLimit: {
        requestsPerMinute: 50,
        tokensPerMinute: 50000
      },
      timeout: 30000,
      retryAttempts: 2,
      retryDelay: 1000,
      models: ['@cf/meta/llama-2-7b-chat-int8'],
      capabilities: ['text-generation']
    },
    openai: {
      enabled: false,
      priority: 2,
      maxTokensPerRequest: 4096,
      costPerToken: 0.002,
      rateLimit: {
        requestsPerMinute: 20,
        tokensPerMinute: 20000
      },
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 2000,
      models: ['gpt-3.5-turbo'],
      capabilities: ['text-generation', 'conversation']
    },
    anthropic: {
      enabled: false,
      priority: 3,
      maxTokensPerRequest: 4096,
      costPerToken: 0.008,
      rateLimit: {
        requestsPerMinute: 10,
        tokensPerMinute: 10000
      },
      timeout: 30000,
      retryAttempts: 2,
      retryDelay: 3000,
      models: ['claude-3-haiku-20240307'],
      capabilities: ['text-generation', 'conversation']
    }
  },
  production: {
    cloudflare: {
      enabled: true,
      priority: 1,
      maxTokensPerRequest: 4096,
      costPerToken: 0.0001,
      rateLimit: {
        requestsPerMinute: 200,
        tokensPerMinute: 200000
      },
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      models: [
        '@cf/meta/llama-2-7b-chat-int8',
        '@cf/mistral/mistral-7b-instruct-v0.1',
        '@cf/microsoft/phi-2'
      ],
      capabilities: ['text-generation', 'conversation']
    },
    openai: {
      enabled: true,
      priority: 2,
      maxTokensPerRequest: 4096,
      costPerToken: 0.002,
      rateLimit: {
        requestsPerMinute: 100,
        tokensPerMinute: 100000
      },
      timeout: 30000,
      retryAttempts: 4,
      retryDelay: 2000,
      models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
      capabilities: ['text-generation', 'conversation', 'code-generation']
    },
    anthropic: {
      enabled: true,
      priority: 3,
      maxTokensPerRequest: 4096,
      costPerToken: 0.008,
      rateLimit: {
        requestsPerMinute: 80,
        tokensPerMinute: 80000
      },
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 3000,
      models: [
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229'
      ],
      capabilities: ['text-generation', 'conversation', 'analysis']
    }
  }
};

// Load balancing strategies
export const LOAD_BALANCING_STRATEGIES = {
  costOptimized: {
    type: 'cost-optimized' as const,
    description: 'Route to the cheapest available provider'
  },
  performance: {
    type: 'least-latency' as const,
    description: 'Route to the fastest responding provider'
  },
  balanced: {
    type: 'weighted' as const,
    weights: {
      cloudflare: 0.6,
      openai: 0.3,
      anthropic: 0.1
    },
    description: 'Balanced approach favoring Cloudflare'
  },
  roundRobin: {
    type: 'round-robin' as const,
    description: 'Evenly distribute requests across all providers'
  }
};

// Helper function to create provider manager with environment-specific config
export function createAIProviderManager(
  environment: 'development' | 'production',
  env: Record<string, any>,
  customConfig?: Partial<Record<AIProviderType, ProviderConfig>>
): AIProviderManager {
  const baseConfig = DEFAULT_PROVIDER_CONFIGS[environment];
  const finalConfig = customConfig
    ? { ...baseConfig, ...customConfig }
    : baseConfig;

  return new AIProviderManager(finalConfig as any, env);
}

// Utility function to monitor provider health
export async function monitorProviderHealth(
  providerManager: AIProviderManager,
  intervalMs = 60000
): Promise<() => void> {
  const interval = setInterval(async () => {
    try {
      const healthStatus = await providerManager.getHealthStatus();
      const unhealthyProviders = healthStatus.filter(status => !status.isHealthy);

      if (unhealthyProviders.length > 0) {
        console.warn(
          `Unhealthy providers detected: ${unhealthyProviders
            .map(p => `${p.provider} (${p.errorRate * 100}% error rate)`)
            .join(', ')}`
        );
      }

      // Log metrics
      const metrics = await providerManager.getMetrics();
      console.log('Provider metrics:', Object.entries(metrics).map(([provider, metric]) => ({
        provider,
        requests: metric.requestCount,
        successRate: `${((metric.successCount / metric.requestCount) * 100).toFixed(1)}%`,
        avgLatency: `${metric.averageLatency.toFixed(0)}ms`,
        totalCost: `$${metric.totalCost.toFixed(4)}`
      })));

    } catch (error) {
      console.error('Health monitoring error:', error);
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}

// Usage example
export const USAGE_EXAMPLE = `
// Basic setup
import { createAIProviderManager, LOAD_BALANCING_STRATEGIES } from './providers';

const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
};

const providerManager = createAIProviderManager('production', env);

// Set load balancing strategy
providerManager.setLoadBalancingStrategy(LOAD_BALANCING_STRATEGIES.costOptimized);

// Generate content with automatic failover
const request = {
  model: 'gpt-3.5-turbo',
  prompt: 'Write a compelling social media post about AI',
  maxTokens: 200,
  temperature: 0.7
};

const response = await providerManager.generateContent(request);
console.log('Generated content:', response.content);
console.log('Provider used:', response.provider);
console.log('Cost:', response.cost);

// Monitor health
const stopMonitoring = await monitorProviderHealth(providerManager);

// Cleanup when done
setTimeout(() => {
  stopMonitoring();
  providerManager.shutdown();
}, 300000); // Stop after 5 minutes
`;