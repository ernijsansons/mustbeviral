/**
 * Database Performance Monitoring
 * Real-time monitoring and alerting for database operations
 * Fortune 50-grade observability patterns
 */

import type { ConnectionMetrics } from './connectionPool';
import type { CacheStats } from './queryCache';

export interface DatabaseMetrics {
  timestamp: number;
  connectionPool: ConnectionMetrics;
  queryCache: CacheStats;
  queryPerformance: QueryPerformanceMetrics;
  errorRates: ErrorMetrics;
  healthScore: number;
}

export interface QueryPerformanceMetrics {
  averageQueryTime: number;
  slowQueries: SlowQuery[];
  queryThroughput: number;
  concurrentQueries: number;
  deadlocks: number;
  timeouts: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: number;
  stackTrace?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  connectionErrors: number;
  queryErrors: number;
  timeoutErrors: number;
  recentErrors: DatabaseError[];
}

export interface DatabaseError {
  type: 'connection' | 'query' | 'timeout' | 'unknown';
  message: string;
  timestamp: number;
  query?: string;
  stackTrace?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: DatabaseMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // milliseconds
  lastTriggered?: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  metrics: Partial<DatabaseMetrics>;
  acknowledged: boolean;
}

export interface MonitorConfig {
  metricsInterval: number;
  alertingEnabled: boolean;
  slowQueryThreshold: number;
  errorRateThreshold: number;
  healthScoreThreshold: number;
  retentionPeriod: number;
}

/**
 * Database Performance Monitor
 */
export class DatabaseMonitor {
  private config: MonitorConfig;
  private metrics: DatabaseMetrics[] = [];
  private alerts: Alert[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private metricsTimer?: NodeJS.Timeout;
  private queryTimes: number[] = [];
  private slowQueries: SlowQuery[] = [];
  private errors: DatabaseError[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly MAX_SLOW_QUERIES = 100;
  private readonly MAX_ERRORS = 500;

  constructor(config?: Partial<MonitorConfig>) {
    this.config = {
      metricsInterval: config?.metricsInterval ?? 30000, // 30 seconds
      alertingEnabled: config?.alertingEnabled ?? true,
      slowQueryThreshold: config?.slowQueryThreshold ?? 1000, // 1 second
      errorRateThreshold: config?.errorRateThreshold ?? 0.05, // 5%
      healthScoreThreshold: config?.healthScoreThreshold ?? 0.8, // 80%
      retentionPeriod: config?.retentionPeriod ?? 24 * 60 * 60 * 1000, // 24 hours
    };

    this.initializeDefaultAlertRules();
    this.startMetricsCollection();
  }

  /**
   * Record query execution
   */
  recordQuery(query: string, duration: number, success: boolean, error?: Error): void {
    // Record query time
    this.queryTimes.push(duration);
    if (this.queryTimes.length > 1000) {
      this.queryTimes.shift();
    }

    // Record slow query
    if (duration > this.config.slowQueryThreshold) {
      const slowQuery: SlowQuery = {
        query: this.sanitizeQuery(query),
        duration,
        timestamp: Date.now(),
        stackTrace: error?.stack,
      };

      this.slowQueries.push(slowQuery);
      if (this.slowQueries.length > this.MAX_SLOW_QUERIES) {
        this.slowQueries.shift();
      }
    }

    // Record error
    if (!success && error) {
      this.recordError({
        type: this.classifyError(error),
        message: error.message,
        timestamp: Date.now(),
        query: this.sanitizeQuery(query),
        stackTrace: error.stack,
      });
    }
  }

  /**
   * Record database error
   */
  recordError(error: DatabaseError): void {
    this.errors.push(error);
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.shift();
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(connectionMetrics?: ConnectionMetrics, cacheStats?: CacheStats): DatabaseMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Calculate query performance
    const recentQueryTimes = this.queryTimes.filter(
      (time, index) => now - (index * 1000) < 60000
    );
    const recentSlowQueries = this.slowQueries.filter(
      query => query.timestamp > oneMinuteAgo
    );
    const recentErrors = this.errors.filter(
      error => error.timestamp > oneMinuteAgo
    );

    const queryPerformance: QueryPerformanceMetrics = {
      averageQueryTime: recentQueryTimes.length > 0
        ? recentQueryTimes.reduce((a, b) => a + b, 0) / recentQueryTimes.length
        : 0,
      slowQueries: recentSlowQueries.slice(-10), // Last 10 slow queries
      queryThroughput: recentQueryTimes.length, // Queries per minute
      concurrentQueries: 0, // Would need more tracking
      deadlocks: 0, // D1 doesn't have traditional deadlocks
      timeouts: recentErrors.filter(e => e.type === 'timeout').length,
    };

    const errorMetrics: ErrorMetrics = {
      totalErrors: this.errors.length,
      errorRate: recentQueryTimes.length > 0
        ? recentErrors.length / recentQueryTimes.length
        : 0,
      connectionErrors: recentErrors.filter(e => e.type === 'connection').length,
      queryErrors: recentErrors.filter(e => e.type === 'query').length,
      timeoutErrors: recentErrors.filter(e => e.type === 'timeout').length,
      recentErrors: recentErrors.slice(-10),
    };

    // Calculate health score
    const healthScore = this.calculateHealthScore(
      connectionMetrics,
      cacheStats,
      queryPerformance,
      errorMetrics
    );

    return {
      timestamp: now,
      connectionPool: connectionMetrics || this.getDefaultConnectionMetrics(),
      queryCache: cacheStats || this.getDefaultCacheStats(),
      queryPerformance,
      errorRates: errorMetrics,
      healthScore,
    };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(duration?: number): DatabaseMetrics[] {
    const since = duration ? Date.now() - duration : 0;
    return this.metrics.filter(m => m.timestamp > since);
  }

  /**
   * Get current alerts
   */
  getAlerts(acknowledged = false): Alert[] {
    return this.alerts.filter(alert => alert.acknowledged === acknowledged);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Generate health report
   */
  generateHealthReport(): {
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) {
      return {
        overallHealth: 'unhealthy',
        score: 0,
        issues: ['No metrics available'],
        recommendations: ['Start monitoring'],
      };
    }

    const { healthScore } = latestMetrics;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Analyze issues
    if (latestMetrics.errorRates.errorRate > this.config.errorRateThreshold) {
      issues.push(`High error rate: ${(latestMetrics.errorRates.errorRate * 100).toFixed(2)}%`);
      recommendations.push('Investigate query errors and optimize failing queries');
    }

    if (latestMetrics.queryPerformance.averageQueryTime > this.config.slowQueryThreshold) {
      issues.push(`Slow query performance: ${latestMetrics.queryPerformance.averageQueryTime.toFixed(2)}ms avg`);
      recommendations.push('Optimize slow queries and add proper indexing');
    }

    if (latestMetrics.connectionPool.healthCheckStatus !== 'healthy') {
      issues.push(`Connection pool issues: ${latestMetrics.connectionPool.healthCheckStatus}`);
      recommendations.push('Check database connectivity and pool configuration');
    }

    if (latestMetrics.queryCache.hitRate < 0.5) {
      issues.push(`Low cache hit rate: ${(latestMetrics.queryCache.hitRate * 100).toFixed(2)}%`);
      recommendations.push('Review caching strategy and TTL settings');
    }

    const overallHealth = healthScore >= 0.8 ? 'healthy' :
                         healthScore >= 0.6 ? 'degraded' : 'unhealthy';

    return {
      overallHealth,
      score: healthScore,
      issues,
      recommendations,
    };
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const rules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (metrics) => metrics.errorRates.errorRate > this.config.errorRateThreshold,
        severity: 'high',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'slow-queries',
        name: 'Slow Queries',
        condition: (metrics) => metrics.queryPerformance.slowQueries.length > 5,
        severity: 'medium',
        enabled: true,
        cooldown: 600000, // 10 minutes
      },
      {
        id: 'low-health-score',
        name: 'Low Health Score',
        condition: (metrics) => metrics.healthScore < this.config.healthScoreThreshold,
        severity: 'high',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'connection-pool-unhealthy',
        name: 'Connection Pool Unhealthy',
        condition: (metrics) => metrics.connectionPool.healthCheckStatus === 'unhealthy',
        severity: 'critical',
        enabled: true,
        cooldown: 120000, // 2 minutes
      },
      {
        id: 'low-cache-hit-rate',
        name: 'Low Cache Hit Rate',
        condition: (metrics) => metrics.queryCache.hitRate < 0.3,
        severity: 'low',
        enabled: true,
        cooldown: 900000, // 15 minutes
      },
    ];

    for (const rule of rules) {
      this.alertRules.set(rule.id, rule);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);
  }

  /**
   * Collect and store metrics
   */
  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics();
    
    this.metrics.push(metrics);
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }

    // Check alerts
    if (this.config.alertingEnabled) {
      this.checkAlerts(metrics);
    }

    // Cleanup old data
    this.cleanupOldData();
  }

  /**
   * Check alerts against metrics
   */
  private checkAlerts(metrics: DatabaseMetrics): void {
    const now = Date.now();

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown) {
        continue;
      }

      // Check condition
      try {
        if (rule.condition(metrics)) {
          const alert: Alert = {
            id: crypto.randomUUID(),
            ruleId: rule.id,
            severity: rule.severity,
            message: `Alert: ${rule.name}`,
            timestamp: now,
            metrics: {
              healthScore: metrics.healthScore,
              errorRates: metrics.errorRates,
              queryPerformance: metrics.queryPerformance,
            },
            acknowledged: false,
          };

          this.alerts.push(alert);
          rule.lastTriggered = now;

          // Log alert
          console.warn(`DATABASE ALERT [${rule.severity.toUpperCase()}]: ${rule.name}`, {
            alertId: alert.id,
            metrics: alert.metrics,
          });
        }
      } catch (error) {
        console.error(`Error checking alert rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(
    connectionMetrics?: ConnectionMetrics,
    cacheStats?: CacheStats,
    queryPerformance?: QueryPerformanceMetrics,
    errorMetrics?: ErrorMetrics
  ): number {
    let score = 1.0;
    let factors = 0;

    // Connection pool health (25%)
    if (connectionMetrics) {
      factors++;
      const poolScore = connectionMetrics.healthCheckStatus === 'healthy' ? 1.0 :
                       connectionMetrics.healthCheckStatus === 'degraded' ? 0.7 : 0.3;
      score *= poolScore;
    }

    // Cache performance (20%)
    if (cacheStats) {
      factors++;
      const cacheScore = Math.min(1.0, cacheStats.hitRate + 0.3); // Minimum 30%
      score *= cacheScore;
    }

    // Query performance (30%)
    if (queryPerformance) {
      factors++;
      const avgTime = queryPerformance.averageQueryTime;
      const queryScore = avgTime > this.config.slowQueryThreshold * 2 ? 0.3 :
                        avgTime > this.config.slowQueryThreshold ? 0.7 : 1.0;
      score *= queryScore;
    }

    // Error rates (25%)
    if (errorMetrics) {
      factors++;
      const errorScore = Math.max(0, 1.0 - (errorMetrics.errorRate * 5)); // Scale error rate
      score *= errorScore;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Classify error type
   */
  private classifyError(error: Error): DatabaseError['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('connection') || message.includes('network')) {
      return 'connection';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('syntax') || message.includes('sql')) {
      return 'query';
    }
    
    return 'unknown';
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/('.*?')/g, "'***'")
      .replace(/".*?"/g, '"***"')
      .substring(0, 200);
  }

  /**
   * Get default connection metrics
   */
  private getDefaultConnectionMetrics(): ConnectionMetrics {
    return {
      activeConnections: 0,
      totalConnections: 0,
      failedConnections: 0,
      averageResponseTime: 0,
      healthCheckStatus: 'healthy',
      lastHealthCheck: new Date(),
      queryCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Get default cache stats
   */
  private getDefaultCacheStats(): CacheStats {
    return {
      entries: 0,
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      avgEntrySize: 0,
      oldestEntry: 0,
      newestEntry: 0,
    };
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;

    // Cleanup old metrics
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

    // Cleanup old alerts
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);

    // Cleanup old errors
    this.errors = this.errors.filter(e => e.timestamp > cutoff);

    // Cleanup old slow queries
    this.slowQueries = this.slowQueries.filter(q => q.timestamp > cutoff);
  }

  /**
   * Shutdown monitor
   */
  shutdown(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
  }
}

// Singleton instance
export const databaseMonitor = new DatabaseMonitor();

export default DatabaseMonitor;