// Health check utility for WebSocket Worker
// Provides health status and diagnostics

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  service: string;
  version: string;
  checks: Record<string, {
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration?: number;
  }>;
}

export class HealthCheck {
  static async check(env: unknown): Promise<Response> {
    const startTime = Date.now();
    const checks: HealthStatus['checks'] = {};

    // Check Durable Object bindings
    try {
      if (env.WEBSOCKET_ROOM) {
        checks.websocket_room_binding = { status: 'pass' };
      } else {
        checks.websocket_room_binding = { status: 'fail', message: 'WEBSOCKET_ROOM binding not found' };
      }

      if (env.COLLABORATION_ROOM) {
        checks.collaboration_room_binding = { status: 'pass' };
      } else {
        checks.collaboration_room_binding = { status: 'fail', message: 'COLLABORATION_ROOM binding not found' };
      }

      if (env.NOTIFICATION_HUB) {
        checks.notification_hub_binding = { status: 'pass' };
      } else {
        checks.notification_hub_binding = { status: 'fail', message: 'NOTIFICATION_HUB binding not found' };
      }
    } catch (error) {
      checks.durable_objects = {
        status: 'fail',
        message: `Durable Object check failed: ${error instanceof Error ? error.message : error}`
      };
    }

    // Check KV binding
    try {
      if (env.CONNECTION_STORE) {
        // Test KV access
        const testKey = `health-check-${Date.now()}`;
        await env.CONNECTION_STORE.put(testKey, 'test', { expirationTtl: 60 });
        const value = await env.CONNECTION_STORE.get(testKey);

        if (value === 'test') {
          checks.kv_store = { status: 'pass' };
        } else {
          checks.kv_store = { status: 'fail', message: 'KV read/write test failed' };
        }

        // Clean up test key
        await env.CONNECTION_STORE.delete(testKey);
      } else {
        checks.kv_store = { status: 'fail', message: 'CONNECTION_STORE binding not found' };
      }
    } catch (error) {
      checks.kv_store = {
        status: 'fail',
        message: `KV store check failed: ${error instanceof Error ? error.message : error}`
      };
    }

    // Check service bindings
    try {
      if (env.AUTH_SERVICE) {
        const authHealthCheck = await env.AUTH_SERVICE.fetch('http://internal/health', {
          method: 'GET',
          headers: { 'User-Agent': 'websocket-worker-health-check' }
        });

        if (authHealthCheck.ok) {
          checks.auth_service = { status: 'pass' };
        } else {
          checks.auth_service = { status: 'warn', message: `Auth service returned ${authHealthCheck.status}` };
        }
      } else {
        checks.auth_service = { status: 'warn', message: 'AUTH_SERVICE binding not found' };
      }
    } catch (error) {
      checks.auth_service = {
        status: 'fail',
        message: `Auth service check failed: ${error instanceof Error ? error.message : error}`
      };
    }

    try {
      if (env.CONTENT_SERVICE) {
        const contentHealthCheck = await env.CONTENT_SERVICE.fetch('http://internal/health', {
          method: 'GET',
          headers: { 'User-Agent': 'websocket-worker-health-check' }
        });

        if (contentHealthCheck.ok) {
          checks.content_service = { status: 'pass' };
        } else {
          checks.content_service = { status: 'warn', message: `Content service returned ${contentHealthCheck.status}` };
        }
      } else {
        checks.content_service = { status: 'warn', message: 'CONTENT_SERVICE binding not found' };
      }
    } catch (error) {
      checks.content_service = {
        status: 'fail',
        message: `Content service check failed: ${error instanceof Error ? error.message : error}`
      };
    }

    // Check environment variables
    const requiredEnvVars = [
      'ENVIRONMENT',
      'SERVICE_NAME',
      'LOG_LEVEL'
    ];

    for (const envVar of requiredEnvVars) {
      if (env[envVar]) {
        checks[`env_${envVar.toLowerCase()}`] = { status: 'pass' };
      } else {
        checks[`env_${envVar.toLowerCase()}`] = { status: 'warn', message: `${envVar} not set` };
      }
    }

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
    const warnChecks = Object.values(checks).filter(check => check.status === 'warn');

    let overallStatus: HealthStatus['status'];
    if (failedChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warnChecks.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const duration = Date.now() - startTime;

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: Date.now(),
      service: env.SERVICE_NAME  ?? 'websocket-worker',
      version: '1.0.0',
      checks: {
        ...checks,
        response_time: { status: 'pass', duration }
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 : 503;

    return new Response(JSON.stringify(healthStatus, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  static async checkDurableObject(env: unknown, objectType: string, objectId: string): Promise<{
    status: 'pass' | 'fail';
    message?: string;
    duration?: number;
  }> {
    const startTime = Date.now();

    try {
      let namespace: DurableObjectNamespace;

      switch (objectType) {
        case 'websocket-room':
          namespace = env.WEBSOCKET_ROOM;
          break;
        case 'collaboration-room':
          namespace = env.COLLABORATION_ROOM;
          break;
        case 'notification-hub':
          namespace = env.NOTIFICATION_HUB;
          break;
        default:
          return { status: 'fail', message: `Unknown object type: ${objectType}` };
      }

      const id = namespace.idFromName(objectId);
      const obj = namespace.get(id);

      const response = await obj.fetch('http://internal/health', {
        method: 'GET'
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        return { status: 'pass', duration };
      } else {
        return {
          status: 'fail',
          message: `Durable Object returned ${response.status}`,
          duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'fail',
        message: `Durable Object check failed: ${error instanceof Error ? error.message : error}`,
        duration
      };
    }
  }
}