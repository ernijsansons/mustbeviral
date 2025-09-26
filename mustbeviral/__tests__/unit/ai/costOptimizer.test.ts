/**
 * AI Cost Optimizer Unit Tests
 * Comprehensive testing for intelligent model selection and cost optimization
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AICostOptimizer, type RequestContext, type ModelConfig } from '../../../src/lib/ai/costOptimizer';
import { MockAIProvider, PerformanceTracker, TestDataGenerator } from '../../utils/testHelpers';

describe('AICostOptimizer', () => {
  let costOptimizer: AICostOptimizer;
  let performanceTracker: PerformanceTracker;
  let mockProviders: Map<string, MockAIProvider>;

  beforeEach(() => {
    costOptimizer = new AICostOptimizer();
    performanceTracker = new PerformanceTracker();
    
    // Setup mock AI providers with different characteristics
    mockProviders = new Map([
      ['expensive-high-quality', new MockAIProvider('GPT-4', 2000, 0.02, 0.03)],
      ['cheap-fast', new MockAIProvider('GPT-3.5', 800, 0.05, 0.002)],
      ['balanced', new MockAIProvider('Claude', 1500, 0.03, 0.015)],
      ['local-free', new MockAIProvider('Local', 5000, 0.1, 0)],
    ]);
  });

  afterEach(() => {
    performanceTracker.clear();
  });

  describe('Model Selection Optimization', () => {
    test('should select cheapest model for low-priority tasks', async () => {
      const context: RequestContext = {
        taskType: 'summarization',
        complexity: 'low',
        maxCost: 0.10,
        maxLatency: 10000,
        qualityThreshold: 0.6,
        priority: 'low'
      };

      const optimization = await costOptimizer.optimizeRequest(context);

      expect(optimization.selectedModel.costPerToken).toBeLessThan(0.01);
      expect(optimization.estimatedCost).toBeLessThan(context.maxCost);
      expect(optimization.reasoning).toContain('cost efficiency');
    });

    test('should select high-quality model for critical tasks', async () => {
      const context: RequestContext = {
        taskType: 'content-generation',
        complexity: 'high',
        maxCost: 1.00,
        maxLatency: 30000,
        qualityThreshold: 0.9,
        priority: 'critical'
      };

      const optimization = await costOptimizer.optimizeRequest(context);

      expect(optimization.selectedModel.qualityScore).toBeGreaterThan(0.9);
      expect(optimization.confidence).toBeGreaterThan(0.8);
      expect(optimization.reasoning).toContain('high quality');
    });

    test('should respect cost constraints', async () => {
      const context: RequestContext = {
        taskType: 'analysis',
        complexity: 'medium',
        maxCost: 0.01, // Very low budget
        maxLatency: 5000,
        qualityThreshold: 0.7,
        priority: 'normal'
      };

      const optimization = await costOptimizer.optimizeRequest(context);

      expect(optimization.estimatedCost).toBeLessThanOrEqual(context.maxCost);
    });

    test('should respect latency constraints', async () => {
      const context: RequestContext = {
        taskType: 'classification',
        complexity: 'low',
        maxCost: 0.50,
        maxLatency: 1000, // Very fast required
        qualityThreshold: 0.7,
        priority: 'normal'
      };

      const optimization = await costOptimizer.optimizeRequest(context);

      expect(optimization.estimatedLatency).toBeLessThanOrEqual(context.maxLatency);
      expect(optimization.selectedModel.latency).toBeLessThan(1500);
    });

    test('should provide fallback chain', async () => {
      const context: RequestContext = {
        taskType: 'text-generation',
        complexity: 'medium',
        maxCost: 0.20,
        maxLatency: 10000,
        qualityThreshold: 0.7,
        priority: 'normal'
      };

      const optimization = await costOptimizer.optimizeRequest(context);

      expect(optimization.fallbackChain).toHaveLength(3);
      expect(optimization.fallbackChain[0]).not.toEqual(optimization.selectedModel);
    });

    test('should throw error when no suitable models available', async () => {
      const impossibleContext: RequestContext = {
        taskType: 'text-generation',
        complexity: 'high',
        maxCost: 0.00001, // Impossibly low budget
        maxLatency: 10,    // Impossibly fast
        qualityThreshold: 0.99, // Impossibly high quality
        priority: 'critical'
      };

      await expect(costOptimizer.optimizeRequest(impossibleContext))
        .rejects.toThrow('No suitable models available');
    });
  });

  describe('Performance Tracking', () => {
    test('should record successful requests accurately', () => {
      const modelName = 'gpt-4o-mini';
      const taskType = 'summarization';
      const cost = 0.005;
      const latency = 1200;
      const quality = 0.85;

      costOptimizer.recordRequest(modelName, taskType, cost, latency, true, quality);

      const metrics = costOptimizer.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.totalCost).toBe(cost);
      expect(metrics.averageCost).toBe(cost);
    });

    test('should track failed requests', () => {
      const modelName = 'claude-3-sonnet';
      const taskType = 'analysis';

      costOptimizer.recordRequest(modelName, taskType, 0, 5000, false, 0);

      const metrics = costOptimizer.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.totalCost).toBe(0);
    });

    test('should calculate efficiency metrics', () => {
      // Record multiple requests with different outcomes
      costOptimizer.recordRequest('cheap-model', 'task1', 0.001, 800, true, 0.7);
      costOptimizer.recordRequest('expensive-model', 'task2', 0.05, 2000, true, 0.95);
      costOptimizer.recordRequest('balanced-model', 'task3', 0.01, 1200, true, 0.85);

      const metrics = costOptimizer.getMetrics();
      expect(metrics.efficiency).toBeGreaterThan(0);
      expect(metrics.averageCost).toBeCloseTo(0.0203, 3);
    });

    test('should provide model analytics', () => {
      // Record requests for multiple models
      costOptimizer.recordRequest('gpt-4o', 'task1', 0.03, 2000, true, 0.95);
      costOptimizer.recordRequest('gpt-4o', 'task2', 0.025, 1800, true, 0.92);
      costOptimizer.recordRequest('claude-haiku', 'task3', 0.001, 1000, true, 0.78);

      const analytics = costOptimizer.getModelAnalytics();
      
      expect(analytics).toHaveLength(2); // Two different models
      expect(analytics[0]).toHaveProperty('efficiency');
      expect(analytics[0]).toHaveProperty('successRate');
      expect(analytics[0]).toHaveProperty('averageLatency');
      
      // Should be sorted by efficiency
      expect(analytics[0].efficiency).toBeGreaterThanOrEqual(analytics[1].efficiency);
    });
  });

  describe('Cost Optimization Recommendations', () => {
    test('should identify expensive model overuse', () => {
      // Simulate overuse of expensive model
      for (let i = 0; i < 150; i++) {
        costOptimizer.recordRequest('gpt-4o', 'simple-task', 0.03, 2000, true, 0.95);
      }

      const recommendations = costOptimizer.getOptimizationRecommendations();
      
      const modelSwitchRec = recommendations.find(r => r.type === 'model-switch');
      expect(modelSwitchRec).toBeDefined();
      expect(modelSwitchRec?.estimatedSavings).toBeGreaterThan(0);
    });

    test('should identify batching opportunities', () => {
      // Simulate many similar requests
      for (let i = 0; i < 50; i++) {
        costOptimizer.recordRequest('claude-sonnet', 'classification', 0.01, 1500, true, 0.88);
      }

      const recommendations = costOptimizer.getOptimizationRecommendations();
      
      const batchingRec = recommendations.find(r => r.type === 'request-batching');
      expect(batchingRec).toBeDefined();
      expect(batchingRec?.effort).toBe('medium');
    });

    test('should identify caching opportunities', () => {
      // Simulate repeated similar requests
      const baseTime = Date.now();
      for (let i = 0; i < 20; i++) {
        costOptimizer.recordRequest('gemini-pro', 'content-analysis', 0.005, 1200, true, 0.83);
      }

      const recommendations = costOptimizer.getOptimizationRecommendations();
      
      const cachingRec = recommendations.find(r => r.type === 'caching');
      expect(cachingRec).toBeDefined();
      expect(cachingRec?.effort).toBe('low');
    });

    test('should prioritize recommendations by savings potential', () => {
      // Create scenario with multiple optimization opportunities
      // High-cost overuse
      for (let i = 0; i < 200; i++) {
        costOptimizer.recordRequest('gpt-4o', 'simple', 0.03, 2000, true, 0.95);
      }
      
      // Caching opportunity
      for (let i = 0; i < 10; i++) {
        costOptimizer.recordRequest('claude-haiku', 'summary', 0.001, 1000, true, 0.78);
      }

      const recommendations = costOptimizer.getOptimizationRecommendations();
      
      // Should be sorted by savings potential
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i-1].estimatedSavings)
          .toBeGreaterThanOrEqual(recommendations[i].estimatedSavings);
      }
    });
  });

  describe('Performance Under Load', () => {
    test('should handle high request volume efficiently', async () => {
      performanceTracker.start('highVolume');
      
      const contexts = Array.from({ length: 1000 }, (_, i) => ({
        taskType: i % 2 === 0 ? 'summarization' : 'classification',
        complexity: ['low', 'medium', 'high'][i % 3],
        maxCost: 0.10,
        maxLatency: 5000,
        qualityThreshold: 0.7,
        priority: 'normal'
      } as RequestContext));

      const promises = contexts.map(context => 
        costOptimizer.optimizeRequest(context)
      );

      const results = await Promise.all(promises);
      const duration = performanceTracker.end('highVolume');

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(10000); // Should handle 1000 requests in <10s
      
      // All results should be valid
      results.forEach(result => {
        expect(result.selectedModel).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    test('should maintain memory efficiency with large history', () => {
      const memoryTracker = new (require('../../utils/testHelpers')).MemoryLeakDetector();
      
      memoryTracker.takeSnapshot('start');
      
      // Record large number of requests
      for (let i = 0; i < 20000; i++) {
        costOptimizer.recordRequest(
          `model-${i % 10}`,
          `task-${i % 5}`,
          Math.random() * 0.05,
          1000 + Math.random() * 2000,
          Math.random() > 0.1,
          0.7 + Math.random() * 0.3
        );
      }
      
      memoryTracker.takeSnapshot('end');
      
      // Should maintain reasonable memory usage
      expect(memoryTracker.detectLeak(200)).toBe(false); // Less than 200MB growth
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle zero-cost requests', () => {
      costOptimizer.recordRequest('local-model', 'test', 0, 1000, true, 0.8);
      
      const metrics = costOptimizer.getMetrics();
      expect(metrics.totalCost).toBe(0);
      expect(metrics.averageCost).toBe(0);
      expect(metrics.efficiency).toBeGreaterThan(0); // Should handle division by zero
    });

    test('should handle invalid quality scores', () => {
      costOptimizer.recordRequest('test-model', 'test', 0.01, 1000, true, -0.5); // Invalid
      costOptimizer.recordRequest('test-model', 'test', 0.01, 1000, true, 1.5);  // Invalid
      
      const analytics = costOptimizer.getModelAnalytics();
      expect(analytics[0].averageQuality).toBeGreaterThanOrEqual(0);
      expect(analytics[0].averageQuality).toBeLessThanOrEqual(1);
    });

    test('should handle concurrent optimization requests', async () => {
      const context: RequestContext = {
        taskType: 'text-generation',
        complexity: 'medium',
        maxCost: 0.20,
        maxLatency: 10000,
        qualityThreshold: 0.7,
        priority: 'normal'
      };

      // Make many concurrent requests
      const promises = Array.from({ length: 100 }, () => 
        costOptimizer.optimizeRequest(context)
      );

      const results = await Promise.all(promises);
      
      // All should succeed and return valid results
      results.forEach(result => {
        expect(result.selectedModel).toBeDefined();
        expect(result.fallbackChain).toHaveLength(3);
      });
    });

    test('should handle malformed request contexts', async () => {
      const invalidContext = {
        taskType: 'invalid-task',
        complexity: 'ultra-high', // Invalid
        maxCost: -1, // Invalid
        maxLatency: 0, // Invalid
        qualityThreshold: 2, // Invalid
        priority: 'super-critical' // Invalid
      } as any;

      await expect(costOptimizer.optimizeRequest(invalidContext))
        .rejects.toThrow();
    });
  });

  describe('Learning and Adaptation', () => {
    test('should adapt model scores based on actual performance', () => {
      const modelName = 'adaptive-model';
      
      // Record consistently poor performance
      for (let i = 0; i < 20; i++) {
        costOptimizer.recordRequest(modelName, 'test', 0.01, 2000, true, 0.3); // Poor quality
      }
      
      const analytics = costOptimizer.getModelAnalytics();
      const modelStats = analytics.find(a => a.name === modelName);
      
      expect(modelStats?.averageQuality).toBeCloseTo(0.3, 1);
      expect(modelStats?.efficiency).toBeLessThan(50); // Should reflect poor performance
    });

    test('should improve recommendations over time', () => {
      // Initial recommendations
      const initialRecs = costOptimizer.getOptimizationRecommendations();
      
      // Simulate usage patterns that create optimization opportunities
      for (let i = 0; i < 100; i++) {
        costOptimizer.recordRequest('expensive-model', 'simple-task', 0.05, 2000, true, 0.95);
      }
      
      const improvedRecs = costOptimizer.getOptimizationRecommendations();
      
      // Should have more specific recommendations
      expect(improvedRecs.length).toBeGreaterThanOrEqual(initialRecs.length);
      
      const savings = improvedRecs.reduce((sum, rec) => sum + rec.estimatedSavings, 0);
      expect(savings).toBeGreaterThan(0);
    });
  });
});