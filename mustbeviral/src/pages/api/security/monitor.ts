/**
 * Security Monitoring API Endpoint
 * Provides runtime security metrics in Monitor format
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { securityOrchestrator } from '../../../lib/security/securityOrchestrator';
import { runtimeSecurityMonitor } from '../../../lib/security/runtimeSecurityMonitor';
import { securityHealthChecker } from '../../../lib/security/securityHealthCheck';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetMetrics(req, res);
      case 'POST':
        return await handleSecurityAction(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Security monitoring API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle GET requests for security metrics
 */
async function handleGetMetrics(req: NextApiRequest, res: NextApiResponse) {
  const { format, timeRange, action } = req.query;

  try {
    switch (action) {
      case 'dashboard':
        return await getDashboardData(req, res);

      case 'health':
        return await getHealthMetrics(req, res);

      case 'monitor':
      default:
        return await getMonitorMetrics(req, res, format as string);

      case 'incidents':
        return await getIncidents(req, res, timeRange as string);

      case 'compliance':
        return await getComplianceReport(req, res);

      case 'trends':
        return await getTrends(req, res, timeRange as string);
    }
  } catch (error) {
    console.error(`Error handling ${action} request:`, error);
    return res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
}

/**
 * Handle POST requests for security actions
 */
async function handleSecurityAction(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.body;

  try {
    switch (action) {
      case 'simulate':
        return await runSecuritySimulation(req, res);

      case 'health-check':
        return await runHealthCheck(req, res);

      case 'test-vulnerability':
        return await testVulnerability(req, res);

      case 'acknowledge-alert':
        return await acknowledgeAlert(req, res);

      default:
        return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    console.error(`Error handling ${action} action:`, error);
    return res.status(500).json({ error: 'Failed to execute action' });
  }
}

/**
 * Get security metrics in Monitor format
 */
async function getMonitorMetrics(req: NextApiRequest, res: NextApiResponse, format?: string) {
  const metrics = await securityOrchestrator.analyzeSecurityMetrics();

  if (format === 'json') {
    return res.json(metrics);
  }

  // Default Monitor format response
  return res.json({
    timestamp: new Date().toISOString(),
    source: 'Must Be Viral Security Monitor',
    ...metrics
  });
}

/**
 * Get comprehensive dashboard data
 */
async function getDashboardData(req: NextApiRequest, res: NextApiResponse) {
  const dashboardData = await securityOrchestrator.getSecurityDashboard();

  return res.json({
    status: 'success',
    data: dashboardData,
    generated_at: new Date().toISOString()
  });
}

/**
 * Get detailed health metrics
 */
async function getHealthMetrics(req: NextApiRequest, res: NextApiResponse) {
  const healthMetrics = await securityHealthChecker.performHealthCheck();

  return res.json({
    status: 'success',
    health: healthMetrics,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get security incidents
 */
async function getIncidents(req: NextApiRequest, res: NextApiResponse, timeRange?: string) {
  const dashboard = await securityOrchestrator.getSecurityDashboard();

  // Filter incidents by time range if specified
  let incidents = dashboard.incidents;

  if (timeRange) {
    const now = new Date();
    let cutoffTime: Date;

    switch (timeRange) {
      case 'hour':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    incidents = incidents.filter(incident =>
      incident.timestamp >= cutoffTime
    );
  }

  return res.json({
    status: 'success',
    incidents,
    count: incidents.length,
    timeRange: timeRange || 'all',
    timestamp: new Date().toISOString()
  });
}

/**
 * Get compliance report
 */
async function getComplianceReport(req: NextApiRequest, res: NextApiResponse) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

  const complianceReport = await runtimeSecurityMonitor.generateComplianceReport({
    start: startTime,
    end: endTime
  });

  return res.json({
    status: 'success',
    compliance: complianceReport,
    period: {
      start: startTime.toISOString(),
      end: endTime.toISOString()
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Get security trends
 */
async function getTrends(req: NextApiRequest, res: NextApiResponse, timeRange?: string) {
  const range = (timeRange as 'hour' | 'day' | 'week') || 'day';

  const trends = securityOrchestrator.getMetricsHistory(range);
  const healthTrends = securityHealthChecker.getHealthTrends(range);

  return res.json({
    status: 'success',
    trends: {
      security: trends,
      health: healthTrends,
      timeRange: range
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Run security simulation
 */
async function runSecuritySimulation(req: NextApiRequest, res: NextApiResponse) {
  const { vulnerabilityId } = req.body;

  console.log('🧪 Starting security simulation via API...');

  const simulationResult = await securityOrchestrator.runSecuritySimulation();

  return res.json({
    status: 'success',
    simulation: {
      ...simulationResult,
      vulnerabilityId: vulnerabilityId || 'all',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Run health check
 */
async function runHealthCheck(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔍 Running health check via API...');

  const healthResult = await securityHealthChecker.performHealthCheck();

  return res.json({
    status: 'success',
    healthCheck: {
      ...healthResult,
      executedAt: new Date().toISOString()
    }
  });
}

/**
 * Test specific vulnerability
 */
async function testVulnerability(req: NextApiRequest, res: NextApiResponse) {
  const { vulnerabilityId, testPayload } = req.body;

  if (!vulnerabilityId) {
    return res.status(400).json({ error: 'vulnerabilityId is required' });
  }

  console.log(`🧪 Testing vulnerability: ${vulnerabilityId}`);

  const testResult = await securityHealthChecker.testVulnerabilityDetection(vulnerabilityId);

  return res.json({
    status: 'success',
    test: {
      vulnerabilityId,
      results: testResult,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Acknowledge security alert
 */
async function acknowledgeAlert(req: NextApiRequest, res: NextApiResponse) {
  const { alertId, acknowledgedBy } = req.body;

  if (!alertId) {
    return res.status(400).json({ error: 'alertId is required' });
  }

  // This would integrate with the actual alerting system
  console.log(`✅ Alert ${alertId} acknowledged by ${acknowledgedBy || 'API user'}`);

  return res.json({
    status: 'success',
    acknowledged: {
      alertId,
      acknowledgedBy: acknowledgedBy || 'API user',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Monitor format response for real-time security analysis
 */
export async function getSecurityMonitorResponse(): Promise<{
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
}> {
  return await securityOrchestrator.analyzeSecurityMetrics();
}

/**
 * WebSocket endpoint for real-time security monitoring
 */
export const config = {
  api: {
    externalResolver: true,
  },
};

// Export additional utilities for programmatic access
export {
  securityOrchestrator,
  runtimeSecurityMonitor,
  securityHealthChecker
};