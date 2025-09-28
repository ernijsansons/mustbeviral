// Analytics Controller - Handles event tracking and analytics processing

interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: number;
  context?: {
    userAgent?: string;
    ip?: string;
    referrer?: string;
    page?: string;
  };
}

interface ABTestVariant {
  testId: string;
  variant: string;
  userId: string;
  timestamp: number;
}

export class AnalyticsController {
  constructor(private env: any) {}

  // Track analytics event
  async trackEvent(eventData: AnalyticsEvent): Promise<{ success: boolean; eventId: string }> {
    try {
      const eventId = this.generateEventId();
      const timestamp = eventData.timestamp ?? Date.now();
      
      // Validate event data
      if (!eventData.event) {
        throw new Error('Event name is required');
      }

      // Store in D1 database
      await this.env.ANALYTICS_DB.prepare(`
        INSERT INTO analytics_events (id, event, user_id, session_id, properties, context, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        eventId,
        eventData.event,
        eventData.userId ?? null,
        eventData.sessionId ?? null,
        JSON.stringify(eventData.properties ?? {}),
        JSON.stringify(eventData.context ?? {}),
        timestamp,
        new Date().toISOString()
      ).run();

      // Cache in KV for real-time analytics
      await this.cacheEventForRealtime(eventId, eventData);

      // Queue for batch processing
      await this.env.ANALYTICS_QUEUE.send({
        type: 'analytics_event',
        eventId,
        eventData,
        timestamp
      });

      return { success: true, eventId };
    } catch (error) {
      console.error('Error tracking event:', error);
      throw error;
    }
  }

  // Get A/B test variant
  async getABTestVariant(testId: string, userId: string): Promise<string> {
    try {
      // Check if user already has a variant assigned
      const existing = await this.env.AB_TESTING.get(`${testId}:${userId}`);
      if (existing) {
        return existing;
      }

      // Get test configuration
      const testConfig = await this.env.AB_TESTING.get(`test:${testId}`);
      if (!testConfig) {
        throw new Error(`A/B test ${testId} not found`);
      }

      const config = JSON.parse(testConfig);
      const variants = config.variants ?? ['control', 'variant'];
      
      // Assign variant based on user ID hash
      const hash = this.hashUserId(userId);
      const variantIndex = hash % variants.length;
      const variant = variants[variantIndex];

      // Store variant assignment
      await this.env.AB_TESTING.put(`${testId}:${userId}`, variant);
      
      // Track variant assignment
      await this.trackEvent({
        event: 'ab_test_assigned',
        userId,
        properties: {
          testId,
          variant,
          assignmentMethod: 'hash_based'
        }
      });

      return variant;
    } catch (error) {
      console.error('Error getting A/B test variant:', error);
      return 'control'; // Default fallback
    }
  }

  // Track A/B test event
  async trackABTestEvent(eventData: {
    testId: string;
    userId: string;
    event: string;
    properties?: Record<string, any>;
  }): Promise<{ success: boolean }> {
    try {
      const variant = await this.getABTestVariant(eventData.testId, eventData.userId);
      
      await this.trackEvent({
        event: eventData.event,
        userId: eventData.userId,
        properties: {
          ...eventData.properties,
          abTestId: eventData.testId,
          abTestVariant: variant
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error tracking A/B test event:', error);
      throw error;
    }
  }

  // Get user behavior analytics
  async getUserBehavior(userId: string, timeRange: string = '7d'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const result = await this.env.ANALYTICS_DB.prepare(`
        SELECT 
          event,
          COUNT(*) as count,
          COUNT(DISTINCT session_id) as unique_sessions,
          AVG(CAST(properties->>'duration' AS REAL)) as avg_duration
        FROM analytics_events 
        WHERE user_id = ? AND created_at >= ?
        GROUP BY event
        ORDER BY count DESC
      `).bind(userId, timeFilter).all();

      return result.results;
    } catch (error) {
      console.error('Error getting user behavior:', error);
      throw error;
    }
  }

  // Get funnel analysis
  async getFunnelAnalysis(funnelSteps: string[], timeRange: string = '7d'): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const steps = funnelSteps.map(step => `'${step}'`).join(',');
      
      const result = await this.env.ANALYTICS_DB.prepare(`
        WITH funnel_data AS (
          SELECT 
            session_id,
            event,
            MIN(created_at) as first_occurrence
          FROM analytics_events 
          WHERE event IN (${steps}) AND created_at >= ?
          GROUP BY session_id, event
        ),
        funnel_progression AS (
          SELECT 
            session_id,
            COUNT(DISTINCT event) as steps_completed,
            MAX(first_occurrence) as last_step_time
          FROM funnel_data
          GROUP BY session_id
        )
        SELECT 
          steps_completed,
          COUNT(*) as sessions,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM funnel_progression
        GROUP BY steps_completed
        ORDER BY steps_completed
      `).bind(timeFilter).all();

      return result.results;
    } catch (error) {
      console.error('Error getting funnel analysis:', error);
      throw error;
    }
  }

  // Process analytics event (called from queue)
  async processAnalyticsEvent(message: any): Promise<void> {
    try {
      const { eventId, eventData, timestamp } = message;
      
      // Update real-time metrics
      await this.updateRealtimeMetrics(eventData);
      
      // Update user behavior tracking
      if (eventData.userId) {
        await this.updateUserBehavior(eventData.userId, eventData);
      }
      
      // Check for conversion events
      if (this.isConversionEvent(eventData.event)) {
        await this.trackConversion(eventData);
      }
      
    } catch (error) {
      console.error('Error processing analytics event:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getTimeFilter(timeRange: string): string {
    const now = new Date();
    let filterDate: Date;
    
    switch (timeRange) {
      case '1h':
        filterDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        filterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return filterDate.toISOString();
  }

  private async cacheEventForRealtime(eventId: string, eventData: AnalyticsEvent): Promise<void> {
    const cacheKey = `realtime:${eventData.event}:${Math.floor(Date.now() / 60000)}`; // 1-minute buckets
    await this.env.METRICS_CACHE.put(cacheKey, JSON.stringify({
      eventId,
      timestamp: Date.now(),
      event: eventData.event,
      userId: eventData.userId
    }));
  }

  private async updateRealtimeMetrics(eventData: AnalyticsEvent): Promise<void> {
    const metricsKey = `metrics:${eventData.event}`;
    const current = await this.env.METRICS_CACHE.get(metricsKey);
    const count = current ? parseInt(current) + 1 : 1;
    await this.env.METRICS_CACHE.put(metricsKey, count.toString(), { expirationTtl: 3600 });
  }

  private async updateUserBehavior(userId: string, eventData: AnalyticsEvent): Promise<void> {
    const behaviorKey = `behavior:${userId}`;
    const behavior = await this.env.BEHAVIOR_TRACKING.get(behaviorKey);
    const behaviorData = behavior ? JSON.parse(behavior) : { events: [], lastActivity: 0 };
    
    behaviorData.events.push({
      event: eventData.event,
      timestamp: Date.now(),
      properties: eventData.properties
    });
    
    // Keep only last 100 events
    if (behaviorData.events.length > 100) {
      behaviorData.events = behaviorData.events.slice(-100);
    }
    
    behaviorData.lastActivity = Date.now();
    
    await this.env.BEHAVIOR_TRACKING.put(behaviorKey, JSON.stringify(behaviorData), { expirationTtl: 86400 * 30 });
  }

  private isConversionEvent(event: string): boolean {
    const conversionEvents = ['purchase', 'signup', 'subscription', 'download', 'contact'];
    return conversionEvents.includes(event.toLowerCase());
  }

  private async trackConversion(eventData: AnalyticsEvent): Promise<void> {
    // Track conversion in separate table for analysis
    await this.env.ANALYTICS_DB.prepare(`
      INSERT INTO conversions (user_id, event, properties, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      eventData.userId,
      eventData.event,
      JSON.stringify(eventData.properties ?? {}),
      Date.now(),
      new Date().toISOString()
    ).run();
  }
}











