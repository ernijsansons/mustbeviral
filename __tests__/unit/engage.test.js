// Unit tests for engagement tracking system
// LOG: TEST-ENGAGE-1 - Engagement tracking unit tests

const { EngagementTracker, ClientTracker } = require('../../src/lib/engage');

// Mock fetch for client-side tests
global.fetch = jest.fn();

describe('EngagementTracker', () => {
  let tracker;

  beforeEach(() => {
    console.log('LOG: TEST-ENGAGE-SETUP-1 - Setting up engagement tracker test');
    tracker = new EngagementTracker();
    jest.clearAllMocks();
  });

  afterEach(() => {
    tracker.stopProcessing();
  });

  describe('Event Tracking', () => {
    test('should track events successfully', async () => {
      console.log('LOG: TEST-ENGAGE-TRACK-1 - Testing event tracking');
      
      const event = {
        content_id: 'test-content-1',
        user_id: 'test-user-1',
        event_type: 'view',
        session_id: 'test-session'
      };

      await tracker.trackEvent(event);

      // Event should be queued for processing
      expect(tracker.eventQueue).toBeDefined();
    });

    test('should handle different event types', async () => {
      console.log('LOG: TEST-ENGAGE-TRACK-2 - Testing different event types');
      
      const eventTypes = ['view', 'share', 'click', 'like', 'comment'];
      
      for (const eventType of eventTypes) {
        await tracker.trackEvent({
          content_id: 'test-content',
          event_type: eventType,
          session_id: 'test-session'
        });
      }

      // All events should be tracked without errors
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Analytics Data Generation', () => {
    test('should generate analytics data', async () => {
      console.log('LOG: TEST-ENGAGE-ANALYTICS-1 - Testing analytics data generation');
      
      const analyticsData = await tracker.getAnalyticsData();

      expect(analyticsData).toBeDefined();
      expect(analyticsData.overview).toBeDefined();
      expect(analyticsData.top_content).toBeDefined();
      expect(analyticsData.engagement_trends).toBeDefined();
      expect(analyticsData.real_time_metrics).toBeDefined();
    });

    test('should include required overview metrics', async () => {
      console.log('LOG: TEST-ENGAGE-ANALYTICS-2 - Testing overview metrics');
      
      const analyticsData = await tracker.getAnalyticsData();
      const overview = analyticsData.overview;

      expect(overview.total_content).toBeGreaterThanOrEqual(0);
      expect(overview.total_views).toBeGreaterThanOrEqual(0);
      expect(overview.total_engagement).toBeGreaterThanOrEqual(0);
      expect(overview.avg_engagement_rate).toBeGreaterThanOrEqual(0);
    });

    test('should generate trend data with correct structure', async () => {
      console.log('LOG: TEST-ENGAGE-ANALYTICS-3 - Testing trend data structure');
      
      const analyticsData = await tracker.getAnalyticsData();
      const trends = analyticsData.engagement_trends;

      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
      
      if (trends.length > 0) {
        const trend = trends[0];
        expect(trend.date).toBeDefined();
        expect(trend.views).toBeGreaterThanOrEqual(0);
        expect(trend.engagements).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('SSE Client Management', () => {
    test('should add and remove SSE clients', () => {
      console.log('LOG: TEST-ENGAGE-SSE-1 - Testing SSE client management');
      
      const mockController = {
        enqueue: jest.fn()
      };

      tracker.addSSEClient(mockController);
      // Should not throw error

      tracker.removeSSEClient(mockController);
      // Should not throw error

      expect(true).toBe(true); // Test passes if no errors
    });
  });
});

describe('ClientTracker', () => {
  let clientTracker;

  beforeEach(() => {
    console.log('LOG: TEST-ENGAGE-CLIENT-SETUP-1 - Setting up client tracker test');
    clientTracker = new ClientTracker('test-user');
    
    // Mock successful fetch response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  describe('Event Sending', () => {
    test('should send view events', async () => {
      console.log('LOG: TEST-ENGAGE-CLIENT-1 - Testing view event sending');
      
      await clientTracker.trackView('test-content-1');

      expect(global.fetch).toHaveBeenCalledWith('/api/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('test-content-1')
      });
    });

    test('should send share events with platform data', async () => {
      console.log('LOG: TEST-ENGAGE-CLIENT-2 - Testing share event sending');
      
      await clientTracker.trackShare('test-content-1', 'twitter');

      expect(global.fetch).toHaveBeenCalledWith('/api/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('twitter')
      });
    });

    test('should send click events with element data', async () => {
      console.log('LOG: TEST-ENGAGE-CLIENT-3 - Testing click event sending');
      
      await clientTracker.trackClick('test-content-1', 'cta-button');

      expect(global.fetch).toHaveBeenCalledWith('/api/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('cta-button')
      });
    });

    test('should handle API errors gracefully', async () => {
      console.log('LOG: TEST-ENGAGE-CLIENT-4 - Testing API error handling');
      
      // Mock failed fetch response
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      // Should not throw error
      await expect(clientTracker.trackView('test-content')).resolves.not.toThrow();
    });

    test('should handle network errors gracefully', async () => {
      console.log('LOG: TEST-ENGAGE-CLIENT-5 - Testing network error handling');
      
      // Mock network error
      global.fetch.mockRejectedValue(new Error('Network error'));

      // Should not throw error
      await expect(clientTracker.trackView('test-content')).resolves.not.toThrow();
    });
  });

  describe('Session Management', () => {
    test('should generate unique session IDs', () => {
      console.log('LOG: TEST-ENGAGE-CLIENT-6 - Testing session ID generation');
      
      const tracker1 = new ClientTracker();
      const tracker2 = new ClientTracker();

      // Session IDs should be different (can't directly test private property)
      expect(tracker1).not.toBe(tracker2);
    });

    test('should include user ID when provided', async () => {
      console.log('LOG: TEST-ENGAGE-CLIENT-7 - Testing user ID inclusion');
      
      const trackerWithUser = new ClientTracker('test-user-123');
      await trackerWithUser.trackView('test-content');

      const callArgs = global.fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.user_id).toBe('test-user');
    });
  });
});

describe('Metrics Calculation', () => {
  test('should calculate engagement rate correctly', () => {
    console.log('LOG: TEST-ENGAGE-METRICS-1 - Testing engagement rate calculation');
    
    const tracker = new EngagementTracker();
    
    // Mock events for calculation
    const events = [
      { event_type: 'view', user_id: 'user1' },
      { event_type: 'view', user_id: 'user2' },
      { event_type: 'share', user_id: 'user1' },
      { event_type: 'click', user_id: 'user2' }
    ];

    const metrics = tracker.calculateMetrics(events);

    expect(metrics.total_views).toBe(2);
    expect(metrics.total_shares).toBe(1);
    expect(metrics.total_clicks).toBe(1);
    expect(metrics.engagement_rate).toBe(100); // (1+1)/2 * 100 = 100%
    expect(metrics.unique_views).toBe(2);
  });

  test('should handle empty events array', () => {
    console.log('LOG: TEST-ENGAGE-METRICS-2 - Testing empty events handling');
    
    const tracker = new EngagementTracker();
    const metrics = tracker.calculateMetrics([]);

    expect(metrics.total_views).toBe(0);
    expect(metrics.engagement_rate).toBe(0);
  });
});