// API Gateway Worker - Enterprise API Orchestration
// Central gateway for all microservices with rate limiting, authentication, and monitoring

import { APIGatewayController } from './controllers/APIGatewayController';
import { RateLimiter } from './durable-objects/RateLimiter';
import { CircuitBreaker } from './durable-objects/CircuitBreaker';
import { APIMonitor } from './durable-objects/APIMonitor';

// Environment bindings
interface Env {
  // KV Namespaces
  RATE_LIMITER: KVNamespace;
  API_KEYS: KVNamespace;
  API_CACHE: KVNamespace;
  CIRCUIT_BREAKER: KVNamespace;
  
  // Durable Objects
  RATE_LIMITER_DO: DurableObjectNamespace;
  CIRCUIT_BREAKER_DO: DurableObjectNamespace;
  API_MONITOR_DO: DurableObjectNamespace;
  
  // Services
  AUTH_SERVICE: Fetcher;
  CONTENT_SERVICE: Fetcher;
  ANALYTICS_SERVICE: Fetcher;
  WEBSOCKET_SERVICE: Fetcher;
  
  // Queues
  API_MONITORING_QUEUE: Queue;
  ERROR_TRACKING_QUEUE: Queue;
  
  // Environment variables
  ENVIRONMENT: string;
  SERVICE_NAME: string;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW: string;
  CACHE_TTL: string;
  CIRCUIT_BREAKER_THRESHOLD: string;
  CIRCUIT_BREAKER_TIMEOUT: string;
  ENABLE_CACHING: string;
  ENABLE_RATE_LIMITING: string;
  ENABLE_CIRCUIT_BREAKER: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

// Service routing configuration
const serviceRoutes = {
  '/api/auth': 'AUTH_SERVICE',
  '/api/content': 'CONTENT_SERVICE',
  '/api/analytics': 'ANALYTICS_SERVICE',
  '/api/websocket': 'WEBSOCKET_SERVICE',
};

// Main request handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const requestId = request.headers.get('X-Request-ID') ?? generateRequestId();

    // Add request ID to headers
    const enhancedRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers),
        'X-Request-ID': requestId,
        'X-Gateway-Timestamp': Date.now().toString(),
      }
    });

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Initialize API Gateway controller
      const gatewayController = new APIGatewayController(env);

      // Log request
      await gatewayController.logRequest(enhancedRequest, requestId);

      // Health check endpoint
      if (path === '/health') {
        return handleHealthCheck(env, requestId);
      }

      // API documentation endpoint
      if (path === '/api/docs') {
        return handleAPIDocumentation(env);
      }

      // Find target service
      const targetService = findTargetService(path);
      if (!targetService) {
        return new Response(
          JSON.stringify({ error: 'Service not found', path }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rate limiting
      if (env.ENABLE_RATE_LIMITING === 'true') {
        const rateLimitResult = await gatewayController.checkRateLimit(enhancedRequest, requestId);
        if (!rateLimitResult.allowed) {
          return new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded', 
              retryAfter: rateLimitResult.retryAfter 
            }),
            { 
              status: 429, 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'Retry-After': rateLimitResult.retryAfter.toString(),
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
              } 
            }
          );
        }
      }

      // Circuit breaker check
      if (env.ENABLE_CIRCUIT_BREAKER === 'true') {
        const circuitBreakerResult = await gatewayController.checkCircuitBreaker(targetService, requestId);
        if (!circuitBreakerResult.allowed) {
          return new Response(
            JSON.stringify({ 
              error: 'Service temporarily unavailable', 
              reason: circuitBreakerResult.reason 
            }),
            { 
              status: 503, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      // Authentication (for protected endpoints)
      if (isProtectedEndpoint(path)) {
        const authResult = await gatewayController.authenticateRequest(enhancedRequest, requestId);
        if (!authResult.authenticated) {
          return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        // Add user context to request
        if (authResult.userId) {
          enhancedRequest.headers.set('X-User-ID', authResult.userId);
        }
        if (authResult.userRole) {
          enhancedRequest.headers.set('X-User-Role', authResult.userRole);
        }
      }

      // Check cache for GET requests
      if (method === 'GET' && env.ENABLE_CACHING === 'true') {
        const cachedResponse = await gatewayController.getCachedResponse(path, requestId);
        if (cachedResponse) {
          return new Response(cachedResponse.body, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
              'X-Cache-TTL': cachedResponse.ttl.toString()
            }
          });
        }
      }

      // Forward request to target service with parallel optimization
      const serviceResponse = await gatewayController.forwardRequestOptimized(
        enhancedRequest,
        targetService,
        requestId
      );

      // Cache successful GET responses
      if (method === 'GET' && serviceResponse.ok && env.ENABLE_CACHING === 'true') {
        await gatewayController.cacheResponse(path, serviceResponse, requestId);
      }

      // Update circuit breaker status
      if (env.ENABLE_CIRCUIT_BREAKER === 'true') {
        await gatewayController.updateCircuitBreaker(targetService, serviceResponse.ok, requestId);
      }

      // Log response
      await gatewayController.logResponse(enhancedRequest, serviceResponse, requestId);

      // Return response with CORS headers
      const responseHeaders = new Headers(serviceResponse.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });
      responseHeaders.set('X-Request-ID', requestId);
      responseHeaders.set('X-Gateway-Version', '1.0.0');

      return new Response(serviceResponse.body, {
        status: serviceResponse.status,
        statusText: serviceResponse.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      console.error('API Gateway Error:', error);
      
      // Create gateway controller for error logging
      const gatewayController = new APIGatewayController(env);

      // Log error
      await gatewayController.logError(enhancedRequest, error, requestId);
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          requestId,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  },

  // Queue handler for monitoring
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    const gatewayController = new APIGatewayController(env);
    
    for (const message of batch.messages) {
      try {
        await gatewayController.processMonitoringMessage(message.body);
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
      }
    }
  },
};

// Helper functions
function findTargetService(path: string): string | null {
  for (const [route, service] of Object.entries(serviceRoutes)) {
    if (path.startsWith(route)) {
      return service;
    }
  }
  return null;
}

function isProtectedEndpoint(path: string): boolean {
  const protectedRoutes = [
    '/api/auth/profile',
    '/api/content/create',
    '/api/content/update',
    '/api/content/delete',
    '/api/analytics/dashboard',
    '/api/analytics/reports'
  ];
  
  return protectedRoutes.some(route => path.startsWith(route));
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check endpoint
async function handleHealthCheck(env: Env, requestId: string): Promise<Response> {
  const health = {
    status: 'healthy',
    service: 'api-gateway',
    environment: env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
    requestId,
    version: '1.0.0',
    services: {
      auth: 'connected',
      content: 'connected',
      analytics: 'connected',
      websocket: 'connected'
    }
  };
  
  return new Response(JSON.stringify(health), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// API documentation endpoint
async function handleAPIDocumentation(env: Env): Promise<Response> {
  const docs = {
    title: 'Must Be Viral API Gateway',
    version: '1.0.0',
    description: 'Enterprise API Gateway for Must Be Viral microservices',
    endpoints: {
      '/api/auth/*': {
        description: 'Authentication and user management',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        authentication: 'Required for most endpoints'
      },
      '/api/content/*': {
        description: 'Content creation and management',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        authentication: 'Required for write operations'
      },
      '/api/analytics/*': {
        description: 'Analytics and metrics',
        methods: ['GET', 'POST'],
        authentication: 'Required for sensitive data'
      },
      '/api/websocket/*': {
        description: 'Real-time WebSocket connections',
        methods: ['GET'],
        authentication: 'Required'
      }
    },
    rateLimiting: {
      enabled: env.ENABLE_RATE_LIMITING === 'true',
      limit: env.RATE_LIMIT_REQUESTS,
      window: env.RATE_LIMIT_WINDOW
    },
    caching: {
      enabled: env.ENABLE_CACHING === 'true',
      ttl: env.CACHE_TTL
    },
    circuitBreaker: {
      enabled: env.ENABLE_CIRCUIT_BREAKER === 'true',
      threshold: env.CIRCUIT_BREAKER_THRESHOLD,
      timeout: env.CIRCUIT_BREAKER_TIMEOUT
    }
  };
  
  return new Response(JSON.stringify(docs, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Export Durable Object classes
export { RateLimiter, CircuitBreaker, APIMonitor };








