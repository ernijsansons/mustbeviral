/**
 * Operational Dashboard
 * Real-time operational insights and system monitoring dashboard
 */

import { CloudflareEnv } from '../cloudflare';
import { getPerformanceMonitor } from '../monitoring/performanceMonitor';
import { getConnectionPool } from '../database/connectionPool';
import { getAutoScaler } from '../scalability/autoScaler';
import { getComplianceManager } from '../compliance/complianceManager';
import { getDataRetentionManager } from '../compliance/dataRetention';
import { HealthMonitor } from '../health/healthMonitor';

export interface DashboardMetrics {
  timestamp: string;
  system: SystemMetrics;
  performance: PerformanceMetrics;
  security: SecurityMetrics;
  compliance: ComplianceMetrics;
  infrastructure: InfrastructureMetrics;
  business: BusinessMetrics;
  alerts: Alert[];
}

export interface SystemMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  environment: string;
  activeConnections: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

export interface PerformanceMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  databaseLatency: number;
  queueDepth: number;
}

export interface SecurityMetrics {
  securityEvents: number;
  suspiciousActivity: number;
  blockedRequests: number;
  authenticationFailures: number;
  rateLimitViolations: number;
  maliciousUserAgents: number;
  geoRestrictedAttempts: number;
  lastSecurityIncident?: string;
}

export interface ComplianceMetrics {
  overallScore: number;
  implementedRequirements: number;
  pendingRequirements: number;
  criticalFindings: number;
  privacyRequestsPending: number;
  dataRetentionJobs: number;
  consentRate: number;
  lastAssessment?: string;
}

export interface InfrastructureMetrics {
  databaseConnections: {
    active: number;
    total: number;
    healthy: number;
  };
  cacheStatus: {
    hitRate: number;
    size: number;
    errors: number;
  };
  storageUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  scalingEvents: number;
  circuitBreakerStatus: {
    open: number;
    halfOpen: number;
    closed: number;
  };
}

export interface BusinessMetrics {
  activeUsers: number;
  contentCreated: number;
  revenue: number;
  subscriptions: {
    free: number;
    standard: number;
    premium: number;
  };
  conversionRate: number;
  churnRate: number;
}

export interface Alert {
  id: string;
  type: 'system' | 'performance' | 'security' | 'compliance' | 'business';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  source: string;
  actions?: string[];
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'status' | 'alert';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: Record<string, unknown>;
  data: unknown;
  refreshInterval: number;
  lastUpdated: string;
}

export interface DashboardConfig {
  refreshInterval: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    securityEvents: number;
    complianceScore: number;
  };
  widgets: DashboardWidget[];
  customMetrics: CustomMetric[];
}

export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  query: string;
  type: 'gauge' | 'counter' | 'histogram';
  unit: string;
  thresholds: {
    warning: number;
    critical: number;
  };
}

export class OperationalDashboard {
  private env: CloudflareEnv;
  private config: DashboardConfig;
  private healthMonitor: HealthMonitor;
  private metricsCache: Map<string, { data: unknown; timestamp: Date }> = new Map();
  private alertHistory: Alert[] = [];
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_ALERTS = 1000;

  constructor(env: CloudflareEnv, config?: Partial<DashboardConfig>) {
    this.env = env;
    this.healthMonitor = new HealthMonitor(env);
    this.config = {
      refreshInterval: 30000,
      alertThresholds: {
        responseTime: 2000,
        errorRate: 5,
        securityEvents: 10,
        complianceScore: 80
      },
      widgets: this.getDefaultWidgets(),
      customMetrics: [],
      ...config
    };
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const timestamp = new Date().toISOString();

    // Collect metrics from all systems
    const [
      systemMetrics,
      performanceMetrics,
      securityMetrics,
      complianceMetrics,
      infrastructureMetrics,
      businessMetrics
    ] = await Promise.all([
      this.getSystemMetrics(),
      this.getPerformanceMetrics(),
      this.getSecurityMetrics(),
      this.getComplianceMetrics(),
      this.getInfrastructureMetrics(),
      this.getBusinessMetrics()
    ]);

    // Generate alerts
    const alerts = await this.generateAlerts({
      system: systemMetrics,
      performance: performanceMetrics,
      security: securityMetrics,
      compliance: complianceMetrics,
      infrastructure: infrastructureMetrics,
      business: businessMetrics
    });

    return { _timestamp,
      system: systemMetrics,
      performance: performanceMetrics,
      security: securityMetrics,
      compliance: complianceMetrics,
      infrastructure: infrastructureMetrics,
      business: businessMetrics,
      alerts
    };
  }

  /**
   * Get real-time system status
   */
  async getSystemStatus(): Promise<{
    status: 'operational' | 'degraded' | 'major_outage';
    components: Array<{
      name: string;
      status: 'operational' | 'degraded' | 'outage';
      responseTime: number;
      uptime: number;
    }>;
    incidents: Array<{
      id: string;
      title: string;
      status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
      impact: 'minor' | 'major' | 'critical';
      startTime: string;
      updates: Array<{
        timestamp: string;
        message: string;
      }>;
    }>;
  }> {
    const healthStatus = await this.healthMonitor.performHealthCheck();

    const components = [
      {
        name: 'API',
        status: healthStatus.status === 'healthy' ? 'operational' as const : 'degraded' as const,
        responseTime: healthStatus.summary.responseTime,
        uptime: 99.9
      },
      {
        name: 'Database',
        status: healthStatus.checks.find(c => c.name === 'database')?.status === 'pass' ? 'operational' as const : 'degraded' as const,
        responseTime: healthStatus.checks.find(c => c.name === 'database')?.duration || 0,
        uptime: 99.8
      },
      {
        name: 'Storage',
        status: 'operational' as const,
        responseTime: 50,
        uptime: 99.9
      },
      {
        name: 'Authentication',
        status: 'operational' as const,
        responseTime: 100,
        uptime: 99.95
      }
    ];

    const overallStatus = components.every(c => c.status === 'operational') ? 'operational' :
                         components.some(c => c.status === 'outage') ? 'major_outage' : 'degraded';

    return {
      status: overallStatus,
      components,
      incidents: [] // Would pull from incident management system
    };
  }

  /**
   * Get widget data
   */
  async getWidgetData(widgetId: string): Promise<unknown> {
    const widget = this.config.widgets.find(w => w.id === widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    // Check cache first
    const cached = this.metricsCache.get(widgetId);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL) {
      return cached.data;
    }

    // Generate widget data based on type
    let data: unknown;

    switch (widget.type) {
      case 'metric':
        data = await this.generateMetricWidgetData(widget);
        break;
      case 'chart':
        data = await this.generateChartWidgetData(widget);
        break;
      case 'table':
        data = await this.generateTableWidgetData(widget);
        break;
      case 'status':
        data = await this.generateStatusWidgetData(widget);
        break;
      case 'alert':
        data = await this.generateAlertWidgetData(widget);
        break;
      default:
        data = { error: 'Unknown widget type' };
    }

    // Cache the data
    this.metricsCache.set(widgetId, { _data,
      timestamp: new Date()
    });

    return data;
  }

  /**
   * Create custom alert
   */
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Promise<Alert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const newAlert: Alert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alert
    };

    this.alertHistory.unshift(newAlert);

    // Keep only recent alerts
    if (this.alertHistory.length > this.MAX_ALERTS) {
      this.alertHistory = this.alertHistory.slice(0, this.MAX_ALERTS);
    }

    console.log(`LOG: DASHBOARD-ALERT-1 - Created alert: ${alertId} (${alert.severity})`);
    return newAlert;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`LOG: DASHBOARD-ALERT-ACK-1 - Acknowledged alert: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Export dashboard data
   */
  async exportDashboard(format: 'json' | 'csv' | 'pdf'): Promise<string | Buffer> {
    const metrics = await this.getDashboardMetrics();

    switch (format) {
      case 'json':
        return JSON.stringify(metrics, null, 2);
      case 'csv':
        return this.formatAsCSV(metrics);
      case 'pdf':
        return Buffer.from('PDF export not implemented'); // Would use PDF library
      default:
        return JSON.stringify(metrics, null, 2);
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const healthStatus = await this.healthMonitor.performHealthCheck();
    const connectionPool = getConnectionPool(this.env);
    const poolMetrics = connectionPool.getMetrics();

    return {
      status: healthStatus.status,
      uptime: healthStatus.uptime,
      version: healthStatus.version,
      environment: healthStatus.environment,
      activeConnections: poolMetrics.activeConnections,
      memoryUsage: 0, // Would get from system
      responseTime: healthStatus.summary.responseTime,
      errorRate: (healthStatus.summary.failed / healthStatus.summary.total) * 100,
      throughput: 0 // Would calculate from recent metrics
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const perfMonitor = getPerformanceMonitor(this.env);
    const metrics = perfMonitor.getCurrentMetrics();

    return {
      requestsPerSecond: metrics.throughput.requestsPerSecond,
      averageResponseTime: metrics.responseTime.avg,
      p95ResponseTime: metrics.responseTime.p95,
      p99ResponseTime: metrics.responseTime.p99,
      errorRate: metrics.errors.rate,
      cacheHitRate: metrics.resources.cacheHitRate,
      databaseLatency: 50, // Would get from connection pool
      queueDepth: 0 // Would get from queue monitoring
    };
  }

  /**
   * Get security metrics
   */
  private async getSecurityMetrics(): Promise<SecurityMetrics> {
    // These would be collected from security monitoring systems
    return {
      securityEvents: 15,
      suspiciousActivity: 3,
      blockedRequests: 45,
      authenticationFailures: 8,
      rateLimitViolations: 12,
      maliciousUserAgents: 5,
      geoRestrictedAttempts: 7,
      lastSecurityIncident: '2024-01-15T10:30:00Z'
    };
  }

  /**
   * Get compliance metrics
   */
  private async getComplianceMetrics(): Promise<ComplianceMetrics> {
    const complianceManager = getComplianceManager(this.env);
    const report = await complianceManager.generateComplianceReport();

    return {
      overallScore: report.summary.overallComplianceScore,
      implementedRequirements: report.summary.implementedRequirements,
      pendingRequirements: report.summary.pendingRequirements,
      criticalFindings: report.riskAreas.filter(r => r.riskLevel === 'critical').length,
      privacyRequestsPending: report.privacyRequests.pending,
      dataRetentionJobs: 5, // Would get from retention manager
      consentRate: 85.5, // Would calculate from consent records
      lastAssessment: report.frameworks[0]?.lastAssessment?.toISOString()
    };
  }

  /**
   * Get infrastructure metrics
   */
  private async getInfrastructureMetrics(): Promise<InfrastructureMetrics> {
    const connectionPool = getConnectionPool(this.env);
    const poolMetrics = connectionPool.getMetrics();
    const autoScaler = getAutoScaler(this.env);
    const scalingHistory = autoScaler.getScalingRecommendations();

    return {
      databaseConnections: {
        active: poolMetrics.activeConnections,
        total: poolMetrics.totalConnections,
        healthy: poolMetrics.totalConnections - poolMetrics.failedConnections
      },
      cacheStatus: {
        hitRate: 85.2,
        size: 1024 * 1024, // 1MB
        errors: 2
      },
      storageUsage: {
        used: 500 * 1024 * 1024, // 500MB
        total: 10 * 1024 * 1024 * 1024, // 10GB
        percentage: 5.0
      },
      scalingEvents: 3,
      circuitBreakerStatus: {
        open: 0,
        halfOpen: 1,
        closed: 5
      }
    };
  }

  /**
   * Get business metrics
   */
  private async getBusinessMetrics(): Promise<BusinessMetrics> {
    // These would come from business analytics systems
    return {
      activeUsers: 1250,
      contentCreated: 89,
      revenue: 15420.50,
      subscriptions: {
        free: 1000,
        standard: 200,
        premium: 50
      },
      conversionRate: 3.2,
      churnRate: 1.8
    };
  }

  /**
   * Generate alerts based on metrics
   */
  private async generateAlerts(metrics: {
    system: SystemMetrics;
    performance: PerformanceMetrics;
    security: SecurityMetrics;
    compliance: ComplianceMetrics;
    infrastructure: InfrastructureMetrics;
    business: BusinessMetrics;
  }): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // System alerts
    if (metrics.system.status === 'unhealthy') {
      alerts.push({
        id: `system_unhealthy_${Date.now()}`,
        type: 'system',
        severity: 'critical',
        title: 'System Unhealthy',
        description: 'System health checks are failing',
        timestamp: new Date().toISOString(),
        acknowledged: false,
        source: 'health_monitor',
        actions: ['Check system logs', 'Review recent deployments']
      });
    }

    // Performance alerts
    if (metrics.performance.averageResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        id: `high_response_time_${Date.now()}`,
        type: 'performance',
        severity: 'warning',
        title: 'High Response Time',
        description: `Average response time is ${metrics.performance.averageResponseTime}ms`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        source: 'performance_monitor',
        actions: ['Check database performance', 'Review query optimization']
      });
    }

    if (metrics.performance.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        id: `high_error_rate_${Date.now()}`,
        type: 'performance',
        severity: 'critical',
        title: 'High Error Rate',
        description: `Error rate is ${metrics.performance.errorRate}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        source: 'performance_monitor',
        actions: ['Check error logs', 'Review recent changes']
      });
    }

    // Security alerts
    if (metrics.security.securityEvents > this.config.alertThresholds.securityEvents) {
      alerts.push({
        id: `high_security_events_${Date.now()}`,
        type: 'security',
        severity: 'warning',
        title: 'High Security Events',
        description: `${metrics.security.securityEvents} security events detected`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        source: 'security_monitor',
        actions: ['Review security logs', 'Check for attack patterns']
      });
    }

    // Compliance alerts
    if (metrics.compliance.overallScore < this.config.alertThresholds.complianceScore) {
      alerts.push({
        id: `low_compliance_score_${Date.now()}`,
        type: 'compliance',
        severity: 'warning',
        title: 'Low Compliance Score',
        description: `Compliance score is ${metrics.compliance.overallScore}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        source: 'compliance_manager',
        actions: ['Review compliance requirements', 'Update policies']
      });
    }

    return alerts;
  }

  /**
   * Get default dashboard widgets
   */
  private getDefaultWidgets(): DashboardWidget[] {
    return [
      {
        id: 'system_status',
        title: 'System Status',
        type: 'status',
        size: 'medium',
        position: { x: 0, y: 0 },
        config: { showDetails: true },
        data: {},
        refreshInterval: 30000,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'response_time',
        title: 'Response Time',
        type: 'chart',
        size: 'large',
        position: { x: 1, y: 0 },
        config: { chartType: 'line', timeRange: '1h' },
        data: {},
        refreshInterval: 30000,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'error_rate',
        title: 'Error Rate',
        type: 'metric',
        size: 'small',
        position: { x: 0, y: 1 },
        config: { unit: '%', threshold: 5 },
        data: {},
        refreshInterval: 30000,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'active_alerts',
        title: 'Active Alerts',
        type: 'alert',
        size: 'medium',
        position: { x: 1, y: 1 },
        config: { maxAlerts: 10, severity: 'all' },
        data: {},
        refreshInterval: 15000,
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  /**
   * Widget data generators
   */
  private async generateMetricWidgetData(widget: DashboardWidget): Promise<unknown> {
    // Generate metric data based on widget config
    return {
      value: Math.floor(Math.random() * 100),
      unit: widget.config.unit || '',
      trend: 'up',
      change: '+5.2%'
    };
  }

  private async generateChartWidgetData(widget: DashboardWidget): Promise<unknown> {
    // Generate chart data
    const dataPoints = [];
    for (let i = 0; i < 24; i++) {
      dataPoints.push({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
        value: Math.floor(Math.random() * 100)
      });
    }

    return {
      data: dataPoints,
      labels: dataPoints.map(d => d.timestamp),
      values: dataPoints.map(d => d.value)
    };
  }

  private async generateTableWidgetData(widget: DashboardWidget): Promise<unknown> {
    // Generate table data
    return {
      headers: ['Name', 'Status', 'Value'],
      rows: [
        ['API', 'Healthy', '99.9%'],
        ['Database', 'Healthy', '99.8%'],
        ['Cache', 'Warning', '85.2%']
      ]
    };
  }

  private async generateStatusWidgetData(widget: DashboardWidget): Promise<unknown> {
    const systemStatus = await this.getSystemStatus();
    return {
      status: systemStatus.status,
      components: systemStatus.components
    };
  }

  private async generateAlertWidgetData(widget: DashboardWidget): Promise<unknown> {
    const activeAlerts = this.alertHistory
      .filter(a => !a.acknowledged)
      .slice(0, widget.config.maxAlerts || 10);

    return {
      alerts: activeAlerts,
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      warning: activeAlerts.filter(a => a.severity === 'warning').length
    };
  }

  /**
   * Format metrics as CSV
   */
  private formatAsCSV(metrics: DashboardMetrics): string {
    const lines: string[] = [];
    lines.push('metric,value,timestamp');

    // System metrics
    lines.push(`system_status,${metrics.system.status},${metrics.timestamp}`);
    lines.push(`system_uptime,${metrics.system.uptime},${metrics.timestamp}`);
    lines.push(`response_time,${metrics.system.responseTime},${metrics.timestamp}`);

    // Performance metrics
    lines.push(`requests_per_second,${metrics.performance.requestsPerSecond},${metrics.timestamp}`);
    lines.push(`error_rate,${metrics.performance.errorRate},${metrics.timestamp}`);
    lines.push(`cache_hit_rate,${metrics.performance.cacheHitRate},${metrics.timestamp}`);

    return lines.join('\n');
  }
}

/**
 * Dashboard endpoints for API access
 */
export class DashboardAPI {
  private dashboard: OperationalDashboard;

  constructor(env: CloudflareEnv) {
    this.dashboard = new OperationalDashboard(env);
  }

  /**
   * Get dashboard metrics endpoint
   */
  async handleMetrics(): Promise<Response> {
    try {
      const metrics = await this.dashboard.getDashboardMetrics();

      return new Response(JSON.stringify(metrics, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=30'
        }
      });

    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          error: 'Failed to get dashboard metrics',
          message: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  /**
   * Get system status endpoint
   */
  async handleStatus(): Promise<Response> {
    try {
      const status = await this.dashboard.getSystemStatus();

      return new Response(JSON.stringify(status, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=10'
        }
      });

    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          error: 'Failed to get system status',
          message: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  /**
   * Get widget data endpoint
   */
  async handleWidget(widgetId: string): Promise<Response> {
    try {
      const data = await this.dashboard.getWidgetData(widgetId);

      return new Response(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=30'
        }
      });

    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          error: 'Failed to get widget data',
          message: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

/**
 * Global dashboard instance
 */
let globalDashboard: OperationalDashboard | null = null;

/**
 * Get or create global dashboard
 */
export function getOperationalDashboard(env: CloudflareEnv, config?: Partial<DashboardConfig>): OperationalDashboard {
  if (!globalDashboard) {
    globalDashboard = new OperationalDashboard(env, config);
  }
  return globalDashboard;
}