// Engagement tracking and analytics engine
// LOG: ENGAGE-INIT-1 - Initialize engagement tracking system

export interface EngagementEvent {
  id: string;
  content_id: string;
  user_id?: string;
  event_type: 'view' | 'share' | 'click' | 'like' | 'comment';
  event_data?: unknown; // Additional event-specific data
  timestamp: string;
  session_id?: string;
  referrer?: string;
  device_info?: string;
}

export interface EngagementMetrics {
  content_id: string;
  total_views: number;
  unique_views: number;
  total_shares: number;
  total_clicks: number;
  engagement_rate: number;
  avg_time_on_content: number;
  bounce_rate: number;
  conversion_rate: number;
  last_updated: string;
}

export interface AnalyticsData {
  overview: {
    total_content: number;
    total_views: number;
    total_engagement: number;
    avg_engagement_rate: number;
  };
  top_content: Array<{
    content_id: string;
    title: string;
    views: number;
    engagement_rate: number;
  }>;
  engagement_trends: Array<{
    date: string;
    views: number;
    engagements: number;
  }>;
  real_time_metrics: {
    active_users: number;
    current_views: number;
    recent_events: EngagementEvent[];
  };
}

// SSE client management
const sseClients = new Set<ReadableStreamDefaultController>();

export class EngagementTracker {
  private eventQueue: EngagementEvent[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('LOG: ENGAGE-TRACKER-1 - Engagement tracker initialized');
    this.startProcessing();
  }

  // Track engagement event
  async trackEvent(event: Omit<EngagementEvent, 'id' | 'timestamp'>): Promise<void> {
    console.log('LOG: ENGAGE-TRACK-1 - Tracking event:', event.event_type, 'for content:', event.content_id);
    
    const fullEvent: EngagementEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString()
    };

    // Add to processing queue
    this.eventQueue.push(fullEvent);
    
    // Notify real-time clients immediately for certain events
    if (['view', 'share', 'click'].includes(event.event_type)) {
      this.notifySSEClients({
        type: 'engagement_event',
        data: fullEvent
      });
    }

    console.log('LOG: ENGAGE-TRACK-2 - Event queued for processing');
  }

  // Process queued events and update metrics
  private async processEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    console.log('LOG: ENGAGE-PROCESS-1 - Processing', this.eventQueue.length, 'events');
    
    try {
      const eventsToProcess = [...this.eventQueue];
      this.eventQueue = [];

      // Group events by content_id for efficient processing
      const eventsByContent = this.groupEventsByContent(eventsToProcess);
      
      for (const [contentId, events] of eventsByContent.entries()) {
        await this.updateContentMetrics(contentId, events);
      }

      // Notify SSE clients of updated metrics
      const updatedMetrics = await this.getAnalyticsData();
      this.notifySSEClients({
        type: 'analytics_update',
        data: updatedMetrics
      });

      console.log('LOG: ENGAGE-PROCESS-2 - Events processed successfully');
    } catch (error) {
      console.error('LOG: ENGAGE-PROCESS-ERROR-1 - Failed to process events:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  // Update metrics for specific content
  private async updateContentMetrics(contentId: string, events: EngagementEvent[]): Promise<void> {
    console.log('LOG: ENGAGE-METRICS-1 - Updating metrics for content:', contentId);
    
    try {
      // Calculate metrics from events
      const metrics = this.calculateMetrics(events);
      
      // In a real implementation, this would update the database
      // For now, we'll store in memory or use the existing content.metadata field
      await this.storeMetrics(contentId, metrics);
      
      console.log('LOG: ENGAGE-METRICS-2 - Metrics updated for content:', contentId);
    } catch (error) {
      console.error('LOG: ENGAGE-METRICS-ERROR-1 - Failed to update metrics:', error);
      throw error;
    }
  }

  // Calculate engagement metrics from events
  private calculateMetrics(events: EngagementEvent[]): Partial<EngagementMetrics> {
    const views = events.filter(e => e.event_type === 'view').length;
    const shares = events.filter(e => e.event_type === 'share').length;
    const clicks = events.filter(e => e.event_type === 'click').length;
    const uniqueUsers = new Set(events.map(e => e.user_id || e.session_id)).size;
    
    const totalEngagements = shares + clicks;
    const engagementRate = views > 0 ? (totalEngagements / views) * 100 : 0;

    return {
      total_views: views,
      unique_views: uniqueUsers,
      total_shares: shares,
      total_clicks: clicks,
      engagement_rate: engagementRate,
      last_updated: new Date().toISOString()
    };
  }

  // Store metrics (placeholder - would use database in real implementation)
  private async storeMetrics(contentId: string, metrics: Partial<EngagementMetrics>): Promise<void> {
    // In a real implementation, this would update the content.metadata field
    // For now, we'll use a simple in-memory store
    if (typeof window === 'undefined') {
      // Server-side storage simulation
      global.contentMetrics = global.contentMetrics || new Map();
      global.contentMetrics.set(contentId, {
        ...global.contentMetrics.get(contentId),
        ...metrics
      });
    }
  }

  // Get comprehensive analytics data
  async getAnalyticsData(): Promise<AnalyticsData> {
    console.log('LOG: ENGAGE-ANALYTICS-1 - Generating analytics data');
    
    try {
      // In a real implementation, this would query the database
      const mockData: AnalyticsData = {
        overview: {
          total_content: 15,
          total_views: 12450,
          total_engagement: 892,
          avg_engagement_rate: 7.2
        },
        top_content: [
          {
            content_id: 'content1',
            title: 'AI Revolution in Content Creation',
            views: 3200,
            engagement_rate: 12.5
          },
          {
            content_id: 'content2',
            title: 'Future of Social Media Marketing',
            views: 2800,
            engagement_rate: 9.8
          }
        ],
        engagement_trends: this.generateTrendData(),
        real_time_metrics: {
          active_users: Math.floor(Math.random() * 50) + 10,
          current_views: Math.floor(Math.random() * 100) + 20,
          recent_events: this.getRecentEvents()
        }
      };

      console.log('LOG: ENGAGE-ANALYTICS-2 - Analytics data generated');
      return mockData;
    } catch (error) {
      console.error('LOG: ENGAGE-ANALYTICS-ERROR-1 - Failed to generate analytics:', error);
      throw error;
    }
  }

  // Generate trend data for charts
  private generateTrendData(): Array<{ date: string; views: number; engagements: number }> {
    const trends = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 1000) + 500,
        engagements: Math.floor(Math.random() * 100) + 50
      });
    }
    
    return trends;
  }

  // Get recent events for real-time display
  private getRecentEvents(): EngagementEvent[] {
    // Return last 10 events from queue or recent processed events
    return this.eventQueue.slice(-10);
  }

  // Group events by content ID
  private groupEventsByContent(events: EngagementEvent[]): Map<string, EngagementEvent[]> {
    const grouped = new Map<string, EngagementEvent[]>();
    
    events.forEach(event => {
      const existing = grouped.get(event.content_id) || [];
      existing.push(event);
      grouped.set(event.content_id, existing);
    });
    
    return grouped;
  }

  // Generate unique event ID
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Start background processing
  private startProcessing(): void {
    console.log('LOG: ENGAGE-PROCESS-3 - Starting background event processing');
    
    this.processingInterval = setInterval(() => {
      this.processEvents();
    }, 5000); // Process every 5 seconds
  }

  // Stop background processing
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('LOG: ENGAGE-PROCESS-4 - Background processing stopped');
    }
  }

  // SSE client management
  addSSEClient(controller: ReadableStreamDefaultController): void {
    sseClients.add(controller);
    console.log('LOG: ENGAGE-SSE-1 - SSE client added, total clients:', sseClients.size);
  }

  removeSSEClient(controller: ReadableStreamDefaultController): void {
    sseClients.delete(controller);
    console.log('LOG: ENGAGE-SSE-2 - SSE client removed, total clients:', sseClients.size);
  }

  // Notify all SSE clients
  private notifySSEClients(message: { type: string; data: any }): void {
    const eventData = `data: ${JSON.stringify(message)}\n\n`;
    
    sseClients.forEach(controller => {
      try {
        controller.enqueue(eventData);
      } catch (error) {
        console.error('LOG: ENGAGE-SSE-ERROR-1 - Failed to send to SSE client:', error);
        sseClients.delete(controller);
      }
    });
    
    if (sseClients.size > 0) {
      console.log('LOG: ENGAGE-SSE-3 - Notified', sseClients.size, 'SSE clients');
    }
  }
}

// Export singleton instance
export const engagementTracker = new EngagementTracker();

// Client-side tracking utilities
export class ClientTracker {
  private sessionId: string;
  private userId?: string;

  constructor(userId?: string) {
    this.sessionId = this.generateSessionId();
    this.userId = userId;
    console.log('LOG: ENGAGE-CLIENT-1 - Client tracker initialized');
  }

  // Track page view
  async trackView(contentId: string, additionalData?: unknown): Promise<void> {
    return this.sendEvent({
      content_id: contentId,
      user_id: this.userId,
      event_type: 'view',
      event_data: additionalData,
      session_id: this.sessionId,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined,
      device_info: this.getDeviceInfo()
    });
  }

  // Track share action
  async trackShare(contentId: string, platform: string): Promise<void> {
    return this.sendEvent({
      content_id: contentId,
      user_id: this.userId,
      event_type: 'share',
      event_data: { platform },
      session_id: this.sessionId
    });
  }

  // Track click action
  async trackClick(contentId: string, element: string): Promise<void> {
    return this.sendEvent({
      content_id: contentId,
      user_id: this.userId,
      event_type: 'click',
      event_data: { element },
      session_id: this.sessionId
    });
  }

  // Send event to server
  private async sendEvent(event: Omit<EngagementEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const response = await fetch('/api/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('LOG: ENGAGE-CLIENT-2 - Event sent successfully:', event.event_type);
    } catch (error) {
      console.error('LOG: ENGAGE-CLIENT-ERROR-1 - Failed to send event:', error);
      // Could implement retry logic or local storage for offline events
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Get basic device info
  private getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'server';
    
    return `${window.navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'}_${window.screen.width}x${window.screen.height}`;
  }
}