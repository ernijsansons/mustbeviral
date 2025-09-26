/**
 * Comprehensive Agent Testing Suite
 * Validates all platform agents for quality, performance, and cost optimization
 */

import { it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TwitterAgent } from '../../../src/lib/ai/agents/TwitterAgent';
import { PlatformAgentCoordinator } from '../../../src/lib/ai/agents/PlatformAgentCoordinator';
import { CostBudget } from '../../../src/lib/ai/agents/monitoring/CostTracker';
import { OptimizationConfig } from '../../../src/lib/ai/agents/monitoring/TokenOptimizer';
import { PerformanceAnalyzer, TestConfiguration } from '../../../src/lib/ai/agents/monitoring/PerformanceAnalyzer';

// Test data constants
const TEST_BUDGET: CostBudget = {
  daily: 10.0,
  weekly: 50.0,
  monthly: 200.0,
  perRequest: 0.05,
  currency: 'USD'
};

const OPTIMIZATION_CONFIG: OptimizationConfig = {
  aggressivenessLevel: 'moderate',
  qualityFloor: 75,
  maxTokenReduction: 40,
  adaptiveLearning: true,
  platformSpecific: true
};

const TEST_CONFIG: TestConfiguration = {
  contentType: 'post',
  complexityLevel: 'medium',
  targetAudience: 'general',
  optimizationLevel: 'moderate',
  qualityThreshold: 80,
  timeLimit: 5000
};

describe('Platform Agent Testing Suite', () => {
  let costTracker: CostTracker;
  let tokenOptimizer: TokenOptimizer;
  let performanceAnalyzer: PerformanceAnalyzer;
  let twitterAgent: TwitterAgent;
  let coordinator: PlatformAgentCoordinator;

  beforeEach(() => {
    costTracker = new CostTracker(TEST_BUDGET);
    tokenOptimizer = new TokenOptimizer();
    performanceAnalyzer = new PerformanceAnalyzer();

    // Mock the external dependencies
    jest.clearAllMocks();
  });

  afterEach(() => {
    costTracker.resetMetrics();
    tokenOptimizer.resetLearningData();
    performanceAnalyzer.resetPerformanceData();
  });

  describe('Cost Tracking System', () => {
    it('should track token usage and calculate costs accurately', () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const model = '@cf/meta/llama-2-7b-chat-int8';

      costTracker.trackRequest(
        'TwitterAgent',
        'twitter',
        inputTokens,
        outputTokens,
        model,
        800,
        true,
        85
      );

      const metrics = costTracker.getCurrentMetrics();
      expect(metrics.totalTokensUsed).toBe(1500);
      expect(metrics.totalAPICalls).toBe(1);
      expect(metrics.totalCostUSD).toBeGreaterThan(0);
      expect(metrics.successRate).toBe(100);
    });

    it('should detect cost spikes and generate alerts', () => {
      // Generate normal requests
      for (let i = 0; i < 5; i++) {
        costTracker.trackRequest('TwitterAgent', 'twitter', 800, 400, '@cf/meta/llama-2-7b-chat-int8', 600, true);
      }

      // Generate expensive request
      costTracker.trackRequest('TwitterAgent', 'twitter', 4000, 2000, '@cf/meta/llama-2-7b-chat-int8', 1200, true);

      const alerts = costTracker.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'cost_spike')).toBe(true);
    });

    it('should provide accurate budget utilization', () => {
      // Simulate daily usage
      for (let i = 0; i < 20; i++) {
        costTracker.trackRequest('TwitterAgent', 'twitter', 1000, 500, '@cf/meta/llama-2-7b-chat-int8', 700, true);
      }

      const utilization = costTracker.getBudgetUtilization();
      expect(utilization.daily.used).toBeGreaterThan(0);
      expect(utilization.daily.percentage).toBeGreaterThan(0);
      expect(utilization.daily.remaining).toBeLessThanOrEqual(TEST_BUDGET.daily);
    });

    it('should generate relevant optimization recommendations', () => {
      // Simulate high token usage scenario
      for (let i = 0; i < 10; i++) {
        costTracker.trackRequest('TwitterAgent', 'twitter', 3500, 1500, '@cf/meta/llama-2-7b-chat-int8', 1200, true);
      }

      const recommendations = costTracker.generateOptimizationRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.type === 'token_reduction')).toBe(true);
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('Token Optimization System', () => {
    it('should calculate optimal token allocation based on complexity', () => {
      const allocation = tokenOptimizer.calculateOptimalAllocation(
        'twitter',
        'post',
        'AI breakthrough in machine learning algorithms',
        85,
        OPTIMIZATION_CONFIG
      );

      expect(allocation.maxTokens).toBeGreaterThan(256);
      expect(allocation.maxTokens).toBeLessThan(4096);
      expect(allocation.inputTokens + allocation.outputTokens).toBeLessThanOrEqual(allocation.maxTokens);
      expect(allocation.qualityThreshold).toBe(85);
    });

    it('should optimize token usage with measurable reduction', () => {
      const testContent = 'Sample content for AI optimization testing with multiple complex requirements and detailed specifications';

      const result = tokenOptimizer.optimizeTokenUsage(
        testContent,
        'twitter',
        OPTIMIZATION_CONFIG,
        2000
      );

      expect(result.optimizedTokens).toBeLessThan(result.originalTokens);
      expect(result.reductionPercentage).toBeGreaterThan(0);
      expect(result.qualityImpact).toBeLessThan(25); // Should maintain reasonable quality
      expect(result.optimizationTechniques.length).toBeGreaterThan(0);
    });

    it('should respect quality floor constraints', () => {
      const extremeConfig: OptimizationConfig = {
        ...OPTIMIZATION_CONFIG,
        aggressivenessLevel: 'extreme',
        qualityFloor: 80
      };

      const result = tokenOptimizer.optimizeTokenUsage(
        'Test content for extreme optimization',
        'twitter',
        extremeConfig,
        1500
      );

      expect(result.qualityImpact).toBeLessThanOrEqual(20); // 100 - 80 = max 20% impact
      expect(result.optimizedTokens).toBeGreaterThanOrEqual(256); // Minimum viable tokens
    });

    it('should provide platform-specific optimization recommendations', () => {
      const recommendations = tokenOptimizer.getOptimizationRecommendations(
        'twitter',
        3200, // High token usage
        88,   // High quality
        0.015 // High cost
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.type === 'allocation')).toBe(true);
      expect(recommendations.some(rec => rec.priority === 'high')).toBe(true);
    });

    it('should learn from optimization results', () => {
      // Record several optimization results
      tokenOptimizer.recordOptimizationResult('twitter', 'post', 1800, 85, true, 88);
      tokenOptimizer.recordOptimizationResult('twitter', 'post', 1600, 82, true, 85);
      tokenOptimizer.recordOptimizationResult('twitter', 'post', 2000, 90, true, 92);

      const stats = tokenOptimizer.getOptimizationStats();
      expect(stats.totalOptimizations).toBe(3);
      expect(stats.averageReduction).toBeGreaterThan(0);
      expect(stats.platformBreakdown.twitter).toBeDefined();
      expect(stats.platformBreakdown.twitter.optimizations).toBe(3);
    });
  });

  describe('Performance Analysis System', () => {
    it('should assess content quality with detailed breakdown', () => {
      const testContent = `🚨 BREAKING: Revolutionary AI breakthrough just announced!

      This changes everything for the future of technology. What are your thoughts?

      #AI #Technology #Breaking #Innovation #Future`;

      const assessment = performanceAnalyzer.assessContentQuality(testContent, 'twitter');

      expect(assessment.overallQuality).toBeGreaterThan(0);
      expect(assessment.overallQuality).toBeLessThanOrEqual(100);
      expect(assessment.contentRelevance).toBeGreaterThan(0);
      expect(assessment.platformOptimization).toBeGreaterThan(0);
      expect(assessment.viralElements).toBeGreaterThan(0);
      expect(assessment.qualityFactors.length).toBeGreaterThan(0);
    });

    it('should run comprehensive performance benchmarks', async () => {
      const contentSamples = [
        'AI is revolutionizing social media content creation',
        'Breaking: New algorithm updates change everything',
        'The future of content is here - are you ready?'
      ];

      const result = await performanceAnalyzer.runPerformanceBenchmark(
        'TwitterAgent',
        'twitter',
        TEST_CONFIG,
        contentSamples
      );

      expect(result.agentName).toBe('TwitterAgent');
      expect(result.platform).toBe('twitter');
      expect(result.metrics.responseTime).toBeGreaterThan(0);
      expect(result.metrics.qualityScore).toBeGreaterThan(0);
      expect(result.metrics.qualityScore).toBeLessThanOrEqual(100);
      expect(result.metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(result.comparisonScore).toBeDefined();
    });

    it('should generate actionable optimization recommendations', () => {
      const lowPerformanceMetrics = {
        responseTime: 3500, // Slow
        qualityScore: 65,   // Below baseline
        viralPotential: 45, // Low
        engagementPrediction: 60, // Low
        costEfficiency: 55, // Poor
        tokenUtilization: 85,
        successRate: 75,    // Below target
        accuracyScore: 70
      };

      const recommendations = performanceAnalyzer.generateOptimizationRecommendations(
        'TwitterAgent',
        'twitter',
        lowPerformanceMetrics
      );

      expect(recommendations.length).toBeGreaterThan(0);

      // Should have high-priority recommendations for major issues
      const highPriorityRecs = recommendations.filter(rec => rec.priority === 'high');
      expect(highPriorityRecs.length).toBeGreaterThan(0);

      // Should cover multiple categories
      const categories = new Set(recommendations.map(rec => rec.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('should track performance trends over time', () => {
      // Simulate multiple benchmark results over time
      const baseMetrics = {
        responseTime: 1000,
        qualityScore: 80,
        viralPotential: 75,
        engagementPrediction: 70,
        costEfficiency: 85,
        tokenUtilization: 60,
        successRate: 90,
        accuracyScore: 82
      };

      // Add trend data
      performanceAnalyzer['updatePerformanceTrends']('TwitterAgent', 'twitter', baseMetrics);

      // Add improved metrics
      const improvedMetrics = { ...baseMetrics, qualityScore: 85, viralPotential: 80 };
      performanceAnalyzer['updatePerformanceTrends']('TwitterAgent', 'twitter', improvedMetrics);

      const trend = performanceAnalyzer.getPerformanceTrends('TwitterAgent', 'twitter', 'qualityScore', 'day');
      expect(trend).toBeDefined();
      expect(trend?.dataPoints.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Testing', () => {
    it('should integrate cost tracking with token optimization', () => {
      // Track a request
      costTracker.trackRequest('TwitterAgent', 'twitter', 2000, 1000, '@cf/meta/llama-2-7b-chat-int8', 1200, true, 85);

      // Get current metrics
      const metrics = costTracker.getCurrentMetrics();

      // Use metrics to optimize future requests
      const allocation = tokenOptimizer.calculateOptimalAllocation(
        'twitter',
        'post',
        'test content',
        85,
        OPTIMIZATION_CONFIG
      );

      expect(allocation.maxTokens).toBeLessThan(3000); // Should be optimized
      expect(metrics.averageTokensPerRequest).toBe(3000); // 2000 + 1000
    });

    it('should integrate performance analysis with cost optimization', async () => {
      const contentSamples = ['AI breakthrough in content optimization'];

      // Run performance benchmark
      const perfResult = await performanceAnalyzer.runPerformanceBenchmark(
        'TwitterAgent',
        'twitter',
        TEST_CONFIG,
        contentSamples
      );

      // Use performance data for cost optimization
      const costRecommendations = costTracker.generateOptimizationRecommendations();
      const perfRecommendations = performanceAnalyzer.generateOptimizationRecommendations(
        'TwitterAgent',
        'twitter',
        perfResult.metrics
      );

      expect(costRecommendations.length + perfRecommendations.length).toBeGreaterThan(0);
    });

    it('should maintain quality while optimizing costs', () => {
      // Simulate optimization cycle
      for (let i = 0; i < 5; i++) {
        // Track request
        costTracker.trackRequest('TwitterAgent', 'twitter', 1500 - (i * 100), 800, '@cf/meta/llama-2-7b-chat-int8', 800, true, 85 - i);

        // Record optimization
        tokenOptimizer.recordOptimizationResult('twitter', 'post', 1500 - (i * 100), 85 - i, true);
      }

      const metrics = costTracker.getCurrentMetrics();
      const optimizationStats = tokenOptimizer.getOptimizationStats();

      // Cost should decrease while maintaining reasonable quality
      expect(metrics.averageTokensPerRequest).toBeLessThan(1500);
      expect(metrics.successRate).toBeGreaterThan(80);
      expect(optimizationStats.averageReduction).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero token scenarios gracefully', () => {
      const result = tokenOptimizer.optimizeTokenUsage('', 'twitter', OPTIMIZATION_CONFIG, 0);

      expect(result.optimizedTokens).toBe(256); // Minimum viable
      expect(result.reductionPercentage).toBe(0);
      expect(result.optimizationTechniques.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle unknown platform gracefully', () => {
      const assessment = performanceAnalyzer.assessContentQuality('test content', 'unknown' as unknown);

      expect(assessment.overallQuality).toBeGreaterThan(0);
      expect(assessment.improvementSuggestions.length).toBeGreaterThan(0);
    });

    it('should handle extreme cost scenarios', () => {
      // Simulate budget overflow
      for (let i = 0; i < 100; i++) {
        costTracker.trackRequest('TwitterAgent', 'twitter', 5000, 2000, '@cf/meta/llama-2-7b-chat-int8', 2000, true);
      }

      const alerts = costTracker.getActiveAlerts();
      const utilization = costTracker.getBudgetUtilization();

      expect(alerts.some(alert => alert.severity === 'critical')).toBe(true);
      expect(utilization.daily.percentage).toBeGreaterThan(90);
    });

    it('should handle performance degradation gracefully', async () => {
      const poorConfig: TestConfiguration = {
        ...TEST_CONFIG,
        qualityThreshold: 95, // Very high threshold
        timeLimit: 100        // Very short time limit
      };

      const result = await performanceAnalyzer.runPerformanceBenchmark(
        'TwitterAgent',
        'twitter',
        poorConfig,
        ['complex content requiring detailed analysis']
      );

      expect(result.metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.qualityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Load and Stress Testing', () => {
    it('should handle high-volume requests efficiently', () => {
      const startTime = Date.now();

      // Simulate 100 rapid requests
      for (let i = 0; i < 100; i++) {
        costTracker.trackRequest(`Agent${i % 5}`, 'twitter', 1000, 500, '@cf/meta/llama-2-7b-chat-int8', 600, true, 80);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should process quickly
      expect(costTracker.getCurrentMetrics().totalAPICalls).toBe(100);
    });

    it('should maintain performance under optimization load', () => {
      const startTime = Date.now();

      // Run 50 optimizations
      for (let i = 0; i < 50; i++) {
        tokenOptimizer.optimizeTokenUsage(
          `Content sample ${i} with varying complexity and requirements`,
          'twitter',
          OPTIMIZATION_CONFIG,
          1500 + (i * 10)
        );
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(2000); // Should be reasonably fast
    });

    it('should handle concurrent benchmarking', async () => {
      const contentSamples = Array.from({ length: 10 }, (_, i) => `Test content ${i}`);

      const benchmarkPromises = Array.from({ length: 5 }, (_, i) =>
        performanceAnalyzer.runPerformanceBenchmark(
          `Agent${i}`,
          'twitter',
          TEST_CONFIG,
          contentSamples.slice(i * 2, (i * 2) + 2)
        )
      );

      const results = await Promise.all(benchmarkPromises);

      expect(results.length).toBe(5);
      expect(results.every(result => result.metrics.responseTime > 0)).toBe(true);
    });
  });

  describe('Data Export and Reporting', () => {
    it('should export comprehensive cost data', () => {
      // Generate test data
      for (let i = 0; i < 10; i++) {
        costTracker.trackRequest('TwitterAgent', 'twitter', 1000, 500, '@cf/meta/llama-2-7b-chat-int8', 700, true, 80);
      }

      const exportData = costTracker.exportCostData();

      expect(exportData.summary).toBeDefined();
      expect(exportData.agentBreakdowns.length).toBeGreaterThan(0);
      expect(exportData.budgetUtilization).toBeDefined();
      expect(exportData.recommendations.length).toBeGreaterThan(0);
      expect(exportData.exportTimestamp).toBeInstanceOf(Date);
    });

    it('should export performance analytics', () => {
      // Generate test performance data
      performanceAnalyzer['storeBenchmarkResult']({
        agentName: 'TwitterAgent',
        platform: 'twitter',
        testType: 'post',
        metrics: {
          responseTime: 800,
          qualityScore: 85,
          viralPotential: 75,
          engagementPrediction: 80,
          costEfficiency: 90,
          tokenUtilization: 65,
          successRate: 95,
          accuracyScore: 88
        },
        timestamp: new Date(),
        testConfiguration: TEST_CONFIG,
        comparisonScore: 12.5
      });

      const exportData = performanceAnalyzer.exportPerformanceData('week');

      expect(exportData.summary).toBeDefined();
      expect(exportData.benchmarks.length).toBeGreaterThan(0);
      expect(exportData.trends).toBeDefined();
      expect(exportData.exportTimestamp).toBeInstanceOf(Date);
    });

    it('should provide optimization statistics', () => {
      // Generate optimization data
      for (let i = 0; i < 5; i++) {
        tokenOptimizer.recordOptimizationResult('twitter', 'post', 1500 - (i * 50), 85 + i, true, 88);
      }

      const stats = tokenOptimizer.getOptimizationStats();

      expect(stats.totalOptimizations).toBe(5);
      expect(stats.averageReduction).toBeGreaterThan(0);
      expect(stats.platformBreakdown.twitter).toBeDefined();
      expect(stats.platformBreakdown.twitter.optimizations).toBe(5);
    });
  });
});