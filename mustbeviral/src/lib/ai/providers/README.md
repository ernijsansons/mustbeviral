# AI Provider Fallback System

A comprehensive, production-ready AI provider management system for Must Be Viral V2 that provides automatic failover, load balancing, caching, and cost optimization across multiple AI providers.

## 🚀 Features

### Core Capabilities
- **Multi-Provider Support**: Cloudflare AI, OpenAI, and Anthropic Claude
- **Automatic Failover**: Seamlessly switch between providers when one fails
- **Load Balancing**: Multiple strategies including round-robin, weighted, least-latency, and cost-optimized
- **Circuit Breaker Pattern**: Prevent cascading failures with automatic recovery
- **Response Caching**: TTL-based caching with LRU eviction to reduce API calls
- **Cost Tracking**: Real-time cost monitoring with budget alerts and projections
- **Retry Logic**: Exponential backoff with provider-specific retry policies
- **Health Monitoring**: Real-time provider health checks and metrics

### Enterprise Features
- **Rate Limiting**: Provider-specific rate limiting with respect for API quotas
- **Metrics & Analytics**: Comprehensive usage statistics and performance metrics
- **Security**: Proper error handling, input validation, and secret management
- **Scalability**: Designed for high-volume production environments
- **Observability**: Detailed logging, monitoring, and alerting capabilities

## 📋 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  Content        │    │  AI Provider     │    │  Provider Adapters  │
│  Generator      │───▶│  Manager         │───▶│  - Cloudflare       │
│                 │    │  - Load Balancer │    │  - OpenAI           │
└─────────────────┘    │  - Circuit Break │    │  - Anthropic        │
                       │  - Cache         │    └─────────────────────┘
                       │  - Cost Tracker  │
                       └──────────────────┘
                              │
                       ┌──────────────────┐
                       │  Support Systems │
                       │  - Retry Handler │
                       │  - Health Monitor│
                       │  - Metrics       │
                       └──────────────────┘
```

## 🛠 Installation & Setup

### 1. Environment Variables

```bash
# Required for OpenAI provider
OPENAI_API_KEY=sk-your-openai-api-key

# Required for Anthropic provider
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional: Environment setting
NODE_ENV=production
```

### 2. Basic Setup

```typescript
import { createAIProviderManager, LOAD_BALANCING_STRATEGIES } from './providers';

const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  NODE_ENV: 'production'
};

// Create provider manager with default production config
const providerManager = createAIProviderManager('production', env);

// Set load balancing strategy
providerManager.setLoadBalancingStrategy(LOAD_BALANCING_STRATEGIES.costOptimized);
```

### 3. Content Generation

```typescript
const request = {
  model: 'gpt-3.5-turbo',
  prompt: 'Write a compelling social media post about AI innovation',
  maxTokens: 200,
  temperature: 0.7
};

try {
  const response = await providerManager.generateContent(request);

  console.log('Generated content:', response.content);
  console.log('Provider used:', response.provider);
  console.log('Cost: $', response.cost);
  console.log('Tokens used:', response.tokensUsed);
} catch (error) {
  console.error('Generation failed:', error.message);
}
```

## 🔧 Configuration

### Provider Configuration

Each provider can be configured with the following options:

```typescript
interface ProviderConfig {
  enabled: boolean;                    // Enable/disable provider
  priority: number;                    // Priority for load balancing
  maxTokensPerRequest: number;         // Maximum tokens per request
  costPerToken: number;                // Cost per token for optimization
  rateLimit: {
    requestsPerMinute: number;         // Rate limit for requests
    tokensPerMinute: number;           // Rate limit for tokens
  };
  timeout: number;                     // Request timeout in milliseconds
  retryAttempts: number;               // Number of retry attempts
  retryDelay: number;                  // Base delay between retries
  models: string[];                    // Supported models
  capabilities: string[];              // Provider capabilities
}
```

### Environment-Specific Configurations

The system includes pre-configured settings for development and production:

```typescript
// Development - Conservative limits, fewer providers
const devManager = createAIProviderManager('development', env);

// Production - Higher limits, all providers enabled
const prodManager = createAIProviderManager('production', env);
```

### Custom Configuration

```typescript
const customConfig = {
  cloudflare: {
    enabled: true,
    priority: 1,
    maxTokensPerRequest: 2048,
    costPerToken: 0.0001,
    // ... other options
  },
  openai: {
    enabled: true,
    priority: 2,
    // ... configuration
  }
};

const manager = new AIProviderManager(customConfig, env);
```

## 📊 Load Balancing Strategies

### 1. Cost Optimized
Routes requests to the cheapest available provider:
```typescript
manager.setLoadBalancingStrategy({
  type: 'cost-optimized'
});
```

### 2. Performance Optimized
Routes to the fastest responding provider:
```typescript
manager.setLoadBalancingStrategy({
  type: 'least-latency'
});
```

### 3. Weighted Distribution
Custom weights for each provider:
```typescript
manager.setLoadBalancingStrategy({
  type: 'weighted',
  weights: {
    cloudflare: 0.6,  // 60% of requests
    openai: 0.3,      // 30% of requests
    anthropic: 0.1    // 10% of requests
  }
});
```

### 4. Round Robin
Evenly distribute requests across all providers:
```typescript
manager.setLoadBalancingStrategy({
  type: 'round-robin'
});
```

## 🏥 Health Monitoring

### Real-time Health Checks

```typescript
// Get current health status
const healthStatus = await manager.getHealthStatus();

healthStatus.forEach(status => {
  console.log(`${status.provider}: ${status.isHealthy ? '✅' : '❌'}`);
  console.log(`  Error rate: ${(status.errorRate * 100).toFixed(1)}%`);
  console.log(`  Avg response time: ${status.responseTime}ms`);
  console.log(`  Circuit breaker: ${status.circuitBreakerState}`);
});
```

### Automated Monitoring

```typescript
import { monitorProviderHealth } from './providers';

// Start automated health monitoring
const stopMonitoring = await monitorProviderHealth(manager, 60000); // Every minute

// Stop monitoring when done
process.on('SIGTERM', () => {
  stopMonitoring();
  manager.shutdown();
});
```

## 💰 Cost Tracking & Optimization

### Real-time Cost Monitoring

```typescript
// Get cost summary by provider
const costSummary = await manager.getCostSummary();

Object.entries(costSummary).forEach(([provider, summary]) => {
  console.log(`${provider}:`);
  console.log(`  Total cost: $${summary.totalCost.toFixed(4)}`);
  console.log(`  Total tokens: ${summary.totalTokens}`);
  console.log(`  Avg cost per token: $${summary.averageCostPerToken.toFixed(6)}`);
});
```

### Budget Management

```typescript
// Set budget limits
manager.setBudget('openai', {
  daily: 10.00,    // $10 per day
  weekly: 50.00,   // $50 per week
  monthly: 200.00  // $200 per month
});

// Check budget status
const budgetStatus = await manager.getBudgetStatus('openai');
console.log(`Daily usage: ${budgetStatus.daily.percentage}%`);
```

### Cost Projections

```typescript
// Get cost projections based on recent usage
const projection = await manager.getCostProjection('openai', 30);
console.log(`Projected monthly cost: $${projection.monthly.toFixed(2)}`);
```

## 🔄 Caching System

### Automatic Response Caching

The system automatically caches successful AI responses to reduce costs and improve performance:

```typescript
// Caching is automatic, but you can control it:

// Clear cache
await manager.clearCache();

// Get cache statistics
const cacheStats = manager.getCacheStats();
console.log(`Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
```

### Cache Configuration

```typescript
const cacheConfig = {
  maxSize: 1000,           // Maximum number of cached items
  defaultTTL: 3600,        // Default TTL in seconds (1 hour)
  compressionThreshold: 1024, // Compress items larger than 1KB
  enableCompression: true,  // Enable compression
  enableStats: true        // Enable statistics tracking
};
```

## 🔁 Circuit Breaker & Retry Logic

### Circuit Breaker States

The system uses circuit breakers to prevent cascading failures:

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Provider is failing, requests are blocked
- **HALF_OPEN**: Testing if provider has recovered

### Retry Configuration

Each provider has customizable retry logic:

```typescript
const retryConfig = {
  maxAttempts: 3,           // Maximum retry attempts
  baseDelay: 1000,          // Base delay in milliseconds
  maxDelay: 30000,          // Maximum delay
  backoffMultiplier: 2,     // Exponential backoff multiplier
  retryableErrors: [        // Errors that should trigger retries
    'rate limit',
    'timeout',
    'service unavailable'
  ]
};
```

## 📈 Metrics & Analytics

### Performance Metrics

```typescript
const metrics = await manager.getMetrics();

Object.entries(metrics).forEach(([provider, metric]) => {
  console.log(`${provider}:`);
  console.log(`  Total requests: ${metric.requestCount}`);
  console.log(`  Success rate: ${(metric.successCount / metric.requestCount * 100).toFixed(1)}%`);
  console.log(`  Average latency: ${metric.averageLatency.toFixed(0)}ms`);
  console.log(`  Total cost: $${metric.totalCost.toFixed(4)}`);
});
```

### Usage Analytics

```typescript
// Get top models by usage
const topModels = await manager.getTopModels(5);

// Get top users by cost
const topUsers = await manager.getTopUsers(10);

// Get daily cost breakdown
const dailyCosts = await manager.getDailyCosts(30);
```

## 🛡️ Error Handling

### Provider-Specific Errors

The system handles various types of errors gracefully:

```typescript
import {
  AIProviderError,
  RateLimitError,
  AuthenticationError,
  ModelNotFoundError
} from './providers/types';

try {
  const response = await manager.generateContent(request);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited, will retry automatically');
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed - check API keys');
  } else if (error instanceof ModelNotFoundError) {
    console.error('Model not available - will try fallback');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Graceful Degradation

When all providers fail, the system provides meaningful error messages:

```typescript
try {
  const response = await manager.generateContent(request);
} catch (error) {
  // Log the failure
  console.error('All providers failed:', error.message);

  // Fallback to cached content or default response
  const fallbackResponse = await getFallbackContent(request);
  return fallbackResponse;
}
```

## 🧪 Testing

### Testing Individual Providers

```typescript
// Test if a specific provider is working
const isWorking = await manager.testProvider('openai');
console.log(`OpenAI is ${isWorking ? 'working' : 'not working'}`);
```

### Load Testing

```typescript
// Generate multiple requests to test load balancing
const requests = Array.from({ length: 10 }, (_, i) => ({
  model: 'gpt-3.5-turbo',
  prompt: `Test request ${i + 1}`,
  maxTokens: 50,
  temperature: 0.5
}));

const results = await Promise.allSettled(
  requests.map(req => manager.generateContent(req))
);

// Analyze which providers were used
const providerUsage = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value.provider)
  .reduce((acc, provider) => {
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});

console.log('Provider usage:', providerUsage);
```

## 🚀 Production Deployment

### Environment Setup

```bash
# Set environment variables
export NODE_ENV=production
export OPENAI_API_KEY=your-openai-key
export ANTHROPIC_API_KEY=your-anthropic-key

# Optional: Configure logging
export LOG_LEVEL=info
```

### Production Best Practices

1. **Monitor Health**: Set up automated health monitoring
2. **Set Budgets**: Configure budget limits to prevent overspending
3. **Cache Optimization**: Tune cache settings for your usage patterns
4. **Error Handling**: Implement comprehensive error handling and fallbacks
5. **Metrics**: Set up monitoring and alerting for key metrics

### Scaling Considerations

- **Rate Limits**: Ensure provider rate limits are appropriate for your load
- **Cost Management**: Monitor costs closely, especially during high usage periods
- **Circuit Breakers**: Tune circuit breaker thresholds based on your reliability requirements
- **Caching**: Optimize cache size and TTL based on your content patterns

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Errors**: Check API keys are correctly set
2. **Rate Limiting**: Adjust rate limits or implement request queuing
3. **High Costs**: Review usage patterns and enable cost optimization
4. **Slow Performance**: Check network connectivity and adjust timeouts

### Debug Mode

```typescript
// Enable verbose logging for debugging
const manager = createAIProviderManager('development', {
  ...env,
  LOG_LEVEL: 'debug'
});
```

### Health Checks

```typescript
// Perform comprehensive health check
const healthStatus = await manager.getHealthStatus();
const metrics = await manager.getMetrics();
const costSummary = await manager.getCostSummary();

console.log('Health Status:', healthStatus);
console.log('Metrics:', metrics);
console.log('Cost Summary:', costSummary);
```

## 📚 API Reference

For detailed API documentation, see the TypeScript interfaces in `types.ts`:

- `AIProviderManager` - Main provider management class
- `AIProvider` - Interface for provider adapters
- `AIRequest` / `AIResponse` - Request/response types
- `ProviderConfig` - Provider configuration options
- `ProviderMetrics` - Performance metrics types

## 🤝 Contributing

When adding new providers or features:

1. Implement the `AIProvider` interface
2. Add retry logic and error handling
3. Include comprehensive tests
4. Update documentation and examples
5. Follow the existing patterns for consistency

## 📄 License

This AI Provider Fallback System is part of Must Be Viral V2 and follows the project's licensing terms.