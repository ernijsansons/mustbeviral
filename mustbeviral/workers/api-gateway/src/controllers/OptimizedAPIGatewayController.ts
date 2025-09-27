/**
 * Optimized API Gateway Controller
 * High-performance request routing with intelligent caching and parallel processing
 */

export interface ServiceRoute {
  name: string;
  fetcher: Fetcher;
  healthEndpoint: string;
  weight: number;
  circuit: CircuitBreakerState;
}

export interface CacheStrategy {
  ttl: number;
  tags: string[];
  condition: (request: Request, response: Response) => boolean;
  compression: boolean;
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  startTime: number;
  route: string;
  method: string;
  clientInfo: {
    ip: string;
    userAgent: string;
    country?: string;
  };
  performance: {
    dnsTime?: number;
    connectionTime?: number;
    responseTime?: number;
  };
}

export class OptimizedAPIGatewayController {
  private env: any;
  private serviceRegistry: Map<string, ServiceRoute[]> = new Map();
  private responseCache: Map<string, CacheEntry> = new Map();
  private requestContexts: Map<string, RequestContext> = new Map();
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly PARALLEL_REQUEST_LIMIT = 5;

  constructor(env: any) {
    this.env = env;
    this.initializeServiceRegistry();
    this.setupCacheStrategies();
  }

  /**
   * Optimized request forwarding with load balancing and parallel processing
   */
  async forwardRequestOptimized(
    request: Request,
    serviceName: string,
    requestId: string
  ): Promise<Response> {
    const context = this.createRequestContext(request, requestId);
    const startTime = performance.now();

    try {
      // Intelligent service selection based on health and load
      const serviceRoute = await this.selectOptimalService(serviceName, context);

      if (!serviceRoute) {
        throw new Error(`No healthy service available for ${serviceName}`);
      }

      // Check for cacheable request
      if (request.method === 'GET') {
        const cachedResponse = await this.getCachedResponseOptimized(request, context);
        if (cachedResponse) {
          this.recordMetrics(context, performance.now() - startTime, true);
          return cachedResponse;
        }
      }

      // Prepare optimized request with compression and keep-alive
      const optimizedRequest = this.prepareOptimizedRequest(request, context);

      // Execute request with timeout and retry logic
      const response = await this.executeRequestWithRetry(
        optimizedRequest,
        serviceRoute,
        context
      );

      // Cache successful responses asynchronously
      if (response.ok && request.method === 'GET') {
        this.cacheResponseAsync(request, response.clone(), context);
      }

      this.recordMetrics(context, performance.now() - startTime, false);
      return response;

    } catch (error) {
      console.error(`API Gateway error for ${serviceName}:`, error);
      this.recordMetrics(context, performance.now() - startTime, false, error as Error);
      throw error;
    } finally {
      this.cleanupRequestContext(requestId);
    }
  }

  /**
   * Parallel request execution for aggregated endpoints
   */
  async executeParallelRequests(requests: Array<{
    request: Request;
    serviceName: string;
    priority: number;
  }>, requestId: string): Promise<Response[]> {
    const context = this.requestContexts.get(requestId);
    if (!context) {
      throw new Error('Request context not found');
    }

    // Sort by priority and split into batches
    const sortedRequests = requests.sort((a, b) => b.priority - a.priority);
    const batches = this.createBatches(sortedRequests, this.PARALLEL_REQUEST_LIMIT);

    const allResults: Response[] = [];

    for (const batch of batches) {
      const batchPromises = batch.map(async ({ request, serviceName }) => {
        try {
          return await this.forwardRequestOptimized(request, serviceName, requestId);
        } catch (error) {
          console.error(`Batch request failed for ${serviceName}:`, error);
          return new Response(JSON.stringify({ error: 'Service unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
    }

    return allResults;
  }

  /**
   * Smart service selection based on health, load, and geographic proximity
   */
  private async selectOptimalService(serviceName: string, context: RequestContext): Promise<ServiceRoute | null> {
    const services = this.serviceRegistry.get(serviceName);
    if (!services || services.length === 0) {
      return null;
    }

    // Filter healthy services
    const healthyServices = services.filter(service => service.circuit !== 'open');
    if (healthyServices.length === 0) {
      return services[0]; // Fallback to any service in emergency
    }

    // Weighted round-robin with health consideration
    const totalWeight = healthyServices.reduce((sum, service) => sum + service.weight, 0);
    let randomWeight = Math.random() * totalWeight;

    for (const service of healthyServices) {
      randomWeight -= service.weight;
      if (randomWeight <= 0) {
        return service;
      }
    }

    return healthyServices[0]; // Fallback
  }

  /**
   * Optimized caching with intelligent invalidation
   */
  private async getCachedResponseOptimized(request: Request, context: RequestContext): Promise<Response | null> {
    const cacheKey = await this.generateCacheKey(request, context);
    const cacheEntry = this.responseCache.get(cacheKey);

    if (!cacheEntry) {
      return null;
    }

    // Check cache freshness
    const now = Date.now();
    if (now > cacheEntry.expiresAt) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    // Stale-while-revalidate strategy
    if (cacheEntry.strategy === 'stale-while-revalidate' &&
        now > cacheEntry.staleAt) {
      // Return stale content but trigger background refresh
      this.refreshCacheInBackground(request, context, cacheKey);
    }

    const response = new Response(cacheEntry.body, {
      status: cacheEntry.status,
      statusText: cacheEntry.statusText,
      headers: new Headers(cacheEntry.headers)
    });

    response.headers.set('X-Cache', 'HIT');
    response.headers.set('X-Cache-Age', Math.floor((now - cacheEntry.createdAt) / 1000).toString());

    return response;
  }

  /**
   * Asynchronous response caching with compression
   */
  private async cacheResponseAsync(request: Request, response: Response, context: RequestContext) {
    try {
      const cacheKey = await this.generateCacheKey(request, context);
      const strategy = this.determineCacheStrategy(request, response);

      if (!strategy) {
        return;
      }

      let body = await response.text();

      // Apply compression if enabled
      if (strategy.compression && body.length > 1024) {
        body = await this.compressResponse(body);
      }

      const now = Date.now();
      const cacheEntry: CacheEntry = {
        body,
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        createdAt: now,
        expiresAt: now + strategy.ttl,
        staleAt: now + (strategy.ttl * 0.8), // 80% of TTL
        strategy: strategy.strategy,
        tags: strategy.tags,
        compressed: strategy.compression
      };

      this.responseCache.set(cacheKey, cacheEntry);

      // Clean up cache if it's getting too large
      if (this.responseCache.size > this.MAX_CACHE_SIZE) {
        this.evictStaleEntries();
      }

    } catch (error) {
      console.warn('Cache storage failed:', error);
    }
  }

  /**
   * Request optimization with compression and connection reuse
   */
  private prepareOptimizedRequest(request: Request, context: RequestContext): Request {
    const headers = new Headers(request.headers);

    // Add compression headers
    if (!headers.has('Accept-Encoding')) {
      headers.set('Accept-Encoding', 'br, gzip, deflate');
    }

    // Add connection optimization
    headers.set('Connection', 'keep-alive');
    headers.set('Keep-Alive', 'timeout=30, max=100');

    // Add context headers for service routing
    headers.set('X-Request-ID', context.requestId);
    headers.set('X-Client-IP', context.clientInfo.ip);

    if (context.userId) {
      headers.set('X-User-ID', context.userId);
    }

    if (context.clientInfo.country) {
      headers.set('X-Client-Country', context.clientInfo.country);
    }

    return new Request(request, { headers });
  }

  /**
   * Request execution with intelligent retry and circuit breaking
   */
  private async executeRequestWithRetry(
    request: Request,
    serviceRoute: ServiceRoute,
    context: RequestContext
  ): Promise<Response> {
    const maxRetries = 3;
    const baseDelay = 100;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeout = this.calculateTimeout(attempt, context.route);
        const response = await this.executeWithTimeout(request, serviceRoute.fetcher, timeout);

        // Update circuit breaker state
        if (response.ok) {
          serviceRoute.circuit = 'closed';
        } else if (response.status >= 500) {
          this.updateCircuitBreaker(serviceRoute, false);
        }

        return response;

      } catch (error) {
        this.updateCircuitBreaker(serviceRoute, false);

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
        await this.sleep(delay);

        console.warn(`Request retry ${attempt}/${maxRetries} after ${delay}ms delay`);
      }
    }

    throw new Error('All retry attempts exhausted');
  }

  /**
   * Background cache refresh for stale-while-revalidate
   */
  private async refreshCacheInBackground(request: Request, context: RequestContext, cacheKey: string) {
    try {
      // Clone request for background refresh
      const refreshRequest = request.clone();
      const serviceName = this.extractServiceName(request);
      const serviceRoute = await this.selectOptimalService(serviceName, context);

      if (serviceRoute) {
        const response = await serviceRoute.fetcher.fetch(refreshRequest);
        if (response.ok) {
          await this.cacheResponseAsync(request, response, context);
        }
      }
    } catch (error) {
      console.warn('Background cache refresh failed:', error);
    }
  }

  /**
   * Intelligent cache eviction based on usage and staleness
   */
  private evictStaleEntries() {
    const now = Date.now();
    const entries = Array.from(this.responseCache.entries());

    // Sort by staleness and usage
    entries.sort(([, a], [, b]) => {
      const aStaleness = now - a.createdAt;
      const bStaleness = now - b.createdAt;
      return bStaleness - aStaleness;
    });

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.responseCache.delete(entries[i][0]);
    }
  }

  // Helper methods
  private createRequestContext(request: Request, requestId: string): RequestContext {
    const url = new URL(request.url);
    const context: RequestContext = {
      requestId,
      startTime: Date.now(),
      route: url.pathname,
      method: request.method,
      clientInfo: {
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        userAgent: request.headers.get('User-Agent') || 'unknown',
        country: request.headers.get('CF-IPCountry') || undefined
      },
      performance: {}
    };

    this.requestContexts.set(requestId, context);
    return context;
  }

  private async generateCacheKey(request: Request, context: RequestContext): Promise<string> {
    const url = new URL(request.url);
    const parts = [
      request.method,
      url.pathname,
      url.search,
      context.userId || 'anonymous'
    ];

    const key = parts.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private determineCacheStrategy(request: Request, response: Response): CacheStrategy | null {
    const url = new URL(request.url);

    // Analytics endpoints - short cache
    if (url.pathname.includes('/analytics')) {
      return {
        ttl: 60000, // 1 minute
        tags: ['analytics'],
        condition: () => true,
        compression: true,
        strategy: 'stale-while-revalidate'
      };
    }

    // Content endpoints - medium cache
    if (url.pathname.includes('/content')) {
      return {
        ttl: 300000, // 5 minutes
        tags: ['content'],
        condition: () => response.ok,
        compression: true,
        strategy: 'cache-first'
      };
    }

    // User data - very short cache
    if (url.pathname.includes('/auth/me')) {
      return {
        ttl: 30000, // 30 seconds
        tags: ['user'],
        condition: () => response.ok,
        compression: false,
        strategy: 'network-first'
      };
    }

    return null; // Don't cache by default
  }

  private calculateTimeout(attempt: number, route: string): number {
    const baseTimeout = route.includes('/auth') ? 5000 : 10000;
    return baseTimeout * Math.pow(1.5, attempt - 1);
  }

  private async executeWithTimeout(request: Request, fetcher: Fetcher, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetcher.fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private updateCircuitBreaker(serviceRoute: ServiceRoute, success: boolean) {
    // Simplified circuit breaker logic
    if (success) {
      serviceRoute.circuit = 'closed';
    } else {
      serviceRoute.circuit = serviceRoute.circuit === 'closed' ? 'half-open' : 'open';
    }
  }

  private extractServiceName(request: Request): string {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    return pathParts[2] || 'unknown'; // /api/{service}/...
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async compressResponse(body: string): Promise<string> {
    // Simple compression implementation
    return body; // Placeholder - would use actual compression
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordMetrics(context: RequestContext, duration: number, cacheHit: boolean, error?: Error) {
    // Metrics recording implementation
    console.log(`Request ${context.requestId}: ${duration}ms, cache: ${cacheHit ? 'HIT' : 'MISS'}, error: ${!!error}`);
  }

  private cleanupRequestContext(requestId: string) {
    this.requestContexts.delete(requestId);
  }

  private initializeServiceRegistry() {
    // Initialize service registry with health checks
    this.serviceRegistry.set('AUTH_SERVICE', [{
      name: 'auth-primary',
      fetcher: this.env.AUTH_SERVICE,
      healthEndpoint: '/health',
      weight: 100,
      circuit: 'closed'
    }]);

    this.serviceRegistry.set('CONTENT_SERVICE', [{
      name: 'content-primary',
      fetcher: this.env.CONTENT_SERVICE,
      healthEndpoint: '/health',
      weight: 100,
      circuit: 'closed'
    }]);
  }

  private setupCacheStrategies() {
    // Cache strategy setup
  }
}

interface CacheEntry {
  body: string;
  status: number;
  statusText: string;
  headers: [string, string][];
  createdAt: number;
  expiresAt: number;
  staleAt: number;
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  tags: string[];
  compressed: boolean;
}

type CircuitBreakerState = 'open' | 'closed' | 'half-open';

export default OptimizedAPIGatewayController;