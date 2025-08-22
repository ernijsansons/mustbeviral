// Unit tests for visibility boost engine
// LOG: TEST-BOOST-1 - Boost engine unit tests

const { VisibilityBoostEngine } = require('../../src/lib/boost');

// Mock fetch for API calls
global.fetch = jest.fn();

describe('VisibilityBoostEngine', () => {
  let boostEngine;

  beforeEach(() => {
    console.log('LOG: TEST-BOOST-SETUP-1 - Setting up boost engine test');
    boostEngine = new VisibilityBoostEngine('test-api-key', ['Test Brand']);
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with correct parameters', () => {
      console.log('LOG: TEST-BOOST-INIT-1 - Testing engine initialization');
      
      expect(boostEngine).toBeDefined();
      expect(boostEngine.brandKeywords).toEqual(['Test Brand']);
    });

    test('should handle missing API key gracefully', () => {
      console.log('LOG: TEST-BOOST-INIT-2 - Testing missing API key handling');
      
      const engineWithoutKey = new VisibilityBoostEngine();
      expect(engineWithoutKey).toBeDefined();
    });
  });

  describe('Brand Mention Search', () => {
    test('should search for brand mentions successfully', async () => {
      console.log('LOG: TEST-BOOST-SEARCH-1 - Testing brand mention search');
      
      // Mock successful API response
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Test Brand is an excellent platform for content creation. Users love the innovative features.'
            }
          }],
          citations: [
            { url: 'https://example.com/review', title: 'Tech Review' }
          ]
        })
      });

      const mentions = await boostEngine.searchBrandMentions(['Test Brand']);

      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
      expect(mentions.length).toBeGreaterThan(0);
      
      if (mentions.length > 0) {
        expect(mentions[0]).toHaveProperty('id');
        expect(mentions[0]).toHaveProperty('snippet');
        expect(mentions[0]).toHaveProperty('sentiment_score');
      }
    });

    test('should handle API failures gracefully', async () => {
      console.log('LOG: TEST-BOOST-SEARCH-2 - Testing API failure handling');
      
      // Mock API failure
      global.fetch.mockRejectedValue(new Error('API Error'));

      const mentions = await boostEngine.searchBrandMentions(['Test Brand']);

      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
      // Should return fallback mentions
      expect(mentions.length).toBeGreaterThan(0);
    });

    test('should handle empty search results', async () => {
      console.log('LOG: TEST-BOOST-SEARCH-3 - Testing empty search results');
      
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
          citations: []
        })
      });

      const mentions = await boostEngine.searchBrandMentions(['Nonexistent Brand']);

      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
    });
  });

  describe('Sentiment Analysis', () => {
    test('should analyze positive sentiment correctly', async () => {
      console.log('LOG: TEST-BOOST-SENTIMENT-1 - Testing positive sentiment analysis');
      
      const result = await boostEngine.analyzeSentiment('This is an excellent and amazing product that I love');

      expect(result.sentiment).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(Array.isArray(result.keywords)).toBe(true);
    });

    test('should analyze negative sentiment correctly', async () => {
      console.log('LOG: TEST-BOOST-SENTIMENT-2 - Testing negative sentiment analysis');
      
      const result = await boostEngine.analyzeSentiment('This is a terrible and awful product that I hate');

      expect(result.sentiment).toBe('negative');
      expect(result.score).toBeLessThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should analyze neutral sentiment correctly', async () => {
      console.log('LOG: TEST-BOOST-SENTIMENT-3 - Testing neutral sentiment analysis');
      
      const result = await boostEngine.analyzeSentiment('This is a product with some features');

      expect(result.sentiment).toBe('neutral');
      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0);
    });

    test('should handle empty text gracefully', async () => {
      console.log('LOG: TEST-BOOST-SENTIMENT-4 - Testing empty text handling');
      
      const result = await boostEngine.analyzeSentiment('');

      expect(result).toBeDefined();
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('Reputation Metrics Calculation', () => {
    test('should calculate metrics from mentions correctly', () => {
      console.log('LOG: TEST-BOOST-METRICS-1 - Testing metrics calculation');
      
      const mockMentions = [
        { sentiment_score: 0.8, snippet: 'great product amazing features' },
        { sentiment_score: -0.3, snippet: 'bad experience terrible support' },
        { sentiment_score: 0.1, snippet: 'okay product decent quality' }
      ];

      const metrics = boostEngine.calculateReputationMetrics(mockMentions);

      expect(metrics.mention_count).toBe(3);
      expect(metrics.positive_mentions).toBe(1);
      expect(metrics.negative_mentions).toBe(1);
      expect(metrics.neutral_mentions).toBe(1);
      expect(metrics.overall_sentiment).toBeCloseTo(0.2, 1);
      expect(metrics.visibility_score).toBe(30);
      expect(Array.isArray(metrics.trending_keywords)).toBe(true);
    });

    test('should handle empty mentions array', () => {
      console.log('LOG: TEST-BOOST-METRICS-2 - Testing empty mentions handling');
      
      const metrics = boostEngine.calculateReputationMetrics([]);

      expect(metrics.mention_count).toBe(0);
      expect(metrics.overall_sentiment).toBe(0);
      expect(metrics.visibility_score).toBe(0);
      expect(metrics.trending_keywords).toEqual([]);
    });
  });

  describe('Content Seeding Plans', () => {
    test('should create seeding plan for reputation repair', () => {
      console.log('LOG: TEST-BOOST-SEEDING-1 - Testing reputation repair seeding plan');
      
      const mockMetrics = {
        overall_sentiment: -0.5,
        visibility_score: 40,
        mention_count: 10,
        positive_mentions: 2,
        negative_mentions: 6,
        neutral_mentions: 2,
        trending_keywords: ['brand', 'product']
      };

      const plan = boostEngine.createSeedingPlan('test-content-1', mockMetrics);

      expect(plan.seeding_strategy).toBe('reputation_repair');
      expect(plan.priority).toBe('high');
      expect(plan.target_platforms).toContain('LinkedIn');
      expect(plan.estimated_reach).toBeGreaterThan(0);
      expect(plan.status).toBe('pending');
    });

    test('should create seeding plan for visibility boost', () => {
      console.log('LOG: TEST-BOOST-SEEDING-2 - Testing visibility boost seeding plan');
      
      const mockMetrics = {
        overall_sentiment: 0.2,
        visibility_score: 15,
        mention_count: 3,
        positive_mentions: 2,
        negative_mentions: 0,
        neutral_mentions: 1,
        trending_keywords: ['brand']
      };

      const plan = boostEngine.createSeedingPlan('test-content-2', mockMetrics);

      expect(plan.seeding_strategy).toBe('visibility_boost');
      expect(plan.priority).toBe('high');
      expect(plan.target_platforms).toContain('Twitter');
    });

    test('should create viral seeding plan for good metrics', () => {
      console.log('LOG: TEST-BOOST-SEEDING-3 - Testing viral seeding plan');
      
      const mockMetrics = {
        overall_sentiment: 0.6,
        visibility_score: 60,
        mention_count: 20,
        positive_mentions: 15,
        negative_mentions: 2,
        neutral_mentions: 3,
        trending_keywords: ['amazing', 'great', 'love']
      };

      const plan = boostEngine.createSeedingPlan('test-content-3', mockMetrics);

      expect(plan.seeding_strategy).toBe('viral');
      expect(plan.target_platforms).toContain('Twitter');
      expect(plan.target_platforms).toContain('TikTok');
    });

    test('should respect explicit strategy parameter', () => {
      console.log('LOG: TEST-BOOST-SEEDING-4 - Testing explicit strategy parameter');
      
      const mockMetrics = {
        overall_sentiment: 0.6,
        visibility_score: 60,
        mention_count: 20,
        positive_mentions: 15,
        negative_mentions: 2,
        neutral_mentions: 3,
        trending_keywords: []
      };

      const plan = boostEngine.createSeedingPlan('test-content-4', mockMetrics, 'reputation_repair');

      expect(plan.seeding_strategy).toBe('reputation_repair');
    });
  });

  describe('Ethics Checks', () => {
    test('should pass ethics check for normal scenarios', () => {
      console.log('LOG: TEST-BOOST-ETHICS-1 - Testing normal ethics check');
      
      const mockMetrics = {
        overall_sentiment: 0.3,
        visibility_score: 50,
        negative_mentions: 2,
        positive_mentions: 8
      };

      const plan = boostEngine.createSeedingPlan('test-content-5', mockMetrics, 'viral');

      expect(plan.seeding_strategy).toBe('viral');
    });

    test('should fail ethics check for excessive negative sentiment', () => {
      console.log('LOG: TEST-BOOST-ETHICS-2 - Testing ethics check failure');
      
      const mockMetrics = {
        overall_sentiment: -0.7,
        visibility_score: 30,
        negative_mentions: 15,
        positive_mentions: 2
      };

      const plan = boostEngine.createSeedingPlan('test-content-6', mockMetrics, 'reputation_repair');

      // Should fallback to safer strategy
      expect(plan.seeding_strategy).toBe('visibility_boost');
    });

    test('should prevent over-amplification', () => {
      console.log('LOG: TEST-BOOST-ETHICS-3 - Testing over-amplification prevention');
      
      const mockMetrics = {
        overall_sentiment: 0.8,
        visibility_score: 90,
        negative_mentions: 1,
        positive_mentions: 20
      };

      const plan = boostEngine.createSeedingPlan('test-content-7', mockMetrics, 'viral');

      // Should fallback due to high visibility
      expect(plan.seeding_strategy).toBe('visibility_boost');
    });
  });
});