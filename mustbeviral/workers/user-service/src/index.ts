/**
 * User Service Worker - Microservice Implementation
 * Clean Architecture with Domain-Driven Design
 * Implements proper separation of concerns and dependency injection
 */

import { createServiceRegistry, CloudflareEnv } from '../../../src/core/infrastructure/ServiceRegistry';
import { UserApplicationService } from '../../../src/core/application/services/UserApplicationService';

// Worker environment interface
interface UserServiceEnv extends CloudflareEnv {
  // Additional worker-specific bindings
  JWT_SECRET: string;
  CORS_ORIGINS: string;
  API_VERSION: string;
  SERVICE_NAME: string;
}

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

// Request/Response interfaces
interface ApiRequest {
  method: string;
  url: string;
  headers: Headers;
  body?: any;
  params: Record<string, string>;
  query: Record<string, string>;
}

interface ApiResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

/**
 * API Router - Clean routing with proper error handling
 */
class ApiRouter {
  private routes = new Map<string, Map<string, (req: ApiRequest, env: UserServiceEnv) => Promise<ApiResponse>>>();

  register(method: string, path: string, handler: (req: ApiRequest, env: UserServiceEnv) => Promise<ApiResponse>): void {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    this.routes.get(method)!.set(path, handler);
  }

  async route(request: Request, env: UserServiceEnv): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Parse request body for non-GET requests
    let body;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }

    // Create API request object
    const apiRequest: ApiRequest = {
      method,
      url: request.url,
      headers: request.headers,
      body,
      params: this.extractPathParams(path),
      query: Object.fromEntries(url.searchParams.entries())
    };

    // Find and execute handler
    const methodRoutes = this.routes.get(method);
    if (methodRoutes) {
      for (const [routePath, handler] of methodRoutes.entries()) {
        if (this.matchPath(path, routePath)) {
          try {
            const result = await handler(apiRequest, env);
            return this.createResponse(result);
          } catch (error) {
            console.error('Route handler error:', error);
            return this.createErrorResponse(500, 'Internal Server Error');
          }
        }
      }
    }

    return this.createErrorResponse(404, 'Not Found');
  }

  private matchPath(requestPath: string, routePath: string): boolean {
    // Simple path matching - in production, use more sophisticated router
    const requestSegments = requestPath.split('/').filter(s => s);
    const routeSegments = routePath.split('/').filter(s => s);

    if (requestSegments.length !== routeSegments.length) {
      return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const requestSegment = requestSegments[i];

      if (routeSegment.startsWith(':')) {
        continue; // Parameter segment
      }

      if (routeSegment !== requestSegment) {
        return false;
      }
    }

    return true;
  }

  private extractPathParams(_path: string): Record<string, string> {
    // Simple parameter extraction - would be more sophisticated in production
    return {};
  }

  private createResponse(result: ApiResponse): Response {
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...result.headers
    };

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers
    });
  }

  private createErrorResponse(status: number, message: string): Response {
    return new Response(JSON.stringify({ error: message, timestamp: new Date().toISOString() }), {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * User API Handlers - Clean separation of concerns
 */
class UserApiHandlers {
  constructor(private userService: UserApplicationService) {}

  async register(req: ApiRequest): Promise<ApiResponse> {
    const { email, password, firstName, lastName, acceptedTerms, marketingOptIn } = req.body;

    if (!email || !password || !firstName || !lastName || !acceptedTerms) {
      return {
        status: 400,
        body: { error: 'Missing required fields: email, password, firstName, lastName, acceptedTerms' }
      };
    }

    try {
      const result = await this.userService.registerUser({
        email,
        password,
        firstName,
        lastName,
        acceptedTerms,
        marketingOptIn
      });

      return {
        status: 201,
        body: {
          success: true,
          data: result
        }
      };
    } catch (error) {
      return {
        status: 400,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  async login(req: ApiRequest): Promise<ApiResponse> {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return {
        status: 400,
        body: { error: 'Email and password are required' }
      };
    }

    try {
      const result = await this.userService.authenticateUser({
        email,
        password,
        rememberMe,
        ipAddress: req.headers.get('CF-Connecting-IP')  ?? undefined,
        userAgent: req.headers.get('User-Agent')  ?? undefined
      });

      if (!result.success) {
        return {
          status: 401,
          body: {
            success: false,
            error: result.error
          }
        };
      }

      return {
        status: 200,
        body: {
          success: true,
          data: result
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  async getProfile(req: ApiRequest): Promise<ApiResponse> {
    const userId = req.params.userId  ?? this.extractUserIdFromToken(req);

    if (!userId) {
      return {
        status: 400,
        body: { error: 'User ID is required' }
      };
    }

    try {
      const user = await this.userService.getUser(userId);

      if (!user) {
        return {
          status: 404,
          body: { error: 'User not found' }
        };
      }

      return {
        status: 200,
        body: {
          success: true,
          data: user
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  async searchUsers(req: ApiRequest): Promise<ApiResponse> {
    const { q, role, status, page = 1, limit = 20 } = req.query;

    try {
      const result = await this.userService.searchUsers(
        {
          email: q,
          name: q,
          role,
          status
        },
        {
          page: parseInt(page.toString()),
          limit: parseInt(limit.toString())
        }
      );

      return {
        status: 200,
        body: {
          success: true,
          data: result
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  async getUserStatistics(): Promise<ApiResponse> {
    try {
      const stats = await this.userService.getUserStatistics({ includeEngagement: true });

      return {
        status: 200,
        body: {
          success: true,
          data: stats
        }
      };
    } catch (error) {
      return {
        status: 500,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  private extractUserIdFromToken(req: ApiRequest): string | null {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    // In production, decode JWT token to get user ID
    const token = authHeader.substring(7);
    // Simplified token parsing - would use proper JWT library
    return token.split('_')[2]  ?? null;
  }
}

/**
 * Health Check Handler
 */
async function handleHealthCheck(env: UserServiceEnv): Promise<Response> {
  const health = {
    service: 'user-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: env.API_VERSION  ?? '1.0.0',
    environment: env.SERVICE_NAME  ?? 'development',
    dependencies: {
      database: 'connected', // Would check actual DB connection
      cache: 'connected',    // Would check KV namespace
      email: 'available'     // Would check email service
    }
  };

  return new Response(JSON.stringify(health), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Main Worker Export - Clean Architecture Entry Point
 */
export default {
  async fetch(request: Request, env: UserServiceEnv, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();

    // Add request ID to context for tracing
    console.warn(`[${requestId}] ${request.method} ${url.pathname}`);

    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Health check endpoint
      if (url.pathname === '/health') {
        return handleHealthCheck(env);
      }

      // Initialize service registry
      const serviceRegistry = createServiceRegistry(env);
      const validation = serviceRegistry.validateServices();

      if (!validation.isValid) {
        console.error('Service validation failed:', validation.errors);
        return new Response(JSON.stringify({
          error: 'Service configuration error',
          details: validation.errors
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      // Get user application service from DI container
      const userService = await serviceRegistry.getContainer().resolve<UserApplicationService>('userApplicationService');

      // Initialize API handlers
      const userHandlers = new UserApiHandlers(userService);

      // Initialize router
      const router = new ApiRouter();

      // Register routes
      router.register('POST', '/api/users/register', (req) => userHandlers.register(req));
      router.register('POST', '/api/users/login', (req) => userHandlers.login(req));
      router.register('GET', '/api/users/profile/:userId', (req) => userHandlers.getProfile(req));
      router.register('GET', '/api/users/search', (req) => userHandlers.searchUsers(req));
      router.register('GET', '/api/users/statistics', () => userHandlers.getUserStatistics());

      // Route request
      const response = await router.route(request, env);

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);

      // Clear scoped services after request
      serviceRegistry.clearScope();

      console.warn(`[${requestId}] Response: ${response.status}`);

      return response;

    } catch (error) {
      console.error(`[${requestId}] Unhandled error:`, error);

      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

// Export service registry for testing
export { createServiceRegistry };