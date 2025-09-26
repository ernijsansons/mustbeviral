/**
 * High-Performance Cache Middleware
 * Intelligent HTTP caching with enterprise-grade optimizations
 */

import { Request, Response, NextFunction } from 'express'
import { enterpriseCache, CacheTier, CacheStrategy } from './enterpriseCache'
import crypto from 'crypto'

// Cache configuration per route/pattern
interface RouteCacheConfig {
  pattern: RegExp | string
  ttl: number
  strategy: CacheStrategy
  tiers: CacheTier[]
  tags?: string[]
  keyGenerator?: (req: Request) => string
  shouldCache?: (req: Request, res: Response) => boolean
  varyBy?: string[] // Headers to vary cache by
  compression?: boolean
  private?: boolean // Whether cache is user-specific
  revalidate?: number // Stale-while-revalidate time
}

// Predefined cache configurations
const CACHE_CONFIGS: RouteCacheConfig[] = [
  // Static assets - Long term caching
  {
    pattern: /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/,
    ttl: 31536000, // 1 year
    strategy: CacheStrategy.CACHE_FIRST,
    tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS, CacheTier.L3_CDN],
    compression: true,
    private: false,
    revalidate: 86400 // 1 day
  },

  // API responses - Short term caching
  {
    pattern: /^\/api\/public\//,
    ttl: 300, // 5 minutes
    strategy: CacheStrategy.CACHE_FIRST,
    tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
    tags: ['api', 'public'],
    varyBy: ['Accept-Language', 'User-Agent'],
    compression: true,
    private: false,
    revalidate: 60 // 1 minute
  },

  // User-specific API - Private caching
  {
    pattern: /^\/api\/user\//,
    ttl: 60, // 1 minute
    strategy: CacheStrategy.CACHE_ASIDE,
    tiers: [CacheTier.L1_MEMORY],
    tags: ['api', 'user'],
    private: true,
    shouldCache: (req, res) => res.statusCode === 200 && req.method === 'GET'
  },

  // Campaign data - Medium term caching
  {
    pattern: /^\/api\/campaigns/,
    ttl: 1800, // 30 minutes
    strategy: CacheStrategy.REFRESH_AHEAD,
    tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
    tags: ['api', 'campaigns'],
    compression: true,
    private: false,
    revalidate: 900 // 15 minutes
  },

  // Analytics endpoints - Aggressive caching
  {
    pattern: /^\/api\/analytics/,
    ttl: 3600, // 1 hour
    strategy: CacheStrategy.CACHE_FIRST,
    tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
    tags: ['api', 'analytics'],
    compression: true,
    private: false,
    revalidate: 1800 // 30 minutes
  },

  // Homepage and landing pages
  {
    pattern: /^\/(home|landing|about)?$/,
    ttl: 600, // 10 minutes
    strategy: CacheStrategy.CACHE_FIRST,
    tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS, CacheTier.L3_CDN],
    tags: ['pages', 'public'],
    varyBy: ['Accept-Language', 'User-Agent'],
    compression: true,
    private: false,
    revalidate: 300 // 5 minutes
  }
]

/**
 * Cache middleware class with advanced features
 */
export class CacheMiddleware {
  private hitStats: Map<string, { hits: number; misses: number; bytes: number }> = new Map()
  private refreshTasks: Map<string, Promise<any>> = new Map()

  /**
   * Express middleware for intelligent HTTP caching
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip caching for non-GET requests by default
      if (req.method !== 'GET') {
        return next()
      }

      // Find matching cache configuration
      const config = this.findCacheConfig(req.path)
      if (!config) {
        return next()
      }

      // Check if we should cache this request
      if (config.shouldCache && !config.shouldCache(req, res)) {
        return next()
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(req, config)
      
      // Try to serve from cache
      try {
        const cachedResponse = await enterpriseCache.get(cacheKey, {
          key: cacheKey,
          strategy: config.strategy,
          tiers: config.tiers,
          tags: config.tags
        })

        if (cachedResponse) {
          // Cache hit - serve cached response
          await this.serveCachedResponse(req, res, cachedResponse, config, cacheKey)
          return
        }
      } catch (error) {
        console.error('Cache retrieval error:', error)
        // Continue to next() on cache errors
      }

      // Cache miss - intercept response and cache it
      await this.interceptAndCache(req, res, next, config, cacheKey)
    }
  }

  /**
   * Cache invalidation middleware
   */
  invalidationMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Store original send method
      const originalSend = res.send

      // Override send method to handle cache invalidation
      res.send = function(body) {
        // Check if we need to invalidate cache based on the request
        if (req.method !== 'GET' && (res.statusCode >= 200 && res.statusCode < 300)) {
          // Determine what to invalidate based on the endpoint
          const tagsToInvalidate = determineCacheInvalidation(req.path, req.method)
          
          // Perform invalidation asynchronously
          Promise.all(tagsToInvalidate.map(tag => 
            enterpriseCache.invalidate(tag, { byTag: true })
          )).catch(error => {
            console.error('Cache invalidation error:', error)
          })
        }

        // Call original send
        return originalSend.call(this, body)
      }

      next()
    }
  }

  /**
   * Cache warming middleware for critical paths
   */
  warmingMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Identify critical paths that should trigger cache warming
      const criticalPaths = [
        '/api/trending-campaigns',
        '/api/popular-users',
        '/api/featured-content'
      ]

      if (criticalPaths.some(path => req.path.includes(path))) {
        // Trigger background cache warming for related data
        this.triggerBackgroundWarming(req.path).catch(error => {
          console.error('Cache warming error:', error)
        })
      }

      next()
    }
  }

  /**
   * Cache statistics endpoint
   */
  statsEndpoint() {
    return (req: Request, res: Response) => {
      const cacheStats = enterpriseCache.getStats()
      const middlewareStats = this.getMiddlewareStats()

      res.json({
        cache: cacheStats,
        middleware: middlewareStats,
        timestamp: new Date().toISOString()
      })
    }
  }

  // Private methods

  private findCacheConfig(path: string): RouteCacheConfig | null {
    return CACHE_CONFIGS.find(config => {
      if (typeof config.pattern === 'string') {
        return path === config.pattern
      }
      return config.pattern.test(path)
    }) || null
  }

  private generateCacheKey(req: Request, config: RouteCacheConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req)
    }

    let keyComponents = [req.path]

    // Add query parameters to key
    if (Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map(key => `${key}=${req.query[key]}`)
        .join('&')
      keyComponents.push(sortedQuery)
    }

    // Add vary headers to key
    if (config.varyBy) {
      const varyComponents = config.varyBy
        .map(header => `${header}:${req.get(header) || 'none'}`)
        .join('|')
      keyComponents.push(varyComponents)
    }

    // Add user identifier for private caches
    if (config.private && req.user?.id) {
      keyComponents.push(`user:${req.user.id}`)
    }

    // Create hash of components for shorter keys
    const keyString = keyComponents.join('::')
    return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 32)
  }

  private async serveCachedResponse(
    req: Request,
    res: Response,
    cachedResponse: any,
    config: RouteCacheConfig,
    cacheKey: string
  ) {
    const stats = this.hitStats.get(cacheKey) || { hits: 0, misses: 0, bytes: 0 }
    stats.hits++
    stats.bytes += Buffer.byteLength(JSON.stringify(cachedResponse))
    this.hitStats.set(cacheKey, stats)

    // Set cache headers
    res.set({
      'X-Cache': 'HIT',
      'X-Cache-Key': cacheKey,
      'Cache-Control': this.generateCacheControlHeader(config),
      'ETag': this.generateETag(cachedResponse),
      'Vary': config.varyBy ? config.varyBy.join(', ') : undefined
    })

    // Handle conditional requests
    const clientETag = req.get('If-None-Match')
    const responseETag = res.get('ETag')
    
    if (clientETag && clientETag === responseETag) {
      res.status(304).end()
      return
    }

    // Set response headers and body
    if (cachedResponse.headers) {
      res.set(cachedResponse.headers)
    }

    res.status(cachedResponse.statusCode || 200)
    
    if (config.compression && req.get('Accept-Encoding')?.includes('gzip')) {
      res.set('Content-Encoding', 'gzip')
    }

    res.send(cachedResponse.body)

    // Trigger stale-while-revalidate if needed
    if (config.revalidate && this.shouldRevalidate(cachedResponse, config.revalidate)) {
      this.triggerRevalidation(req, config, cacheKey).catch(error => {
        console.error('Revalidation error:', error)
      })
    }
  }

  private async interceptAndCache(
    req: Request,
    res: Response,
    next: NextFunction,
    config: RouteCacheConfig,
    cacheKey: string
  ) {
    const stats = this.hitStats.get(cacheKey) || { hits: 0, misses: 0, bytes: 0 }
    stats.misses++

    // Store original methods
    const originalSend = res.send
    const originalJson = res.json
    const originalStatus = res.status

    let statusCode = 200
    let responseHeaders: any = {}
    let responseBody: any = null

    // Override status method
    res.status = function(code) {
      statusCode = code
      return originalStatus.call(this, code)
    }

    // Override send method
    res.send = function(body) {
      responseBody = body
      responseHeaders = { ...res.getHeaders() }
      
      // Cache successful responses
      if (statusCode >= 200 && statusCode < 300) {
        const cachedResponse = {
          statusCode,
          headers: responseHeaders,
          body,
          timestamp: Date.now()
        }

        // Update statistics
        stats.bytes += Buffer.byteLength(JSON.stringify(cachedResponse))
        
        // Cache the response asynchronously
        enterpriseCache.set(cacheKey, cachedResponse, {
          key: cacheKey,
          ttl: config.ttl,
          strategy: config.strategy,
          tiers: config.tiers,
          tags: config.tags,
          compress: config.compression
        }).catch(error => {
          console.error('Cache storage error:', error)
        })
      }

      // Set cache headers
      res.set({
        'X-Cache': 'MISS',
        'X-Cache-Key': cacheKey,
        'Cache-Control': this.generateCacheControlHeader(config),
        'ETag': this.generateETag(body),
        'Vary': config.varyBy ? config.varyBy.join(', ') : undefined
      })

      this.hitStats.set(cacheKey, stats)
      return originalSend.call(this, body)
    }

    // Override json method
    res.json = function(obj) {
      responseBody = obj
      responseHeaders = { ...res.getHeaders() }
      
      if (statusCode >= 200 && statusCode < 300) {
        const cachedResponse = {
          statusCode,
          headers: responseHeaders,
          body: obj,
          timestamp: Date.now()
        }

        stats.bytes += Buffer.byteLength(JSON.stringify(cachedResponse))
        
        enterpriseCache.set(cacheKey, cachedResponse, {
          key: cacheKey,
          ttl: config.ttl,
          strategy: config.strategy,
          tiers: config.tiers,
          tags: config.tags,
          compress: config.compression
        }).catch(error => {
          console.error('Cache storage error:', error)
        })
      }

      res.set({
        'X-Cache': 'MISS',
        'X-Cache-Key': cacheKey,
        'Cache-Control': this.generateCacheControlHeader(config),
        'ETag': this.generateETag(obj),
        'Vary': config.varyBy ? config.varyBy.join(', ') : undefined
      })

      this.hitStats.set(cacheKey, stats)
      return originalJson.call(this, obj)
    }

    next()
  }

  private generateCacheControlHeader(config: RouteCacheConfig): string {
    const directives = []
    
    if (config.private) {
      directives.push('private')
    } else {
      directives.push('public')
    }
    
    directives.push(`max-age=${config.ttl}`)
    
    if (config.revalidate) {
      directives.push(`stale-while-revalidate=${config.revalidate}`)
    }
    
    return directives.join(', ')
  }

  private generateETag(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data)
    return crypto.createHash('md5').update(content).digest('hex')
  }

  private shouldRevalidate(cachedResponse: any, revalidateTime: number): boolean {
    const age = (Date.now() - cachedResponse.timestamp) / 1000
    return age > revalidateTime
  }

  private async triggerRevalidation(
    req: Request,
    config: RouteCacheConfig,
    cacheKey: string
  ): Promise<void> {
    // Prevent multiple revalidation tasks for the same key
    if (this.refreshTasks.has(cacheKey)) {
      return
    }

    const refreshPromise = this.performRevalidation(req, config, cacheKey)
    this.refreshTasks.set(cacheKey, refreshPromise)
    
    try {
      await refreshPromise
    } finally {
      this.refreshTasks.delete(cacheKey)
    }
  }

  private async performRevalidation(
    req: Request,
    config: RouteCacheConfig,
    cacheKey: string
  ): Promise<void> {
    // This would make a background request to refresh the cache
    // Implementation depends on your application architecture
    console.log(`Revalidating cache for key: ${cacheKey}`)
  }

  private async triggerBackgroundWarming(path: string): Promise<void> {
    // Trigger background cache warming based on the accessed path
    const warmingStrategies = [
      { pattern: '/api/campaigns', related: ['/api/trending-campaigns', '/api/featured-campaigns'] },
      { pattern: '/api/users', related: ['/api/popular-users', '/api/active-users'] },
      { pattern: '/api/analytics', related: ['/api/performance-stats', '/api/engagement-metrics'] }
    ]

    const strategy = warmingStrategies.find(s => path.includes(s.pattern))
    if (strategy) {
      // Warm related endpoints
      await Promise.all(strategy.related.map(async (relatedPath) => {
        const relatedConfig = this.findCacheConfig(relatedPath)
        if (relatedConfig) {
          // This would trigger a background request to warm the cache
          console.log(`Warming cache for related path: ${relatedPath}`)
        }
      }))
    }
  }

  private getMiddlewareStats() {
    const totalHits = Array.from(this.hitStats.values()).reduce((sum, stat) => sum + stat.hits, 0)
    const totalMisses = Array.from(this.hitStats.values()).reduce((sum, stat) => sum + stat.misses, 0)
    const totalBytes = Array.from(this.hitStats.values()).reduce((sum, stat) => sum + stat.bytes, 0)

    return {
      totalHits,
      totalMisses,
      hitRate: totalHits / (totalHits + totalMisses) || 0,
      totalBytes,
      activeKeys: this.hitStats.size,
      refreshTasks: this.refreshTasks.size
    }
  }
}

/**
 * Determine cache invalidation tags based on request path and method
 */
function determineCacheInvalidation(path: string, method: string): string[] {
  const tags: string[] = []

  if (path.includes('/api/campaigns')) {
    tags.push('campaigns', 'api')
  }
  
  if (path.includes('/api/users')) {
    tags.push('users', 'api')
  }
  
  if (path.includes('/api/analytics')) {
    tags.push('analytics', 'api')
  }

  // For POST/PUT/DELETE operations, invalidate broader caches
  if (method !== 'GET') {
    tags.push('public')
  }

  return tags
}

// Export singleton instance
export const cacheMiddleware = new CacheMiddleware()
export default cacheMiddleware