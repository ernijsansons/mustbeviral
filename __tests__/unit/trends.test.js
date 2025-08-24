// Unit tests for trend monitoring engine
// LOG: TEST-TRENDS-1 - Trend monitoring unit tests

const { TrendMonitoringEngine } = require('../../src/lib/trends');

// Mock google-trends-api
jest.mock('google-trends-api', () => ({
  dailyTrends: jest.fn(),
  interestOverTime: jest.fn(),
  relatedQueries: jest.fn()
}));

const googleTrends = require('google-trends-api');

describe('TrendMonitoringEngine', () => {
  let trendEngine;

  beforeEach(() => {
    console.log('LOG: TEST-TRENDS-SETUP-1 - Setting up trend engine test');
    trendEngine = new TrendMonitoringEngine();
    jest.clearAllMocks();
  });

  describe('Trending Topics', () => {
    test('should fetch trending topics successfully', async () => {
      console.log('LOG: TEST-TRENDS-FETCH-1 - Testing trending topics fetch');
      
      const mockResponse = JSON.stringify({
        default: {
          trendingSearchesDays: [{
            trendingSearches: [{
              title: { query: 'AI Technology' },
              formattedTraffic: '100K+',
              relatedQueries: [{ query: 'machine learning' }],
              articles: [{ source: 'tech' }]
            }]
          }]
        }
      });

      googleTrends.dailyTrends.mockResolvedValue(mockResponse);

      const result = await trendEngine.fetchTrendingTopics('US');

      expect(result).toHaveLength(1);
      expect(result[0].keyword).toBe('AI Technology');
      expect(result[0].source).toBe('google_trends');
      expect(googleTrends.dailyTrends).toHaveBeenCalledWith({
        trendDate: expect.any(Date),
        geo: 'US'
      });
    });

    test('should handle API failures gracefully', async () => {
      console.log('LOG: TEST-TRENDS-FETCH-2 - Testing API failure handling');
      
      googleTrends.dailyTrends.mockRejectedValue(new Error('API Error'));

      const result = await trendEngine.fetchTrendingTopics('US');

      expect(result).toHaveLength(2); // Should return fallback trends
      expect(result[0].source).toBe('manual');
    });

    test('should handle malformed API responses', async () => {
      console.log('LOG: TEST-TRENDS-FETCH-3 - Testing malformed response handling');
      
      googleTrends.dailyTrends.mockResolvedValue('invalid json');

      const result = await trendEngine.fetchTrendingTopics('US');

      expect(result).toHaveLength(2); // Should return fallback trends
    });
  });

  describe('Keyword Trends', () => {
    test('should fetch keyword trends successfully', async () => {
      console.log('LOG: TEST-TRENDS-KEYWORD-1 - Testing keyword trends fetch');
      
      const mockResponse = JSON.stringify({
        default: {
          timelineData: [
            { value: [75, 60] },
            { value: [80, 65] }
          ]
        }
      });

      googleTrends.interestOverTime.mockResolvedValue(mockResponse);

      const result = await trendEngine.getKeywordTrends(['AI', 'content']);

      expect(result).toHaveLength(2);
      expect(result[0].keyword).toBe('AI');
      expect(result[0].trend_score).toBe(80); // Latest value
      expect(result[1].keyword).toBe('content');
      expect(result[1].trend_score).toBe(65);
    });

    test('should handle empty keyword list', async () => {
      console.log('LOG: TEST-TRENDS-KEYWORD-2 - Testing empty keyword list');
      
      const result = await trendEngine.getKeywordTrends([]);

      expect(result).toHaveLength(0);
    });
  });

  describe('Related Queries', () => {
    test('should fetch related queries successfully', async () => {
      console.log('LOG: TEST-TRENDS-RELATED-1 - Testing related queries fetch');
      
      const mockResponse = JSON.stringify({
        default: {
          rankedList: [{
            rankedKeyword: [
              { query: 'artificial intelligence' },
              { query: 'machine learning' },
              { query: 'AI news' }
            ]
          }]
        }
      });

      googleTrends.relatedQueries.mockResolvedValue(mockResponse);

      const result = await trendEngine.getRelatedQueries('AI');

      expect(result).toHaveLength(3);
      expect(result).toContain('artificial intelligence');
      expect(result).toContain('machine learning');
      expect(result).toContain('AI news');
    });

    test('should handle API failures for related queries', async () => {
      console.log('LOG: TEST-TRENDS-RELATED-2 - Testing related queries API failure');
      
      googleTrends.relatedQueries.mockRejectedValue(new Error('API Error'));

      const result = await trendEngine.getRelatedQueries('AI');

      expect(result).toHaveLength(0);
    });
  });

  describe('Viral Potential Analysis', () => {
    test('should calculate viral potential correctly', () => {
      console.log('LOG: TEST-TRENDS-VIRAL-1 - Testing viral potential calculation');
      
      const mockTrends = [
        {
          keyword: 'AI technology',
          trend_score: 80,
          related_queries: ['artificial intelligence', 'machine learning']
        },
        {
          keyword: 'content creation',
          trend_score: 60,
          related_queries: ['digital content', 'social media']
        }
      ];

      const result = trendEngine.analyzeViralPotential(['AI', 'content'], mockTrends);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    test('should handle keywords with no matches', () => {
      console.log('LOG: TEST-TRENDS-VIRAL-2 - Testing no matches scenario');
      
      const mockTrends = [
        { keyword: 'unrelated topic', trend_score: 50, related_queries: [] }
      ];

      const result = trendEngine.analyzeViralPotential(['nonexistent'], mockTrends);

      expect(result).toBe(30); // Base score for no matches
    });
  });

  describe('Growth Predictions', () => {
    test('should predict growth with sufficient data', async () => {
      console.log('LOG: TEST-TRENDS-PREDICT-1 - Testing growth prediction');
      
      // Mock keyword trends with growth pattern
      const mockResponse = JSON.stringify({
        default: {
          timelineData: [
            { value: [50] },
            { value: [55] },
            { value: [60] },
            { value: [70] },
            { value: [75] }
          ]
        }
      });

      googleTrends.interestOverTime.mockResolvedValue(mockResponse);

      const result = await trendEngine.predictTrendGrowth('AI');

      expect(result.keyword).toBe('AI');
      expect(typeof result.predicted_growth).toBe('number');
      expect(result.confidence_level).toBeGreaterThan(0);
      expect(result.time_horizon).toBe('7d');
    });

    test('should handle insufficient data for predictions', async () => {
      console.log('LOG: TEST-TRENDS-PREDICT-2 - Testing insufficient data scenario');
      
      googleTrends.interestOverTime.mockResolvedValue(JSON.stringify({
        default: { timelineData: [] }
      }));

      const result = await trendEngine.predictTrendGrowth('unknown');

      expect(result.keyword).toBe('unknown');
      expect(result.confidence_level).toBe(30); // Low confidence fallback
      expect(result.factors).toContain('insufficient_data');
    });
  });

  describe('Content Suggestions', () => {
    test('should generate content suggestions', () => {
      console.log('LOG: TEST-TRENDS-SUGGEST-1 - Testing content suggestions');
      
      const mockTrends = [
        {
          keyword: 'AI technology trends',
          category: 'technology',
          related_queries: ['machine learning', 'artificial intelligence'],
          trend_score: 75
        }
      ];

      const result = trendEngine.getContentSuggestions('AI', mockTrends);

      expect(result.trending_keywords).toHaveLength(1);
      expect(result.related_topics).toContain('machine learning');
      expect(result.viral_potential).toBeGreaterThan(0);
      expect(result.content_angles).toHaveLength(5);
      expect(result.optimal_timing).toBeDefined();
    });

    test('should handle topics with no relevant trends', () => {
      console.log('LOG: TEST-TRENDS-SUGGEST-2 - Testing no relevant trends');
      
      const mockTrends = [
        { keyword: 'unrelated', category: 'other', related_queries: [], trend_score: 30 }
      ];

      const result = trendEngine.getContentSuggestions('nonexistent', mockTrends);

      expect(result.trending_keywords).toHaveLength(0);
      expect(result.content_angles).toHaveLength(3); // Base angles
    });
  });

  describe('Caching', () => {
    test('should cache results and return cached data', async () => {
      console.log('LOG: TEST-TRENDS-CACHE-1 - Testing caching mechanism');
      
      const mockResponse = JSON.stringify({
        default: { trendingSearchesDays: [{ trendingSearches: [] }] }
      });

      googleTrends.dailyTrends.mockResolvedValue(mockResponse);

      // First call
      await trendEngine.fetchTrendingTopics('US');
      expect(googleTrends.dailyTrends).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await trendEngine.fetchTrendingTopics('US');
      expect(googleTrends.dailyTrends).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });
});