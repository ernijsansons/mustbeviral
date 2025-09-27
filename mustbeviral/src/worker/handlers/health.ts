// Health Check Request Handler
// Extracted from worker.ts for modularity

import { CloudflareService} from '../../lib/cloudflare';
import { log} from '../../lib/monitoring/logger';

export class HealthHandler {
  constructor(private cloudflareService: CloudflareService) {}

  async handleHealth(): Promise<Response> {
    log.debug('Health check', { component: 'health' });

    try {
      // Check all Cloudflare services
      const healthChecks = await this.cloudflareService.healthCheck();

      // Detailed health status
      const health = {
        status: healthChecks.db && healthChecks.kv && healthChecks.r2 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: healthChecks.db ? 'healthy' : 'unhealthy',
          cache: healthChecks.kv ? 'healthy' : 'unhealthy',
          storage: healthChecks.r2 ? 'healthy' : 'unhealthy'
        },
        version: '1.0.0'
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;

      return new Response(JSON.stringify(health), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: unknown) {
      log.error('Health check failed', error as Error, {
        component: 'health',
        action: 'check'
      });
      return new Response(JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}