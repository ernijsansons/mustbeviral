export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  properties: Record<string, unknown>;
  context: EventContext;
  metadata: EventMetadata;
}

export interface EventContext {
  page?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  utm?: UTMParameters;
}

export interface UTMParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface EventMetadata {
  version: string;
  source: string;
  processed: boolean;
  enriched: boolean;
  flags: string[];
}

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
  filters?: Record<string, unknown>;
  dimensions: string[];
  timeWindow: number;
}

export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: QueryFilter[];
  timeRange: TimeRange;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
  limit?: number;
  orderBy?: OrderBy[];
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AnalyticsResult {
  data: DataPoint[];
  metadata: QueryMetadata;
  performance: QueryPerformance;
}

export interface DataPoint {
  timestamp: number;
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

export interface QueryMetadata {
  totalRows: number;
  processedRows: number;
  executionTime: number;
  cacheHit: boolean;
  queryId: string;
}

export interface QueryPerformance {
  queryTime: number;
  indexTime: number;
  aggregationTime: number;
  serializationTime: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  timeWindow: number;
  enabled: boolean;
  actions: AlertAction[];
  lastTriggered?: number;
  cooldown: number;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
  consecutiveBreach: number;
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'log';
  target: string;
  template?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class RealTimeAnalytics {
  private events: Map<string, AnalyticsEvent[]> = new Map();
  private metrics: Map<string, MetricDefinition> = new Map();
  private aggregatedData: Map<string, Map<number, DataPoint>> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private queryCache: Map<string, AnalyticsResult> = new Map();
  private streamProcessors: Map<string, (event: AnalyticsEvent) => void> = new Map();

  constructor() {
    this.initializeDefaultMetrics();
    this.startAggregationEngine();
    this.startAlertEngine();
  }

  track(event: Omit<AnalyticsEvent, 'id' | 'timestamp' | 'metadata'>): void {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      metadata: {
        version: '1.0',
        source: 'realtime-analytics',
        processed: false,
        enriched: false,
        flags: []
      }
    };

    this.enrichEvent(analyticsEvent);
    this.storeEvent(analyticsEvent);
    this.processEventStreams(analyticsEvent);
    this.updateRealTimeMetrics(analyticsEvent);
  }

  page(properties: {
    page: string;
    title?: string;
    userId?: string;
    sessionId: string;
    context?: Partial<EventContext>;
  }): void {
    this.track({
      sessionId: properties.sessionId,
      userId: properties.userId,
      eventType: 'page',
      eventName: 'page_view',
      properties: {
        page: properties.page,
        title: properties.title
      },
      context: {
        page: properties.page,
        ...properties.context
      }
    });
  }

  identify(userId: string, traits: Record<string, unknown>, sessionId: string): void {
    this.track({ _userId,
      sessionId,
      eventType: 'identify',
      eventName: 'user_identified',
      properties: traits,
      context: {}
    });
  }

  conversion(eventName: string, properties: Record<string, unknown>, context: {
    userId?: string;
    sessionId: string;
    value?: number;
    currency?: string;
  }): void {
    this.track({
      userId: context.userId,
      sessionId: context.sessionId,
      eventType: 'conversion',
      eventName,
      properties: {
        ...properties,
        value: context.value,
        currency: context.currency
      },
      context: {}
    });
  }

  defineMetric(definition: MetricDefinition): void {
    this.metrics.set(definition.name, definition);

    if (!this.aggregatedData.has(definition.name)) {
      this.aggregatedData.set(definition.name, new Map());
    }
  }

  async query(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const queryId = this.generateQueryId(query);
    const cached = this.queryCache.get(queryId);

    if (cached && this.isCacheValid(cached)) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cacheHit: true
        }
      };
    }

    const startTime = Date.now();
    const result = await this.executeQuery(query);
    const executionTime = Date.now() - startTime;

    const analyticsResult: AnalyticsResult = {
      data: result,
      metadata: {
        totalRows: result.length,
        processedRows: result.length,
        executionTime,
        cacheHit: false,
        queryId
      },
      performance: {
        queryTime: executionTime,
        indexTime: 0,
        aggregationTime: 0,
        serializationTime: 0
      }
    };

    this.queryCache.set(queryId, analyticsResult);
    return analyticsResult;
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
  }

  addStreamProcessor(name: string, processor: (event: AnalyticsEvent) => void): void {
    this.streamProcessors.set(name, processor);
  }

  removeStreamProcessor(name: string): void {
    this.streamProcessors.delete(name);
  }

  getMetrics(): Record<string, unknown> {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    return {
      totalEvents: Array.from(this.events.values()).flat().length,
      eventsLastHour: Array.from(this.events.values()).flat()
        .filter(e => e.timestamp > oneHourAgo).length,
      uniqueUsers: new Set(
        Array.from(this.events.values()).flat()
          .filter(e => e.userId && e.timestamp > oneHourAgo)
          .map(e => e.userId)
      ).size,
      uniqueSessions: new Set(
        Array.from(this.events.values()).flat()
          .filter(e => e.timestamp > oneHourAgo)
          .map(e => e.sessionId)
      ).size,
      topEvents: this.getTopEvents(oneHourAgo),
      conversionRate: this.calculateConversionRate(oneHourAgo),
      averageSessionDuration: this.calculateAverageSessionDuration(oneHourAgo)
    };
  }

  getEventsByType(eventType: string, timeRange?: TimeRange): AnalyticsEvent[] {
    const events = this.events.get(eventType) || [];

    if (!timeRange) return events;

    return events.filter(e =>
      e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    );
  }

  getUserJourney(userId: string, timeRange?: TimeRange): AnalyticsEvent[] {
    const allEvents = Array.from(this.events.values()).flat();
    let userEvents = allEvents.filter(e => e.userId === userId);

    if (timeRange) {
      userEvents = userEvents.filter(e =>
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    return userEvents.sort((a, _b) => a.timestamp - b.timestamp);
  }

  getSessionEvents(sessionId: string): AnalyticsEvent[] {
    const allEvents = Array.from(this.events.values()).flat();
    return allEvents
      .filter(e => e.sessionId === sessionId)
      .sort((a, _b) => a.timestamp - b.timestamp);
  }

  getFunnelAnalysis(steps: string[], timeRange: TimeRange): {
    step: string;
    users: number;
    conversionRate: number;
    dropOffRate: number;
  }[] {
    const allEvents = Array.from(this.events.values()).flat()
      .filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end);

    const usersByStep = steps.map(step => {
      return new Set(
        allEvents
          .filter(e => e.eventName === step)
          .map(e => e.userId)
          .filter(Boolean)
      );
    });

    const totalUsers = usersByStep[0]?.size || 0;

    return steps.map((step, _index) => {
      const users = usersByStep[index]?.size || 0;
      const conversionRate = totalUsers > 0 ? (users / totalUsers) * 100 : 0;
      const previousStepUsers = index > 0 ? usersByStep[index - 1]?.size || 0 : totalUsers;
      const dropOffRate = previousStepUsers > 0 ? ((previousStepUsers - users) / previousStepUsers) * 100 : 0;

      return { _step,
        users,
        conversionRate,
        dropOffRate
      };
    });
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateQueryId(query: AnalyticsQuery): string {
    return btoa(JSON.stringify(query)).substring(0, 32);
  }

  private enrichEvent(event: AnalyticsEvent): void {
    event.metadata.enriched = true;
    event.metadata.flags.push('enriched');

    if (event.context.userAgent) {
      const parsed = this.parseUserAgent(event.context.userAgent);
      event.context.browser = parsed.browser;
      event.context.os = parsed.os;
      event.context.device = parsed.device;
    }

    if (event.context.ip && !event.context.country) {
      const geo = this.getGeoLocation(event.context.ip);
      event.context.country = geo.country;
      event.context.city = geo.city;
    }
  }

  private parseUserAgent(userAgent: string): {
    browser: string;
    os: string;
    device: string;
  } {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown'
    };
  }

  private getGeoLocation(ip: string): { country: string; city: string } {
    return {
      country: 'Unknown',
      city: 'Unknown'
    };
  }

  private storeEvent(event: AnalyticsEvent): void {
    const eventType = event.eventType;
    if (!this.events.has(eventType)) {
      this.events.set(eventType, []);
    }

    this.events.get(eventType)!.push(event);
    event.metadata.processed = true;
  }

  private processEventStreams(event: AnalyticsEvent): void {
    this.streamProcessors.forEach(processor => {
      try {
        processor(event);
      } catch (error: unknown) {
        console.error('Stream processor error:', error);
      }
    });
  }

  private updateRealTimeMetrics(event: AnalyticsEvent): void {
    this.metrics.forEach((metric, _name) => {
      if (this.eventMatchesMetric(event, metric)) {
        this.updateMetricAggregation(name, event, metric);
      }
    });
  }

  private eventMatchesMetric(event: AnalyticsEvent, metric: MetricDefinition): boolean {
    if (metric.filters) {
      return Object.entries(metric.filters).every(([key, value]) => {
        const eventValue = this.getEventValue(event, key);
        return eventValue === value;
      });
    }
    return true;
  }

  private getEventValue(event: AnalyticsEvent, path: string): unknown {
    const keys = path.split('.');
    let value: unknown = event;

    for (const key of keys) {
      value = value?.[key];
    }

    return value;
  }

  private updateMetricAggregation(metricName: string, event: AnalyticsEvent, metric: MetricDefinition): void {
    const timeWindow = Math.floor(event.timestamp / metric.timeWindow) * metric.timeWindow;
    const aggregatedMetrics = this.aggregatedData.get(metricName)!;

    const existing = aggregatedMetrics.get(timeWindow);
    if (existing) {
      this.aggregateDataPoint(existing, event, metric);
    } else {
      aggregatedMetrics.set(timeWindow, this.createDataPoint(event, metric, timeWindow));
    }
  }

  private createDataPoint(event: AnalyticsEvent, metric: MetricDefinition, timestamp: number): DataPoint {
    const dimensions: Record<string, string> = {};
    metric.dimensions.forEach(dim => {
      dimensions[dim] = this.getEventValue(event, dim)?.toString() || 'unknown';
    });

    const metrics: Record<string, number> = {};
    metrics[metric.name] = this.getMetricValue(event, metric);

    return { _timestamp,
      dimensions,
      metrics
    };
  }

  private aggregateDataPoint(dataPoint: DataPoint, event: AnalyticsEvent, metric: MetricDefinition): void {
    const value = this.getMetricValue(event, metric);
    const currentValue = dataPoint.metrics[metric.name] || 0;

    switch (metric.aggregation) {
      case 'sum':
      case 'count':
        dataPoint.metrics[metric.name] = currentValue + value;
        break;
      case 'avg':
        dataPoint.metrics[metric.name] = (currentValue + value) / 2;
        break;
      case 'min':
        dataPoint.metrics[metric.name] = Math.min(currentValue, value);
        break;
      case 'max':
        dataPoint.metrics[metric.name] = Math.max(currentValue, value);
        break;
    }
  }

  private getMetricValue(event: AnalyticsEvent, metric: MetricDefinition): number {
    switch (metric.type) {
      case 'counter':
        return 1;
      case 'gauge':
        return this.getEventValue(event, 'properties.value') || 0;
      case 'timer':
        return this.getEventValue(event, 'properties.duration') || 0;
      case 'histogram':
        return this.getEventValue(event, 'properties.value') || 0;
      default:
        return 1;
    }
  }

  private async executeQuery(query: AnalyticsQuery): Promise<DataPoint[]> {
    const results: DataPoint[] = [];

    for (const metricName of query.metrics) {
      const metricData = this.aggregatedData.get(metricName);
      if (!metricData) continue;

      for (const [timestamp, dataPoint] of metricData.entries()) {
        if (timestamp >= query.timeRange.start && timestamp <= query.timeRange.end) {
          if (this.dataPointMatchesFilters(dataPoint, query.filters || [])) {
            results.push(dataPoint);
          }
        }
      }
    }

    return this.sortAndLimitResults(results, query);
  }

  private dataPointMatchesFilters(dataPoint: DataPoint, filters: QueryFilter[]): boolean {
    return filters.every(filter => {
      const value = this.getDataPointValue(dataPoint, filter.field);
      return this.evaluateFilter(value, filter.operator, filter.value);
    });
  }

  private getDataPointValue(dataPoint: DataPoint, field: string): unknown {
    if (field.startsWith('dimensions.')) {
      return dataPoint.dimensions[field.substring(11)];
    }
    if (field.startsWith('metrics.')) {
      return dataPoint.metrics[field.substring(8)];
    }
    return (dataPoint as unknown)[field];
  }

  private evaluateFilter(value: unknown, operator: string, filterValue: unknown): boolean {
    switch (operator) {
      case 'eq': return value === filterValue;
      case 'ne': return value !== filterValue;
      case 'gt': return value > filterValue;
      case 'gte': return value >= filterValue;
      case 'lt': return value < filterValue;
      case 'lte': return value <= filterValue;
      case 'in': return Array.isArray(filterValue) && filterValue.includes(value);
      case 'nin': return Array.isArray(filterValue) && !filterValue.includes(value);
      case 'contains': return value && value.toString().includes(filterValue);
      case 'regex': return new RegExp(filterValue).test(value);
      default: return true;
    }
  }

  private sortAndLimitResults(results: DataPoint[], query: AnalyticsQuery): DataPoint[] {
    if (query.orderBy) {
      results.sort((a, _b) => {
        for (const order of query.orderBy!) {
          const aValue = this.getDataPointValue(a, order.field);
          const bValue = this.getDataPointValue(b, order.field);

          if (aValue !== bValue) {
            const comparison = aValue < bValue ? -1 : 1;
            return order.direction === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    if (query.limit) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  private isCacheValid(result: AnalyticsResult): boolean {
    const cacheAge = Date.now() - result.metadata.executionTime;
    return cacheAge < 60000; // 1 minute cache
  }

  private initializeDefaultMetrics(): void {
    this.defineMetric({
      name: 'page_views',
      type: 'counter',
      aggregation: 'count',
      dimensions: ['page', 'country'],
      timeWindow: 60000 // 1 minute
    });

    this.defineMetric({
      name: 'unique_users',
      type: 'gauge',
      aggregation: 'count',
      dimensions: ['country'],
      timeWindow: 300000 // 5 minutes
    });

    this.defineMetric({
      name: 'conversions',
      type: 'counter',
      aggregation: 'sum',
      filters: { eventType: 'conversion' },
      dimensions: ['eventName', 'country'],
      timeWindow: 300000
    });

    this.defineMetric({
      name: 'session_duration',
      type: 'timer',
      aggregation: 'avg',
      dimensions: ['device', 'browser'],
      timeWindow: 300000
    });
  }

  private startAggregationEngine(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 60000); // Clean up every minute
  }

  private startAlertEngine(): void {
    setInterval(() => {
      this.evaluateAlerts();
    }, 30000); // Check alerts every 30 seconds
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    this.events.forEach((events, _eventType) => {
      this.events.set(eventType, events.filter(e => e.timestamp > cutoff));
    });

    this.aggregatedData.forEach((data, _metricName) => {
      data.forEach((value, _timestamp) => {
        if (timestamp < cutoff) {
          data.delete(timestamp);
        }
      });
    });
  }

  private evaluateAlerts(): void {
    const now = Date.now();

    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;
      if (rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldown) return;

      const metricData = this.aggregatedData.get(rule.metric);
      if (!metricData) return;

      const recentData = Array.from(metricData.entries())
        .filter(([timestamp]) => timestamp > now - rule.timeWindow)
        .map(([, dataPoint]) => dataPoint.metrics[rule.metric] || 0);

      if (recentData.length === 0) return;

      const aggregatedValue = this.aggregateValues(recentData, rule.condition.aggregation);
      const breaches = this.evaluateCondition(aggregatedValue, rule.condition.operator, rule.threshold);

      if (breaches) {
        this.triggerAlert(rule, aggregatedValue);
      }
    });
  }

  private aggregateValues(values: number[], aggregation: string): number {
    switch (aggregation) {
      case 'avg': return values.reduce((sum, _v) => sum + v, 0) / values.length;
      case 'sum': return values.reduce((sum, _v) => sum + v, 0);
      case 'min': return Math.min(...values);
      case 'max': return Math.max(...values);
      case 'count': return values.length;
      default: return 0;
    }
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private async triggerAlert(rule: AlertRule, value: number): Promise<void> {
    rule.lastTriggered = Date.now();

    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, rule, value);
      } catch (error: unknown) {
        console.error(`Failed to execute alert action: ${action.type}`, error);
      }
    }
  }

  private async executeAlertAction(action: AlertAction, rule: AlertRule, value: number): Promise<void> {
    const message = `Alert: ${rule.name} - Metric ${rule.metric} is ${value} (threshold: ${rule.threshold})`;

    switch (action.type) {
      case 'log':
        console.warn(message);
        break;
      case 'webhook':
        await fetch(action.target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _rule, value, message, severity: action.severity })
        });
        break;
      // Add other action types as needed
    }
  }

  private getTopEvents(since: number): Array<{ eventName: string; count: number }> {
    const eventCounts = new Map<string, number>();

    Array.from(this.events.values()).flat()
      .filter(e => e.timestamp > since)
      .forEach(e => {
        eventCounts.set(e.eventName, (eventCounts.get(e.eventName) || 0) + 1);
      });

    return Array.from(eventCounts.entries())
      .map(([eventName, count]) => ({ _eventName, count }))
      .sort((a, _b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateConversionRate(since: number): number {
    const events = Array.from(this.events.values()).flat()
      .filter(e => e.timestamp > since);

    const sessions = new Set(events.map(e => e.sessionId));
    const conversions = new Set(
      events.filter(e => e.eventType === 'conversion').map(e => e.sessionId)
    );

    return sessions.size > 0 ? (conversions.size / sessions.size) * 100 : 0;
  }

  private calculateAverageSessionDuration(since: number): number {
    const sessionEvents = new Map<string, AnalyticsEvent[]>();

    Array.from(this.events.values()).flat()
      .filter(e => e.timestamp > since)
      .forEach(e => {
        if (!sessionEvents.has(e.sessionId)) {
          sessionEvents.set(e.sessionId, []);
        }
        sessionEvents.get(e.sessionId)!.push(e);
      });

    const durations = Array.from(sessionEvents.values()).map(events => {
      events.sort((a, _b) => a.timestamp - b.timestamp);
      return events[events.length - 1].timestamp - events[0].timestamp;
    });

    return durations.length > 0
      ? durations.reduce((sum, _d) => sum + d, 0) / durations.length
      : 0;
  }
}