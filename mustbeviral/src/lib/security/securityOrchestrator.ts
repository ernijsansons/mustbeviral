/**
 * Security Orchestrator for Must Be Viral V2
 * Coordinates all security monitoring, alerting, and response systems
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import { runtimeSecurityMonitor, SecurityIncident } from './runtimeSecurityMonitor';
import { securityAlerting } from './alertingSystem';
import { securityHealthChecker } from './securityHealthCheck';
import { securityMonitor, SecurityEvent, ThreatResponse } from './securityMonitoring';

export interface SecurityDashboardData {
  timestamp: Date;
  overview: {
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    activeIncidents: number;
    blockedAttacks: number;
    healthScore: number;
    systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED';
  };
  realTimeMetrics: {
    requestsPerSecond: number;
    securityEventsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
    threatDetectionRate: number;
  };
  vulnerabilities: Array<{
    id: string;
    name: string;
    severity: string;
    detectionRate: number;
    lastDetected?: Date;
    falsePositiveRate: number;
  }>;
  incidents: Array<{
    id: string;
    timestamp: Date;
    vulnerability: string;
    severity: string;
    sourceIP: string;
    status: string;
    blocked: boolean;
  }>;
  alerts: Array<{
    id: string;
    timestamp: Date;
    message: string;
    severity: string;
    acknowledged: boolean;
  }>;
  compliance: {
    owaspScore: number;
    gdprCompliant: boolean;
    auditTrailHealthy: boolean;
    lastComplianceCheck: Date;
  };
  recommendations: Array<{
    priority: string;
    category: string;
    description: string;
    action: string;
  }>;
}

export interface SecurityMetrics {
  alert_level: 'critical' | 'warning' | 'info';
  anomalies_detected: Array<{
    type: 'error' | 'performance' | 'resource';
    description: string;
    severity: 'high' | 'medium' | 'low';
    frequency: string;
    impact: string;
  }>;
  metrics_summary: {
    error_rate: string;
    avg_latency: string;
    throughput: string;
    resource_usage: { cpu: string; memory: string };
  };
  hotfix_recommendations: Array<{
    issue: string;
    fix: string;
    priority: 'immediate' | 'scheduled' | 'optional';
    implementation: string;
  }>;
  trend_analysis: string;
  next_actions: string[];
}

export class SecurityOrchestrator extends EventEmitter {
  private isInitialized = false;
  private metricsHistory: Array<{ timestamp: Date; metrics: SecurityMetrics }> = [];
  private dashboardCache?: { data: SecurityDashboardData; timestamp: Date };
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize security orchestrator
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🔐 Initializing Security Orchestrator...');

      // Set up event listeners for cross-system communication
      this.setupEventListeners();

      // Perform initial health check
      await securityHealthChecker.performHealthCheck();

      this.isInitialized = true;
      console.log('✅ Security Orchestrator initialized successfully');

      // Emit initialization complete event
      this.emit('initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Security Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Main security middleware for Express applications
   */
  securityMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.isInitialized) {
        console.warn('Security orchestrator not initialized, skipping security checks');
        return next();
      }

      const startTime = Date.now();
      const requestId = this.generateRequestId();

      try {
        // Add security context to request
        (req as any).security = {
          requestId,
          startTime,
          orchestrated: true
        };

        // Run pre-request security checks
        const preCheckResult = await this.preRequestSecurityAnalysis(req, res);

        if (preCheckResult.blocked) {
          return this.handleBlockedRequest(req, res, preCheckResult);
        }

        // Set up post-request monitoring
        this.setupPostRequestMonitoring(req, res, startTime);

        next();

      } catch (error) {
        console.error('Security middleware error:', error);
        // Continue processing even if security check fails
        next();
      }
    };
  }

  /**
   * Get comprehensive security dashboard data
   */
  async getSecurityDashboard(): Promise<SecurityDashboardData> {
    // Check cache
    if (this.dashboardCache &&
        Date.now() - this.dashboardCache.timestamp.getTime() < this.CACHE_TTL) {
      return this.dashboardCache.data;
    }

    try {
      // Gather data from all security systems
      const [
        healthMetrics,
        runtimeDashboard,
        monitoringDashboard,
        alertStats
      ] = await Promise.all([
        securityHealthChecker.performHealthCheck(),
        runtimeSecurityMonitor.getSecurityDashboard(),
        securityMonitor.getSecurityDashboard(),
        securityAlerting.getAlertStatistics()
      ]);

      const dashboardData: SecurityDashboardData = {
        timestamp: new Date(),
        overview: {
          threatLevel: runtimeDashboard.overview.threatLevel,
          activeIncidents: runtimeDashboard.overview.activeIncidents,
          blockedAttacks: runtimeDashboard.overview.blockedAttacks,
          healthScore: healthMetrics.overall.score,
          systemStatus: healthMetrics.overall.status
        },
        realTimeMetrics: {
          requestsPerSecond: monitoringDashboard.performance.averageProcessingTime > 0 ?
            Math.round(1000 / monitoringDashboard.performance.averageProcessingTime) : 0,
          securityEventsPerMinute: monitoringDashboard.recentEvents.length,
          avgResponseTime: monitoringDashboard.performance.averageProcessingTime,
          errorRate: monitoringDashboard.performance.detectionAccuracy * 100,
          threatDetectionRate: runtimeDashboard.vulnerabilityStatus.reduce(
            (avg, v) => avg + v.detectionRate, 0
          ) / runtimeDashboard.vulnerabilityStatus.length
        },
        vulnerabilities: runtimeDashboard.vulnerabilityStatus.map(v => ({
          id: v.id,
          name: v.name,
          severity: 'HIGH', // Would map from actual severity
          detectionRate: v.detectionRate,
          lastDetected: v.lastTested,
          falsePositiveRate: v.falsePositiveRate
        })),
        incidents: runtimeDashboard.recentIncidents.slice(0, 10).map(incident => ({
          id: incident.id,
          timestamp: incident.timestamp,
          vulnerability: incident.vulnerability,
          severity: incident.severity,
          sourceIP: incident.source.ip,
          status: incident.investigation.status,
          blocked: incident.response.blocked
        })),
        alerts: monitoringDashboard.recentEvents.slice(0, 10).map(event => ({
          id: event.id,
          timestamp: new Date(event.timestamp),
          message: `${event.type} detected from ${event.source.ip}`,
          severity: this.mapThreatLevelToSeverity(event.threatLevel),
          acknowledged: false
        })),
        compliance: {
          owaspScore: healthMetrics.compliance.owaspCompliance,
          gdprCompliant: healthMetrics.compliance.gdprCompliance,
          auditTrailHealthy: healthMetrics.compliance.auditTrailIntegrity,
          lastComplianceCheck: new Date()
        },
        recommendations: [
          ...healthMetrics.recommendations.map(r => ({
            priority: r.severity,
            category: r.category,
            description: r.description,
            action: r.actionRequired
          })),
          ...runtimeDashboard.recommendations.map(r => ({
            priority: 'MEDIUM',
            category: 'RUNTIME',
            description: r,
            action: r
          }))
        ]
      };

      // Cache the result
      this.dashboardCache = {
        data: dashboardData,
        timestamp: new Date()
      };

      return dashboardData;

    } catch (error) {
      console.error('Failed to generate security dashboard:', error);
      throw error;
    }
  }

  /**
   * Analyze security metrics in the Monitor format
   */
  async analyzeSecurityMetrics(logData?: any): Promise<SecurityMetrics> {
    const dashboard = await this.getSecurityDashboard();
    const healthMetrics = await securityHealthChecker.performHealthCheck();

    // Detect anomalies
    const anomalies = [];

    // High error rate anomaly
    if (dashboard.realTimeMetrics.errorRate > 10) {
      anomalies.push({
        type: 'error' as const,
        description: `High error rate detected: ${dashboard.realTimeMetrics.errorRate.toFixed(1)}%`,
        severity: 'high' as const,
        frequency: 'continuous',
        impact: 'Multiple users affected, potential service degradation'
      });
    }

    // Performance anomaly
    if (dashboard.realTimeMetrics.avgResponseTime > 2000) {
      anomalies.push({
        type: 'performance' as const,
        description: `High response time: ${dashboard.realTimeMetrics.avgResponseTime}ms`,
        severity: 'medium' as const,
        frequency: 'intermittent',
        impact: 'User experience degradation'
      });
    }

    // Security incidents
    if (dashboard.overview.activeIncidents > 0) {
      anomalies.push({
        type: 'error' as const,
        description: `${dashboard.overview.activeIncidents} active security incidents`,
        severity: dashboard.overview.threatLevel === 'CRITICAL' ? 'high' as const : 'medium' as const,
        frequency: 'recent',
        impact: 'Potential security breach, immediate attention required'
      });
    }

    // Resource utilization from performance metrics
    const resourceUsage = healthMetrics.performance.resourceUtilization;
    if (resourceUsage > 80) {
      anomalies.push({
        type: 'resource' as const,
        description: `High resource utilization: ${resourceUsage}%`,
        severity: 'medium' as const,
        frequency: 'continuous',
        impact: 'Performance degradation, potential service impact'
      });
    }

    // Generate hotfix recommendations
    const hotfixRecommendations = [];

    // Critical security issues
    if (dashboard.overview.threatLevel === 'CRITICAL') {
      hotfixRecommendations.push({
        issue: 'Critical security threats detected',
        fix: 'Implement immediate IP blocking and investigate attack patterns',
        priority: 'immediate' as const,
        implementation: 'Deploy emergency security rules and monitor closely'
      });
    }

    // Performance issues
    if (dashboard.realTimeMetrics.avgResponseTime > 5000) {
      hotfixRecommendations.push({
        issue: 'High response times affecting user experience',
        fix: 'Optimize security monitoring overhead and implement caching',
        priority: 'scheduled' as const,
        implementation: 'Tune security patterns and add performance monitoring'
      });
    }

    // Compliance issues
    if (dashboard.compliance.owaspScore < 80) {
      hotfixRecommendations.push({
        issue: 'OWASP compliance score below acceptable threshold',
        fix: 'Address identified OWASP Top 10 vulnerabilities',
        priority: 'scheduled' as const,
        implementation: 'Review and strengthen security controls'
      });
    }

    // Failed health checks
    if (healthMetrics.overall.status === 'CRITICAL') {
      hotfixRecommendations.push({
        issue: 'Security health checks failing',
        fix: 'Investigate and resolve failing security controls',
        priority: 'immediate' as const,
        implementation: 'Run diagnostic tests and fix critical security components'
      });
    }

    // Generate trend analysis
    let trendAnalysis = 'Security metrics are stable';
    if (dashboard.overview.threatLevel === 'CRITICAL') {
      trendAnalysis = 'Critical security events detected - immediate intervention required';
    } else if (dashboard.overview.activeIncidents > 5) {
      trendAnalysis = 'Elevated security incident rate - monitor closely';
    } else if (healthMetrics.overall.score < 80) {
      trendAnalysis = 'Security health score declining - preventive measures recommended';
    }

    // Next actions
    const nextActions = [
      ...(dashboard.overview.threatLevel === 'CRITICAL' ?
        ['Immediate security response required', 'Investigate critical threats'] : []),
      ...(dashboard.overview.activeIncidents > 0 ?
        [`Review ${dashboard.overview.activeIncidents} active security incidents`] : []),
      ...(healthMetrics.overall.score < 90 ?
        ['Improve security health score', 'Address failing security controls'] : []),
      ...(dashboard.compliance.owaspScore < 85 ?
        ['Strengthen OWASP compliance', 'Review security controls'] : []),
      'Continue monitoring security metrics',
      'Review and tune detection patterns',
      'Update security documentation'
    ].slice(0, 5); // Limit to 5 actions

    const securityMetrics: SecurityMetrics = {
      alert_level: this.determineAlertLevel(dashboard, anomalies),
      anomalies_detected: anomalies,
      metrics_summary: {
        error_rate: `${dashboard.realTimeMetrics.errorRate.toFixed(1)}%`,
        avg_latency: `${dashboard.realTimeMetrics.avgResponseTime}ms`,
        throughput: `${dashboard.realTimeMetrics.requestsPerSecond} req/s`,
        resource_usage: {
          cpu: `${resourceUsage}%`,
          memory: `${Math.min(100, resourceUsage + 10)}%` // Estimated
        }
      },
      hotfix_recommendations: hotfixRecommendations,
      trend_analysis: trendAnalysis,
      next_actions: nextActions
    };

    // Store metrics in history
    this.metricsHistory.push({
      timestamp: new Date(),
      metrics: securityMetrics
    });

    // Keep only last 100 entries
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }

    return securityMetrics;
  }

  /**
   * Run security simulation scenarios
   */
  async runSecuritySimulation(): Promise<{
    results: Array<{
      scenario: string;
      passed: boolean;
      detectionTime: number;
      recommendation: string;
    }>;
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      averageDetectionTime: number;
    };
  }> {
    console.log('🧪 Running comprehensive security simulation...');

    try {
      const simulationResult = await runtimeSecurityMonitor.runSecuritySimulation();

      const results = simulationResult.results.map(result => ({
        scenario: `${result.vulnerability}: ${result.scenario}`,
        passed: result.detected === result.expectedDetection,
        detectionTime: result.responseTime,
        recommendation: result.recommendation
      }));

      const summary = {
        totalTests: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        averageDetectionTime: results.reduce((sum, r) => sum + r.detectionTime, 0) / results.length
      };

      console.log('✅ Security simulation completed', summary);

      return { results, summary };

    } catch (error) {
      console.error('❌ Security simulation failed:', error);
      throw error;
    }
  }

  /**
   * Get security metrics history for trending
   */
  getMetricsHistory(timeRange: 'hour' | 'day' | 'week'): Array<{
    timestamp: Date;
    alertLevel: string;
    anomalyCount: number;
    errorRate: number;
    responseTime: number;
  }> {
    const now = Date.now();
    let cutoffTime: number;

    switch (timeRange) {
      case 'hour':
        cutoffTime = now - (60 * 60 * 1000);
        break;
      case 'day':
        cutoffTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
    }

    return this.metricsHistory
      .filter(entry => entry.timestamp.getTime() >= cutoffTime)
      .map(entry => ({
        timestamp: entry.timestamp,
        alertLevel: entry.metrics.alert_level,
        anomalyCount: entry.metrics.anomalies_detected.length,
        errorRate: parseFloat(entry.metrics.metrics_summary.error_rate.replace('%', '')),
        responseTime: parseInt(entry.metrics.metrics_summary.avg_latency.replace('ms', ''))
      }));
  }

  // Private helper methods

  private setupEventListeners(): void {
    // Listen for security incidents from runtime monitor
    runtimeSecurityMonitor.on('security-incident', (incident: SecurityIncident) => {
      console.log(`🚨 Security incident detected: ${incident.id}`);
      securityAlerting.processSecurityIncident(incident);
    });

    // Listen for auto-block events
    runtimeSecurityMonitor.on('auto-block', (blockInfo: any) => {
      console.log(`🔒 Auto-blocking IP: ${blockInfo.ip}`);
      // Integrate with actual firewall/blocking system
    });

    // Listen for alerts
    securityAlerting.on('alert-sent', (alert: any) => {
      console.log(`📢 Security alert sent: ${alert.id}`);
    });

    // Listen for health check failures
    securityHealthChecker.on('health-check-failed', (error: any) => {
      console.error(`❌ Security health check failed: ${error.message}`);
    });
  }

  private async preRequestSecurityAnalysis(req: Request, res: Response): Promise<{
    blocked: boolean;
    reason?: string;
    threatLevel?: string;
  }> {
    try {
      // Use the existing security monitor for pre-request analysis
      const threatResponse = await securityMonitor.processSecurityEvent(req, res, {
        requestId: (req as any).security?.requestId,
        startTime: (req as any).security?.startTime
      });

      return {
        blocked: threatResponse.action === 'BLOCK',
        reason: threatResponse.reason,
        threatLevel: threatResponse.action
      };

    } catch (error) {
      console.error('Pre-request security analysis failed:', error);
      return { blocked: false };
    }
  }

  private setupPostRequestMonitoring(req: Request, res: Response, startTime: number): void {
    // Intercept response to analyze post-request
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    res.send = (body: any) => {
      this.postRequestAnalysis(req, res, body, startTime);
      return originalSend(body);
    };

    res.json = (obj: any) => {
      this.postRequestAnalysis(req, res, obj, startTime);
      return originalJson(obj);
    };
  }

  private async postRequestAnalysis(req: Request, res: Response, responseBody: any, startTime: number): Promise<void> {
    try {
      const responseTime = Date.now() - startTime;

      // Log the request for audit trail
      console.log(`📊 Request completed: ${req.method} ${req.path} - ${res.statusCode} (${responseTime}ms)`);

      // Emit metrics for monitoring
      this.emit('request-completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

    } catch (error) {
      console.error('Post-request analysis failed:', error);
    }
  }

  private handleBlockedRequest(req: Request, res: Response, checkResult: any): void {
    const blockResponse = {
      error: 'Request blocked by security policy',
      reason: checkResult.reason,
      threatLevel: checkResult.threatLevel,
      timestamp: new Date().toISOString(),
      requestId: (req as any).security?.requestId,
      support: 'Contact support if you believe this is an error'
    };

    res.status(403).json(blockResponse);

    console.warn(`🚫 Request blocked: ${req.method} ${req.path} from ${req.ip} - ${checkResult.reason}`);
  }

  private determineAlertLevel(
    dashboard: SecurityDashboardData,
    anomalies: any[]
  ): 'critical' | 'warning' | 'info' {
    if (dashboard.overview.threatLevel === 'CRITICAL' ||
        anomalies.some(a => a.severity === 'high')) {
      return 'critical';
    }
    if (dashboard.overview.threatLevel === 'HIGH' ||
        dashboard.overview.activeIncidents > 0 ||
        anomalies.some(a => a.severity === 'medium')) {
      return 'warning';
    }
    return 'info';
  }

  private mapThreatLevelToSeverity(threatLevel: number): string {
    if (threatLevel >= 4) return 'CRITICAL';
    if (threatLevel >= 3) return 'HIGH';
    if (threatLevel >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Shutdown security orchestrator
   */
  shutdown(): void {
    console.log('🔐 Shutting down Security Orchestrator...');
    this.removeAllListeners();
    console.log('✅ Security Orchestrator shutdown complete');
  }
}

// Export singleton instance
export const securityOrchestrator = new SecurityOrchestrator();
export default securityOrchestrator;