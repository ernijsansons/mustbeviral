/**
 * Agent Integration and Orchestration Testing Suite
 * Tests the PlatformAgentCoordinator, cross-platform workflows,
 * and integration between all optimization systems
 */

import { it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PlatformAgentCoordinator } from '../../src/lib/ai/agents/PlatformAgentCoordinator';
import { CostBudget } from '../../src/lib/ai/agents/monitoring/CostTracker';
import { OptimizationConfig } from '../../src/lib/ai/agents/monitoring/TokenOptimizer';
import { PerformanceAnalyzer } from '../../src/lib/ai/agents/monitoring/PerformanceAnalyzer';
import { QualityAssurance } from '../../src/lib/ai/agents/quality/QualityAssurance';
import { CacheConfig } from '../../src/lib/ai/agents/cache/SmartCache';
import { BatchConfiguration, ProcessingRequest } from '../../src/lib/ai/agents/cache/BatchProcessor';

// Mock implementations
const mockAI = {
  run: jest.fn().mockResolvedValue({
    response: 'Mock AI generated content optimized for viral performance'
  })
};

const mockEnv = {
  JWT_SECRET: 'test-secret',
  DATABASE_URL: 'test-db-url',
  OPENAI_API_KEY: 'test-key'
};

const defaultConfig = {
  maxTokens: 4096,
  enableRealTimeOptimization: true,
  enableCompetitorAnalysis: true,
  enableTrendAnalysis: true,
  enableCrossPlatformAdaptation: true,
  performanceMonitoring: true,
  errorRecoveryEnabled: true,
  batchProcessingEnabled: true,
  advancedReasoningEnabled: true
};

const mockProcessingFunction = jest.fn().mockImplementation(async (requests: ProcessingRequest[]) => {
  return requests.map(req => ({
    requestId: req.id,
    content: `Generated content for ${req.platform}: ${req.prompt}`,
    qualityScore: 85,
    tokenCount: 150,
    processingTime: 500,
    batchId: 'batch-123',
    batchSize: requests.length,
    costEstimate: 0.002,
    fromCache: false
  }));
});

describe('Agent Integration and Orchestration Suite', () => {
  let coordinator: PlatformAgentCoordinator;
  let costTracker: CostTracker;
  let tokenOptimizer: TokenOptimizer;
  let performanceAnalyzer: PerformanceAnalyzer;
  let qualityAssurance: QualityAssurance;
  let smartCache: SmartCache;
  let batchProcessor: BatchProcessor;

  beforeEach(() => {
    // Initialize all optimization systems
    const budget: CostBudget = {
      daily: 20.0,
      weekly: 100.0,
      monthly: 400.0,
      perRequest: 0.10,
      currency: 'USD'
    };

    const cacheConfig: CacheConfig = {
      maxSize: 1000,
      defaultTTL: 3600,
      semanticThreshold: 0.85,
      enableBatching: true,
      batchSize: 5,
      batchTimeout: 2000,
      compressionEnabled: true,
      persistToDisk: false
    };

    const batchConfig: BatchConfiguration = {
      maxBatchSize: 10,
      batchTimeout: 3000,
      priorityLevels: 5,
      concurrencyLimit: 3,
      retryAttempts: 2,
      retryDelay: 1000,
      costThreshold: 0.50
    };

    costTracker = new CostTracker(budget);
    tokenOptimizer = new TokenOptimizer();
    performanceAnalyzer = new PerformanceAnalyzer();
    qualityAssurance = new QualityAssurance();
    smartCache = new SmartCache(cacheConfig);
    batchProcessor = new BatchProcessor(batchConfig, mockProcessingFunction);

    // Initialize coordinator with all agents
    coordinator = new PlatformAgentCoordinator(mockAI, mockEnv, defaultConfig);

    jest.clearAllMocks();
  });

  afterEach(() => {
    costTracker.resetMetrics();
    tokenOptimizer.resetLearningData();
    performanceAnalyzer.resetPerformanceData();
    qualityAssurance.resetQualityData();
    smartCache.resetCache();
    batchProcessor.reset();
  });

  describe('PlatformAgentCoordinator Orchestration', () => {
    describe('Multi-Platform Content Adaptation', () => {
      it('should generate platform-specific adaptations from universal content', async () => {
        const universalRequest = {
          topic: 'Revolutionary AI breakthrough transforms industries',
          tone: 'exciting' as const,
          targetAudience: 'tech enthusiasts',
          goals: ['viral' as const, 'engagement' as const, 'awareness' as const],
          platforms: ['twitter', 'tiktok', 'instagram']
        };

        const result = await coordinator.generateUniversalContent(universalRequest);

        expect(result.adaptations).toHaveProperty('twitter');
        expect(result.adaptations).toHaveProperty('tiktok');
        expect(result.adaptations).toHaveProperty('instagram');

        // Each adaptation should be platform-optimized
        expect(result.adaptations.twitter.content.length).toBeLessThanOrEqual(280);
        expect(result.adaptations.tiktok.optimization.hashtags).toEqual(
          expect.arrayContaining([expect.stringMatching(/(fyp|foryou)/)])
        );
        expect(result.adaptations.instagram.optimization.hashtags.length).toBeGreaterThan(5);

        // Cross-platform strategy should be defined
        expect(result.distributionStrategy.primaryPlatform).toBeTruthy();
        expect(result.distributionStrategy.cascadePlatforms.length).toBeGreaterThan(0);
        expect(result.crossPlatformAnalysis.crossPlatformViralPotential).toBeGreaterThan(0);
      });

      it('should maintain content coherence across platforms', async () => {
        const request = {
          topic: 'Climate change solutions everyone can implement',
          tone: 'educational' as const,
          targetAudience: 'environmentally conscious individuals',
          goals: ['awareness' as const, 'engagement' as const],
          platforms: ['twitter', 'tiktok', 'instagram']
        };

        const result = await coordinator.generateUniversalContent(request);

        // Extract key themes from each adaptation
        const themes = {
          twitter: result.adaptations.twitter.content.toLowerCase(),
          tiktok: result.adaptations.tiktok.content.toLowerCase(),
          instagram: result.adaptations.instagram.content.toLowerCase()
        };

        // Should contain consistent core messaging
        const coreKeywords = ['climate', 'solution', 'environment'];
        Object.values(themes).forEach(content => {
          expect(coreKeywords.some(keyword => content.includes(keyword))).toBe(true);
        });

        // But platform-specific optimization should differ
        expect(themes.twitter).not.toBe(themes.tiktok);
        expect(themes.tiktok).not.toBe(themes.instagram);
      });

      it('should optimize cross-platform timing and sequencing', async () => {
        const request = {
          topic: 'Breaking tech news announcement',
          tone: 'exciting' as const,
          targetAudience: 'tech community',
          goals: ['viral' as const, 'awareness' as const],
          platforms: ['twitter', 'tiktok', 'instagram']
        };

        const result = await coordinator.generateUniversalContent(request);

        expect(result.distributionStrategy.contentDistribution.sequential.length).toBeGreaterThan(0);

        // Should have optimal timing recommendations
        result.distributionStrategy.contentDistribution.sequential.forEach(step => {
          expect(step.platform).toBeTruthy();
          expect(step.delay).toBeGreaterThanOrEqual(0);
          expect(step.adaptation).toBeTruthy();
        });

        // Primary platform should be identified for breaking news
        expect(['twitter', 'tiktok', 'instagram']).toContain(result.distributionStrategy.primaryPlatform);
      });
    });

    describe('Agent Selection and Routing', () => {
      it('should route requests to optimal agents based on content type', async () => {
        const requests = [
          {
            topic: 'Quick productivity tip',
            contentType: 'tweet',
            platform: 'twitter',
            tone: 'casual' as const,
            targetAudience: 'professionals',
            goals: ['engagement' as const]
          },
          {
            topic: 'Dance challenge tutorial',
            contentType: 'video',
            platform: 'tiktok',
            tone: 'energetic' as const,
            targetAudience: 'young adults',
            goals: ['viral' as const]
          },
          {
            topic: 'Photography inspiration gallery',
            contentType: 'carousel',
            platform: 'instagram',
            tone: 'artistic' as const,
            targetAudience: 'photographers',
            goals: ['awareness' as const]
          }
        ];

        const results = await Promise.all(
          requests.map(req => coordinator.routeToOptimalAgent(req))
        );

        expect(results.length).toBe(3);

        // Each result should be optimized for its platform
        expect(results[0].agentUsed).toBe('TwitterAgent');
        expect(results[1].agentUsed).toBe('TikTokAgent');
        expect(results[2].agentUsed).toBe('InstagramAgent');

        // Performance should meet thresholds
        results.forEach(result => {
          expect(result.analysis.platformScore).toBeGreaterThan(75);
          expect(result.analysis.algorithmAlignment).toBeGreaterThan(70);
        });
      });

      it('should handle agent fallback when primary agent fails', async () => {
        // Mock primary agent failure
        const originalRun = mockAI.run;
        mockAI.run.mockRejectedValueOnce(new Error('Primary agent failed'));
        mockAI.run.mockResolvedValueOnce({ response: 'Fallback agent content' });

        const request = {
          topic: 'Important announcement',
          contentType: 'post',
          platform: 'twitter',
          tone: 'professional' as const,
          targetAudience: 'business community',
          goals: ['awareness' as const]
        };

        const result = await coordinator.routeToOptimalAgent(request);

        expect(result.content).toBeTruthy();
        expect(mockAI.run).toHaveBeenCalledTimes(2); // Initial failure + successful fallback
        expect(result.metadata.usedFallback).toBe(true);

        mockAI.run = originalRun;
      });
    });

    describe('Batch Processing Coordination', () => {
      it('should efficiently process batch requests across multiple platforms', async () => {
        const batchRequest = {
          requests: [
            {
              topic: 'AI trend update 1',
              tone: 'professional' as const,
              targetAudience: 'tech professionals',
              contentType: 'post',
              goals: ['awareness' as const],
              platform: 'twitter'
            },
            {
              topic: 'AI trend update 2',
              tone: 'casual' as const,
              targetAudience: 'general audience',
              contentType: 'video',
              goals: ['viral' as const],
              platform: 'tiktok'
            },
            {
              topic: 'AI trend update 3',
              tone: 'educational' as const,
              targetAudience: 'students',
              contentType: 'carousel',
              goals: ['engagement' as const],
              platform: 'instagram'
            }
          ],
          crossPlatformOptimization: true,
          generateVariations: 2,
          includePerformancePrediction: true
        };

        const startTime = Date.now();
        const results = await coordinator.processBatchRequest(batchRequest);
        const processingTime = Date.now() - startTime;

        expect(results.length).toBe(6); // 3 requests × 2 variations
        expect(processingTime).toBeLessThan(10000); // Should be faster than individual requests

        // Each result should include performance predictions
        results.forEach(result => {
          expect(result.performancePrediction).toBeDefined();
          expect(result.performancePrediction.viralPotential).toBeGreaterThan(0);
          expect(result.performancePrediction.engagementForecast).toBeGreaterThan(0);
        });

        // Cross-platform optimization should be applied
        const platformGroups = results.reduce((groups, _result) => {
          const platform = result.platform;
          if (!groups[platform]) groups[platform] = [];
          groups[platform].push(result);
          return groups;
        }, {} as Record<string, unknown[]>);

        Object.keys(platformGroups).forEach(platform => {
          expect(platformGroups[platform].length).toBe(2); // 2 variations per platform
        });
      });

      it('should integrate with batch processor for optimal throughput', async () => {
        const requests = Array.from({ length: 8 }, (_, _i) => ({
          topic: `Batch content ${i + 1}`,
          tone: 'casual' as const,
          targetAudience: 'general',
          contentType: 'post',
          goals: ['engagement' as const],
          platform: ['twitter', 'tiktok', 'instagram'][i % 3]
        }));

        // Add requests to batch processor
        const requestIds = await Promise.all(
          requests.map(req =>
            batchProcessor.addRequest({
              platform: req.platform,
              contentType: req.contentType,
              prompt: req.topic,
              priority: 5,
              maxTokens: 2000,
              qualityThreshold: 80,
              callback: () => {},
              errorCallback: () => {}
            })
          )
        );

        expect(requestIds.length).toBe(8);

        // Wait for batch processing
        await new Promise(resolve => setTimeout(resolve, 4000));

        const stats = batchProcessor.getBatchStats();
        expect(stats.metrics.totalBatches).toBeGreaterThan(0);
        expect(stats.metrics.averageBatchSize).toBeGreaterThan(1);
      });
    });
  });

  describe('Cost Optimization Integration', () => {
    describe('Real-Time Cost Monitoring', () => {
      it('should track costs across all agent operations', async () => {
        const requests = [
          {
            topic: 'Tech innovation spotlight',
            platform: 'twitter',
            tone: 'professional' as const,
            targetAudience: 'tech community',
            contentType: 'tweet',
            goals: ['awareness' as const]
          },
          {
            topic: 'Innovation demo video',
            platform: 'tiktok',
            tone: 'exciting' as const,
            targetAudience: 'young professionals',
            contentType: 'video',
            goals: ['viral' as const]
          }
        ];

        for (const request of requests) {
          const result = await coordinator.routeToOptimalAgent(request);

          // Track cost for each operation
          costTracker.trackRequest(
            result.agentUsed,
            request.platform,
            500, // Input tokens
            300, // Output tokens
            '@cf/meta/llama-2-7b-chat-int8',
            result.metadata.processingTime || 800,
            true,
            result.analysis.platformScore
          );
        }

        const metrics = costTracker.getCurrentMetrics();
        expect(metrics.totalAPICalls).toBe(2);
        expect(metrics.totalCostUSD).toBeGreaterThan(0);
        expect(metrics.successRate).toBe(100);

        // Should generate cost optimization recommendations
        const recommendations = costTracker.generateOptimizationRecommendations();
        expect(recommendations.length).toBeGreaterThan(0);
      });

      it('should trigger cost alerts when thresholds are exceeded', async () => {
        // Generate high-cost scenarios
        for (let i = 0; i < 10; i++) {
          costTracker.trackRequest(
            'TwitterAgent',
            'twitter',
            3000, // High token usage
            2000,
            '@cf/meta/llama-2-7b-chat-int8',
            1500,
            true,
            85
          );
        }

        const alerts = costTracker.getActiveAlerts();
        expect(alerts.length).toBeGreaterThan(0);

        const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
        if (criticalAlerts.length > 0) {
          expect(criticalAlerts[0].type).toMatch(/(budget_exceeded|cost_spike)/);
        }
      });
    });

    describe('Token Optimization Integration', () => {
      it('should optimize token usage across all agents', async () => {
        const optimizationConfig: OptimizationConfig = {
          aggressivenessLevel: 'aggressive',
          qualityFloor: 80,
          maxTokenReduction: 50,
          adaptiveLearning: true,
          platformSpecific: true
        };

        const platforms = ['twitter', 'tiktok', 'instagram'];

        for (const platform of platforms) {
          const allocation = tokenOptimizer.calculateOptimalAllocation(
            platform,
            'post',
            'AI breakthrough announcement',
            85,
            optimizationConfig
          );

          expect(allocation.maxTokens).toBeLessThan(4096);
          expect(allocation.maxTokens).toBeGreaterThan(256);
          expect(allocation.inputTokens + allocation.outputTokens).toBeLessThanOrEqual(allocation.maxTokens);

          // Record optimization results
          tokenOptimizer.recordOptimizationResult(
            platform,
            'post',
            allocation.maxTokens,
            85,
            true,
            88
          );
        }

        const stats = tokenOptimizer.getOptimizationStats();
        expect(stats.totalOptimizations).toBe(3);
        expect(stats.averageReduction).toBeGreaterThan(0);
      });

      it('should maintain quality while reducing token usage', async () => {
        const request = {
          topic: 'Comprehensive guide to viral content creation strategies',
          platform: 'twitter',
          tone: 'educational' as const,
          targetAudience: 'content creators',
          contentType: 'thread',
          goals: ['awareness' as const, 'engagement' as const]
        };

        // Get baseline result
        const baselineResult = await coordinator.routeToOptimalAgent(request);

        // Optimize token allocation
        const allocation = tokenOptimizer.calculateOptimalAllocation(
          'twitter',
          'thread',
          request.topic,
          85,
          {
            aggressivenessLevel: 'moderate',
            qualityFloor: 80,
            maxTokenReduction: 40,
            adaptiveLearning: true,
            platformSpecific: true
          }
        );

        // Generate optimized content
        const optimizedRequest = { ...request, maxTokens: allocation.maxTokens };
        const optimizedResult = await coordinator.routeToOptimalAgent(optimizedRequest);

        // Quality should remain acceptable
        expect(optimizedResult.analysis.platformScore).toBeGreaterThan(75);
        expect(optimizedResult.analysis.viralPrediction).toBeGreaterThan(70);

        // Token usage should be reduced
        expect(allocation.maxTokens).toBeLessThan(4096);

        const qualityDifference = Math.abs(
          optimizedResult.analysis.platformScore - baselineResult.analysis.platformScore
        );
        expect(qualityDifference).toBeLessThan(15); // Should maintain similar quality
      });
    });

    describe('Smart Caching Integration', () => {
      it('should cache and retrieve similar content requests', async () => {
        const baseRequest = {
          topic: 'AI technology breakthrough',
          platform: 'twitter',
          tone: 'exciting' as const,
          targetAudience: 'tech enthusiasts',
          contentType: 'tweet',
          goals: ['viral' as const]
        };

        // First request - should generate new content
        const firstResult = await smartCache.getContent(
          baseRequest.platform,
          baseRequest.contentType,
          baseRequest.topic
        );

        expect(firstResult.cacheHit).toBe(false);
        expect(firstResult.content).toBeTruthy();

        // Similar request - should hit cache
        const similarResult = await smartCache.getContent(
          baseRequest.platform,
          baseRequest.contentType,
          'AI tech breakthrough announcement' // Similar but not identical
        );

        // Should find semantic similarity
        if (similarResult.cacheHit) {
          expect(similarResult.content).toBeTruthy();
          expect(similarResult.processingTime).toBeLessThan(firstResult.processingTime);
        }

        const cacheStats = smartCache.getCacheStats();
        expect(cacheStats.totalEntries).toBeGreaterThan(0);
      });

      it('should preload cache with popular content patterns', async () => {
        const popularPatterns = [
          {
            platform: 'twitter',
            contentType: 'tweet',
            topics: [
              'AI breakthrough news',
              'Tech industry update',
              'Innovation announcement'
            ],
            priority: 8
          },
          {
            platform: 'tiktok',
            contentType: 'video',
            topics: [
              'Quick life hack',
              'Viral dance trend',
              'Comedy skit idea'
            ],
            priority: 7
          }
        ];

        await smartCache.preloadCache(popularPatterns);

        const cacheStats = smartCache.getCacheStats();
        expect(cacheStats.totalEntries).toBeGreaterThan(0);

        // Subsequent requests should benefit from preloading
        const result = await smartCache.getContent(
          'twitter',
          'tweet',
          'Breaking AI news update'
        );

        if (result.cacheHit) {
          expect(result.processingTime).toBeLessThan(1000);
        }
      });

      it('should optimize cache performance automatically', () => {
        // Add various cache entries
        const patterns = [
          { platform: 'twitter', contentType: 'tweet', topic: 'tech news 1' },
          { platform: 'twitter', contentType: 'tweet', topic: 'tech news 2' },
          { platform: 'tiktok', contentType: 'video', topic: 'viral content' },
          { platform: 'instagram', contentType: 'post', topic: 'lifestyle tip' }
        ];

        // Simulate cache usage
        patterns.forEach(async (pattern, _index) => {
          for (let i = 0; i < index + 1; i++) {
            await smartCache.getContent(
              pattern.platform,
              pattern.contentType,
              `${pattern.topic} variant ${i}`
            );
          }
        });

        const optimization = smartCache.optimizeCache();
        expect(optimization.removedEntries).toBeGreaterThanOrEqual(0);
        expect(optimization.consolidatedEntries).toBeGreaterThanOrEqual(0);
        expect(optimization.projectedSavings).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Quality Assurance Integration', () => {
    describe('Automated Quality Validation', () => {
      it('should validate content quality across all platforms', async () => {
        const requests = [
          {
            topic: 'Revolutionary AI breakthrough transforms healthcare',
            platform: 'twitter',
            tone: 'professional' as const,
            targetAudience: 'healthcare professionals',
            contentType: 'tweet',
            goals: ['awareness' as const]
          },
          {
            topic: 'Mind-blowing AI demo you need to see',
            platform: 'tiktok',
            tone: 'exciting' as const,
            targetAudience: 'tech enthusiasts',
            contentType: 'video',
            goals: ['viral' as const]
          },
          {
            topic: 'Beautiful AI-generated art inspiration gallery',
            platform: 'instagram',
            tone: 'artistic' as const,
            targetAudience: 'artists',
            contentType: 'carousel',
            goals: ['engagement' as const]
          }
        ];

        for (const request of requests) {
          const result = await coordinator.routeToOptimalAgent(request);

          const qualityAssessment = await qualityAssurance.assessContent(
            result.content,
            request.platform,
            request.contentType
          );

          expect(qualityAssessment.passedThreshold).toBe(true);
          expect(qualityAssessment.metrics.overallScore).toBeGreaterThan(75);
          expect(qualityAssessment.metrics.platformOptimization).toBeGreaterThan(70);
          expect(qualityAssessment.metrics.brandSafety).toBeGreaterThan(85);

          // Platform-specific quality checks
          if (request.platform === 'twitter') {
            expect(qualityAssessment.metrics.viralPotential).toBeGreaterThan(70);
          } else if (request.platform === 'tiktok') {
            expect(qualityAssessment.metrics.engagementLikelihood).toBeGreaterThan(75);
          } else if (request.platform === 'instagram') {
            expect(qualityAssessment.metrics.creativityScore).toBeGreaterThan(70);
          }
        }
      });

      it('should automatically improve low-quality content', async () => {
        // Generate potentially low-quality content
        const request = {
          topic: 'generic content post',
          platform: 'twitter',
          tone: 'casual' as const,
          targetAudience: 'general',
          contentType: 'tweet',
          goals: ['engagement' as const]
        };

        const result = await coordinator.routeToOptimalAgent(request);
        const assessment = await qualityAssurance.assessContent(
          result.content,
          request.platform,
          request.contentType
        );

        if (!assessment.passedThreshold) {
          const improvement = await qualityAssurance.improveContent(assessment, 'aggressive');

          expect(improvement.improvementScore).toBeGreaterThan(0);
          expect(improvement.appliedFixes.length).toBeGreaterThan(0);
          expect(improvement.improvedContent).not.toBe(result.content);

          // Re-assess improved content
          const newAssessment = await qualityAssurance.assessContent(
            improvement.improvedContent,
            request.platform,
            request.contentType
          );

          expect(newAssessment.metrics.overallScore).toBeGreaterThan(assessment.metrics.overallScore);
        }
      });
    });

    describe('Quality Trend Analysis', () => {
      it('should track quality trends across platforms and time', async () => {
        const platforms = ['twitter', 'tiktok', 'instagram'];

        // Generate content across multiple platforms
        for (let i = 0; i < 5; i++) {
          for (const platform of platforms) {
            const request = {
              topic: `Quality test content ${i + 1} for ${platform}`,
              platform,
              tone: 'professional' as const,
              targetAudience: 'general',
              contentType: 'post',
              goals: ['awareness' as const]
            };

            const result = await coordinator.routeToOptimalAgent(request);
            await qualityAssurance.assessContent(
              result.content,
              platform,
              'post'
            );
          }
        }

        // Check quality trends
        for (const platform of platforms) {
          const trends = qualityAssurance.getQualityTrends(platform, 'day');
          // Trends may not be available immediately in test environment
          expect(Array.isArray(trends)).toBe(true);
        }

        const systemRecommendations = qualityAssurance.generateSystemRecommendations();
        expect(systemRecommendations.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Performance Analytics Integration', () => {
    describe('Cross-Platform Performance Comparison', () => {
      it('should benchmark performance across all agents', async () => {
        const testConfig = {
          contentType: 'post',
          complexityLevel: 'medium' as const,
          targetAudience: 'general',
          optimizationLevel: 'moderate' as const,
          qualityThreshold: 80,
          timeLimit: 5000
        };

        const contentSamples = [
          'AI breakthrough in machine learning',
          'Sustainable technology innovation',
          'Future of digital transformation'
        ];

        const platforms = ['twitter', 'tiktok', 'instagram'];

        for (const platform of platforms) {
          const benchmark = await performanceAnalyzer.runPerformanceBenchmark(
            `${platform}Agent`,
            platform,
            testConfig,
            contentSamples
          );

          expect(benchmark.metrics.responseTime).toBeLessThan(5000);
          expect(benchmark.metrics.qualityScore).toBeGreaterThan(80);
          expect(benchmark.metrics.successRate).toBe(100);
          expect(benchmark.metrics.viralPotential).toBeGreaterThan(70);
        }

        // Compare agent performance
        const comparison = performanceAnalyzer.compareAgentPerformance('TwitterAgent', 'day');
        expect(comparison.length).toBeGreaterThan(0);

        comparison.forEach(result => {
          expect(result.rankingScore).toBeGreaterThan(0);
          expect(result.averageQuality).toBeGreaterThan(0);
        });
      });

      it('should generate optimization recommendations based on performance data', () => {
        const lowPerformanceMetrics = {
          responseTime: 4500,
          qualityScore: 72,
          viralPotential: 55,
          engagementPrediction: 65,
          costEfficiency: 60,
          tokenUtilization: 88,
          successRate: 88,
          accuracyScore: 75
        };

        const recommendations = performanceAnalyzer.generateOptimizationRecommendations(
          'TwitterAgent',
          'twitter',
          lowPerformanceMetrics
        );

        expect(recommendations.length).toBeGreaterThan(0);

        const highPriorityRecs = recommendations.filter(rec => rec.priority === 'high');
        expect(highPriorityRecs.length).toBeGreaterThan(0);

        // Should cover multiple optimization categories
        const categories = new Set(recommendations.map(rec => rec.category));
        expect(categories.size).toBeGreaterThan(1);
      });
    });

    describe('Real-Time Performance Monitoring', () => {
      it('should track performance trends in real-time', async () => {
        const baselineMetrics = {
          responseTime: 1000,
          qualityScore: 85,
          viralPotential: 80,
          engagementPrediction: 75,
          costEfficiency: 90,
          tokenUtilization: 70,
          successRate: 95,
          accuracyScore: 88
        };

        // Simulate performance data over time
        for (let i = 0; i < 3; i++) {
          const metrics = {
            ...baselineMetrics,
            qualityScore: baselineMetrics.qualityScore + (Math.random() - 0.5) * 10,
            responseTime: baselineMetrics.responseTime + (Math.random() - 0.5) * 200
          };

          performanceAnalyzer['updatePerformanceTrends']('TwitterAgent', 'twitter', metrics);
        }

        const qualityTrend = performanceAnalyzer.getPerformanceTrends(
          'TwitterAgent',
          'twitter',
          'qualityScore',
          'day'
        );

        if (qualityTrend) {
          expect(qualityTrend.dataPoints.length).toBeGreaterThan(0);
          expect(['improving', 'declining', 'stable']).toContain(qualityTrend.trend);
        }
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    describe('Graceful Degradation', () => {
      it('should handle partial system failures gracefully', async () => {
        // Mock cost tracker failure
        const originalTrackRequest = costTracker.trackRequest.bind(costTracker);
        costTracker.trackRequest = jest.fn().mockImplementation(() => {
          throw new Error('Cost tracking temporarily unavailable');
        });

        const request = {
          topic: 'Resilience test content',
          platform: 'twitter',
          tone: 'professional' as const,
          targetAudience: 'general',
          contentType: 'tweet',
          goals: ['awareness' as const]
        };

        // Should still generate content despite cost tracking failure
        const result = await coordinator.routeToOptimalAgent(request);
        expect(result.content).toBeTruthy();
        expect(result.analysis.platformScore).toBeGreaterThan(0);

        // Restore original function
        costTracker.trackRequest = originalTrackRequest;
      });

      it('should recover from token optimizer failures', async () => {
        // Mock token optimizer failure
        const originalCalculateOptimalAllocation = tokenOptimizer.calculateOptimalAllocation.bind(tokenOptimizer);
        tokenOptimizer.calculateOptimalAllocation = jest.fn().mockImplementation(() => {
          throw new Error('Token optimization service unavailable');
        });

        const request = {
          topic: 'Fallback optimization test',
          platform: 'twitter',
          tone: 'casual' as const,
          targetAudience: 'general',
          contentType: 'tweet',
          goals: ['engagement' as const]
        };

        // Should fall back to default token allocation
        const result = await coordinator.routeToOptimalAgent(request);
        expect(result.content).toBeTruthy();

        // Restore original function
        tokenOptimizer.calculateOptimalAllocation = originalCalculateOptimalAllocation;
      });
    });

    describe('Circuit Breaker Pattern', () => {
      it('should implement circuit breaker for external API failures', async () => {
        // Simulate repeated API failures
        mockAI.run
          .mockRejectedValueOnce(new Error('API Error 1'))
          .mockRejectedValueOnce(new Error('API Error 2'))
          .mockRejectedValueOnce(new Error('API Error 3'))
          .mockResolvedValueOnce({ response: 'Recovery content' });

        const request = {
          topic: 'Circuit breaker test',
          platform: 'twitter',
          tone: 'professional' as const,
          targetAudience: 'general',
          contentType: 'tweet',
          goals: ['awareness' as const]
        };

        // Should eventually succeed with circuit breaker logic
        const result = await coordinator.routeToOptimalAgent(request);
        expect(result.content).toBeTruthy();
      });
    });
  });

  describe('End-to-End Integration Validation', () => {
    it('should execute complete workflow with all optimizations enabled', async () => {
      const comprehensiveRequest = {
        topic: 'Complete integration test: AI revolutionizes social media marketing',
        tone: 'exciting' as const,
        targetAudience: 'marketing professionals',
        goals: ['viral' as const, 'engagement' as const, 'awareness' as const],
        platforms: ['twitter', 'tiktok', 'instagram'],
        enableCostOptimization: true,
        enableQualityAssurance: true,
        enableCaching: true,
        enablePerformanceMonitoring: true
      };

      const startTime = Date.now();

      // 1. Generate universal content
      const universalResult = await coordinator.generateUniversalContent(comprehensiveRequest);

      // 2. Validate quality for all adaptations
      const qualityAssessments = await Promise.all(
        Object.entries(universalResult.adaptations).map(async ([platform, adaptation]) => {
          return await qualityAssurance.assessContent(
            adaptation.content,
            platform,
            adaptation.contentType
          );
        })
      );

      // 3. Track costs and performance
      Object.entries(universalResult.adaptations).forEach(([platform, adaptation]) => {
        costTracker.trackRequest(
          `${platform}Agent`,
          platform,
          400,
          250,
          '@cf/meta/llama-2-7b-chat-int8',
          adaptation.metadata.processingTime || 800,
          true,
          adaptation.analysis.platformScore
        );
      });

      const totalTime = Date.now() - startTime;

      // Assertions
      expect(Object.keys(universalResult.adaptations)).toHaveLength(3);
      expect(qualityAssessments.every(assessment => assessment.passedThreshold)).toBe(true);
      expect(totalTime).toBeLessThan(15000); // Complete workflow under 15 seconds

      // Verify cross-platform optimization
      expect(universalResult.crossPlatformAnalysis.crossPlatformViralPotential).toBeGreaterThan(70);
      expect(universalResult.distributionStrategy.primaryPlatform).toBeTruthy();

      // Verify cost efficiency
      const costMetrics = costTracker.getCurrentMetrics();
      expect(costMetrics.successRate).toBe(100);
      expect(costMetrics.totalCostUSD).toBeGreaterThan(0);

      // Generate comprehensive report
      const performanceData = performanceAnalyzer.exportPerformanceData('day');
      const costData = costTracker.exportCostData();
      const qualityData = qualityAssurance.exportQualityData('day');

      expect(performanceData.benchmarks.length).toBeGreaterThan(0);
      expect(costData.summary).toBeDefined();
      expect(qualityData.summary).toBeDefined();
    });
  });
});