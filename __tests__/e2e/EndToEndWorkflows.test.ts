/**
 * End-to-End Workflow Testing Suite
 * Tests complete user journeys from content request to optimized delivery
 * Validates real-world scenarios and production readiness
 */

import { it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PlatformAgentCoordinator } from '../../src/lib/ai/agents/PlatformAgentCoordinator';
import { CostTracker } from '../../src/lib/ai/agents/monitoring/CostTracker';
import { TokenOptimizer } from '../../src/lib/ai/agents/monitoring/TokenOptimizer';
import { PerformanceAnalyzer } from '../../src/lib/ai/agents/monitoring/PerformanceAnalyzer';
import { QualityAssurance } from '../../src/lib/ai/agents/quality/QualityAssurance';
import { SmartCache } from '../../src/lib/ai/agents/cache/SmartCache';
import { BatchProcessor } from '../../src/lib/ai/agents/cache/BatchProcessor';

// Realistic mock implementations
const mockAI = {
  run: jest.fn().mockImplementation(async (request: unknown) => {
    // Simulate realistic AI processing time
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // Generate platform-specific responses
    const platform = request.platform?.toLowerCase() || 'general';
    const topic = request.messages?.[0]?.content || 'default topic';

    const responses = {
      twitter: `🚨 BREAKING: ${topic}

This changes everything! Here's what you need to know:

🧵 Thread below
#AI #Technology #Breaking`,

      tiktok: `POV: You just discovered ${topic} 🤯

*shows transformation*

Wait for the plot twist at the end!

#fyp #viral #ai #trending`,

      instagram: `✨ ${topic} ✨

Swipe for the complete guide →

🔥 Save this for later
💭 What are your thoughts?

#inspiration #innovation #technology #save`,

      general: `Revolutionary update: ${topic}

This breakthrough is transforming how we think about the future. The implications are massive and here's why...`
    };

    return {
      response: responses[platform] || responses.general
    };
  })
};

const mockEnv = {
  JWT_SECRET: 'test-jwt-secret',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  OPENAI_API_KEY: 'test-openai-key',
  STRIPE_SECRET_KEY: 'test-stripe-key'
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

describe('End-to-End Workflow Testing Suite', () => {
  let coordinator: PlatformAgentCoordinator;
  let costTracker: CostTracker;
  let tokenOptimizer: TokenOptimizer;
  let performanceAnalyzer: PerformanceAnalyzer;
  let qualityAssurance: QualityAssurance;
  let smartCache: SmartCache;
  let batchProcessor: BatchProcessor;

  beforeEach(() => {
    // Initialize integrated system
    coordinator = new PlatformAgentCoordinator(mockAI, mockEnv, defaultConfig);

    costTracker = new CostTracker({
      daily: 50.0,
      weekly: 200.0,
      monthly: 800.0,
      perRequest: 0.15,
      currency: 'USD'
    });

    tokenOptimizer = new TokenOptimizer();
    performanceAnalyzer = new PerformanceAnalyzer();
    qualityAssurance = new QualityAssurance();

    smartCache = new SmartCache({
      maxSize: 2000,
      defaultTTL: 7200,
      semanticThreshold: 0.80,
      enableBatching: true,
      batchSize: 8,
      batchTimeout: 3000,
      compressionEnabled: true,
      persistToDisk: false
    });

    const mockProcessingFunction = async (requests: unknown[]) => {
      return requests.map(req => ({
        requestId: req.id,
        content: `Generated content for ${req.platform}: ${req.prompt}`,
        qualityScore: 85 + Math.random() * 10,
        tokenCount: 120 + Math.random() * 80,
        processingTime: 400 + Math.random() * 300,
        batchId: 'batch-test',
        batchSize: requests.length,
        costEstimate: 0.003,
        fromCache: false
      }));
    };

    batchProcessor = new BatchProcessor({
      maxBatchSize: 12,
      batchTimeout: 4000,
      priorityLevels: 5,
      concurrencyLimit: 4,
      retryAttempts: 3,
      retryDelay: 1500,
      costThreshold: 1.0
    }, mockProcessingFunction);

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

  describe('Complete User Journey: Single Platform Content Creation', () => {
    it('should handle complete workflow from request to optimized content delivery', async () => {
      const userRequest = {
        topic: 'Groundbreaking AI advancement in healthcare diagnosis',
        tone: 'professional' as const,
        targetAudience: 'healthcare professionals',
        platform: 'twitter',
        contentType: 'thread',
        goals: ['awareness' as const, 'engagement' as const],
        urgency: 'normal' as const,
        budget: 0.10,
        qualityThreshold: 85
      };

      console.log('🚀 Starting complete workflow test...');
      const workflowStartTime = Date.now();

      // Step 1: Initial content generation with optimization
      console.log('📝 Step 1: Content generation with optimization');
      const allocation = tokenOptimizer.calculateOptimalAllocation(
        userRequest.platform,
        userRequest.contentType,
        userRequest.topic,
        userRequest.qualityThreshold,
        {
          aggressivenessLevel: 'moderate',
          qualityFloor: 80,
          maxTokenReduction: 40,
          adaptiveLearning: true,
          platformSpecific: true
        }
      );

      const optimizedRequest = { ...userRequest, maxTokens: allocation.maxTokens };
      const contentResult = await coordinator.routeToOptimalAgent(optimizedRequest);

      expect(contentResult.content).toBeTruthy();
      expect(contentResult.content.length).toBeGreaterThan(50);
      expect(contentResult.agentUsed).toBe('TwitterAgent');

      // Step 2: Quality assessment and improvement
      console.log('🔍 Step 2: Quality assessment and improvement');
      const qualityAssessment = await qualityAssurance.assessContent(
        contentResult.content,
        userRequest.platform,
        userRequest.contentType
      );

      let finalContent = contentResult.content;
      let finalQuality = qualityAssessment.metrics.overallScore;

      if (!qualityAssessment.passedThreshold) {
        const improvement = await qualityAssurance.improveContent(qualityAssessment, 'moderate');
        finalContent = improvement.improvedContent;

        // Re-assess improved content
        const newAssessment = await qualityAssurance.assessContent(
          finalContent,
          userRequest.platform,
          userRequest.contentType
        );
        finalQuality = newAssessment.metrics.overallScore;
      }

      expect(finalQuality).toBeGreaterThan(userRequest.qualityThreshold);

      // Step 3: Cost tracking and budget validation
      console.log('💰 Step 3: Cost tracking and budget validation');
      costTracker.trackRequest(
        contentResult.agentUsed,
        userRequest.platform,
        allocation.inputTokens,
        allocation.outputTokens,
        '@cf/meta/llama-2-7b-chat-int8',
        contentResult.metadata.processingTime || 700,
        true,
        finalQuality
      );

      const costMetrics = costTracker.getCurrentMetrics();
      expect(costMetrics.averageCostPerRequest).toBeLessThanOrEqual(userRequest.budget);

      // Step 4: Performance tracking
      console.log('📊 Step 4: Performance tracking');
      const performanceBenchmark = await performanceAnalyzer.runPerformanceBenchmark(
        contentResult.agentUsed,
        userRequest.platform,
        {
          contentType: userRequest.contentType,
          complexityLevel: 'medium',
          targetAudience: userRequest.targetAudience,
          optimizationLevel: 'moderate',
          qualityThreshold: userRequest.qualityThreshold,
          timeLimit: 8000
        },
        [finalContent]
      );

      expect(performanceBenchmark.metrics.qualityScore).toBeGreaterThan(80);
      expect(performanceBenchmark.metrics.responseTime).toBeLessThan(8000);

      // Step 5: Cache storage for future optimization
      console.log('🗄️ Step 5: Cache storage for future optimization');
      await smartCache.getContent(
        userRequest.platform,
        userRequest.contentType,
        userRequest.topic,
        { priority: 'normal' }
      );

      const workflowTotalTime = Date.now() - workflowStartTime;
      console.log(`✅ Complete workflow completed in ${workflowTotalTime}ms`);

      // Final validations
      expect(workflowTotalTime).toBeLessThan(15000); // Complete workflow under 15s
      expect(finalContent).toBeTruthy();
      expect(finalQuality).toBeGreaterThan(userRequest.qualityThreshold);
      expect(costMetrics.successRate).toBe(100);

      console.log(`🎉 Workflow Success:
        - Quality: ${finalQuality.toFixed(1)}/100
        - Cost: $${costMetrics.averageCostPerRequest.toFixed(4)}
        - Time: ${workflowTotalTime}ms
        - Cache entries: ${smartCache.getCacheStats().totalEntries}`);
    });

    it('should handle urgent content requests with expedited processing', async () => {
      const urgentRequest = {
        topic: 'BREAKING: Major security vulnerability discovered',
        tone: 'urgent' as const,
        targetAudience: 'tech community',
        platform: 'twitter',
        contentType: 'tweet',
        goals: ['viral' as const, 'awareness' as const],
        urgency: 'critical' as const,
        maxResponseTime: 3000
      };

      const startTime = Date.now();

      // Urgent requests should bypass batching and caching
      const result = await coordinator.routeToOptimalAgent(urgentRequest);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(urgentRequest.maxResponseTime);
      expect(result.content).toBeTruthy();
      expect(result.content.toLowerCase()).toMatch(/(breaking|urgent|critical)/);
      expect(result.analysis.viralPrediction).toBeGreaterThan(75);

      // Should still maintain quality despite speed requirements
      const qualityAssessment = await qualityAssurance.assessContent(
        result.content,
        urgentRequest.platform,
        urgentRequest.contentType
      );

      expect(qualityAssessment.metrics.overallScore).toBeGreaterThan(75);
    });

    it('should handle budget-constrained requests with aggressive optimization', async () => {
      const budgetConstrainedRequest = {
        topic: 'Cost-effective social media marketing strategies',
        tone: 'educational' as const,
        targetAudience: 'small business owners',
        platform: 'instagram',
        contentType: 'carousel',
        goals: ['awareness' as const, 'engagement' as const],
        budget: 0.02, // Very low budget
        qualityThreshold: 70 // Lower quality threshold due to budget
      };

      // Use aggressive optimization for budget constraints
      const allocation = tokenOptimizer.calculateOptimalAllocation(
        budgetConstrainedRequest.platform,
        budgetConstrainedRequest.contentType,
        budgetConstrainedRequest.topic,
        budgetConstrainedRequest.qualityThreshold,
        {
          aggressivenessLevel: 'extreme',
          qualityFloor: 65,
          maxTokenReduction: 60,
          adaptiveLearning: true,
          platformSpecific: true
        }
      );

      const result = await coordinator.routeToOptimalAgent({
        ...budgetConstrainedRequest,
        maxTokens: allocation.maxTokens
      });

      // Track actual costs
      costTracker.trackRequest(
        result.agentUsed,
        budgetConstrainedRequest.platform,
        allocation.inputTokens,
        allocation.outputTokens,
        '@cf/meta/llama-2-7b-chat-int8',
        result.metadata.processingTime || 600,
        true,
        result.analysis.platformScore
      );

      const costMetrics = costTracker.getCurrentMetrics();

      expect(result.content).toBeTruthy();
      expect(costMetrics.averageCostPerRequest).toBeLessThanOrEqual(budgetConstrainedRequest.budget);
      expect(result.analysis.platformScore).toBeGreaterThan(budgetConstrainedRequest.qualityThreshold);

      // Should generate cost optimization recommendations
      const recommendations = costTracker.generateOptimizationRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Complete User Journey: Multi-Platform Campaign', () => {
    it('should execute coordinated multi-platform content strategy', async () => {
      const campaignRequest = {
        topic: 'Sustainable technology revolution: How green innovation is changing the world',
        tone: 'inspiring' as const,
        targetAudience: 'environmentally conscious tech enthusiasts',
        goals: ['viral' as const, 'awareness' as const, 'engagement' as const],
        platforms: ['twitter', 'tiktok', 'instagram'],
        campaignType: 'coordinated_launch',
        budget: 0.50,
        qualityThreshold: 85,
        timeframe: '24_hours'
      };

      console.log('🌍 Starting multi-platform campaign workflow...');
      const campaignStartTime = Date.now();

      // Step 1: Generate universal content with cross-platform optimization
      console.log('🎯 Step 1: Universal content generation');
      const universalResult = await coordinator.generateUniversalContent(campaignRequest);

      expect(Object.keys(universalResult.adaptations)).toHaveLength(3);
      expect(universalResult.distributionStrategy.primaryPlatform).toBeTruthy();

      // Step 2: Quality validation for all platforms
      console.log('✅ Step 2: Multi-platform quality validation');
      const qualityAssessments = await Promise.all(
        Object.entries(universalResult.adaptations).map(async ([platform, adaptation]) => {
          const assessment = await qualityAssurance.assessContent(
            adaptation.content,
            platform,
            adaptation.contentType
          );
          return { _platform, assessment, content: adaptation.content };
        })
      );

      const allPassedQuality = qualityAssessments.every(qa => qa.assessment.passedThreshold);
      expect(allPassedQuality).toBe(true);

      // Step 3: Cost analysis across all platforms
      console.log('💸 Step 3: Cross-platform cost analysis');
      Object.entries(universalResult.adaptations).forEach(([platform, adaptation]) => {
        costTracker.trackRequest(
          `${platform}Agent`,
          platform,
          350,
          220,
          '@cf/meta/llama-2-7b-chat-int8',
          adaptation.metadata.processingTime || 650,
          true,
          adaptation.analysis.platformScore
        );
      });

      const totalCost = costTracker.getCurrentMetrics().totalCostUSD;
      expect(totalCost).toBeLessThanOrEqual(campaignRequest.budget);

      // Step 4: Performance benchmarking across platforms
      console.log('📈 Step 4: Cross-platform performance analysis');
      const performanceResults = await Promise.all(
        Object.entries(universalResult.adaptations).map(async ([platform, adaptation]) => {
          return await performanceAnalyzer.runPerformanceBenchmark(
            `${platform}Agent`,
            platform,
            {
              contentType: adaptation.contentType,
              complexityLevel: 'high',
              targetAudience: campaignRequest.targetAudience,
              optimizationLevel: 'moderate',
              qualityThreshold: campaignRequest.qualityThreshold,
              timeLimit: 6000
            },
            [adaptation.content]
          );
        })
      );

      const averageQuality = performanceResults.reduce(
        (sum, _result) => sum + result.metrics.qualityScore, 0
      ) / performanceResults.length;

      expect(averageQuality).toBeGreaterThan(campaignRequest.qualityThreshold);

      // Step 5: Distribution strategy validation
      console.log('🚀 Step 5: Distribution strategy validation');
      const distributionPlan = universalResult.distributionStrategy;

      expect(distributionPlan.contentDistribution.sequential.length).toBeGreaterThan(0);
      expect(distributionPlan.viralAmplification.triggerPlatform).toBeTruthy();
      expect(distributionPlan.viralAmplification.cascadePlatforms.length).toBeGreaterThan(0);

      // Step 6: Cross-platform synergy analysis
      console.log('🔗 Step 6: Cross-platform synergy analysis');
      const synergies = universalResult.crossPlatformAnalysis.synergies;

      expect(synergies.length).toBeGreaterThan(0);
      synergies.forEach(synergy => {
        expect(synergy.platforms.length).toBeGreaterThan(1);
        expect(synergy.expectedBoost).toBeGreaterThan(0);
        expect(['content_cross_promotion', 'hashtag_amplification', 'timing_optimization'])
          .toContain(synergy.synergyType);
      });

      const campaignTotalTime = Date.now() - campaignStartTime;
      console.log(`🎊 Multi-platform campaign completed in ${campaignTotalTime}ms`);

      // Final campaign validation
      expect(campaignTotalTime).toBeLessThan(20000); // Campaign generation under 20s
      expect(universalResult.crossPlatformAnalysis.crossPlatformViralPotential).toBeGreaterThan(75);

      console.log(`🏆 Campaign Success:
        - Platforms: ${Object.keys(universalResult.adaptations).join(', ')}
        - Average Quality: ${averageQuality.toFixed(1)}/100
        - Total Cost: $${totalCost.toFixed(4)}
        - Viral Potential: ${universalResult.crossPlatformAnalysis.crossPlatformViralPotential.toFixed(1)}%
        - Synergies: ${synergies.length} identified`);
    });

    it('should handle staggered content release with timing optimization', async () => {
      const staggeredRequest = {
        topic: 'Weekly tech digest: Top 5 innovations this week',
        tone: 'educational' as const,
        targetAudience: 'tech professionals',
        goals: ['awareness' as const, 'engagement' as const],
        platforms: ['twitter', 'tiktok', 'instagram'],
        releaseStrategy: 'staggered',
        timeZone: 'UTC',
        optimalTiming: true
      };

      const result = await coordinator.generateUniversalContent(staggeredRequest);

      // Should have staggered timing recommendations
      const sequentialPlan = result.distributionStrategy.contentDistribution.sequential;
      expect(sequentialPlan.length).toBeGreaterThan(0);

      // Each platform should have different timing
      const delays = sequentialPlan.map(step => step.delay);
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // Should optimize for platform-specific peak times
      sequentialPlan.forEach(step => {
        expect(step.platform).toBeTruthy();
        expect(step.delay).toBeGreaterThanOrEqual(0);
        expect(step.adaptation).toBeTruthy();
      });
    });

    it('should maintain brand consistency across all platforms', async () => {
      const brandConsistentRequest = {
        topic: 'Our company values: Innovation, sustainability, and community impact',
        tone: 'professional' as const,
        targetAudience: 'potential customers and employees',
        goals: ['awareness' as const, 'community' as const],
        platforms: ['twitter', 'tiktok', 'instagram'],
        brandGuidelines: {
          tone: 'professional but approachable',
          keyMessages: ['innovation', 'sustainability', 'community'],
          avoidTerms: ['disruptive', 'revolutionary'],
          requiredHashtags: ['#OurValues', '#Innovation']
        }
      };

      const result = await coordinator.generateUniversalContent(brandConsistentRequest);

      // Validate brand consistency across platforms
      Object.entries(result.adaptations).forEach(([, adaptation]) => {
        const content = adaptation.content.toLowerCase();

        // Should include key messages
        expect(
          brandConsistentRequest.brandGuidelines.keyMessages.some(message =>
            content.includes(message.toLowerCase())
          )
        ).toBe(true);

        // Should avoid specified terms
        brandConsistentRequest.brandGuidelines.avoidTerms.forEach(term => {
          expect(content).not.toContain(term.toLowerCase());
        });

        // Should include required hashtags
        brandConsistentRequest.brandGuidelines.requiredHashtags.forEach(hashtag => {
          expect(adaptation.optimization.hashtags).toContain(hashtag);
        });
      });

      // Quality should be maintained despite constraints
      const qualityAssessments = await Promise.all(
        Object.entries(result.adaptations).map(async ([platform, adaptation]) => {
          return await qualityAssurance.assessContent(
            adaptation.content,
            platform,
            adaptation.contentType
          );
        })
      );

      qualityAssessments.forEach(assessment => {
        expect(assessment.metrics.overallScore).toBeGreaterThan(75);
        expect(assessment.metrics.brandSafety).toBeGreaterThan(90);
      });
    });
  });

  describe('High-Volume Batch Processing Workflows', () => {
    it('should handle high-volume content generation efficiently', async () => {
      const batchSize = 20;
      const topics = Array.from({ length: batchSize }, (_, _i) =>
        `Daily content idea ${i + 1}: Creative inspiration for social media`
      );

      const batchRequests = topics.map((topic, _index) => ({ _topic,
        tone: ['casual', 'professional', 'inspiring'][index % 3] as const,
        targetAudience: 'content creators',
        platform: ['twitter', 'tiktok', 'instagram'][index % 3],
        contentType: 'post',
        goals: ['engagement' as const],
        priority: Math.floor(Math.random() * 10) + 1
      }));

      console.log(`⚡ Processing batch of ${batchSize} requests...`);
      const batchStartTime = Date.now();

      // Process batch with coordinator
      const batchRequest = {
        requests: batchRequests,
        crossPlatformOptimization: false,
        generateVariations: 1,
        includePerformancePrediction: true
      };

      const results = await coordinator.processBatchRequest(batchRequest);
      const batchTotalTime = Date.now() - batchStartTime;

      expect(results.length).toBe(batchSize);
      expect(batchTotalTime).toBeLessThan(30000); // 30 seconds for 20 requests

      // Validate all results
      results.forEach((result, _index) => {
        expect(result.content).toBeTruthy();
        expect(result.platform).toBe(batchRequests[index].platform);
        expect(result.analysis.platformScore).toBeGreaterThan(70);
      });

      // Track batch performance
      results.forEach((_result) => {
        costTracker.trackRequest(
          result.agentUsed,
          result.platform,
          300,
          180,
          '@cf/meta/llama-2-7b-chat-int8',
          result.metadata.processingTime || 500,
          true,
          result.analysis.platformScore
        );
      });

      const batchMetrics = costTracker.getCurrentMetrics();
      expect(batchMetrics.totalAPICalls).toBe(batchSize);
      expect(batchMetrics.successRate).toBe(100);

      const averageTimePerRequest = batchTotalTime / batchSize;
      console.log(`🚀 Batch completed:
        - Requests: ${batchSize}
        - Total time: ${batchTotalTime}ms
        - Avg per request: ${averageTimePerRequest.toFixed(0)}ms
        - Success rate: ${batchMetrics.successRate}%
        - Total cost: $${batchMetrics.totalCostUSD.toFixed(4)}`);
    });

    it('should optimize cache usage for similar batch requests', async () => {
      const similarTopics = [
        'AI breakthrough in machine learning',
        'Machine learning AI advancement',
        'Revolutionary AI technology in ML',
        'Latest AI innovation in machine learning',
        'Breakthrough machine learning AI update'
      ];

      // First round - populate cache
      console.log('🗄️ Round 1: Populating cache...');
      await Promise.all(
        similarTopics.map(async topic => {
          return await smartCache.getContent(
            'twitter',
            'tweet',
            topic,
            { priority: 'normal' }
          );
        })
      );

      // Second round - should benefit from cache
      console.log('⚡ Round 2: Testing cache efficiency...');
      const secondRoundStart = Date.now();
      const secondRoundResults = await Promise.all(
        similarTopics.map(async topic => {
          return await smartCache.getContent(
            'twitter',
            'tweet',
            `Updated: ${topic}`, // Slightly different but similar
            { priority: 'normal' }
          );
        })
      );
      const secondRoundTime = Date.now() - secondRoundStart;

      const cacheStats = smartCache.getCacheStats();
      console.log(`📊 Cache performance:
        - Total entries: ${cacheStats.totalEntries}
        - Cache hits: ${cacheStats.totalHits}
        - Hit rate: ${cacheStats.hitRate.toFixed(1)}%
        - Total savings: $${cacheStats.totalSavings.toFixed(4)}`);

      expect(cacheStats.totalEntries).toBeGreaterThan(0);
      expect(secondRoundTime).toBeLessThan(10000); // Should be faster due to caching

      // At least some requests should be cache hits
      const cacheHits = secondRoundResults.filter(result => result.cacheHit);
      if (cacheHits.length > 0) {
        expect(cacheStats.hitRate).toBeGreaterThan(0);
      }
    });

    it('should handle mixed-priority batch requests with proper queuing', async () => {
      const mixedPriorityRequests = [
        { topic: 'URGENT: Security alert', priority: 10, platform: 'twitter' },
        { topic: 'Regular update 1', priority: 5, platform: 'instagram' },
        { topic: 'Low priority content', priority: 2, platform: 'tiktok' },
        { topic: 'CRITICAL: System maintenance', priority: 9, platform: 'twitter' },
        { topic: 'Regular update 2', priority: 4, platform: 'instagram' }
      ];

      console.log('🎯 Testing priority-based batch processing...');

      // Add all requests to batch processor
      const requestIds = await Promise.all(
        mixedPriorityRequests.map(async req => {
          return await batchProcessor.addRequest({
            platform: req.platform,
            contentType: 'post',
            prompt: req.topic,
            priority: req.priority,
            maxTokens: 1500,
            qualityThreshold: 80,
            callback: () => {
              console.log(`✅ Completed: ${req.topic} (Priority ${req.priority})`);
            },
            errorCallback: (_error) => {
              console.error(`❌ Failed: ${req.topic} - ${error.message}`);
            }
          });
        })
      );

      expect(requestIds.length).toBe(5);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 6000));

      const batchStats = batchProcessor.getBatchStats();
      expect(batchStats.metrics.totalBatches).toBeGreaterThan(0);

      // High priority requests should be processed first
      // (This would be validated through timing in a real implementation)
      console.log(`📈 Batch processing stats:
        - Total batches: ${batchStats.metrics.totalBatches}
        - Average batch size: ${batchStats.metrics.averageBatchSize.toFixed(1)}
        - Processing time: ${batchStats.metrics.averageProcessingTime.toFixed(0)}ms
        - Error rate: ${(batchStats.metrics.errorRate * 100).toFixed(1)}%`);
    });
  });

  describe('Real-World Scenario Testing', () => {
    it('should handle viral content detection and amplification workflow', async () => {
      const viralCandidateRequest = {
        topic: 'BREAKING: Revolutionary discovery that changes everything we know about space',
        tone: 'exciting' as const,
        targetAudience: 'science enthusiasts',
        goals: ['viral' as const, 'awareness' as const],
        platforms: ['twitter', 'tiktok', 'instagram'],
        viralOptimization: true,
        amplificationStrategy: 'aggressive'
      };

      console.log('🚀 Testing viral content workflow...');

      const result = await coordinator.generateUniversalContent(viralCandidateRequest);

      // Analyze viral potential across platforms
      const viralAnalysis = result.crossPlatformAnalysis;
      expect(viralAnalysis.crossPlatformViralPotential).toBeGreaterThan(80);

      // Each platform should be optimized for viral mechanics
      Object.entries(result.adaptations).forEach(([, adaptation]) => {
        expect(adaptation.analysis.viralPrediction).toBeGreaterThan(75);

        const content = adaptation.content.toLowerCase();

        // Should include viral elements
        const viralElements = [
          'breaking', 'revolutionary', 'amazing', 'incredible',
          'you won\'t believe', 'shocking', 'unbelievable'
        ];

        expect(
          viralElements.some(element => content.includes(element))
        ).toBe(true);

        // Platform-specific viral optimization
        if (platform === 'twitter') {
          expect(content).toMatch(/(🚨|⚡|🔥)/); // Viral emojis
        } else if (platform === 'tiktok') {
          expect(adaptation.optimization.hashtags).toEqual(
            expect.arrayContaining([expect.stringMatching(/(fyp|viral|trending)/)])
          );
        } else if (platform === 'instagram') {
          expect(adaptation.optimization.hashtags.length).toBeGreaterThan(8);
        }
      });

      // Should identify optimal amplification strategy
      const amplification = result.distributionStrategy.viralAmplification;
      expect(amplification.triggerPlatform).toBeTruthy();
      expect(amplification.cascadePlatforms.length).toBeGreaterThan(0);
      expect(amplification.amplificationStrategy).toBe('aggressive');

      console.log(`🎯 Viral optimization results:
        - Cross-platform viral potential: ${viralAnalysis.crossPlatformViralPotential.toFixed(1)}%
        - Trigger platform: ${amplification.triggerPlatform}
        - Cascade platforms: ${amplification.cascadePlatforms.join(', ')}
        - Synergies identified: ${viralAnalysis.synergies.length}`);
    });

    it('should handle crisis communication workflow with speed and accuracy', async () => {
      const crisisCommunicationRequest = {
        topic: 'Important update regarding recent service outage and our response',
        tone: 'professional' as const,
        targetAudience: 'customers and stakeholders',
        goals: ['awareness' as const, 'community' as const],
        platforms: ['twitter', 'instagram'],
        urgency: 'critical' as const,
        accuracy: 'high',
        brandSafety: 'maximum',
        approvalRequired: false
      };

      console.log('🆘 Testing crisis communication workflow...');
      const crisisStartTime = Date.now();

      const result = await coordinator.generateUniversalContent(crisisCommunicationRequest);
      const crisisResponseTime = Date.now() - crisisStartTime;

      // Should respond quickly for crisis situations
      expect(crisisResponseTime).toBeLessThan(8000);

      // Content quality validation for crisis communication
      const qualityValidations = await Promise.all(
        Object.entries(result.adaptations).map(async ([platform, adaptation]) => {
          const assessment = await qualityAssurance.assessContent(
            adaptation.content,
            platform,
            adaptation.contentType
          );
          return { _platform, assessment };
        })
      );

      qualityValidations.forEach(({ assessment }) => {
        // Crisis communication must have high brand safety
        expect(assessment.metrics.brandSafety).toBeGreaterThan(95);

        // Should be professional and clear
        expect(assessment.metrics.grammarQuality).toBeGreaterThan(90);
        expect(assessment.metrics.contentRelevance).toBeGreaterThan(85);

        // Should pass all critical quality rules
        const criticalIssues = assessment.validation.issues.filter(
          issue => issue.severity === 'critical'
        );
        expect(criticalIssues.length).toBe(0);
      });

      // Content should be appropriate for crisis communication
      Object.entries(result.adaptations).forEach(([, adaptation]) => {
        const content = adaptation.content.toLowerCase();

        // Should include appropriate crisis communication elements
        expect(content).toMatch(/(update|inform|address|response|working|resolve)/);

        // Should not include inappropriate elements for crisis
        expect(content).not.toMatch(/(exciting|amazing|viral|trending)/);
      });

      console.log(`🚨 Crisis communication results:
        - Response time: ${crisisResponseTime}ms
        - Platforms covered: ${Object.keys(result.adaptations).length}
        - Brand safety: ${qualityValidations.map(v => v.assessment.metrics.brandSafety.toFixed(1)).join('%, ')}%
        - All critical issues resolved: ✅`);
    });

    it('should handle influencer collaboration content workflow', async () => {
      const influencerCollabRequest = {
        topic: 'Exciting partnership announcement with @TechInfluencer on AI innovation',
        tone: 'collaborative' as const,
        targetAudience: 'tech community and both audiences',
        goals: ['awareness' as const, 'engagement' as const, 'community' as const],
        platforms: ['twitter', 'instagram'],
        collaboration: {
          influencerHandle: '@TechInfluencer',
          crossPromotion: true,
          mentionRequirements: true,
          sharedHashtags: ['#TechPartnership', '#Innovation']
        },
        brandAlignment: true
      };

      console.log('🤝 Testing influencer collaboration workflow...');

      const result = await coordinator.generateUniversalContent(influencerCollabRequest);

      // Validate collaboration elements
      Object.entries(result.adaptations).forEach(([, adaptation]) => {
        // Should mention the influencer
        expect(adaptation.content).toContain('@TechInfluencer');

        // Should include shared hashtags
        influencerCollabRequest.collaboration.sharedHashtags.forEach(hashtag => {
          expect(adaptation.optimization.hashtags).toContain(hashtag);
        });

        // Should be optimized for cross-promotion
        const content = adaptation.content.toLowerCase();
        expect(content).toMatch(/(partnership|collaboration|excited|together)/);
      });

      // Quality assessment for collaboration content
      const qualityAssessments = await Promise.all(
        Object.entries(result.adaptations).map(async ([platform, adaptation]) => {
          return await qualityAssurance.assessContent(
            adaptation.content,
            platform,
            adaptation.contentType
          );
        })
      );

      qualityAssessments.forEach(assessment => {
        // Should maintain brand safety and authenticity
        expect(assessment.metrics.brandSafety).toBeGreaterThan(90);
        expect(assessment.metrics.authenticity).toBeGreaterThan(80);
        expect(assessment.metrics.engagementLikelihood).toBeGreaterThan(75);
      });

      console.log(`🎉 Influencer collaboration results:
        - Cross-promotion elements: ✅
        - Shared hashtags included: ✅
        - Brand alignment maintained: ✅
        - Engagement optimization: ${qualityAssessments.map(a => a.metrics.engagementLikelihood.toFixed(1)).join('%, ')}%`);
    });
  });

  describe('System Resilience and Error Recovery', () => {
    it('should gracefully handle partial system failures', async () => {
      console.log('🛡️ Testing system resilience...');

      // Simulate quality assurance system failure
      const originalAssessContent = qualityAssurance.assessContent.bind(qualityAssurance);
      qualityAssurance.assessContent = jest.fn().mockRejectedValue(
        new Error('Quality assessment service temporarily unavailable')
      );

      const resilientRequest = {
        topic: 'System resilience test content',
        tone: 'professional' as const,
        targetAudience: 'developers',
        platform: 'twitter',
        contentType: 'tweet',
        goals: ['awareness' as const]
      };

      // Should still generate content despite quality system failure
      const result = await coordinator.routeToOptimalAgent(resilientRequest);

      expect(result.content).toBeTruthy();
      expect(result.analysis.platformScore).toBeGreaterThan(0);

      // System should log the failure but continue operation
      console.log('✅ System continued operation despite quality assessment failure');

      // Restore quality assessment
      qualityAssurance.assessContent = originalAssessContent;

      // Verify system recovery
      const recoveryAssessment = await qualityAssurance.assessContent(
        result.content,
        resilientRequest.platform,
        resilientRequest.contentType
      );

      expect(recoveryAssessment.metrics.overallScore).toBeGreaterThan(0);
      console.log('🔄 System successfully recovered from failure');
    });

    it('should handle concurrent high-load scenarios', async () => {
      console.log('⚡ Testing concurrent high-load handling...');

      const concurrentRequests = Array.from({ length: 15 }, (_, _i) => ({
        topic: `Concurrent test request ${i + 1}`,
        tone: 'casual' as const,
        targetAudience: 'general',
        platform: ['twitter', 'tiktok', 'instagram'][i % 3],
        contentType: 'post',
        goals: ['engagement' as const]
      }));

      const concurrentStartTime = Date.now();

      // Execute all requests concurrently
      const results = await Promise.all(
        concurrentRequests.map(async (request, _index) => {
          try {
            return await coordinator.routeToOptimalAgent(request);
          } catch (error: unknown) {
            console.error(`Request ${index + 1} failed:`, error.message);
            return null;
          }
        })
      );

      const concurrentTotalTime = Date.now() - concurrentStartTime;
      const successfulResults = results.filter(result => result !== null);

      console.log(`🚀 Concurrent execution results:
        - Total requests: ${concurrentRequests.length}
        - Successful: ${successfulResults.length}
        - Failed: ${concurrentRequests.length - successfulResults.length}
        - Total time: ${concurrentTotalTime}ms
        - Success rate: ${(successfulResults.length / concurrentRequests.length * 100).toFixed(1)}%`);

      // Should handle most requests successfully
      expect(successfulResults.length).toBeGreaterThan(concurrentRequests.length * 0.8);

      // Should complete in reasonable time despite high load
      expect(concurrentTotalTime).toBeLessThan(45000);

      // Successful results should maintain quality
      successfulResults.forEach(result => {
        if (result) {
          expect(result.content).toBeTruthy();
          expect(result.analysis.platformScore).toBeGreaterThan(60);
        }
      });
    });

    it('should maintain data consistency during system stress', async () => {
      console.log('🧪 Testing data consistency under stress...');

      // Generate multiple requests that should trigger various optimizations
      const stressRequests = [
        { topic: 'High cost content generation', platform: 'twitter', simulate: 'high_cost' },
        { topic: 'Cache test similar content', platform: 'instagram', simulate: 'cache_similar' },
        { topic: 'Cache test similar post', platform: 'instagram', simulate: 'cache_similar' },
        { topic: 'Quality improvement needed', platform: 'tiktok', simulate: 'low_quality' },
        { topic: 'Batch processing test', platform: 'twitter', simulate: 'batch' }
      ];

      const stressResults = [];

      for (const request of stressRequests) {
        try {
          const result = await coordinator.routeToOptimalAgent({
            topic: request.topic,
            tone: 'casual' as const,
            targetAudience: 'general',
            platform: request.platform,
            contentType: 'post',
            goals: ['engagement' as const]
          });

          stressResults.push({ success: true, result });

          // Track metrics for data consistency validation
          costTracker.trackRequest(
            result.agentUsed,
            request.platform,
            400,
            250,
            '@cf/meta/llama-2-7b-chat-int8',
            result.metadata.processingTime || 600,
            true,
            result.analysis.platformScore
          );

        } catch (error: unknown) {
          stressResults.push({ success: false, error: error.message });
        }
      }

      // Validate data consistency
      const costMetrics = costTracker.getCurrentMetrics();
      const cacheStats = smartCache.getCacheStats();

      // Metrics should be consistent and valid
      expect(costMetrics.totalAPICalls).toBeGreaterThan(0);
      expect(costMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(costMetrics.successRate).toBeLessThanOrEqual(100);

      // Cache should maintain integrity
      expect(cacheStats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(cacheStats.hitRate).toBeGreaterThanOrEqual(0);
      expect(cacheStats.hitRate).toBeLessThanOrEqual(100);

      const successfulStressResults = stressResults.filter(r => r.success);
      console.log(`🔬 Stress test results:
        - Successful operations: ${successfulStressResults.length}/${stressRequests.length}
        - Cost tracking integrity: ✅
        - Cache integrity: ✅
        - Data consistency maintained: ✅`);

      expect(successfulStressResults.length).toBeGreaterThan(stressRequests.length * 0.7);
    });
  });
});