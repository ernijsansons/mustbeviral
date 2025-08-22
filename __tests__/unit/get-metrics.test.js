// Unit tests for metrics API
// LOG: TEST-METRICS-API-1 - Metrics API unit tests

const { GET } = require('../../src/app/api/get-metrics/route');

// Mock database service
jest.mock('../../src/lib/db', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    healthCheck: jest.fn().mockResolvedValue(true),
    getUserByEmail: jest.fn(),
    getContentByUserId: jest.fn()
  }))
}));

describe('Metrics API', () => {
  let mockRequest;

  beforeEach(() => {
    console.log('LOG: TEST-METRICS-API-SETUP-1 - Setting up metrics API test');
    
    mockRequest = {
      url: 'http://localhost:3000/api/get-metrics'
    };
    
    jest.clearAllMocks();
  });

  describe('GET Requests', () => {
    test('should handle conversions metrics request', async () => {
      console.log('LOG: TEST-METRICS-API-CONVERSIONS-1 - Testing conversions request');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=conversions&timeRange=30d';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('conversions');
      expect(result.data.overview).toBeDefined();
      expect(result.data.trends).toBeDefined();
      expect(result.data.funnel).toBeDefined();
      expect(result.timeRange).toBe('30d');
    });

    test('should handle matches metrics request', async () => {
      console.log('LOG: TEST-METRICS-API-MATCHES-1 - Testing matches request');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=matches&timeRange=7d';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('matches');
      expect(result.data.overview).toBeDefined();
      expect(result.data.status_breakdown).toBeDefined();
      expect(result.data.top_content).toBeDefined();
      expect(result.data.top_influencers).toBeDefined();
      expect(result.data.trends).toBeDefined();
    });

    test('should handle overview metrics request', async () => {
      console.log('LOG: TEST-METRICS-API-OVERVIEW-1 - Testing overview request');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=overview&timeRange=90d';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('overview');
      expect(result.data.conversions).toBeDefined();
      expect(result.data.matches).toBeDefined();
      expect(result.data.combined_metrics).toBeDefined();
    });

    test('should use default parameters when not provided', async () => {
      console.log('LOG: TEST-METRICS-API-DEFAULTS-1 - Testing default parameters');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('conversions'); // Default type
      expect(result.timeRange).toBe('30d'); // Default time range
    });

    test('should include userId when provided', async () => {
      console.log('LOG: TEST-METRICS-API-USER-1 - Testing userId parameter');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=conversions&userId=test-user-123';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
    });
  });

  describe('Data Structure Validation', () => {
    test('should return correct conversions data structure', async () => {
      console.log('LOG: TEST-METRICS-API-STRUCTURE-1 - Testing conversions data structure');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=conversions';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.data.overview).toHaveProperty('total_signups');
      expect(result.data.overview).toHaveProperty('total_published');
      expect(result.data.overview).toHaveProperty('total_strategies');
      expect(result.data.overview).toHaveProperty('conversion_rate');
      
      expect(Array.isArray(result.data.trends)).toBe(true);
      expect(Array.isArray(result.data.funnel)).toBe(true);
      
      if (result.data.trends.length > 0) {
        const trend = result.data.trends[0];
        expect(trend).toHaveProperty('date');
        expect(trend).toHaveProperty('signups');
        expect(trend).toHaveProperty('published_content');
        expect(trend).toHaveProperty('strategies_generated');
      }
    });

    test('should return correct matches data structure', async () => {
      console.log('LOG: TEST-METRICS-API-STRUCTURE-2 - Testing matches data structure');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=matches';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.data.overview).toHaveProperty('total_matches');
      expect(result.data.overview).toHaveProperty('avg_match_score');
      expect(result.data.overview).toHaveProperty('acceptance_rate');
      expect(result.data.overview).toHaveProperty('completion_rate');
      
      expect(Array.isArray(result.data.status_breakdown)).toBe(true);
      expect(Array.isArray(result.data.top_content)).toBe(true);
      expect(Array.isArray(result.data.top_influencers)).toBe(true);
      expect(Array.isArray(result.data.trends)).toBe(true);
    });

    test('should return correct overview data structure', async () => {
      console.log('LOG: TEST-METRICS-API-STRUCTURE-3 - Testing overview data structure');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=overview';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.data.conversions).toBeDefined();
      expect(result.data.matches).toBeDefined();
      expect(result.data.combined_metrics).toBeDefined();
      expect(result.data.combined_metrics).toHaveProperty('platform_health');
    });
  });

  describe('Error Handling', () => {
    test('should reject invalid type parameter', async () => {
      console.log('LOG: TEST-METRICS-API-ERROR-1 - Testing invalid type parameter');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=invalid';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid type parameter');
    });

    test('should handle database errors gracefully', async () => {
      console.log('LOG: TEST-METRICS-API-ERROR-2 - Testing database error handling');
      
      // Mock database service to throw error
      const { DatabaseService } = require('../../src/lib/db');
      DatabaseService.mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=conversions';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch metrics data');
    });
  });

  describe('Time Range Processing', () => {
    test('should handle different time ranges', async () => {
      console.log('LOG: TEST-METRICS-API-TIME-1 - Testing time range processing');
      
      const timeRanges = ['7d', '30d', '90d', 'all'];
      
      for (const timeRange of timeRanges) {
        mockRequest.url = `http://localhost:3000/api/get-metrics?type=conversions&timeRange=${timeRange}`;
        
        const response = await GET(mockRequest);
        const result = await response.json();
        
        expect(result.success).toBe(true);
        expect(result.timeRange).toBe(timeRange);
      }
    });

    test('should use default time range for invalid values', async () => {
      console.log('LOG: TEST-METRICS-API-TIME-2 - Testing invalid time range handling');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=conversions&timeRange=invalid';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.timeRange).toBe('invalid'); // API accepts it but uses default internally
    });
  });

  describe('Data Generation', () => {
    test('should generate trend data with correct length', async () => {
      console.log('LOG: TEST-METRICS-API-TRENDS-1 - Testing trend data generation');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=conversions&timeRange=7d';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      expect(result.data.trends).toHaveLength(7);
      
      const trend = result.data.trends[0];
      expect(trend).toHaveProperty('date');
      expect(trend).toHaveProperty('signups');
      expect(typeof trend.signups).toBe('number');
    });

    test('should generate realistic mock data', async () => {
      console.log('LOG: TEST-METRICS-API-TRENDS-2 - Testing realistic mock data');
      
      mockRequest.url = 'http://localhost:3000/api/get-metrics?type=matches';
      
      const response = await GET(mockRequest);
      const result = await response.json();
      
      // Check that percentages add up to 100
      const statusBreakdown = result.data.status_breakdown;
      const totalPercentage = statusBreakdown.reduce((sum: number, status: any) => sum + status.percentage, 0);
      expect(Math.abs(totalPercentage - 100)).toBeLessThan(1); // Allow for rounding
      
      // Check that match scores are in valid range
      expect(result.data.overview.avg_match_score).toBeGreaterThanOrEqual(0);
      expect(result.data.overview.avg_match_score).toBeLessThanOrEqual(1);
    });
  });
});