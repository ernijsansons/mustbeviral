// Analytics Worker - Enterprise Analytics & Monitoring
// Handles real-time analytics, metrics, and business intelligence

import { AnalyticsController } from './controllers/AnalyticsController';
import { MetricsController } from './controllers/MetricsController';
import { ReportController } from './controllers/ReportController';
import { RealtimeAnalytics } from './durable-objects/RealtimeAnalytics';
import { EventProcessor } from './durable-objects/EventProcessor';
import { DashboardAggregator } from './durable-objects/DashboardAggregator';

// Environment bindings
interface Env {
  // D1 Databases
  ANALYTICS_DB: D1Database;
  
  // KV Namespaces
  METRICS_CACHE: KVNamespace;
  BEHAVIOR_TRACKING: KVNamespace;
  AB_TESTING: KVNamespace;
  
  // R2 Buckets
  ANALYTICS_EXPORTS: R2Bucket;
  
  // Durable Objects
  REALTIME_ANALYTICS: DurableObjectNamespace;
  EVENT_PROCESSOR: DurableObjectNamespace;
  DASHBOARD_AGGREGATOR: DurableObjectNamespace;
  
  // Services
  AUTH_SERVICE: Fetcher;
  CONTENT_SERVICE: Fetcher;
  
  // Queues
  ANALYTICS_QUEUE: Queue;
  REPORT_QUEUE: Queue;
  
  // AI
  AI: Ai;
  
  // Environment variables
  ENVIRONMENT: string;
  SERVICE_NAME: string;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string;
  BATCH_SIZE: string;
  PROCESSING_INTERVAL: string;
  RETENTION_DAYS: string;
  REAL_TIME_ENABLED: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

// Main request handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Initialize controllers
      const analyticsController = new AnalyticsController(env);
      const metricsController = new MetricsController(env);
      const reportController = new ReportController(env);

      // Route handling
      if (path.startsWith('/api/analytics/events')) {
        return handleAnalyticsEvents(request, analyticsController, env);
      } else if (path.startsWith('/api/analytics/metrics')) {
        return handleMetrics(request, metricsController, env);
      } else if (path.startsWith('/api/analytics/reports')) {
        return handleReports(request, reportController, env);
      } else if (path.startsWith('/api/analytics/dashboard')) {
        return handleDashboard(request, env);
      } else if (path.startsWith('/api/analytics/ab-test')) {
        return handleABTesting(request, analyticsController, env);
      } else if (path.startsWith('/api/analytics/export')) {
        return handleExport(request, reportController, env);
      } else if (path === '/health') {
        return handleHealthCheck(env);
      } else {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Analytics Worker Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },

  // Durable Objects
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    const analyticsController = new AnalyticsController(env);
    
    for (const message of batch.messages) {
      try {
        await analyticsController.processAnalyticsEvent(message.body);
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
      }
    }
  },
};

// Handle analytics events
async function handleAnalyticsEvents(
  request: Request,
  controller: AnalyticsController,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const body = await request.json() as any;
  const result = await controller.trackEvent(body);
  
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle metrics requests
async function handleMetrics(
  request: Request,
  controller: MetricsController,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const metricType = url.searchParams.get('type') || undefined;
  const timeRange = url.searchParams.get('range') ?? '24h';

  const metrics = await controller.getMetrics(metricType, timeRange);
  
  return new Response(JSON.stringify(metrics), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle reports
async function handleReports(
  request: Request,
  controller: ReportController,
  env: Env
): Promise<Response> {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const reportId = url.searchParams.get('id');
    
    if (reportId) {
      const report = await controller.getReport(reportId);
      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const reports = await controller.listReports();
      return new Response(JSON.stringify(reports), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } else if (request.method === 'POST') {
    const body = await request.json() as any;
    const report = await controller.generateReport(body);
    
    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

// Handle dashboard data
async function handleDashboard(request: Request, env: Env): Promise<Response> {
  const dashboardId = new URL(request.url).searchParams.get('id') ?? 'default';
  
  // Get dashboard aggregator durable object
  const id = env.DASHBOARD_AGGREGATOR.idFromName(dashboardId);
  const stub = env.DASHBOARD_AGGREGATOR.get(id);
  
  const response = await stub.fetch(request);
  return new Response(response.body, {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle A/B testing
async function handleABTesting(
  request: Request,
  controller: AnalyticsController,
  env: Env
): Promise<Response> {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const testId = url.searchParams.get('testId');
    const userId = url.searchParams.get('userId');

    if (!testId || !userId) {
      return new Response('testId and userId are required', { status: 400, headers: corsHeaders });
    }

    const variant = await controller.getABTestVariant(testId, userId);
    return new Response(JSON.stringify({ variant }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } else if (request.method === 'POST') {
    const body = await request.json() as any;
    const result = await controller.trackABTestEvent(body);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

// Handle data export
async function handleExport(
  request: Request,
  controller: ReportController,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const format = url.searchParams.get('format') ?? 'json';
  const dateRange = url.searchParams.get('range') ?? '7d';
  
  const exportData = await controller.exportData(format, dateRange);
  
  if (format === 'csv') {
    return new Response(exportData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-export-${Date.now()}.csv"`
      }
    });
  }
  
  return new Response(JSON.stringify(exportData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Health check endpoint
async function handleHealthCheck(env: Env): Promise<Response> {
  const health = {
    status: 'healthy',
    service: 'analytics-worker',
    environment: env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
    uptime: Date.now(),
    version: '1.0.0'
  };
  
  return new Response(JSON.stringify(health), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Export Durable Object classes
export { RealtimeAnalytics, EventProcessor, DashboardAggregator };











