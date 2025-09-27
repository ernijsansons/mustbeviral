# Performance Optimization Guide - Must Be Viral V2

## Performance Targets

| Metric | Target | Critical | Current |
|--------|--------|----------|---------|
| **Page Load Time** | <2s | >3s | TBD |
| **API Response (P50)** | <100ms | >500ms | TBD |
| **API Response (P95)** | <500ms | >2000ms | TBD |
| **Time to First Byte** | <200ms | >600ms | TBD |
| **First Contentful Paint** | <1.5s | >2.5s | TBD |
| **Largest Contentful Paint** | <2.5s | >4s | TBD |
| **Database Query Time** | <50ms | >200ms | TBD |
| **Cache Hit Rate** | >90% | <70% | TBD |

## 1. Frontend Optimization

### Code Splitting & Lazy Loading

```typescript
// src/App.tsx - Implement route-based code splitting
import { lazy, Suspense } from 'react';
import { Route, Router } from 'wouter';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load heavy components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AITools = lazy(() => import('./pages/AITools'));
const ContentEditor = lazy(() => import('./pages/ContentEditor'));

// Preload critical routes
const preloadComponent = (component: () => Promise<any>) => {
  component();
};

export default function App() {
  // Preload dashboard on app mount
  useEffect(() => {
    preloadComponent(() => import('./pages/Dashboard'));
  }, []);

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/ai-tools" component={AITools} />
        <Route path="/editor" component={ContentEditor} />
      </Suspense>
    </Router>
  );
}
```

### Bundle Size Optimization

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
        // Separate large libraries
        lodash: {
          test: /[\\/]node_modules[\\/]lodash/,
          name: 'lodash',
          priority: 20,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)/,
          name: 'react',
          priority: 20,
        },
      },
    },
    // Tree shaking
    usedExports: true,
    // Minification
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info'],
          },
        },
      }),
    ],
  },
};
```

### Image Optimization

```typescript
// src/components/OptimizedImage.tsx
import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  lazy = true,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCI+PC9zdmc+',
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isIntersecting, setIsIntersecting] = useState(!lazy);

  useEffect(() => {
    if (!lazy) {
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    const img = document.getElementById(`img-${src}`);
    if (img) observer.observe(img);

    return () => observer.disconnect();
  }, [src, lazy]);

  useEffect(() => {
    if (isIntersecting && imageSrc === placeholder) {
      // Load optimized version based on device
      const dpr = window.devicePixelRatio || 1;
      const optimizedSrc = getOptimizedImageUrl(src, width, height, dpr);

      // Preload image
      const img = new Image();
      img.onload = () => setImageSrc(optimizedSrc);
      img.src = optimizedSrc;
    }
  }, [isIntersecting, src, width, height, imageSrc, placeholder]);

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`${getOptimizedImageUrl(src, width, height, 1, 'webp')} 1x,
                 ${getOptimizedImageUrl(src, width, height, 2, 'webp')} 2x`}
      />
      <img
        id={`img-${src}`}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
      />
    </picture>
  );
}

function getOptimizedImageUrl(
  src: string,
  width?: number,
  height?: number,
  dpr: number = 1,
  format: string = 'auto'
): string {
  // Use Cloudflare Image Resizing
  const params = new URLSearchParams({
    width: String((width || 800) * dpr),
    height: String((height || 600) * dpr),
    format,
    quality: '85',
    fit: 'cover',
  });

  return `https://cdn.mustbeviral.com/cdn-cgi/image/${params}/${src}`;
}
```

### React Performance Optimizations

```typescript
// src/hooks/useOptimized.ts
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Memoized expensive computations
 */
export function useExpensiveComputation<T>(
  computeFn: () => T,
  deps: any[]
): T {
  return useMemo(() => {
    console.time('expensive-computation');
    const result = computeFn();
    console.timeEnd('expensive-computation');
    return result;
  }, deps);
}

/**
 * Debounced callback for search/filter operations
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  return useCallback(
    debounce(callback, delay, {
      leading: false,
      trailing: true,
    }),
    deps
  );
}

/**
 * Virtual scrolling for large lists
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex + 1),
      offsetY: startIndex * itemHeight,
    };
  }, [scrollTop, items, itemHeight, containerHeight, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    ...visibleRange,
    handleScroll,
    totalHeight: items.length * itemHeight,
  };
}
```

## 2. Backend Optimization

### Database Query Optimization

```typescript
// src/lib/database/QueryOptimizer.ts
export class QueryOptimizer {
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute

  /**
   * Optimize N+1 queries with DataLoader pattern
   */
  createBatchLoader<K, V>(
    batchFn: (keys: K[]) => Promise<V[]>
  ): (key: K) => Promise<V> {
    const batch: { key: K; resolve: (value: V) => void }[] = [];
    let scheduled = false;

    const dispatch = async () => {
      const currentBatch = [...batch];
      batch.length = 0;
      scheduled = false;

      const keys = currentBatch.map(item => item.key);
      const values = await batchFn(keys);

      currentBatch.forEach((item, index) => {
        item.resolve(values[index]);
      });
    };

    return (key: K): Promise<V> => {
      return new Promise(resolve => {
        batch.push({ key, resolve });

        if (!scheduled) {
          scheduled = true;
          process.nextTick(dispatch);
        }
      });
    };
  }

  /**
   * Query result caching
   */
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = this.cacheTimeout
  ): Promise<T> {
    const cached = this.queryCache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.result;
    }

    const result = await queryFn();
    this.queryCache.set(key, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Optimized pagination query
   */
  async paginatedQuery<T>(
    table: string,
    page: number,
    limit: number,
    filters?: Record<string, any>,
    orderBy?: string
  ): Promise<{ data: T[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;

    // Use window function for efficient counting
    const query = `
      WITH paginated AS (
        SELECT *, COUNT(*) OVER() as total_count
        FROM ${table}
        ${filters ? this.buildWhereClause(filters) : ''}
        ${orderBy ? `ORDER BY ${orderBy}` : ''}
        LIMIT ${limit + 1} OFFSET ${offset}
      )
      SELECT * FROM paginated;
    `;

    const results = await this.db.query<T & { total_count: number }>(query);

    const hasMore = results.length > limit;
    const data = results.slice(0, limit).map(({ total_count, ...item }) => item as T);
    const total = results[0]?.total_count || 0;

    return { data, total, hasMore };
  }

  /**
   * Index usage optimization
   */
  async analyzeQueryPerformance(query: string): Promise<any> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const result = await this.db.query(explainQuery);

    const plan = result[0]['QUERY PLAN'][0];
    const recommendations = [];

    // Check for sequential scans on large tables
    if (plan['Node Type'] === 'Seq Scan' && plan['Total Cost'] > 1000) {
      recommendations.push({
        type: 'INDEX_MISSING',
        table: plan['Relation Name'],
        suggestion: `Consider adding an index on frequently queried columns`,
      });
    }

    // Check for slow sorting
    if (plan['Sort Method'] && plan['Sort Space Used'] > 1000) {
      recommendations.push({
        type: 'SORT_OPTIMIZATION',
        suggestion: `Consider adding an index to support ORDER BY clause`,
      });
    }

    return {
      executionTime: plan['Execution Time'],
      planningTime: plan['Planning Time'],
      totalCost: plan['Total Cost'],
      recommendations,
    };
  }
}
```

### API Response Caching

```typescript
// src/middleware/caching.ts
import { Redis } from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

export class CacheMiddleware {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Cache middleware with intelligent key generation
   */
  cache(options: {
    ttl?: number;
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request) => boolean;
    varyBy?: string[];
  } = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check if caching should be applied
      if (options.condition && !options.condition(req)) {
        return next();
      }

      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator(req)
        : this.generateCacheKey(req, options.varyBy);

      // Try to get from cache
      try {
        const cached = await this.redis.get(key);

        if (cached) {
          const data = JSON.parse(cached);
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-TTL', data.ttl);
          return res.status(data.status || 200).json(data.body);
        }
      } catch (error) {
        console.error('Cache retrieval error:', error);
      }

      // Cache miss - store original send method
      const originalSend = res.json.bind(res);

      // Override json method to cache response
      res.json = (body: any) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ttl = options.ttl || this.defaultTTL;
          const cacheData = {
            body,
            status: res.statusCode,
            ttl,
            timestamp: Date.now(),
          };

          // Store in cache (don't wait)
          this.redis
            .setex(key, ttl, JSON.stringify(cacheData))
            .catch(err => console.error('Cache storage error:', err));

          res.setHeader('X-Cache', 'MISS');
        }

        return originalSend(body);
      };

      next();
    };
  }

  /**
   * Cache invalidation
   */
  invalidate(patterns: string[]): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.json.bind(res);

      res.json = (body: any) => {
        // Invalidate cache after successful mutation
        if (res.statusCode >= 200 && res.statusCode < 300) {
          patterns.forEach(pattern => {
            this.invalidatePattern(pattern, req).catch(console.error);
          });
        }

        return originalSend(body);
      };

      next();
    };
  }

  private async invalidatePattern(pattern: string, req: Request): Promise<void> {
    // Replace placeholders with actual values
    const key = pattern.replace(/:(\w+)/g, (_, param) => req.params[param] || req.body[param]);

    const keys = await this.redis.keys(key);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private generateCacheKey(req: Request, varyBy: string[] = []): string {
    const parts = [
      req.method,
      req.originalUrl,
      req.user?.id || 'anonymous',
      req.user?.tier || 'free',
    ];

    // Add vary-by headers
    varyBy.forEach(header => {
      parts.push(req.headers[header.toLowerCase()] || '');
    });

    // Create hash for consistent key length
    const hash = createHash('sha256').update(parts.join(':')).digest('hex');
    return `cache:${hash}`;
  }
}

// Usage in routes
const cache = new CacheMiddleware(redis);

// Cache public content for 5 minutes
router.get('/api/content/public',
  cache.cache({ ttl: 300 }),
  contentController.getPublicContent
);

// Cache with user-specific key
router.get('/api/analytics/dashboard',
  authenticate,
  cache.cache({
    ttl: 60,
    keyGenerator: (req) => `analytics:${req.user.id}:dashboard`,
  }),
  analyticsController.getDashboard
);

// Invalidate cache on content creation
router.post('/api/content',
  authenticate,
  contentController.create,
  cache.invalidate(['cache:*content*'])
);
```

### Connection Pooling

```typescript
// src/lib/database/ConnectionPool.ts
import { Pool } from 'pg';
import { Redis } from 'ioredis';

export class DatabaseConnectionPool {
  private pool: Pool;
  private activeConnections = 0;
  private waitingQueue: (() => void)[] = [];

  constructor(config: any) {
    this.pool = new Pool({
      ...config,
      max: 20,                    // Maximum connections
      min: 5,                     // Minimum connections
      idleTimeoutMillis: 30000,   // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Connection timeout
      maxUses: 7500,              // Close connection after 7500 uses

      // Connection lifecycle hooks
      onConnect: async (client) => {
        // Set connection parameters
        await client.query('SET statement_timeout = 30000'); // 30s query timeout
        await client.query('SET idle_in_transaction_session_timeout = 60000'); // 60s idle timeout
      },
    });

    // Monitor pool health
    this.pool.on('error', (err, client) => {
      console.error('Database pool error:', err);
    });

    this.pool.on('acquire', () => {
      this.activeConnections++;
    });

    this.pool.on('release', () => {
      this.activeConnections--;
      this.processWaitingQueue();
    });
  }

  async query<T>(text: string, params?: any[]): Promise<T[]> {
    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);

      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        console.warn('Slow query detected:', {
          query: text.substring(0, 100),
          duration,
          rows: result.rowCount,
        });
      }

      return result.rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async getConnection() {
    if (this.activeConnections >= this.pool.options.max) {
      // Queue if at capacity
      return new Promise((resolve) => {
        this.waitingQueue.push(() => {
          this.pool.connect().then(resolve);
        });
      });
    }

    return this.pool.connect();
  }

  private processWaitingQueue() {
    if (this.waitingQueue.length > 0 && this.activeConnections < this.pool.options.max) {
      const next = this.waitingQueue.shift();
      if (next) next();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      active: this.activeConnections,
    };
  }
}
```

## 3. Cloudflare Workers Optimization

### Edge Caching Strategy

```typescript
// workers/cache-worker.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Cache configuration by path
    const cacheConfig = this.getCacheConfig(url.pathname);

    if (!cacheConfig.cache) {
      return fetch(request);
    }

    // Create cache key
    const cacheKey = this.createCacheKey(request, cacheConfig);
    const cache = caches.default;

    // Check cache
    let response = await cache.match(cacheKey);

    if (response) {
      // Add cache headers
      response = new Response(response.body, response);
      response.headers.set('CF-Cache-Status', 'HIT');
      return response;
    }

    // Cache miss - fetch from origin
    response = await fetch(request);

    // Only cache successful responses
    if (response.ok) {
      // Clone response for caching
      const responseToCache = response.clone();

      // Add cache headers
      const headers = new Headers(responseToCache.headers);
      headers.set('Cache-Control', `public, max-age=${cacheConfig.ttl}`);
      headers.set('CF-Cache-Status', 'MISS');

      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });

      // Store in cache (don't wait)
      event.waitUntil(cache.put(cacheKey, cachedResponse));
    }

    return response;
  },

  getCacheConfig(pathname: string): { cache: boolean; ttl: number; varyBy: string[] } {
    // Static assets - long cache
    if (pathname.match(/\.(js|css|jpg|jpeg|png|gif|svg|woff2?)$/)) {
      return { cache: true, ttl: 31536000, varyBy: [] }; // 1 year
    }

    // API endpoints
    if (pathname.startsWith('/api/')) {
      // Public content - cache briefly
      if (pathname.includes('/public') || pathname.includes('/trending')) {
        return { cache: true, ttl: 300, varyBy: ['Accept', 'Accept-Language'] }; // 5 minutes
      }

      // User-specific content - no cache
      if (pathname.includes('/user') || pathname.includes('/dashboard')) {
        return { cache: false, ttl: 0, varyBy: [] };
      }
    }

    // HTML pages - cache briefly
    if (pathname.endsWith('/') || pathname.endsWith('.html')) {
      return { cache: true, ttl: 60, varyBy: ['Accept', 'Accept-Language'] }; // 1 minute
    }

    // Default - no cache
    return { cache: false, ttl: 0, varyBy: [] };
  },

  createCacheKey(request: Request, config: any): Request {
    const url = new URL(request.url);

    // Normalize URL
    url.searchParams.sort(); // Sort query params for consistent keys

    // Create cache key with vary headers
    const headers = new Headers();
    config.varyBy.forEach((header: string) => {
      const value = request.headers.get(header);
      if (value) headers.set(header, value);
    });

    return new Request(url.toString(), {
      method: request.method,
      headers,
    });
  }
};
```

### Worker Performance Optimization

```typescript
// workers/optimized-worker.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Early return for health checks
    if (request.url.endsWith('/health')) {
      return new Response('OK', { status: 200 });
    }

    // Implement request coalescing for identical requests
    const requestKey = this.getRequestKey(request);
    const inFlightRequest = this.inFlightRequests.get(requestKey);

    if (inFlightRequest) {
      // Wait for in-flight request
      return inFlightRequest;
    }

    // Process new request
    const responsePromise = this.handleRequest(request, env, ctx);
    this.inFlightRequests.set(requestKey, responsePromise);

    try {
      const response = await responsePromise;
      return response;
    } finally {
      this.inFlightRequests.delete(requestKey);
    }
  },

  async handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();

    try {
      // Parallel fetch for required data
      const [userData, contentData, analyticsData] = await Promise.all([
        this.fetchUserData(request, env),
        this.fetchContentData(request, env),
        this.fetchAnalyticsData(request, env),
      ]);

      // Process and combine data
      const result = this.processData(userData, contentData, analyticsData);

      // Create response with performance headers
      const response = new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'X-Worker-Location': env.CF_WORKER_LOCATION || 'unknown',
        },
      });

      return response;
    } catch (error) {
      // Error response with details
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Response-Time': `${Date.now() - startTime}ms`,
          },
        }
      );
    }
  },

  // Request deduplication
  inFlightRequests: new Map<string, Promise<Response>>(),

  getRequestKey(request: Request): string {
    const url = new URL(request.url);
    return `${request.method}:${url.pathname}${url.search}`;
  },
};
```

## 4. Network Optimization

### CDN Configuration

```yaml
# cloudflare-cdn-rules.yml
rules:
  # Cache static assets
  - description: "Cache static assets"
    expression: (http.request.uri.path.extension in {"js" "css" "jpg" "jpeg" "png" "gif" "svg" "woff" "woff2"})
    action:
      cache:
        edge_ttl: 2592000  # 30 days
        browser_ttl: 86400  # 1 day
        respect_origin: false

  # Compress responses
  - description: "Enable Brotli compression"
    expression: (http.response.content_type.type in {"text" "application"})
    action:
      compress:
        algorithms: ["br", "gzip"]

  # Optimize images
  - description: "Polish images"
    expression: (http.request.uri.path.extension in {"jpg" "jpeg" "png"})
    action:
      polish: "lossy"
      webp: true
      quality: 85

  # Minify resources
  - description: "Minify HTML/CSS/JS"
    expression: (http.response.content_type.type in {"text/html" "text/css" "application/javascript"})
    action:
      minify:
        html: true
        css: true
        js: true

  # HTTP/2 Push
  - description: "Server push critical resources"
    expression: (http.request.uri.path eq "/")
    action:
      server_push:
        - "/css/critical.css"
        - "/js/app.js"
        - "/fonts/main.woff2"
```

### Request Optimization

```typescript
// src/lib/api/OptimizedClient.ts
export class OptimizedAPIClient {
  private baseURL: string;
  private requestQueue: Map<string, Promise<any>> = new Map();

  /**
   * Batch multiple API calls
   */
  async batchRequest(requests: Array<{
    url: string;
    method: string;
    body?: any;
  }>): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/api/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    return response.json();
  }

  /**
   * Request with automatic retry and backoff
   */
  async requestWithRetry<T>(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(5000), // 5s timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;

        // Exponential backoff
        if (i < maxRetries - 1) {
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    throw lastError!;
  }

  /**
   * GraphQL query with fragment optimization
   */
  async graphqlQuery(query: string, variables?: any): Promise<any> {
    // Check if query result is cached
    const cacheKey = this.getCacheKey(query, variables);
    const cached = this.queryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }

    const response = await fetch(`${this.baseURL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: this.optimizeQuery(query),
        variables,
      }),
    });

    const data = await response.json();

    // Cache successful responses
    if (!data.errors) {
      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
    }

    return data;
  }

  private optimizeQuery(query: string): string {
    // Add commonly used fragments
    const fragments = `
      fragment UserFields on User {
        id
        username
        email
        avatar
        tier
      }

      fragment ContentFields on Content {
        id
        title
        body
        type
        createdAt
        author {
          ...UserFields
        }
      }
    `;

    return `${fragments}\n${query}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 5. Monitoring & Analysis

### Performance Monitoring

```typescript
// src/lib/monitoring/PerformanceMonitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Web Vitals tracking
   */
  trackWebVitals() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('FID', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * API call tracking
   */
  trackAPICall(endpoint: string, duration: number, status: number) {
    const key = `api:${endpoint}:${status >= 200 && status < 300 ? 'success' : 'error'}`;
    this.recordMetric(key, duration);

    // Alert on slow endpoints
    if (duration > 1000) {
      console.warn(`Slow API call detected: ${endpoint} took ${duration}ms`);
      this.sendAlert('SLOW_API', { endpoint, duration });
    }
  }

  /**
   * Resource timing analysis
   */
  analyzeResourceTiming() {
    const resources = performance.getEntriesByType('resource');

    const analysis = {
      totalResources: resources.length,
      totalSize: 0,
      totalDuration: 0,
      slowResources: [],
      largeResources: [],
      byType: {},
    };

    resources.forEach(resource => {
      const duration = resource.duration;
      const size = resource.transferSize || 0;

      analysis.totalDuration += duration;
      analysis.totalSize += size;

      // Track by type
      const type = this.getResourceType(resource.name);
      if (!analysis.byType[type]) {
        analysis.byType[type] = { count: 0, size: 0, duration: 0 };
      }
      analysis.byType[type].count++;
      analysis.byType[type].size += size;
      analysis.byType[type].duration += duration;

      // Identify problems
      if (duration > 500) {
        analysis.slowResources.push({
          url: resource.name,
          duration,
          size,
        });
      }

      if (size > 100000) { // 100KB
        analysis.largeResources.push({
          url: resource.name,
          duration,
          size,
        });
      }
    });

    return analysis;
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();

    const typeMap = {
      js: 'script',
      css: 'stylesheet',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      svg: 'image',
      woff: 'font',
      woff2: 'font',
      ttf: 'font',
    };

    return typeMap[extension] || 'other';
  }

  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(value);

    // Send to analytics
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Performance Metric', {
        metric: name,
        value,
        timestamp: Date.now(),
      });
    }
  }

  getMetricsSummary() {
    const summary = {};

    this.metrics.forEach((values, name) => {
      summary[name] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: this.percentile(values, 0.5),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99),
      };
    });

    return summary;
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }
}
```

## Performance Testing Script

```bash
#!/bin/bash
# performance-test.sh

echo "=== Performance Testing Suite ==="

# 1. Lighthouse Performance Test
echo "[1] Running Lighthouse..."
npx lighthouse https://mustbeviral.com \
  --output=json \
  --output-path=./performance-report.json \
  --chrome-flags="--headless"

# Extract scores
PERFORMANCE_SCORE=$(jq '.categories.performance.score' performance-report.json)
echo "Performance Score: $PERFORMANCE_SCORE"

# 2. WebPageTest
echo "[2] Running WebPageTest..."
npm install -g webpagetest
webpagetest test https://mustbeviral.com \
  --location "Dulles:Chrome" \
  --connectivity "Cable" \
  --runs 3 \
  --first \
  --reporter json > webpagetest-results.json

# 3. Bundle Size Analysis
echo "[3] Analyzing bundle size..."
npm run build
npx webpack-bundle-analyzer stats.json --mode static --report bundle-report.html

# 4. Critical CSS Generation
echo "[4] Generating critical CSS..."
npx critical https://mustbeviral.com \
  --base . \
  --inline \
  --extract \
  --width 320 \
  --height 480 \
  > critical.css

# 5. Image Optimization Check
echo "[5] Checking image optimization..."
find ./public -type f \( -name "*.jpg" -o -name "*.png" \) -exec ls -lh {} \; | \
  awk '{total += $5} END {print "Total image size: " total/1024/1024 " MB"}'

# 6. Database Query Performance
echo "[6] Testing database performance..."
psql $DATABASE_URL << EOF
-- Enable timing
\timing on

-- Test queries
EXPLAIN ANALYZE SELECT COUNT(*) FROM users;
EXPLAIN ANALYZE SELECT * FROM content ORDER BY created_at DESC LIMIT 10;
EXPLAIN ANALYZE SELECT * FROM users u JOIN content c ON u.id = c.user_id LIMIT 100;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
EOF

echo "=== Performance Testing Complete ==="
```

## Performance Checklist

### Frontend
- [ ] Code splitting implemented
- [ ] Lazy loading for routes
- [ ] Images optimized and lazy loaded
- [ ] Critical CSS inlined
- [ ] Unused CSS removed
- [ ] JavaScript minified
- [ ] Bundle size < 200KB (initial)
- [ ] Service worker caching
- [ ] Preconnect to required origins
- [ ] Resource hints (prefetch/preload)

### Backend
- [ ] Database queries optimized
- [ ] Indexes created for common queries
- [ ] Connection pooling configured
- [ ] Query results cached
- [ ] N+1 queries eliminated
- [ ] API responses compressed
- [ ] Rate limiting implemented
- [ ] Background jobs for heavy tasks

### Infrastructure
- [ ] CDN configured
- [ ] Static assets cached
- [ ] Brotli compression enabled
- [ ] HTTP/2 enabled
- [ ] Edge caching configured
- [ ] Auto-scaling configured
- [ ] Health checks implemented
- [ ] Monitoring alerts set up

---

**Remember**: Performance is a feature. Measure, optimize, and continuously monitor.