// Enhanced Monitoring Dashboard
// Provides comprehensive observability and metrics collection

import { log } from './logger';
import { getTelemetry } from '../tracing/telemetry';
import { telemetryConfig } from '../tracing/config';

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  database: {
    connectionPool: number;
    queryCount: number;
    averageQueryTime: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    size: number;
  };
  ai: {
    requestCount: number;
    averageTokens: number;
    costPerRequest: number;
  };
  organization: {
    activeOrganizations: number;
    totalUsers: number;
    contentGenerated: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  duration: number; // seconds
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  notificationChannels: string[];
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'status' | 'map';
  config: {
    metrics: string[];
    timeRange: string;
    refreshInterval: number;
    visualization?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

class MonitoringDashboard {
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Map<string, AlertRule> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private systemMetrics: SystemMetrics;
  private metricsRetentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
  private telemetry = getTelemetry();

  constructor() {
    this.systemMetrics = this.getDefaultSystemMetrics();
    this.setupDefaultAlerts();
    this.setupDefaultWidgets();
    this.startMetricsCollection();
  }

  // Record a metric
  recordMetric(metric: MetricData): void {
    const key = `${metric.name}_${JSON.stringify(metric.labels || {})}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricArray = this.metrics.get(key)!;
    metricArray.push(metric);

    // Clean up old metrics
    const cutoff = Date.now() - this.metricsRetentionPeriod;
    this.metrics.set(key, metricArray.filter(m => m.timestamp > cutoff));

    // Check alerts
    this.checkAlerts(metric);

    // Add to telemetry
    this.telemetry.addSpanEvent('metric.recorded', {
      'metric.name': metric.name,
      'metric.value': metric.value,
      'metric.type': metric.type,
    });

    log.debug('Metric recorded', {
      action: 'metric_recorded',
      metadata: {
        name: metric.name,
        value: metric.value,
        type: metric.type,
        labels: metric.labels
      }
    });
  }

  // Record counter metric
  recordCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.recordMetric({ _name,
      value,
      timestamp: Date.now(),
      labels,
      type: 'counter'
    });
  }

  // Record gauge metric
  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({ _name,
      value,
      timestamp: Date.now(),
      labels,
      type: 'gauge'
    });
  }

  // Record histogram metric
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({ _name,
      value,
      timestamp: Date.now(),
      labels,
      type: 'histogram'
    });
  }

  // Get metrics by name and time range
  getMetrics(
    name: string,
    timeRange: number = 3600000, // 1 hour default
    labels?: Record<string, string>
  ): MetricData[] {
    const key = `${name}_${JSON.stringify(labels || {})}`;
    const metrics = this.metrics.get(key) || [];
    const cutoff = Date.now() - timeRange;

    return metrics.filter(m => m.timestamp > cutoff);
  }

  // Get aggregated metric value
  getAggregatedMetric(
    name: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    timeRange: number = 3600000,
    labels?: Record<string, string>
  ): number {
    const metrics = this.getMetrics(name, timeRange, labels);

    if (metrics.length === 0) return 0;

    switch (aggregation) {
      case 'sum':
        return metrics.reduce((sum, _m) => sum + m.value, 0);
      case 'avg':
        return metrics.reduce((sum, _m) => sum + m.value, 0) / metrics.length;
      case 'min':
        return Math.min(...metrics.map(m => m.value));
      case 'max':
        return Math.max(...metrics.map(m => m.value));
      case 'count':
        return metrics.length;
      default:
        return 0;
    }
  }

  // Update system metrics
  async updateSystemMetrics(): Promise<void> {
    try {
      // Memory metrics
      const memoryUsage = process.memoryUsage ? process.memoryUsage() : { heapUsed: 0, heapTotal: 0 };
      this.systemMetrics.memory = {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: memoryUsage.heapTotal > 0 ? (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 : 0
      };

      // Performance metrics
      const requestCount = this.getAggregatedMetric('http_requests_total', 'count', 60000); // last minute
      const responseTimeAvg = this.getAggregatedMetric('http_request_duration', 'avg', 60000);
      const errorCount = this.getAggregatedMetric('http_requests_total', 'count', 60000, { status: '5xx' });

      this.systemMetrics.performance = {
        requestsPerSecond: requestCount / 60,
        averageResponseTime: responseTimeAvg,
        errorRate: requestCount > 0 ? (errorCount / requestCount) * 100 : 0
      };

      // Database metrics
      const dbQueries = this.getAggregatedMetric('db_queries_total', 'count', 60000);
      const dbQueryTime = this.getAggregatedMetric('db_query_duration', 'avg', 60000);

      this.systemMetrics.database = {
        connectionPool: this.getAggregatedMetric('db_connections_active', 'avg', 60000),
        queryCount: dbQueries,
        averageQueryTime: dbQueryTime
      };

      // Cache metrics
      const cacheHits = this.getAggregatedMetric('cache_operations_total', 'count', 60000, { result: 'hit' });
      const cacheMisses = this.getAggregatedMetric('cache_operations_total', 'count', 60000, { result: 'miss' });
      const totalCacheOps = cacheHits + cacheMisses;

      this.systemMetrics.cache = {
        hitRate: totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : 0,
        missRate: totalCacheOps > 0 ? (cacheMisses / totalCacheOps) * 100 : 0,
        size: this.getAggregatedMetric('cache_size_bytes', 'avg', 60000)
      };

      // AI metrics
      const aiRequests = this.getAggregatedMetric('ai_requests_total', 'count', 60000);
      const aiTokens = this.getAggregatedMetric('ai_tokens_total', 'sum', 60000);
      const aiCost = this.getAggregatedMetric('ai_cost_total', 'sum', 60000);

      this.systemMetrics.ai = {
        requestCount: aiRequests,
        averageTokens: aiRequests > 0 ? aiTokens / aiRequests : 0,
        costPerRequest: aiRequests > 0 ? aiCost / aiRequests : 0
      };

      // Organization metrics
      this.systemMetrics.organization = {
        activeOrganizations: this.getAggregatedMetric('organizations_active', 'avg', 60000),
        totalUsers: this.getAggregatedMetric('users_total', 'avg', 60000),
        contentGenerated: this.getAggregatedMetric('content_generated_total', 'count', 60000)
      };

      // Record system metrics
      this.recordGauge('system_memory_usage_percent', this.systemMetrics.memory.percentage);
      this.recordGauge('system_performance_rps', this.systemMetrics.performance.requestsPerSecond);
      this.recordGauge('system_performance_response_time', this.systemMetrics.performance.averageResponseTime);
      this.recordGauge('system_performance_error_rate', this.systemMetrics.performance.errorRate);

    } catch (error: unknown) {
      log.error('Failed to update system metrics', {
        action: 'update_system_metrics_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  // Get current system metrics
  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  // Add alert rule
  addAlert(alert: AlertRule): void {
    this.alerts.set(alert.id, alert);

    log.info('Alert rule added', {
      action: 'alert_rule_added',
      metadata: {
        id: alert.id,
        name: alert.name,
        metric: alert.metric,
        threshold: alert.threshold,
        severity: alert.severity
      }
    });
  }

  // Check alerts for a metric
  private checkAlerts(metric: MetricData): void {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled || alert.metric !== metric.name) {
        continue;
      }

      const isTriggered = this.evaluateAlert(alert, metric.value);

      if (isTriggered) {
        this.triggerAlert(alert, metric);
      }
    }
  }

  // Evaluate if alert should trigger
  private evaluateAlert(alert: AlertRule, value: number): boolean {
    switch (alert.operator) {
      case '>':
        return value > alert.threshold;
      case '<':
        return value < alert.threshold;
      case '=':
        return value === alert.threshold;
      case '>=':
        return value >= alert.threshold;
      case '<=':
        return value <= alert.threshold;
      default:
        return false;
    }
  }

  // Trigger alert
  private triggerAlert(alert: AlertRule, metric: MetricData): void {
    const alertData = {
      alertId: alert.id,
      alertName: alert.name,
      metric: metric.name,
      value: metric.value,
      threshold: alert.threshold,
      severity: alert.severity,
      timestamp: metric.timestamp,
      labels: metric.labels
    };

    log.warn('Alert triggered', {
      action: 'alert_triggered',
      metadata: alertData
    });

    // Add telemetry event
    this.telemetry.addSpanEvent('alert.triggered', {
      'alert.id': alert.id,
      'alert.name': alert.name,
      'alert.severity': alert.severity,
      'metric.name': metric.name,
      'metric.value': metric.value
    });

    // TODO: Implement notification channels (email, Slack, PagerDuty, etc.)
    this.sendAlertNotifications(alert, alertData);
  }

  // Send alert notifications
  private async sendAlertNotifications(alert: AlertRule, alertData: unknown): Promise<void> {
    // Placeholder for notification implementation
    console.log('Alert notification:', {
      channels: alert.notificationChannels,
      alert: alertData
    });
  }

  // Add dashboard widget
  addWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);

    log.info('Dashboard widget added', {
      action: 'dashboard_widget_added',
      metadata: {
        id: widget.id,
        title: widget.title,
        type: widget.type
      }
    });
  }

  // Get dashboard configuration
  getDashboard(): {
    widgets: DashboardWidget[];
    systemMetrics: SystemMetrics;
    recentAlerts: unknown[];
  } {
    return {
      widgets: Array.from(this.widgets.values()),
      systemMetrics: this.getSystemMetrics(),
      recentAlerts: this.getRecentAlerts()
    };
  }

  // Get recent alerts
  private getRecentAlerts(limit: number = 10): unknown[] {
    // This would typically query an alerts storage system
    // For now, return empty array
    return [];
  }

  // Get health status
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: string; message: string }>;
  } {
    const checks: Record<string, { status: string; message: string }> = {};

    // Memory check
    const memoryPercent = this.systemMetrics.memory.percentage;
    checks.memory = {
      status: memoryPercent < 80 ? 'healthy' : memoryPercent < 95 ? 'warning' : 'error',
      message: `Memory usage: ${memoryPercent.toFixed(1)}%`
    };

    // Error rate check
    const errorRate = this.systemMetrics.performance.errorRate;
    checks.errors = {
      status: errorRate < 1 ? 'healthy' : errorRate < 5 ? 'warning' : 'error',
      message: `Error rate: ${errorRate.toFixed(1)}%`
    };

    // Response time check
    const responseTime = this.systemMetrics.performance.averageResponseTime;
    checks.performance = {
      status: responseTime < 1000 ? 'healthy' : responseTime < 5000 ? 'warning' : 'error',
      message: `Avg response time: ${responseTime.toFixed(0)}ms`
    };

    // Database check
    const dbQueryTime = this.systemMetrics.database.averageQueryTime;
    checks.database = {
      status: dbQueryTime < 100 ? 'healthy' : dbQueryTime < 500 ? 'warning' : 'error',
      message: `Avg query time: ${dbQueryTime.toFixed(0)}ms`
    };

    // Overall status
    const hasErrors = Object.values(checks).some(check => check.status === 'error');
    const hasWarnings = Object.values(checks).some(check => check.status === 'warning');

    const overallStatus = hasErrors ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';

    return { status: overallStatus, checks };
  }

  // Export metrics for external systems
  exportMetrics(format: 'prometheus' | 'json' | 'csv'): string {
    switch (format) {
      case 'prometheus':
        return this.exportPrometheusMetrics();
      case 'json':
        return this.exportJsonMetrics();
      case 'csv':
        return this.exportCsvMetrics();
      default:
        return this.exportJsonMetrics();
    }
  }

  // Export metrics in Prometheus format
  private exportPrometheusMetrics(): string {
    const lines: string[] = [];

    for (const [key, metricArray] of this.metrics.entries()) {
      const latest = metricArray[metricArray.length - 1];
      if (!latest) continue;

      const labels = latest.labels
        ? Object.entries(latest.labels).map(([k, v]) => `${k}="${v}"`).join(',')
        : '';

      const labelsStr = labels ? `{${labels}}` : '';
      lines.push(`${latest.name}${labelsStr} ${latest.value} ${latest.timestamp}`);
    }

    return lines.join('\n');
  }

  // Export metrics in JSON format
  private exportJsonMetrics(): string {
    const metrics: unknown = {};

    for (const [key, metricArray] of this.metrics.entries()) {
      metrics[key] = metricArray;
    }

    return JSON.stringify({
      timestamp: Date.now(),
      systemMetrics: this.systemMetrics,
      metrics
    }, null, 2);
  }

  // Export metrics in CSV format
  private exportCsvMetrics(): string {
    const lines = ['timestamp,name,value,type,labels'];

    for (const metricArray of this.metrics.values()) {
      for (const metric of metricArray) {
        const labelsStr = JSON.stringify(metric.labels || {});
        lines.push(`${metric.timestamp},${metric.name},${metric.value},${metric.type},"${labelsStr}"`);
      }
    }

    return lines.join('\n');
  }

  // Start periodic metrics collection
  private startMetricsCollection(): void {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    log.info('Metrics collection started', {
      action: 'metrics_collection_started'
    });
  }

  // Get default system metrics
  private getDefaultSystemMetrics(): SystemMetrics {
    return {
      memory: { used: 0, total: 0, percentage: 0 },
      performance: { requestsPerSecond: 0, averageResponseTime: 0, errorRate: 0 },
      database: { connectionPool: 0, queryCount: 0, averageQueryTime: 0 },
      cache: { hitRate: 0, missRate: 0, size: 0 },
      ai: { requestCount: 0, averageTokens: 0, costPerRequest: 0 },
      organization: { activeOrganizations: 0, totalUsers: 0, contentGenerated: 0 }
    };
  }

  // Setup default alert rules
  private setupDefaultAlerts(): void {
    this.addAlert({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      metric: 'system_memory_usage_percent',
      operator: '>',
      threshold: 90,
      duration: 300,
      severity: 'warning',
      enabled: true,
      notificationChannels: ['email', 'slack']
    });

    this.addAlert({
      id: 'high-error-rate',
      name: 'High Error Rate',
      metric: 'system_performance_error_rate',
      operator: '>',
      threshold: 5,
      duration: 60,
      severity: 'error',
      enabled: true,
      notificationChannels: ['email', 'slack', 'pagerduty']
    });

    this.addAlert({
      id: 'slow-response-time',
      name: 'Slow Response Time',
      metric: 'system_performance_response_time',
      operator: '>',
      threshold: 5000,
      duration: 120,
      severity: 'warning',
      enabled: true,
      notificationChannels: ['slack']
    });
  }

  // Setup default dashboard widgets
  private setupDefaultWidgets(): void {
    this.addWidget({
      id: 'system-overview',
      title: 'System Overview',
      type: 'metric',
      config: {
        metrics: ['system_memory_usage_percent', 'system_performance_rps', 'system_performance_error_rate'],
        timeRange: '1h',
        refreshInterval: 30,
        aggregation: 'avg'
      },
      position: { x: 0, y: 0, width: 4, height: 2 }
    });

    this.addWidget({
      id: 'response-time-chart',
      title: 'Response Time Trend',
      type: 'chart',
      config: {
        metrics: ['http_request_duration'],
        timeRange: '1h',
        refreshInterval: 30,
        visualization: 'line',
        aggregation: 'avg'
      },
      position: { x: 4, y: 0, width: 8, height: 4 }
    });

    this.addWidget({
      id: 'error-rate-chart',
      title: 'Error Rate',
      type: 'chart',
      config: {
        metrics: ['system_performance_error_rate'],
        timeRange: '1h',
        refreshInterval: 30,
        visualization: 'area',
        aggregation: 'avg'
      },
      position: { x: 0, y: 2, width: 4, height: 2 }
    });
  }
}

// Global dashboard instance
const globalDashboard = new MonitoringDashboard();

// Export dashboard instance
export { globalDashboard as dashboard };