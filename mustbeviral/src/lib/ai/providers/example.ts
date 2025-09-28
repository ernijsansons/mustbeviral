/**
 * Example usage of the AI Provider Fallback System
 *
 * This file demonstrates how to use the comprehensive AI provider fallback system
 * with automatic failover, load balancing, caching, and cost optimization.
 */

import { AIProviderManager } from './AIProviderManager';
import { createAIProviderManager, LOAD_BALANCING_STRATEGIES, monitorProviderHealth } from './index';
import { AIRequest, AIProviderType, ProviderConfig } from './types';

// Example 1: Basic Setup with Default Configuration
async function basicUsageExample() {
  console.log('=== Basic Usage Example ===');

  const env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-openai-key',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'your-anthropic-key',
    NODE_ENV: 'production'
  };

  // Create provider manager with production configuration
  const providerManager = createAIProviderManager('production', env);

  try {
    // Simple content generation request
    const request: AIRequest = {
      model: 'gpt-3.5-turbo',
      prompt: 'Write a compelling tweet about the future of AI that will go viral',
      maxTokens: 280,
      temperature: 0.8
    };

    console.log('Generating content...');
    const response = await providerManager.generateContent(request);

    console.log('✅ Content generated successfully!');
    console.log('Provider:', response.provider);
    console.log('Model:', response.model);
    console.log('Content:', response.content);
    console.log('Tokens used:', response.tokensUsed);
    console.log('Cost: $', response.cost?.toFixed(6));
    console.log('Latency:', response.metadata?.latency, 'ms');

  } catch (error) {
    console.error('❌ Content generation failed:', error);
  } finally {
    await providerManager.shutdown();
  }
}

// Example 2: Load Balancing Strategies
async function loadBalancingExample() {
  console.log('\n=== Load Balancing Example ===');

  const env = { NODE_ENV: 'development' };
  const providerManager = createAIProviderManager('development', env);

  const testRequest: AIRequest = {
    model: 'llama-2-7b',
    prompt: 'Explain quantum computing in simple terms',
    maxTokens: 150,
    temperature: 0.7
  };

  // Test different load balancing strategies
  const strategies = [
    LOAD_BALANCING_STRATEGIES.roundRobin,
    LOAD_BALANCING_STRATEGIES.costOptimized,
    LOAD_BALANCING_STRATEGIES.performance
  ];

  for (const strategy of strategies) {
    console.log(`\nTesting ${strategy.type} strategy:`);
    providerManager.setLoadBalancingStrategy(strategy);

    try {
      const response = await providerManager.generateContent(testRequest);
      console.log(`✅ ${strategy.type}: Used ${response.provider} provider`);
    } catch (error) {
      console.log(`❌ ${strategy.type}: Failed -`, (error as Error).message);
    }
  }

  await providerManager.shutdown();
}

// Example 3: Failover and Error Handling
async function failoverExample() {
  console.log('\n=== Failover Example ===');

  // Create custom config with intentionally failing primary provider
  const customConfig: Record<AIProviderType, ProviderConfig> = {
    cloudflare: {
      enabled: false, // Disabled to simulate failure
      priority: 1,
      maxTokensPerRequest: 4096,
      costPerToken: 0.0001,
      rateLimit: { requestsPerMinute: 100, tokensPerMinute: 100000 },
      timeout: 30000,
      retryAttempts: 1,
      retryDelay: 1000,
      models: ['@cf/meta/llama-2-7b-chat-int8'],
      capabilities: ['text-generation']
    },
    openai: {
      enabled: true, // This will be the fallback
      priority: 2,
      maxTokensPerRequest: 4096,
      costPerToken: 0.002,
      rateLimit: { requestsPerMinute: 60, tokensPerMinute: 90000 },
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 2000,
      models: ['gpt-3.5-turbo'],
      capabilities: ['text-generation']
    },
    anthropic: {
      enabled: false,
      priority: 3,
      maxTokensPerRequest: 4096,
      costPerToken: 0.008,
      rateLimit: { requestsPerMinute: 50, tokensPerMinute: 50000 },
      timeout: 30000,
      retryAttempts: 2,
      retryDelay: 3000,
      models: ['claude-3-haiku-20240307'],
      capabilities: ['text-generation']
    }
  };

  const env = { OPENAI_API_KEY: 'demo-key' };
  const providerManager = new AIProviderManager(customConfig, env);

  try {
    const request: AIRequest = {
      model: '@cf/meta/llama-2-7b-chat-int8', // Primary model that will fail
      prompt: 'Write a brief explanation of machine learning',
      maxTokens: 100,
      temperature: 0.5
    };

    console.log('Attempting generation with failing primary provider...');
    const response = await providerManager.generateContent(request);

    console.log('✅ Fallback successful!');
    console.log('Original model requested:', request.model);
    console.log('Actually used provider:', response.provider);
    console.log('Actually used model:', response.model);

  } catch (error) {
    console.error('❌ All providers failed:', (error as Error).message);
  }

  await providerManager.shutdown();
}

// Example 4: Monitoring and Health Checks
async function monitoringExample() {
  console.log('\n=== Monitoring Example ===');

  const env = { NODE_ENV: 'development' };
  const providerManager = createAIProviderManager('development', env);

  // Start health monitoring
  const stopMonitoring = await monitorProviderHealth(providerManager, 5000); // Every 5 seconds

  // Generate some requests to create metrics
  const requests: AIRequest[] = [
    {
      model: 'llama-2-7b',
      prompt: 'What is artificial intelligence?',
      maxTokens: 50,
      temperature: 0.3
    },
    {
      model: 'gpt-3.5-turbo',
      prompt: 'Explain blockchain technology',
      maxTokens: 75,
      temperature: 0.7
    },
    {
      model: 'claude-3-haiku',
      prompt: 'Describe renewable energy',
      maxTokens: 60,
      temperature: 0.5
    }
  ];

  console.log('Generating multiple requests to build metrics...');
  for (const request of requests) {
    try {
      await providerManager.generateContent(request);
      console.log(`✅ Generated content with ${request.model}`);
    } catch (error) {
      console.log(`❌ Failed with ${request.model}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Get health status
  console.log('\nProvider Health Status:');
  const healthStatus = await providerManager.getHealthStatus();
  healthStatus.forEach(status => {
    console.log(`${status.provider}: ${status.isHealthy ? '✅' : '❌'} (${status.errorRate * 100}% error rate)`);
  });

  // Get cost summary
  console.log('\nCost Summary:');
  const costSummary = await providerManager.getCostSummary();
  Object.entries(costSummary).forEach(([provider, summary]) => {
    console.log(`${provider}: $${summary.totalCost.toFixed(6)} (${summary.totalTokens} tokens)`);
  });

  // Stop monitoring and cleanup
  setTimeout(() => {
    stopMonitoring();
    providerManager.shutdown();
    console.log('\n✅ Monitoring stopped and resources cleaned up');
  }, 15000); // Stop after 15 seconds
}

// Example 5: Caching Demonstration
async function cachingExample() {
  console.log('\n=== Caching Example ===');

  const env = { NODE_ENV: 'development' };
  const providerManager = createAIProviderManager('development', env);

  const request: AIRequest = {
    model: 'llama-2-7b',
    prompt: 'What are the benefits of renewable energy?',
    maxTokens: 100,
    temperature: 0.1 // Low temperature for consistent results
  };

  console.log('First request (should generate new content):');
  const start1 = Date.now();
  try {
    const response1 = await providerManager.generateContent(request);
    const time1 = Date.now() - start1;
    console.log(`✅ Generated in ${time1}ms`);
    console.log('Provider:', response1.provider);
  } catch (error) {
    console.log('❌ First request failed');
  }

  console.log('\nSecond request (should use cache):');
  const start2 = Date.now();
  try {
    const response2 = await providerManager.generateContent(request);
    const time2 = Date.now() - start2;
    console.log(`✅ Completed in ${time2}ms (likely from cache)`);
    console.log('Provider:', response2.provider);
  } catch (error) {
    console.log('❌ Second request failed');
  }

  await providerManager.shutdown();
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 AI Provider Fallback System Examples\n');

  try {
    await basicUsageExample();
    await loadBalancingExample();
    await failoverExample();
    await monitoringExample();
    await cachingExample();
  } catch (error) {
    console.error('Example execution error:', error);
  }

  console.log('\n🎉 All examples completed!');
}

// Export for use in other files or tests
export {
  basicUsageExample,
  loadBalancingExample,
  failoverExample,
  monitoringExample,
  cachingExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}