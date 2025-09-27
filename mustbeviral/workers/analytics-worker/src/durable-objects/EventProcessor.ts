// Event Processor Durable Object
// Handles batch processing of analytics events

interface EventData {
  id: string;
  event: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  context?: Record<string, any>;
  timestamp: number;
}

interface ProcessingBatch {
  id: string;
  events: EventData[];
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class EventProcessor {
  private state: DurableObjectState;
  private env: any;
  private processingQueue: ProcessingBatch[] = [];
  private isProcessing = false;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;

    // Schedule periodic processing
    this.scheduleProcessing();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/process':
        return this.handleProcess(request);
      case '/batch':
        return this.handleBatch(request);
      case '/status':
        return this.handleStatus(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleProcess(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const eventData = await request.json() as EventData;
      await this.addEventToBatch(eventData);

      return new Response(JSON.stringify({
        success: true,
        message: 'Event added to processing queue'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error processing event:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleBatch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { events } = await request.json() as { events: EventData[] };

      if (!Array.isArray(events)) {
        return new Response('Events must be an array', { status: 400 });
      }

      const batchId = await this.createBatch(events);

      return new Response(JSON.stringify({
        success: true,
        batchId,
        eventCount: events.length
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error handling batch:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleStatus(request: Request): Promise<Response> {
    const status = {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      timestamp: Date.now(),
      batches: this.processingQueue.map(batch => ({
        id: batch.id,
        eventCount: batch.events.length,
        status: batch.status,
        createdAt: batch.createdAt
      }))
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async addEventToBatch(eventData: EventData): Promise<void> {
    // Find or create current batch
    let currentBatch = this.processingQueue.find(
      batch => batch.status === 'pending' && batch.events.length < 100
    );

    if (!currentBatch) {
      currentBatch = {
        id: this.generateBatchId(),
        events: [],
        createdAt: Date.now(),
        status: 'pending'
      };
      this.processingQueue.push(currentBatch);
    }

    currentBatch.events.push(eventData);

    // Trigger processing if batch is full
    if (currentBatch.events.length >= 100) {
      this.triggerProcessing();
    }
  }

  private async createBatch(events: EventData[]): Promise<string> {
    const batch: ProcessingBatch = {
      id: this.generateBatchId(),
      events,
      createdAt: Date.now(),
      status: 'pending'
    };

    this.processingQueue.push(batch);
    this.triggerProcessing();

    return batch.id;
  }

  private async triggerProcessing(): Promise<void> {
    if (this.isProcessing) {return;}

    setTimeout(() => {
      this.processQueue();
    }, 100); // Small delay to allow batching
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {return;}

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const batch = this.processingQueue.find(b => b.status === 'pending');
        if (!batch) {break;}

        batch.status = 'processing';

        try {
          await this.processBatch(batch);
          batch.status = 'completed';

          // Remove completed batch from queue
          const index = this.processingQueue.indexOf(batch);
          if (index > -1) {
            this.processingQueue.splice(index, 1);
          }

        } catch (error) {
          console.error('Error processing batch:', error);
          batch.status = 'failed';
        }
      }

    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatch(batch: ProcessingBatch): Promise<void> {
    // Process events in parallel
    const promises = batch.events.map(event => this.processEvent(event));
    await Promise.allSettled(promises);

    // Update aggregated metrics
    await this.updateAggregatedMetrics(batch.events);

    // Notify real-time analytics
    await this.notifyRealtimeAnalytics(batch);
  }

  private async processEvent(event: EventData): Promise<void> {
    try {
      // Store in D1 database
      await this.env.ANALYTICS_DB.prepare(`
        INSERT INTO analytics_events (id, event, user_id, session_id, properties, context, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        event.id,
        event.event,
        event.userId ?? null,
        event.sessionId ?? null,
        JSON.stringify(event.properties ?? {}),
        JSON.stringify(event.context ?? {}),
        event.timestamp,
        new Date().toISOString()
      ).run();

      // Update user behavior if userId exists
      if (event.userId) {
        await this.updateUserBehavior(event.userId, event);
      }

    } catch (error) {
      console.error('Error processing individual event:', error);
      throw error;
    }
  }

  private async updateAggregatedMetrics(events: EventData[]): Promise<void> {
    const eventCounts: Record<string, number> = {};
    const userEvents: Record<string, Set<string>> = {};

    // Count events and unique users
    for (const event of events) {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;

      if (event.userId) {
        if (!userEvents[event.event]) {
          userEvents[event.event] = new Set();
        }
        userEvents[event.event].add(event.userId);
      }
    }

    // Update KV cache with aggregated data
    for (const [eventName, count] of Object.entries(eventCounts)) {
      const key = `metrics:${eventName}`;
      const current = await this.env.METRICS_CACHE.get(key);
      const newCount = (current ? parseInt(current) : 0) + count;

      await this.env.METRICS_CACHE.put(key, newCount.toString(), {
        expirationTtl: 3600
      });
    }
  }

  private async updateUserBehavior(userId: string, event: EventData): Promise<void> {
    const behaviorKey = `behavior:${userId}`;
    const behavior = await this.env.BEHAVIOR_TRACKING.get(behaviorKey);
    const behaviorData = behavior ? JSON.parse(behavior) : { events: [], lastActivity: 0 };

    behaviorData.events.push({
      event: event.event,
      timestamp: event.timestamp,
      properties: event.properties
    });

    // Keep only last 100 events
    if (behaviorData.events.length > 100) {
      behaviorData.events = behaviorData.events.slice(-100);
    }

    behaviorData.lastActivity = Date.now();

    await this.env.BEHAVIOR_TRACKING.put(behaviorKey, JSON.stringify(behaviorData), {
      expirationTtl: 86400 * 30
    });
  }

  private async notifyRealtimeAnalytics(batch: ProcessingBatch): Promise<void> {
    try {
      // Get realtime analytics durable object
      const id = this.env.REALTIME_ANALYTICS.idFromName('global');
      const realtimeAnalytics = this.env.REALTIME_ANALYTICS.get(id);

      // Broadcast batch completion
      await realtimeAnalytics.fetch('http://internal/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'analytics',
          message: {
            type: 'batch_processed',
            batchId: batch.id,
            eventCount: batch.events.length,
            timestamp: Date.now()
          }
        })
      });

    } catch (error) {
      console.error('Error notifying realtime analytics:', error);
    }
  }

  private scheduleProcessing(): Promise<void> {
    // Process queue every 30 seconds
    return new Promise((resolve) => {
      setInterval(() => {
        if (this.processingQueue.length > 0) {
          this.processQueue();
        }
      }, 30000);
      resolve();
    });
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}