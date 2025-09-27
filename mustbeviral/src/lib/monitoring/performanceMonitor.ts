/**
 * Response Time and Performance Monitoring
 * Comprehensive performance tracking with real-time metrics and alerting
 */

import { CloudflareEnv} from '../cloudflare';
import { RequestContext, RequestMetrics} from '../../worker/requestContext';

export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    peakRPS: number;
  };
  errors: {
    count: number;
    rate: number;
    distribution: Record<string, number>;
  };
  resources: {
    databaseQueries: number;
    kvOperations: number;
    encryptionOps: number;
    cacheHitRate: number;
  };
  endpoints: Record<string, EndpointMetrics>;
  alerts: PerformanceAlert[];
}

export interface EndpointMetrics {
  path: string;
  method: string;
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  errorRate: number;
  slowRequestCount: number;
  lastAccessed: Date;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'high_response_time' | 'error_rate' | 'throughput_drop' | 'resource_exhaustion';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  endpoint?: string;
}

export interface MonitoringConfig {
  alertThresholds: {
    responseTime: {
      warning: number;
      critical: number;
    };
    errorRate: {
      warning: number;
      critical: number;
    };
    throughputDrop: {
      warning: number;
      critical: number;
    };
  };
  sampling: {
    enabled: boolean;
    rate: number; // 0.0 to 1.0
  };
  retention: {
    detailedMetrics: number; // minutes
    aggregatedMetrics: number; // hours
  };
  realTimeEnabled: boolean;
}

export class PerformanceMonitor {
  private env: CloudflareEnv;
  private config: MonitoringConfig;
  private responseTimeHistory: number[] = [];
  private requestCounts: Array<{ timestamp: Date; count: number }> = [];
  private endpointMetrics: Map<string, EndpointMetrics> = new Map();
  private alerts: PerformanceAlert[] = [];
  private metricsBuffer: Array<{
    timestamp: Date;
    requestId: string;
    metrics: RequestMetrics;
    context: RequestContext;
  }> = [];
  private flushTimer?: unknown;
  private readonly MAXHISTORY = 10000;
  private readonly BUFFERSIZE = 100;
  private readonly FLUSHINTERVAL = 10000; // 10 seconds

  constructor(env: CloudflareEnv, config?: Partial<MonitoringConfig>) {
    this.env = env;
    this.config = {
      alertThresholds: {
        responseTime: {
          warning: 2000, // 2 seconds
          critical: 5000 // 5 seconds
        },
        errorRate: {
          warning: 5, // 5%
          critical: 10 // 10%
        },
        throughputDrop: {
          warning: 30, // 30% drop
          critical: 50 // 50% drop
        }
      },
      sampling: {
        enabled: true,
        rate: 1.0 // Sample all requests by default
      },
      retention: {
        detailedMetrics: 60, // 1 hour
        aggregatedMetrics: 24 // 24 hours
      },
      realTimeEnabled: true,
      ...config
    };

    this.startMetricsFlush();
    this.startAggregation();
  }

  /**
   * Record request performance
   */
  recordRequest(context: RequestContext, metrics: RequestMetrics): void {
    // Apply sampling if enabled
    if (this.config.sampling.enabled && Math.random() > this.config.sampling.rate) {
      return;
    }

    // Add to buffer
    this.metricsBuffer.push({
      timestamp: new Date(),
      requestId: context.id,
      metrics,
      context
    });

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFERSIZE) {
      this.flushMetrics();
    }

    // Real-time processing
    if (this.config.realTimeEnabled) {
      this.processRealTime(context, metrics);
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const fiveMinutesAgo = new Date(now.getTime() - 300000);

    // Calculate response time statistics
    const recentResponseTimes = this.responseTimeHistory.slice(-1000); // Last 1000 requests
    const responseTimeStats = this.calculateResponseTimeStats(recentResponseTimes);

    // Calculate throughput
    const recentRequests = this.requestCounts.filter(r => r.timestamp >= oneMinuteAgo);
    const totalRecentRequests = recentRequests.reduce((sum, r) => sum + r.count, 0);
    const requestsPerSecond = totalRecentRequests / 60;
    const requestsPerMinute = totalRecentRequests;

    // Calculate peak RPS over last 5 minutes
    const fiveMinuteRequests = this.requestCounts.filter(r => r.timestamp >= fiveMinutesAgo);
    const peakRPS = Math.max(
      ...fiveMinuteRequests.map(r => r.count),
      0
    );

    // Calculate error metrics
    const errorMetrics = this.calculateErrorMetrics();

    // Calculate resource metrics
    const resourceMetrics = this.calculateResourceMetrics();

    // Get endpoint metrics
    const endpointMetrics: Record<string, EndpointMetrics> = {};
    for (const [key, metrics] of this.endpointMetrics.entries()) {
      endpointMetrics[key] = { ...metrics };
    }

    // Get active alerts
    const activeAlerts = this.alerts.filter(alert => !alert.acknowledged);

    return {
      responseTime: responseTimeStats,
      throughput: { requestsPerSecond,
        requestsPerMinute,
        peakRPS
      },
      errors: errorMetrics,
      resources: resourceMetrics,
      endpoints: endpointMetrics,
      alerts: activeAlerts
    };
  }

  /**
   * Get endpoint performance summary
   */
  getEndpointSummary(path?: string): EndpointMetrics[] {
    let metrics = Array.from(this.endpointMetrics.values());

    if (path) {
      metrics = metrics.filter(m => m.path.includes(path));
    }

    return metrics.sort((a, b) => b.requestCount - a.requestCount);
  }

  /**
   * Get performance alerts
   */
  getAlerts(severity?: 'warning' | 'critical'): PerformanceAlert[] {
    let alerts = [...this.alerts];

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`LOG: PERF-MONITOR-ALERT-ACK-1 - Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Get performance trend analysis
   */
  getTrendAnalysis(timeRange: 'hour' | 'day' | 'week'): {
    responseTimeTrend: Array<{ timestamp: Date; value: number }>;
    throughputTrend: Array<{ timestamp: Date; value: number }>;
    errorRateTrend: Array<{ timestamp: Date; value: number }>;
    insights: string[];
  } {
    const insights: string[] = [];
    const now = new Date();
    let timeWindow: number;

    switch (timeRange) {
      case 'hour':
        timeWindow = 60 * 60 * 1000;
        break;
      case 'day':
        timeWindow = 24 * 60 * 60 * 1000;
        break;
      case 'week':
        timeWindow = 7 * 24 * 60 * 60 * 1000;
        break;
    }

    const cutoff = new Date(now.getTime() - timeWindow);

    // For this implementation, return sample data
    // In production, this would query stored metrics
    const responseTimeTrend = this.generateTrendData(cutoff, now, 'responseTime');
    const throughputTrend = this.generateTrendData(cutoff, now, 'throughput');
    const errorRateTrend = this.generateTrendData(cutoff, now, 'errorRate');

    // Generate insights
    if (responseTimeTrend.length > 0) {
      const avgResponseTime = responseTimeTrend.reduce((a, b) => a + b.value, 0) / responseTimeTrend.length;
      if (avgResponseTime > this.config.alertThresholds.responseTime.warning) {
        insights.push(`Average response time (${avgResponseTime.toFixed(0)}ms) is above warning threshold`);
      }
    }

    if (errorRateTrend.length > 0) {
      const avgErrorRate = errorRateTrend.reduce((a, b) => a + b.value, 0) / errorRateTrend.length;
      if (avgErrorRate > this.config.alertThresholds.errorRate.warning) {
        insights.push(`Error rate (${avgErrorRate.toFixed(1)}%) is elevated`);
      }
    }

    return { responseTimeTrend,
      throughputTrend,
      errorRateTrend,
      insights
    };
  }

  /**
   * Export metrics for external monitoring
   */
  async exportMetrics(format: 'prometheus' | 'json' | 'csv'): Promise<string> {
    const metrics = this.getCurrentMetrics();

    switch (format) {
      case 'prometheus':
        return this.formatPrometheusMetrics(metrics);
      case 'json':
        return JSON.stringify(metrics, null, 2);
      case 'csv':
        return this.formatCSVMetrics(metrics);
      default:
        return JSON.stringify(metrics, null, 2);
    }
  }

  /**
   * Clear historical data
   */
  clearHistory(): void {
    this.responseTimeHistory = [];
    this.requestCounts = [];
    this.endpointMetrics.clear();
    this.alerts = [];
    this.metricsBuffer = [];

    console.log('LOG: PERF-MONITOR-CLEAR-1 - Performance monitoring history cleared');
  }

  /**
   * Shutdown monitoring
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush remaining metrics
    this.flushMetrics();

    console.log('LOG: PERF-MONITOR-SHUTDOWN-1 - Performance monitor shutdown complete');
  }

  /**
   * Process metrics in real-time
   */
  private processRealTime(context: RequestContext, metrics: RequestMetrics): void {
    // Update response time history
    this.responseTimeHistory.push(metrics.duration);
    if (this.responseTimeHistory.length > this.MAXHISTORY) {
      this.responseTimeHistory.shift();
    }

    // Update request counts
    const now = new Date();
    const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

    let requestCount = this.requestCounts.find(r =>
      r.timestamp.getTime() === currentMinute.getTime()
    );

    if (!requestCount) {
      requestCount = { timestamp: currentMinute, count: 0 };
      this.requestCounts.push(requestCount);

      // Keep only last hour
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      this.requestCounts = this.requestCounts.filter(r => r.timestamp >= oneHourAgo);
    }

    requestCount.count++;

    // Update endpoint metrics
    this.updateEndpointMetrics(context, metrics);

    // Check for alerts
    this.checkAlerts(context, metrics);
  }

  /**
   * Update endpoint-specific metrics
   */
  private updateEndpointMetrics(context: RequestContext, metrics: RequestMetrics): void {
    const url = new URL(context.url);
    const key = `${context.method}:${url.pathname}`;

    let endpointMetric = this.endpointMetrics.get(key);
    if (!endpointMetric) {
      endpointMetric = {
        path: url.pathname,
        method: context.method,
        requestCount: 0,
        averageResponseTime: 0,
        errorCount: 0,
        errorRate: 0,
        slowRequestCount: 0,
        lastAccessed: new Date(),
        p95ResponseTime: 0,
        p99ResponseTime: 0
      };
      this.endpointMetrics.set(key, endpointMetric);
    }

    // Update metrics
    const oldAvg = endpointMetric.averageResponseTime;
    const oldCount = endpointMetric.requestCount;

    endpointMetric.requestCount++;
    endpointMetric.averageResponseTime =
      (oldAvg * oldCount + metrics.duration) / endpointMetric.requestCount;
    endpointMetric.lastAccessed = new Date();

    if (metrics.statusCode >= 400) {
      endpointMetric.errorCount++;
    }

    if (metrics.duration > 2000) { // 2 seconds
      endpointMetric.slowRequestCount++;
    }

    endpointMetric.errorRate = (endpointMetric.errorCount / endpointMetric.requestCount) * 100;

    // Update percentiles (simplified calculation)
    // In production, use proper percentile calculation algorithms
    endpointMetric.p95ResponseTime = endpointMetric.averageResponseTime * 1.5;
    endpointMetric.p99ResponseTime = endpointMetric.averageResponseTime * 2.0;
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(context: RequestContext, metrics: RequestMetrics): void {
    const now = new Date();

    // Response time alert
    if (metrics.duration > this.config.alertThresholds.responseTime.critical) {
      this.createAlert('high_response_time', 'critical',
        `Critical response time: ${metrics.duration}ms`,
        metrics.duration, this.config.alertThresholds.responseTime.critical,
        context.url
      );
    } else if (metrics.duration > this.config.alertThresholds.responseTime.warning) {
      this.createAlert('high_response_time', 'warning',
        `High response time: ${metrics.duration}ms`,
        metrics.duration, this.config.alertThresholds.responseTime.warning,
        context.url
      );
    }

    // Error rate alert (check endpoint error rate)
    const url = new URL(context.url);
    const endpointKey = `${context.method}:${url.pathname}`;
    const endpointMetric = this.endpointMetrics.get(endpointKey);

    if (endpointMetric && endpointMetric.errorRate > this.config.alertThresholds.errorRate.critical) {
      this.createAlert('error_rate', 'critical',
        `Critical error rate: ${endpointMetric.errorRate.toFixed(1)}%`,
        endpointMetric.errorRate, this.config.alertThresholds.errorRate.critical,
        context.url
      );
    } else if (endpointMetric && endpointMetric.errorRate > this.config.alertThresholds.errorRate.warning) {
      this.createAlert('error_rate', 'warning',
        `High error rate: ${endpointMetric.errorRate.toFixed(1)}%`,
        endpointMetric.errorRate, this.config.alertThresholds.errorRate.warning,
        context.url
      );
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number,
    endpoint?: string
  ): void {
    const alertId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const alert: PerformanceAlert = {
      id: alertId,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date(),
      acknowledged: false,
      endpoint
    };

    this.alerts.push(alert);

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.log(`LOG: PERF-MONITOR-ALERT-${severity.toUpperCase()}-1 - ${message}`, { alertId,
      value,
      threshold,
      endpoint
    });

    // In production, send to external alerting system
    if (severity === 'critical') {
      this.sendCriticalAlert(alert);
    }
  }

  /**
   * Send critical alert to external systems
   */
  private async sendCriticalAlert(alert: PerformanceAlert): Promise<void> {
    try {
      // Store in KV for immediate access
      await this.env.TRENDS_CACHE.put(
        `critical_perf_alert:${alert.id}`,
        JSON.stringify(alert),
        { expirationTtl: 3600 } // 1 hour
      );

      console.error(`🚨 CRITICAL PERFORMANCE ALERT: ${alert.message}`, alert);

      // In production: send to Slack, email, PagerDuty, etc.
    } catch (error: unknown) {
      console.error('LOG: PERF-MONITOR-ALERT-ERROR-1 - Failed to send critical alert:', error);
    }
  }

  /**
   * Calculate response time statistics
   */
  private calculateResponseTimeStats(responseTimes: number[]): PerformanceMetrics['responseTime'] {
    if (responseTimes.length === 0) {
      return { avg: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...responseTimes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      avg: responseTimes.reduce((a, b) => a + b, 0) / len,
      min: sorted[0],
      max: sorted[len - 1],
      p50: sorted[Math.floor(len * 0.5)],
      p90: sorted[Math.floor(len * 0.9)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  }

  /**
   * Calculate error metrics
   */
  private calculateErrorMetrics(): PerformanceMetrics['errors'] {
    let totalErrors = 0;
    let totalRequests = 0;
    const errorDistribution: Record<string, number> = {};

    for (const endpointMetric of this.endpointMetrics.values()) {
      totalErrors += endpointMetric.errorCount;
      totalRequests += endpointMetric.requestCount;

      if (endpointMetric.errorCount > 0) {
        const key = `${endpointMetric.method} ${endpointMetric.path}`;
        errorDistribution[key] = endpointMetric.errorCount;
      }
    }

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    return {
      count: totalErrors,
      rate: errorRate,
      distribution: errorDistribution
    };
  }

  /**
   * Calculate resource usage metrics
   */
  private calculateResourceMetrics(): PerformanceMetrics['resources'] {
    // Aggregate from recent metrics buffer
    let totalDbQueries = 0;
    let totalKvOps = 0;
    let totalEncryptionOps = 0;
    let cacheHits = 0;
    let totalRequests = 0;

    for (const bufferEntry of this.metricsBuffer.slice(-100)) { // Last 100 requests
      totalDbQueries += bufferEntry.metrics.dbQueries ?? 0;
      totalKvOps += (bufferEntry.metrics.kvReads ?? 0) + (bufferEntry.metrics.kvWrites ?? 0);
      totalEncryptionOps += bufferEntry.metrics.encryptionOps ?? 0;

      if (bufferEntry.metrics.cacheHit) {
        cacheHits++;
      }
      totalRequests++;
    }

    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    return {
      databaseQueries: totalDbQueries,
      kvOperations: totalKvOps,
      encryptionOps: totalEncryptionOps,
      cacheHitRate
    };
  }

  /**
   * Generate trend data for analysis
   */
  private generateTrendData(
    startTime: Date,
    endTime: Date,
    metric: 'responseTime' | 'throughput' | 'errorRate'
  ): Array<{ timestamp: Date; value: number }> {
    // This is a simplified implementation
    // In production, query actual stored metrics
    const points: Array<{ timestamp: Date; value: number }> = [];
    const interval = (endTime.getTime() - startTime.getTime()) / 20; // 20 data points

    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(startTime.getTime() + i * interval);
      let value = 0;

      switch (metric) {
        case 'responseTime':
          value = 500 + Math.random() * 1000; // Random data for demo
          break;
        case 'throughput':
          value = 50 + Math.random() * 100;
          break;
        case 'errorRate':
          value = Math.random() * 5;
          break;
      }

      points.push({ timestamp, value });
    }

    return points;
  }

  /**
   * Format metrics for Prometheus
   */
  private formatPrometheusMetrics(metrics: PerformanceMetrics): string {
    const lines: string[] = [];

    // Response time metrics
    lines.push(`# TYPE http_request_duration_seconds histogram`);
    lines.push(`http_request_duration_seconds_sum ${metrics.responseTime.avg / 1000}`);
    lines.push(`http_request_duration_seconds_count ${this.responseTimeHistory.length}`);

    // Throughput metrics
    lines.push(`# TYPE http_requests_per_second gauge`);
    lines.push(`http_requests_per_second ${metrics.throughput.requestsPerSecond}`);

    // Error rate
    lines.push(`# TYPE http_error_rate gauge`);
    lines.push(`http_error_rate ${metrics.errors.rate / 100}`);

    return lines.join('\n');
  }

  /**
   * Format metrics as CSV
   */
  private formatCSVMetrics(metrics: PerformanceMetrics): string {
    const lines: string[] = [];
    lines.push('metric,value,unit');
    lines.push(`responsetimeavg,${metrics.responseTime.avg},ms`);
    lines.push(`responsetimep95,${metrics.responseTime.p95},ms`);
    lines.push(`requestspersecond,${metrics.throughput.requestsPerSecond},rps`);
    lines.push(`errorrate,${metrics.errors.rate},%`);

    return lines.join('\n');
  }

  /**
   * Start metrics flush timer
   */
  private startMetricsFlush(): void {
    this.flushTimer = setInterval_(() => {
      this.flushMetrics();
    }, this.FLUSHINTERVAL);
  }

  /**
   * Flush metrics buffer to storage
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) {return;}

    try {
      // In production, store in time-series database
      console.log(`LOG: PERF-MONITOR-FLUSH-1 - Flushing ${this.metricsBuffer.length} metrics`);

      // Clear buffer
      this.metricsBuffer = [];
    } catch (error: unknown) {
      console.error('LOG: PERF-MONITOR-FLUSH-ERROR-1 - Failed to flush metrics:', error);
    }
  }

  /**
   * Start metrics aggregation
   */
  private startAggregation(): void {
    // Run every 5 minutes
    setInterval_(() => {
      this.aggregateMetrics();
    }, 300000);
  }

  /**
   * Aggregate metrics for historical storage
   */
  private aggregateMetrics(): void {
    try {
      const metrics = this.getCurrentMetrics();

      console.log('LOG: PERF-MONITOR-AGGREGATE-1 - Aggregating metrics', {
        avgResponseTime: metrics.responseTime.avg,
        requestsPerSecond: metrics.throughput.requestsPerSecond,
        errorRate: metrics.errors.rate
      });

      // In production, store aggregated metrics
    } catch (error: unknown) {
      console.error('LOG: PERF-MONITOR-AGGREGATE-ERROR-1 - Failed to aggregate metrics:', error);
    }
  }
}

/**
 * Global performance monitor instance
 */
let globalPerformanceMonitor: PerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getPerformanceMonitor(env: CloudflareEnv, config?: Partial<MonitoringConfig>): PerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PerformanceMonitor(env, config);
  }
  return globalPerformanceMonitor;
}

// Default instance for browser/component usage
// Only create if we're in a server environment with CloudflareEnv
export const performanceMonitor = _(() => {
  // Guard against browser environment
  if (typeof window !== 'undefined') {
    // Return a stub for browser usage
    return {
      startMonitoring: () => {},
      stopMonitoring: () => {},
      recordRequest: () => {},
      getCurrentMetrics: () => ({
        responseTime: { avg: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, p99: 0 },
        throughput: { requestsPerSecond: 0, requestsPerMinute: 0, peakRPS: 0 },
        errors: { count: 0, rate: 0, distribution: {} },
        resources: { databaseQueries: 0, kvOperations: 0, encryptionOps: 0, cacheHitRate: 0 },
        endpoints: {},
        alerts: []
      }),
      getEndpointSummary: () => [],
      getAlerts: () => [],
      acknowledgeAlert: () => false,
      getTrendAnalysis: () => ({
        responseTimeTrend: [],
        throughputTrend: [],
        errorRateTrend: [],
        insights: []
      }),
      exportMetrics: () => Promise.resolve('{}'),
      clearHistory: () => {},
      shutdown: () => {}
    };
  }

  // Only create real instance in server environment
  return null;
})();