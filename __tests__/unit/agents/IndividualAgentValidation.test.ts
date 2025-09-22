/**
 * Comprehensive Individual Agent Validation Test Suite
 * Tests each platform agent from every angle - algorithm knowledge, content generation,
 * viral mechanics, performance, and integration with optimization systems
 */

import { it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TwitterAgent } from '../../../src/lib/ai/agents/TwitterAgent';
import { TikTokAgent } from '../../../src/lib/ai/agents/TikTokAgent';
import { InstagramAgent } from '../../../src/lib/ai/agents/InstagramAgent';
import { CostBudget } from '../../../src/lib/ai/agents/monitoring/CostTracker';
import { OptimizationConfig } from '../../../src/lib/ai/agents/monitoring/TokenOptimizer';
import { _PerformanceAnalyzer, TestConfiguration } from '../../../src/lib/ai/agents/monitoring/PerformanceAnalyzer';
import { QualityAssurance } from '../../../src/lib/ai/agents/quality/QualityAssurance';
import { ALGORITHM_DATABASE } from '../../../src/lib/ai/agents/AlgorithmData';

// Mock environment setup
const mockAI = {
  run: jest.fn().mockResolvedValue({
    response: 'Generated content with viral potential and platform optimization'
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

const optimizationConfig: OptimizationConfig = {
  aggressivenessLevel: 'moderate',
  qualityFloor: 80,
  maxTokenReduction: 40,
  adaptiveLearning: true,
  platformSpecific: true
};

describe('Individual Agent Validation Suite', () => {
  let costTracker: CostTracker;
  let tokenOptimizer: TokenOptimizer;
  let performanceAnalyzer: PerformanceAnalyzer;
  let qualityAssurance: QualityAssurance;

  beforeEach(() => {
    const budget: CostBudget = {
      daily: 10.0,
      weekly: 50.0,
      monthly: 200.0,
      perRequest: 0.05,
      currency: 'USD'
    };

    costTracker = new CostTracker(budget);
    tokenOptimizer = new TokenOptimizer();
    performanceAnalyzer = new PerformanceAnalyzer();
    qualityAssurance = new QualityAssurance();

    jest.clearAllMocks();
  });

  afterEach(() => {
    costTracker.resetMetrics();
    tokenOptimizer.resetLearningData();
    performanceAnalyzer.resetPerformanceData();
    qualityAssurance.resetQualityData();
  });

  describe('TwitterAgent Deep Validation', () => {
    let twitterAgent: TwitterAgent;

    beforeEach(() => {
      twitterAgent = new TwitterAgent(mockAI, mockEnv, defaultConfig);
    });

    describe('Algorithm Knowledge Accuracy', () => {
      it('should have correct Twitter algorithm factors with proper weights', () => {
        const factors = twitterAgent.getAlgorithmFactors();

        // Primary ranking factors validation
        expect(factors.primaryRankingFactors).toContain('engagement_velocity');
        expect(factors.primaryRankingFactors).toContain('reply_depth');
        expect(factors.primaryRankingFactors).toContain('retweet_ratio');
        expect(factors.primaryRankingFactors).toContain('recency');
        expect(factors.primaryRankingFactors).toContain('author_authority');

        // Engagement weights validation
        expect(factors.engagementWeights).toHaveProperty('likes');
        expect(factors.engagementWeights).toHaveProperty('retweets');
        expect(factors.engagementWeights).toHaveProperty('replies');
        expect(factors.engagementWeights).toHaveProperty('quotes');

        // Weight distribution validation
        const totalWeight = Object.values(factors.engagementWeights).reduce((sum, _weight) => sum + weight, 0);
        expect(totalWeight).toBeCloseTo(100, 1); // Should sum to approximately 100%
      });

      it('should understand Twitter content format preferences', () => {
        const factors = twitterAgent.getAlgorithmFactors();

        expect(factors.contentFormatPreferences).toContain('threads');
        expect(factors.contentFormatPreferences).toContain('images');
        expect(factors.contentFormatPreferences).toContain('polls');
        expect(factors.contentFormatPreferences).toContain('hashtags');
      });

      it('should know Twitter optimal timing patterns', () => {
        const factors = twitterAgent.getAlgorithmFactors();

        expect(factors.optimalTimingPatterns).toContain('9am-10am');
        expect(factors.optimalTimingPatterns).toContain('3pm-4pm');
        expect(factors.optimalTimingPatterns).toContain('7pm-9pm');
      });

      it('should identify Twitter penalty factors', () => {
        const factors = twitterAgent.getAlgorithmFactors();

        expect(factors.penaltyFactors).toContain('excessive_hashtags');
        expect(factors.penaltyFactors).toContain('spam_behavior');
        expect(factors.penaltyFactors).toContain('misinformation');
      });
    });

    describe('Viral Mechanics Implementation', () => {
      it('should understand viral emotional triggers', () => {
        const viralMechanics = twitterAgent.getViralMechanics();

        expect(viralMechanics.emotionalTriggers).toContain('surprise');
        expect(viralMechanics.emotionalTriggers).toContain('outrage');
        expect(viralMechanics.emotionalTriggers).toContain('inspiration');
        expect(viralMechanics.emotionalTriggers).toContain('humor');
      });

      it('should implement sharing psychology principles', () => {
        const viralMechanics = twitterAgent.getViralMechanics();

        expect(viralMechanics.sharingPsychology).toContain('social_proof');
        expect(viralMechanics.sharingPsychology).toContain('identity_expression');
        expect(viralMechanics.sharingPsychology).toContain('information_value');
      });

      it('should track current trending factors', () => {
        const viralMechanics = twitterAgent.getViralMechanics();

        expect(viralMechanics.trendingFactors).toContain('breaking_news');
        expect(viralMechanics.trendingFactors).toContain('cultural_moments');
        expect(viralMechanics.trendingFactors).toContain('meme_potential');
      });
    });

    describe('Content Generation Quality', () => {
      it('should generate platform-optimized content', async () => {
        const request = {
          topic: 'AI breakthrough in 2024',
          tone: 'exciting' as const,
          targetAudience: 'tech enthusiasts',
          contentType: 'tweet',
          goals: ['viral' as const, 'engagement' as const]
        };

        const result = await twitterAgent.generateContent(request);

        expect(result.content).toBeTruthy();
        expect(result.content.length).toBeLessThanOrEqual(280); // Twitter character limit
        expect(result.optimization.hashtags.length).toBeGreaterThan(0);
        expect(result.optimization.hashtags.length).toBeLessThanOrEqual(5); // Twitter best practice
        expect(result.analysis.viralPrediction).toBeGreaterThan(0);
        expect(result.analysis.viralPrediction).toBeLessThanOrEqual(100);
      });

      it('should generate quality thread content', async () => {
        const request = {
          topic: 'Complete guide to viral content creation',
          tone: 'educational' as const,
          targetAudience: 'content creators',
          contentType: 'thread',
          goals: ['awareness' as const, 'engagement' as const]
        };

        const result = await twitterAgent.generateContent(request);

        // Thread-specific validations
        expect(result.content).toContain('1/'); // Thread numbering
        expect(result.optimization.hashtags.length).toBeLessThanOrEqual(3); // Fewer hashtags for threads
        expect(result.analysis.algorithmAlignment).toBeGreaterThan(70);
      });

      it('should maintain quality with cost optimization', async () => {
        // Generate content with token optimization
        const allocation = tokenOptimizer.calculateOptimalAllocation(
          'twitter',
          'tweet',
          'AI breakthrough news',
          85,
          optimizationConfig
        );

        const request = {
          topic: 'AI breakthrough in machine learning',
          tone: 'professional' as const,
          targetAudience: 'researchers',
          contentType: 'tweet',
          goals: ['awareness' as const],
          maxTokens: allocation.maxTokens
        };

        const result = await twitterAgent.generateContent(request);

        // Quality should remain high despite optimization
        expect(result.analysis.platformScore).toBeGreaterThan(75);
        expect(result.analysis.viralPrediction).toBeGreaterThan(60);

        // Track cost efficiency
        costTracker.trackRequest(
          'TwitterAgent',
          'twitter',
          allocation.inputTokens,
          allocation.outputTokens,
          '@cf/meta/llama-2-7b-chat-int8',
          500,
          true,
          result.analysis.platformScore
        );

        const metrics = costTracker.getCurrentMetrics();
        expect(metrics.successRate).toBe(100);
      });
    });

    describe('Performance and Efficiency', () => {
      it('should meet response time requirements', async () => {
        const startTime = Date.now();

        const request = {
          topic: 'Quick viral tip',
          tone: 'casual' as const,
          targetAudience: 'general',
          contentType: 'tweet',
          goals: ['engagement' as const]
        };

        const result = await twitterAgent.generateContent(request);
        const responseTime = Date.now() - startTime;

        expect(responseTime).toBeLessThan(3000); // 3 second max
        expect(result.content).toBeTruthy();
      });

      it('should handle batch generation efficiently', async () => {
        const batchRequest = {
          requests: Array.from({ length: 5 }, (_, _i) => ({
            topic: `Viral content tip ${i + 1}`,
            tone: 'casual' as const,
            targetAudience: 'creators',
            contentType: 'tweet',
            goals: ['engagement' as const]
          })),
          crossPlatformOptimization: false,
          generateVariations: 1,
          includePerformancePrediction: true
        };

        const startTime = Date.now();
        const results = await twitterAgent.generateBatch(batchRequest);
        const totalTime = Date.now() - startTime;

        expect(results.length).toBe(5);
        expect(totalTime).toBeLessThan(8000); // Should be faster than 5 individual requests
        expect(results.every(r => r.content.length > 0)).toBe(true);
      });

      it('should optimize token usage effectively', async () => {
        const content = 'Test content for token optimization analysis';
        const optimizationResult = tokenOptimizer.optimizeTokenUsage(
          content,
          'twitter',
          optimizationConfig,
          2000
        );

        expect(optimizationResult.optimizedTokens).toBeLessThan(optimizationResult.originalTokens);
        expect(optimizationResult.reductionPercentage).toBeGreaterThan(0);
        expect(optimizationResult.qualityImpact).toBeLessThan(25); // Should maintain quality
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should handle empty topic gracefully', async () => {
        const request = {
          topic: '',
          tone: 'casual' as const,
          targetAudience: 'general',
          contentType: 'tweet',
          goals: ['engagement' as const]
        };

        await expect(twitterAgent.generateContent(request)).rejects.toThrow();
      });

      it('should handle extremely long topics', async () => {
        const longTopic = 'A'.repeat(1000);

        const request = {
          topic: longTopic,
          tone: 'professional' as const,
          targetAudience: 'general',
          contentType: 'tweet',
          goals: ['awareness' as const]
        };

        const result = await twitterAgent.generateContent(request);
        expect(result.content.length).toBeLessThanOrEqual(280);
      });

      it('should handle API failures with retry logic', async () => {
        // Mock API failure
        mockAI.run.mockRejectedValueOnce(new Error('API temporarily unavailable'));
        mockAI.run.mockResolvedValueOnce({ response: 'Recovered content' });

        const request = {
          topic: 'Test resilience',
          tone: 'casual' as const,
          targetAudience: 'general',
          contentType: 'tweet',
          goals: ['engagement' as const]
        };

        const result = await twitterAgent.generateContent(request);
        expect(result.content).toBeTruthy();
        expect(mockAI.run).toHaveBeenCalledTimes(2); // Initial call + retry
      });
    });

    describe('Quality Assurance Integration', () => {
      it('should pass quality validation for generated content', async () => {
        const request = {
          topic: 'Amazing AI breakthrough just announced',
          tone: 'exciting' as const,
          targetAudience: 'tech enthusiasts',
          contentType: 'tweet',
          goals: ['viral' as const, 'engagement' as const]
        };

        const result = await twitterAgent.generateContent(request);

        const qualityAssessment = await qualityAssurance.assessContent(
          result.content,
          'twitter',
          'tweet'
        );

        expect(qualityAssessment.passedThreshold).toBe(true);
        expect(qualityAssessment.metrics.overallScore).toBeGreaterThan(75);
        expect(qualityAssessment.metrics.platformOptimization).toBeGreaterThan(70);
        expect(qualityAssessment.validation.issues.length).toBeLessThan(3);
      });

      it('should improve content quality when needed', async () => {
        // Generate intentionally poor content for improvement testing
        const poorContent = 'bad content without optimization';

        const assessment = await qualityAssurance.assessContent(
          poorContent,
          'twitter',
          'tweet'
        );

        if (!assessment.passedThreshold) {
          const improvement = await qualityAssurance.improveContent(assessment, 'moderate');

          expect(improvement.improvementScore).toBeGreaterThan(0);
          expect(improvement.appliedFixes.length).toBeGreaterThan(0);
          expect(improvement.improvedContent).not.toBe(poorContent);
        }
      });
    });
  });

  describe('TikTokAgent Deep Validation', () => {
    let tiktokAgent: TikTokAgent;

    beforeEach(() => {
      tiktokAgent = new TikTokAgent(mockAI, mockEnv, defaultConfig);
    });

    describe('Algorithm Knowledge Accuracy', () => {
      it('should understand TikTok FYP algorithm factors', () => {
        const factors = tiktokAgent.getAlgorithmFactors();

        expect(factors.primaryRankingFactors).toContain('completion_rate');
        expect(factors.primaryRankingFactors).toContain('engagement_velocity');
        expect(factors.primaryRankingFactors).toContain('sound_trending');
        expect(factors.primaryRankingFactors).toContain('hashtag_momentum');
      });

      it('should prioritize completion rate correctly', () => {
        const factors = tiktokAgent.getAlgorithmFactors();

        expect(factors.engagementWeights.completion_rate).toBeGreaterThan(35);
        expect(factors.engagementWeights.completion_rate).toBeGreaterThan(factors.engagementWeights.likes);
      });

      it('should understand TikTok content format preferences', () => {
        const factors = tiktokAgent.getAlgorithmFactors();

        expect(factors.contentFormatPreferences).toContain('vertical_video');
        expect(factors.contentFormatPreferences).toContain('trending_sounds');
        expect(factors.contentFormatPreferences).toContain('quick_hooks');
        expect(factors.contentFormatPreferences).toContain('visual_effects');
      });
    });

    describe('Viral Mechanics Implementation', () => {
      it('should focus on hook-based viral mechanics', () => {
        const viralMechanics = tiktokAgent.getViralMechanics();

        expect(viralMechanics.emotionalTriggers).toContain('curiosity');
        expect(viralMechanics.emotionalTriggers).toContain('surprise');
        expect(viralMechanics.trendingFactors).toContain('hook_strength');
        expect(viralMechanics.trendingFactors).toContain('completion_optimization');
      });

      it('should understand TikTok community engagement patterns', () => {
        const viralMechanics = tiktokAgent.getViralMechanics();

        expect(viralMechanics.communityEngagement).toContain('duets');
        expect(viralMechanics.communityEngagement).toContain('stitches');
        expect(viralMechanics.communityEngagement).toContain('challenges');
      });
    });

    describe('Content Generation Quality', () => {
      it('should generate FYP-optimized content', async () => {
        const request = {
          topic: 'Life hack that will blow your mind',
          tone: 'exciting' as const,
          targetAudience: 'young adults',
          contentType: 'video',
          goals: ['viral' as const, 'engagement' as const]
        };

        const result = await tiktokAgent.generateContent(request);

        expect(result.content).toContain('POV:' || result.content.includes('Wait for it'));
        expect(result.optimization.hashtags).toContain('#fyp' || result.optimization.hashtags.includes('#foryou'));
        expect(result.analysis.viralPrediction).toBeGreaterThan(75);
      });

      it('should optimize for completion rate', async () => {
        const request = {
          topic: 'Amazing transformation reveal',
          tone: 'inspiring' as const,
          targetAudience: 'fitness enthusiasts',
          contentType: 'transformation',
          goals: ['viral' as const]
        };

        const result = await tiktokAgent.generateContent(request);

        // Should include completion rate optimization strategies
        expect(result.content.toLowerCase()).toMatch(/wait|reveal|end|surprise/);
        expect(result.analysis.algorithmAlignment).toBeGreaterThan(80);
      });
    });
  });

  describe('InstagramAgent Deep Validation', () => {
    let instagramAgent: InstagramAgent;

    beforeEach(() => {
      instagramAgent = new InstagramAgent(mockAI, mockEnv, defaultConfig);
    });

    describe('Algorithm Knowledge Accuracy', () => {
      it('should understand Instagram algorithm factors', () => {
        const factors = instagramAgent.getAlgorithmFactors();

        expect(factors.primaryRankingFactors).toContain('relationship_score');
        expect(factors.primaryRankingFactors).toContain('interest_alignment');
        expect(factors.primaryRankingFactors).toContain('content_quality');
        expect(factors.primaryRankingFactors).toContain('save_rate');
      });

      it('should prioritize visual content factors', () => {
        const factors = instagramAgent.getAlgorithmFactors();

        expect(factors.contentFormatPreferences).toContain('high_quality_images');
        expect(factors.contentFormatPreferences).toContain('carousels');
        expect(factors.contentFormatPreferences).toContain('reels');
        expect(factors.contentFormatPreferences).toContain('stories');
      });
    });

    describe('Content Generation Quality', () => {
      it('should generate aesthetically optimized content', async () => {
        const request = {
          topic: 'Minimalist lifestyle inspiration',
          tone: 'inspiring' as const,
          targetAudience: 'lifestyle enthusiasts',
          contentType: 'post',
          goals: ['awareness' as const, 'engagement' as const]
        };

        const result = await instagramAgent.generateContent(request);

        expect(result.content).toMatch(/✨|🌟|💫/); // Should include aesthetic emojis
        expect(result.optimization.hashtags.length).toBeGreaterThanOrEqual(5);
        expect(result.optimization.hashtags.length).toBeLessThanOrEqual(30);
        expect(result.content.toLowerCase()).toMatch(/save|share|tag/); // Save optimization
      });

      it('should optimize for save rate', async () => {
        const request = {
          topic: 'Ultimate productivity tips compilation',
          tone: 'educational' as const,
          targetAudience: 'professionals',
          contentType: 'carousel',
          goals: ['awareness' as const]
        };

        const result = await instagramAgent.generateContent(request);

        expect(result.content.toLowerCase()).toMatch(/save|bookmark|reference/);
        expect(result.analysis.algorithmAlignment).toBeGreaterThan(75);
      });
    });
  });

  describe('Cross-Agent Performance Comparison', () => {
    let agents: Array<{ name: string; agent: unknown }>;

    beforeEach(() => {
      agents = [
        { name: 'TwitterAgent', agent: new TwitterAgent(mockAI, mockEnv, defaultConfig) },
        { name: 'TikTokAgent', agent: new TikTokAgent(mockAI, mockEnv, defaultConfig) },
        { name: 'InstagramAgent', agent: new InstagramAgent(mockAI, mockEnv, defaultConfig) }
      ];
    });

    it('should maintain consistent quality across all agents', async () => {
      const commonRequest = {
        topic: 'Revolutionary AI advancement',
        tone: 'exciting' as const,
        targetAudience: 'tech enthusiasts',
        contentType: 'post',
        goals: ['viral' as const, 'engagement' as const]
      };

      const results = await Promise.all(
        agents.map(async ({ _name, agent }) => {
          const result = await agent.generateContent(commonRequest);
          return { _name, result };
        })
      );

      // All agents should produce high-quality content
      results.forEach(({ _name, result }) => {
        expect(result.analysis.platformScore).toBeGreaterThan(70);
        expect(result.analysis.viralPrediction).toBeGreaterThan(60);
        expect(result.content.length).toBeGreaterThan(20);
      });

      // Platform-specific optimizations should differ
      const twitterResult = results.find(r => r.name === 'TwitterAgent')?.result;
      const tiktokResult = results.find(r => r.name === 'TikTokAgent')?.result;
      const instagramResult = results.find(r => r.name === 'InstagramAgent')?.result;

      expect(twitterResult?.content).not.toBe(tiktokResult?.content);
      expect(tiktokResult?.content).not.toBe(instagramResult?.content);
    });

    it('should demonstrate platform-specific optimization differences', async () => {
      const request = {
        topic: 'Daily motivation for success',
        tone: 'inspiring' as const,
        targetAudience: 'young professionals',
        contentType: 'post',
        goals: ['engagement' as const]
      };

      const results = await Promise.all(
        agents.map(async ({ _name, agent }) => {
          const result = await agent.generateContent(request);
          return { _name, platform: agent.platformName, result };
        })
      );

      // Twitter should have hashtags but be concise
      const twitterResult = results.find(r => r.platform === 'Twitter')?.result;
      expect(twitterResult?.content.length).toBeLessThanOrEqual(280);
      expect(twitterResult?.optimization.hashtags.length).toBeLessThanOrEqual(5);

      // TikTok should focus on hooks and FYP optimization
      const tiktokResult = results.find(r => r.platform === 'TikTok')?.result;
      expect(tiktokResult?.optimization.hashtags.some(h => h.includes('fyp') || h.includes('foryou'))).toBe(true);

      // Instagram should optimize for saves and use more hashtags
      const instagramResult = results.find(r => r.platform === 'Instagram')?.result;
      expect(instagramResult?.optimization.hashtags.length).toBeGreaterThan(5);
      expect(instagramResult?.content.toLowerCase()).toMatch(/save|share/);
    });

    it('should integrate with cost optimization systems consistently', async () => {
      const request = {
        topic: 'Tech innovation update',
        tone: 'professional' as const,
        targetAudience: 'industry professionals',
        contentType: 'post',
        goals: ['awareness' as const]
      };

      for (const { _name, agent } of agents) {
        const allocation = tokenOptimizer.calculateOptimalAllocation(
          agent.platformName.toLowerCase(),
          'post',
          request.topic,
          85,
          optimizationConfig
        );

        const optimizedRequest = { ...request, maxTokens: allocation.maxTokens };
        const result = await agent.generateContent(optimizedRequest);

        // Track performance
        costTracker.trackRequest(
          name,
          agent.platformName.toLowerCase(),
          allocation.inputTokens,
          allocation.outputTokens,
          '@cf/meta/llama-2-7b-chat-int8',
          600,
          true,
          result.analysis.platformScore
        );

        // Quality should remain high despite optimization
        expect(result.analysis.platformScore).toBeGreaterThan(75);
      }

      // Verify cost tracking worked
      const metrics = costTracker.getCurrentMetrics();
      expect(metrics.totalAPICalls).toBe(3);
      expect(metrics.successRate).toBe(100);
      expect(metrics.averageCostPerRequest).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarking', () => {
    it('should meet performance benchmarks across all agents', async () => {
      const testConfig: TestConfiguration = {
        contentType: 'post',
        complexityLevel: 'medium',
        targetAudience: 'general',
        optimizationLevel: 'moderate',
        qualityThreshold: 80,
        timeLimit: 5000
      };

      const contentSamples = [
        'AI breakthrough in machine learning',
        'Sustainable living tips for beginners',
        'Cryptocurrency market analysis update'
      ];

      const agents = [
        { name: 'TwitterAgent', agent: new TwitterAgent(mockAI, mockEnv, defaultConfig) },
        { name: 'TikTokAgent', agent: new TikTokAgent(mockAI, mockEnv, defaultConfig) },
        { name: 'InstagramAgent', agent: new InstagramAgent(mockAI, mockEnv, defaultConfig) }
      ];

      for (const { _name, agent } of agents) {
        const benchmark = await performanceAnalyzer.runPerformanceBenchmark(
          name,
          agent.platformName.toLowerCase(),
          testConfig,
          contentSamples
        );

        // Performance requirements
        expect(benchmark.metrics.responseTime).toBeLessThan(5000);
        expect(benchmark.metrics.qualityScore).toBeGreaterThan(80);
        expect(benchmark.metrics.successRate).toBe(100);
        expect(benchmark.metrics.viralPotential).toBeGreaterThan(70);
      }
    });

    it('should generate optimization recommendations for underperforming agents', () => {
      const lowPerformanceMetrics = {
        responseTime: 4000,
        qualityScore: 70,
        viralPotential: 50,
        engagementPrediction: 60,
        costEfficiency: 60,
        tokenUtilization: 90,
        successRate: 85,
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

      // Should identify specific improvement areas
      const categories = new Set(recommendations.map(rec => rec.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });
});