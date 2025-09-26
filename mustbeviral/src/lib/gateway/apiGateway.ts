/**
 * Advanced API Gateway
 * Comprehensive API management with routing, load balancing, caching, and monitoring
 */

import { CloudflareEnv } from '../cloudflare';
import { createSecurityMiddleware } from '../../middleware/security';
import { createRateLimitMiddleware } from '../../middleware/rateLimiter';
import { createRouteSecurityMiddleware } from '../../middleware/routeSecurity';
import { getThreatDetector } from '../security/threatDetection';
import { getPerformanceMonitor } from '../monitoring/performanceMonitor';
import { RequestContextMiddleware } from '../../worker/requestContext';

export interface APIRoute {
  id: string;
  path: string | RegExp;
  methods: string[];
  handler: APIHandler;
  middleware: APIMiddleware[];
  config: RouteConfig;
  version: string;
  deprecated?: boolean;
  deprecationDate?: Date;
  successorRoute?: string;
}

export interface RouteConfig {
  authentication: 'none' | 'optional' | 'required' | 'admin';
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
    byUser?: boolean;
  };
  caching?: {
    enabled: boolean;
    ttl: number;
    varyBy?: string[];
    conditions?: CacheCondition[];
  };
  loadBalancing?: {
    strategy: 'round_robin' | 'least_connections' | 'weighted' | 'geographic';
    healthCheck: boolean;
    failover: boolean;
  };
  transformation?: {
    request?: RequestTransformation;
    response?: ResponseTransformation;
  };
  monitoring?: {
    detailed: boolean;
    sampling: number;
  };
  timeout: number;
  retries: number;
}

export interface CacheCondition {
  type: 'header' | 'query' | 'method' | 'status';
  key: string;
  value: string | RegExp;
  operation: 'equals' | 'contains' | 'matches' | 'exists';
}

export interface RequestTransformation {
  headers?: {
    add?: Record<string, string>;
    remove?: string[];
    modify?: Record<string, string>;
  };
  query?: {
    add?: Record<string, string>;
    remove?: string[];
    modify?: Record<string, string>;
  };
  body?: {
    transform?: 'json_to_xml' | 'xml_to_json' | 'custom';
    schema?: unknown;
  };
}

export interface ResponseTransformation {
  headers?: {
    add?: Record<string, string>;
    remove?: string[];
    modify?: Record<string, string>;
  };
  body?: {
    transform?: 'json_to_xml' | 'xml_to_json' | 'filter' | 'paginate';
    schema?: unknown;
    filter?: string[];
  };
  status?: {
    map?: Record<number, number>;
  };
}

export interface APIHandler {
  (request: APIRequest): Promise<APIResponse>;
}

export interface APIMiddleware {
  name: string;
  handler: (request: APIRequest, next: () => Promise<APIResponse>) => Promise<APIResponse>;
  order: number;
  enabled: boolean;
}

export interface APIRequest extends Request {
  params: Record<string, string>;
  query: Record<string, string>;
  context: RequestContext;
  startTime: number;
}

export interface APIResponse extends Response {
  metadata?: {
    processingTime: number;
    cacheHit?: boolean;
    upstream?: string;
    transformations?: string[];
  };
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  route: APIRoute;
  authenticated: boolean;
  permissions: string[];
}

export interface GatewayMetrics {
  requests: {
    total: number;
    success: number;
    errors: number;
    blocked: number;
  };
  latency: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  routes: Record<string, RouteMetrics>;
  upstreams: Record<string, UpstreamMetrics>;
}

export interface RouteMetrics {
  requests: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
  lastAccessed: Date;
}

export interface UpstreamMetrics {
  requests: number;
  averageLatency: number;
  errorRate: number;
  availability: number;
  lastHealthCheck: Date;
}

export class AdvancedAPIGateway {
  private env: CloudflareEnv;
  private routes: Map<string, APIRoute> = new Map();
  private middleware: APIMiddleware[] = [];
  private upstreams: Map<string, UpstreamService> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private cache: APICache;
  private metrics: GatewayMetrics;
  private requestContextMiddleware: RequestContextMiddleware;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.cache = new APICache(env);
    this.requestContextMiddleware = new RequestContextMiddleware(env);
    this.metrics = this.initializeMetrics();
    this.initializeMiddleware();
  }

  /**
   * Register API route
   */
  registerRoute(route: Omit<APIRoute, 'id'>): APIRoute {
    const routeId = `route_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const apiRoute: APIRoute = {
      id: routeId,
      ...route
    };

    this.routes.set(routeId, apiRoute);
    console.log(`LOG: API-GATEWAY-ROUTE-1 - Registered route: ${route.path} [${route.methods.join(', ')}]`);

    return apiRoute;
  }

  /**
   * Register global middleware
   */
  registerMiddleware(middleware: Omit<APIMiddleware, 'enabled'>): void {
    this.middleware.push({
      ...middleware,
      enabled: true
    });

    // Sort by order
    this.middleware.sort((a, _b) => a.order - b.order);
    console.log(`LOG: API-GATEWAY-MIDDLEWARE-1 - Registered middleware: ${middleware.name}`);
  }

  /**
   * Register upstream service
   */
  registerUpstream(name: string, service: UpstreamService): void {
    this.upstreams.set(name, service);
    console.log(`LOG: API-GATEWAY-UPSTREAM-1 - Registered upstream: ${name}`);
  }

  /**
   * Process incoming request
   */
  async processRequest(request: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      // Create request context
      const { request: contextualRequest, context } = await this.requestContextMiddleware.processRequest(request);

      // Find matching route
      const route = this.findMatchingRoute(request);
      if (!route) {
        return this.createErrorResponse(404, 'Route not found');
      }

      // Check if route is deprecated
      if (route.deprecated) {
        console.warn(`LOG: API-GATEWAY-DEPRECATED-1 - Deprecated route accessed: ${route.path}`);
      }

      // Create API request
      const apiRequest = await this.createAPIRequest(contextualRequest, route, context);

      // Apply security checks
      const securityResult = await this.applySecurity(apiRequest);
      if (!securityResult.allowed) {
        return securityResult.response!;
      }

      // Check cache
      const cachedResponse = await this.checkCache(apiRequest);
      if (cachedResponse) {
        this.updateMetrics(route, startTime, 200, true);
        return cachedResponse;
      }

      // Apply middleware chain
      let response = await this.applyMiddleware(apiRequest, route);

      // Apply transformations
      response = await this.applyTransformations(apiRequest, response);

      // Cache response if applicable
      await this.cacheResponse(apiRequest, response);

      // Update metrics
      this.updateMetrics(route, startTime, response.status, false);

      // Add gateway headers
      response = this.addGatewayHeaders(response, {
        processingTime: Date.now() - startTime,
        route: route.id,
        cached: false
      });

      return response;

    } catch (error: unknown) {
      console.error('LOG: API-GATEWAY-ERROR-1 - Request processing failed:', error);
      this.updateMetrics(null, startTime, 500, false);
      return this.createErrorResponse(500, 'Internal gateway error');
    }
  }

  /**
   * Get gateway metrics
   */
  getMetrics(): GatewayMetrics {
    return { ...this.metrics };
  }

  /**
   * Get route analytics
   */
  getRouteAnalytics(routeId?: string): {
    route: APIRoute;
    metrics: RouteMetrics;
    trends: Array<{ timestamp: Date; requests: number; latency: number }>;
    errors: Array<{ timestamp: Date; error: string; count: number }>;
  }[] {
    const routes = routeId
      ? [this.routes.get(routeId)].filter(Boolean) as APIRoute[]
      : Array.from(this.routes.values());

    return routes.map(route => ({ _route,
      metrics: this.metrics.routes[route.id] || this.createEmptyRouteMetrics(),
      trends: this.generateTrendData(route.id),
      errors: this.generateErrorData(route.id)
    }));
  }

  /**
   * Update route configuration
   */
  updateRouteConfig(routeId: string, config: Partial<RouteConfig>): boolean {
    const route = this.routes.get(routeId);
    if (!route) return false;

    route.config = { ...route.config, ...config };
    console.log(`LOG: API-GATEWAY-UPDATE-1 - Updated route config: ${routeId}`);
    return true;
  }

  /**
   * Enable/disable route
   */
  toggleRoute(routeId: string, enabled: boolean): boolean {
    const route = this.routes.get(routeId);
    if (!route) return false;

    if (!enabled) {
      route.deprecated = true;
      route.deprecationDate = new Date();
    } else {
      route.deprecated = false;
      route.deprecationDate = undefined;
    }

    console.log(`LOG: API-GATEWAY-TOGGLE-1 - Route ${enabled ? 'enabled' : 'disabled'}: ${routeId}`);
    return true;
  }

  /**
   * Find matching route
   */
  private findMatchingRoute(request: Request): APIRoute | null {
    const url = new URL(request.url);
    const method = request.method;

    for (const route of this.routes.values()) {
      // Check method
      if (!route.methods.includes(method)) continue;

      // Check path
      const pathMatch = typeof route.path === 'string'
        ? url.pathname === route.path || url.pathname.startsWith(route.path)
        : route.path.test(url.pathname);

      if (pathMatch && !route.deprecated) {
        return route;
      }
    }

    return null;
  }

  /**
   * Create API request object
   */
  private async createAPIRequest(request: Request, route: APIRoute, context: unknown): Promise<APIRequest> {
    const url = new URL(request.url);

    // Extract path parameters
    const params = this.extractPathParams(route.path, url.pathname);

    // Extract query parameters
    const query = Object.fromEntries(url.searchParams.entries());

    const apiRequest = Object.assign(request, { _params,
      query,
      context: {
        requestId: context.id,
        userId: context.userId,
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        route,
        authenticated: context.authenticated || false,
        permissions: context.permissions || []
      },
      startTime: Date.now()
    }) as APIRequest;

    return apiRequest;
  }

  /**
   * Apply security checks
   */
  private async applySecurity(request: APIRequest): Promise<{ allowed: boolean; response?: Response }> {
    // Apply threat detection
    const threatDetector = getThreatDetector(this.env);
    const threatResult = await threatDetector.analyzeRequest(request, request.context as unknown);

    if (threatResult.threatDetected && threatResult.riskLevel === 'critical') {
      return {
        allowed: false,
        response: this.createErrorResponse(403, 'Request blocked due to security concerns')
      };
    }

    // Apply route-level security
    const routeSecurity = createRouteSecurityMiddleware(this.env);
    const securityResult = await routeSecurity.enforceRouteSececurity(request, request.context as unknown);

    return securityResult;
  }

  /**
   * Check cache for response
   */
  private async checkCache(request: APIRequest): Promise<Response | null> {
    if (!request.context.route.config.caching?.enabled) {
      return null;
    }

    return await this.cache.get(request);
  }

  /**
   * Apply middleware chain
   */
  private async applyMiddleware(request: APIRequest, route: APIRoute): Promise<APIResponse> {
    // Combine global and route middleware
    const allMiddleware = [
      ...this.middleware.filter(m => m.enabled),
      ...route.middleware.filter(m => m.enabled)
    ].sort((a, _b) => a.order - b.order);

    let index = 0;

    const next = async (): Promise<APIResponse> => {
      if (index >= allMiddleware.length) {
        // Execute route handler
        return await route.handler(request);
      }

      const middleware = allMiddleware[index++];
      return await middleware.handler(request, next);
    };

    return await next();
  }

  /**
   * Apply request/response transformations
   */
  private async applyTransformations(request: APIRequest, response: APIResponse): Promise<APIResponse> {
    const transformations: string[] = [];

    // Apply request transformations (already applied in middleware)

    // Apply response transformations
    const config = request.context.route.config.transformation?.response;
    if (config) {
      if (config.headers) {
        const headers = new Headers(response.headers);

        // Add headers
        if (config.headers.add) {
          for (const [key, value] of Object.entries(config.headers.add)) {
            headers.set(key, value);
            transformations.push(`add_header_${key}`);
          }
        }

        // Remove headers
        if (config.headers.remove) {
          for (const header of config.headers.remove) {
            headers.delete(header);
            transformations.push(`remove_header_${header}`);
          }
        }

        // Modify headers
        if (config.headers.modify) {
          for (const [key, value] of Object.entries(config.headers.modify)) {
            headers.set(key, value);
            transformations.push(`modify_header_${key}`);
          }
        }

        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        }) as APIResponse;
      }

      // Transform response body
      if (config.body) {
        response = await this.transformResponseBody(response, config.body);
        transformations.push('transform_body');
      }

      // Map status codes
      if (config.status?.map && config.status.map[response.status]) {
        const newStatus = config.status.map[response.status];
        response = new Response(response.body, {
          status: newStatus,
          statusText: response.statusText,
          headers: response.headers
        }) as APIResponse;
        transformations.push(`map_status_${response.status}_to_${newStatus}`);
      }
    }

    if (transformations.length > 0) {
      response.metadata = {
        ...response.metadata,
        transformations
      };
    }

    return response;
  }

  /**
   * Cache response
   */
  private async cacheResponse(request: APIRequest, response: APIResponse): Promise<void> {
    const cacheConfig = request.context.route.config.caching;
    if (!cacheConfig?.enabled) return;

    // Check cache conditions
    if (cacheConfig.conditions) {
      const shouldCache = cacheConfig.conditions.every(condition =>
        this.evaluateCacheCondition(condition, request, response)
      );
      if (!shouldCache) return;
    }

    await this.cache.set(request, response, cacheConfig.ttl);
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.registerMiddleware({
      name: 'security',
      handler: async (request, _next) => {
        const security = createSecurityMiddleware();
        const securityCheck = security.processRequest(request);
        if (securityCheck) {
          return securityCheck as APIResponse;
        }
        const response = await next();
        return security.processResponse(request, response) as APIResponse;
      },
      order: 100
    });

    // Rate limiting middleware
    this.registerMiddleware({
      name: 'rate_limit',
      handler: async (request, _next) => {
        const rateLimiter = createRateLimitMiddleware(this.env);
        const rateLimitResult = await rateLimiter(request);
        if (rateLimitResult) {
          return rateLimitResult as APIResponse;
        }
        return await next();
      },
      order: 200
    });

    // Request/response logging
    this.registerMiddleware({
      name: 'logging',
      handler: async (request, _next) => {
        const startTime = Date.now();
        console.log(`LOG: API-GATEWAY-REQUEST-1 - ${request.method} ${request.url}`);

        const response = await next();
        const duration = Date.now() - startTime;

        console.log(`LOG: API-GATEWAY-RESPONSE-1 - ${request.method} ${request.url} ${response.status} ${duration}ms`);
        return response;
      },
      order: 300
    });

    // Performance monitoring
    this.registerMiddleware({
      name: 'monitoring',
      handler: async (request, _next) => {
        const perfMonitor = getPerformanceMonitor(this.env);
        const response = await next();

        perfMonitor.recordRequest(request.context as unknown, {
          duration: Date.now() - request.startTime,
          statusCode: response.status,
          cacheHit: response.metadata?.cacheHit || false
        });

        return response;
      },
      order: 400
    });
  }

  /**
   * Utility methods
   */
  private extractPathParams(routePath: string | RegExp, requestPath: string): Record<string, string> {
    const params: Record<string, string> = {};

    if (typeof routePath === 'string') {
      // Simple path parameter extraction
      // Example: /users/:id -> /users/123
      const routeParts = routePath.split('/');
      const requestParts = requestPath.split('/');

      for (let i = 0; i < routeParts.length; i++) {
        const routePart = routeParts[i];
        if (routePart.startsWith(':')) {
          const paramName = routePart.substring(1);
          params[paramName] = requestParts[i] || '';
        }
      }
    }

    return params;
  }

  private evaluateCacheCondition(condition: CacheCondition, request: APIRequest, response: APIResponse): boolean {
    let value: string = '';

    switch (condition.type) {
      case 'header':
        value = request.headers.get(condition.key) || '';
        break;
      case 'query':
        value = request.query[condition.key] || '';
        break;
      case 'method':
        value = request.method;
        break;
      case 'status':
        value = response.status.toString();
        break;
    }

    switch (condition.operation) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return value.includes(condition.value as string);
      case 'matches':
        return new RegExp(condition.value as string).test(value);
      case 'exists':
        return !!value;
      default:
        return false;
    }
  }

  private async transformResponseBody(response: APIResponse, config: ResponseTransformation['body']): Promise<APIResponse> {
    if (!config) return response;

    try {
      const body = await response.text();
      let transformedBody = body;

      switch (config.transform) {
        case 'json_to_xml':
          // Would implement JSON to XML conversion
          break;
        case 'xml_to_json':
          // Would implement XML to JSON conversion
          break;
        case 'filter':
          if (config.filter) {
            const data = JSON.parse(body);
            const filtered = this.filterObject(data, config.filter);
            transformedBody = JSON.stringify(filtered);
          }
          break;
        case 'paginate':
          // Would implement pagination logic
          break;
      }

      return new Response(transformedBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      }) as APIResponse;

    } catch (error: unknown) {
      console.error('LOG: API-GATEWAY-TRANSFORM-ERROR-1 - Body transformation failed:', error);
      return response;
    }
  }

  private filterObject(obj: unknown, fields: string[]): unknown {
    if (Array.isArray(obj)) {
      return obj.map(item => this.filterObject(item, fields));
    }

    if (typeof obj === 'object' && obj !== null) {
      const filtered: unknown = {};
      for (const field of fields) {
        if (obj.hasOwnProperty(field)) {
          filtered[field] = obj[field];
        }
      }
      return filtered;
    }

    return obj;
  }

  private createErrorResponse(status: number, message: string): Response {
    return new Response(
      JSON.stringify({
        error: true,
        status,
        message,
        timestamp: new Date().toISOString()
      }),
      { _status,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  private addGatewayHeaders(response: APIResponse, metadata: unknown): APIResponse {
    const headers = new Headers(response.headers);
    headers.set('X-Gateway-Processing-Time', `${metadata.processingTime}ms`);
    headers.set('X-Gateway-Route', metadata.route);
    headers.set('X-Gateway-Cached', metadata.cached.toString());
    headers.set('X-Gateway-Version', '1.0');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    }) as APIResponse;
  }

  private initializeMetrics(): GatewayMetrics {
    return {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        blocked: 0
      },
      latency: {
        average: 0,
        p50: 0,
        p95: 0,
        p99: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      routes: {},
      upstreams: {}
    };
  }

  private updateMetrics(route: APIRoute | null, startTime: number, status: number, cached: boolean): void {
    const duration = Date.now() - startTime;

    // Update global metrics
    this.metrics.requests.total++;
    if (status >= 200 && status < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    if (cached) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    this.metrics.cache.hitRate = this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses);

    // Update route metrics
    if (route) {
      if (!this.metrics.routes[route.id]) {
        this.metrics.routes[route.id] = this.createEmptyRouteMetrics();
      }

      const routeMetrics = this.metrics.routes[route.id];
      routeMetrics.requests++;
      routeMetrics.averageLatency = (routeMetrics.averageLatency + duration) / 2;
      routeMetrics.lastAccessed = new Date();

      if (status >= 400) {
        routeMetrics.errorRate = (routeMetrics.errorRate + 1) / routeMetrics.requests;
      }

      if (cached) {
        routeMetrics.cacheHitRate = (routeMetrics.cacheHitRate + 1) / routeMetrics.requests;
      }
    }
  }

  private createEmptyRouteMetrics(): RouteMetrics {
    return {
      requests: 0,
      averageLatency: 0,
      errorRate: 0,
      cacheHitRate: 0,
      lastAccessed: new Date()
    };
  }

  private generateTrendData(routeId: string): Array<{ timestamp: Date; requests: number; latency: number }> {
    // Generate sample trend data - in production this would come from stored metrics
    const trends = [];
    for (let i = 23; i >= 0; i--) {
      trends.push({
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
        requests: Math.floor(Math.random() * 100),
        latency: Math.floor(Math.random() * 1000) + 100
      });
    }
    return trends;
  }

  private generateErrorData(routeId: string): Array<{ timestamp: Date; error: string; count: number }> {
    // Generate sample error data - in production this would come from error logs
    return [
      {
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        error: '500 Internal Server Error',
        count: 5
      },
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        error: '404 Not Found',
        count: 12
      }
    ];
  }
}

/**
 * API Cache implementation
 */
class APICache {
  private env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
  }

  async get(request: APIRequest): Promise<Response | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.env.TRENDS_CACHE.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        return new Response(data.body, {
          status: data.status,
          statusText: data.statusText,
          headers: data.headers
        });
      }

      return null;
    } catch (error: unknown) {
      console.error('LOG: API-CACHE-GET-ERROR-1 - Cache get failed:', error);
      return null;
    }
  }

  async set(request: APIRequest, response: APIResponse, ttl: number): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const body = await response.text();

      const cacheData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body
      };

      await this.env.TRENDS_CACHE.put(
        cacheKey,
        JSON.stringify(cacheData),
        { expirationTtl: ttl }
      );

    } catch (error: unknown) {
      console.error('LOG: API-CACHE-SET-ERROR-1 - Cache set failed:', error);
    }
  }

  private generateCacheKey(request: APIRequest): string {
    const url = new URL(request.url);
    const varyBy = request.context.route.config.caching?.varyBy || [];

    let key = `${request.method}:${url.pathname}`;

    // Add query parameters to key
    const sortedParams = Array.from(url.searchParams.entries()).sort();
    if (sortedParams.length > 0) {
      key += `?${new URLSearchParams(sortedParams).toString()}`;
    }

    // Add vary headers
    for (const header of varyBy) {
      const value = request.headers.get(header);
      if (value) {
        key += `:${header}=${value}`;
      }
    }

    return `api_cache:${btoa(key)}`;
  }
}

/**
 * Upstream service interface
 */
interface UpstreamService {
  name: string;
  endpoints: string[];
  healthCheck: {
    enabled: boolean;
    path: string;
    interval: number;
    timeout: number;
  };
  loadBalancing: {
    strategy: 'round_robin' | 'least_connections' | 'weighted';
    weights?: Record<string, number>;
  };
}

/**
 * Circuit breaker interface
 */
interface CircuitBreaker {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime: Date;
  nextAttemptTime: Date;
}

/**
 * Global API gateway instance
 */
let globalAPIGateway: AdvancedAPIGateway | null = null;

/**
 * Get or create global API gateway
 */
export function getAPIGateway(env: CloudflareEnv): AdvancedAPIGateway {
  if (!globalAPIGateway) {
    globalAPIGateway = new AdvancedAPIGateway(env);
  }
  return globalAPIGateway;
}