/**
 * API Cache Optimizer
 * Intelligent caching for API endpoints with performance optimizations
 * Supports GraphQL, REST, and WebSocket caching strategies
 */

import { Request, Response } from 'express'
import { enterpriseCache, CacheTier, CacheStrategy } from './enterpriseCache'
import { cdnService } from './cdnService'
import crypto from 'crypto'

export interface ApiCacheRule {
  endpoint: RegExp | string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'
  strategy: CacheStrategy
  ttl: number
  tiers: CacheTier[]
  tags: string[]
  keyGenerator?: (req: Request) => string
  shouldCache?: (req: Request, res: Response) => boolean
  transform?: (data: any) => any
  compress: boolean
  private: boolean
  maxAge?: number
  staleWhileRevalidate?: number
  varyBy?: string[]
  rateLimit?: {
    windowMs: number
    maxRequests: number
    skipSuccessfulRequests?: boolean
  }
}

export interface CacheMetadata {
  key: string
  hit: boolean
  tier?: CacheTier
  size: number
  age: number
  ttl: number
  tags: string[]
  generatedAt: number
}

export interface ApiCacheStats {
  totalRequests: number
  cachedRequests: number
  hitRate: number
  averageResponseTime: number
  cacheSize: number
  bandwidth: {
    saved: number
    total: number
    savingPercentage: number
  }
  topEndpoints: Array<{
    endpoint: string
    requests: number
    hitRate: number
    avgResponseTime: number
  }>
}

/**
 * Advanced API Cache Optimizer
 */
export class ApiCacheOptimizer {
  private rules: ApiCacheRule[] = []
  private stats: Map<string, { requests: number; hits: number; misses: number; totalTime: number; totalSize: number }> = new Map()
  private rateLimiters: Map<string, { requests: number; resetTime: number }> = new Map()
  private compressionThreshold = 1024 // 1KB
  
  constructor() {
    this.initializeDefaultRules()
  }

  /**
   * Add or update cache rule for specific API endpoint
   */
  addRule(rule: ApiCacheRule): void {
    // Remove existing rule for same endpoint
    this.rules = this.rules.filter(r => 
      (typeof r.endpoint === 'string' && typeof rule.endpoint === 'string' && r.endpoint !== rule.endpoint) ||
      (r.endpoint instanceof RegExp && rule.endpoint instanceof RegExp && r.endpoint.source !== rule.endpoint.source)
    )
    
    this.rules.push(rule)
    this.rules.sort((a, b) => this.getRulePriority(b) - this.getRulePriority(a))
  }

  /**
   * Main caching middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: Function) => {
      const startTime = Date.now()
      const rule = this.findMatchingRule(req)
      
      if (!rule || req.method !== 'GET') {
        return next()
      }

      // Check rate limiting
      if (rule.rateLimit && !this.checkRateLimit(req, rule.rateLimit)) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: this.getRetryAfter(req, rule.rateLimit)
        })
      }

      const cacheKey = this.generateCacheKey(req, rule)
      const endpointStats = this.getEndpointStats(req.path)

      try {
        // Try to get from cache
        const cachedResponse = await enterpriseCache.get(cacheKey, {
          key: cacheKey,
          strategy: rule.strategy,
          tiers: rule.tiers,
          tags: rule.tags
        })

        if (cachedResponse && this.isCacheValid(cachedResponse, rule)) {
          // Cache hit
          await this.serveCachedResponse(req, res, cachedResponse, rule, cacheKey, startTime)
          endpointStats.hits++
          endpointStats.requests++
          return
        }

        // Cache miss - intercept response
        await this.interceptResponse(req, res, next, rule, cacheKey, startTime, endpointStats)
        
      } catch (error) {
        console.error('Cache error:', error)
        endpointStats.requests++
        next()
      }
    }
  }

  /**
   * Cache invalidation middleware
   */
  invalidationMiddleware() {
    return async (req: Request, res: Response, next: Function) => {
      const originalSend = res.send
      const originalJson = res.json

      // Override response methods
      res.send = function(body) {
        handleCacheInvalidation(req, res, body)
        return originalSend.call(this, body)
      }

      res.json = function(obj) {
        handleCacheInvalidation(req, res, obj)
        return originalJson.call(this, obj)
      }

      async function handleCacheInvalidation(request: Request, response: Response, responseBody: any) {
        // Only invalidate on successful mutations
        if (request.method !== 'GET' && response.statusCode >= 200 && response.statusCode < 300) {
          const tagsToInvalidate = determineTags(request.path, request.method, responseBody)
          
          await Promise.all([
            // Invalidate cache tags
            ...tagsToInvalidate.map(tag => 
              enterpriseCache.invalidate(tag, { byTag: true })
            ),
            // Purge from CDN if applicable
            cdnService.purge({ tags: tagsToInvalidate })
          ]).catch(error => {
            console.error('Cache invalidation failed:', error)
          })
        }
      }

      next()
    }
  }

  /**
   * GraphQL caching middleware
   */
  graphqlMiddleware() {
    return async (req: Request, res: Response, next: Function) => {
      if (req.path !== '/graphql' || req.method !== 'POST') {
        return next()
      }

      const { query, variables, operationName } = req.body

      // Only cache queries, not mutations
      if (!query || query.trim().startsWith('mutation')) {
        return next()
      }

      const cacheKey = this.generateGraphQLCacheKey(query, variables, operationName)
      const ttl = this.getGraphQLTTL(query)

      try {
        // Try cache first
        const cachedResult = await enterpriseCache.get(cacheKey, {
          key: cacheKey,
          ttl,
          tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
          tags: ['graphql', 'api']
        })

        if (cachedResult) {
          return res.json({
            data: cachedResult,
            extensions: {
              cacheHit: true,
              cacheKey: cacheKey.substring(0, 16) + '...'
            }
          })
        }

        // Intercept response for caching
        const originalJson = res.json
        res.json = function(obj) {
          // Cache successful GraphQL responses
          if (obj.data && !obj.errors) {
            enterpriseCache.set(cacheKey, obj.data, {
              key: cacheKey,
              ttl,
              tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
              tags: ['graphql', 'api']
            }).catch(error => {
              console.error('GraphQL cache storage failed:', error)
            })
          }

          obj.extensions = {
            ...obj.extensions,
            cacheHit: false
          }

          return originalJson.call(this, obj)
        }

        next()
        
      } catch (error) {
        console.error('GraphQL cache error:', error)
        next()
      }
    }
  }

  /**
   * WebSocket message caching
   */
  websocketCaching(socket: any, message: any) {
    // Cache frequently requested WebSocket data
    const messageType = message.type
    const cacheableTypes = ['user_data', 'campaign_stats', 'notifications']
    
    if (cacheableTypes.includes(messageType)) {
      const cacheKey = `ws:${messageType}:${message.userId || 'global'}`
      
      // Try cache first
      enterpriseCache.get(cacheKey).then(cachedData => {
        if (cachedData) {
          socket.emit('response', {
            ...message,
            data: cachedData,
            cached: true
          })
        } else {
          // Handle cache miss - would typically trigger data fetch
          this.handleWebSocketCacheMiss(socket, message, cacheKey)
        }
      }).catch(error => {
        console.error('WebSocket cache error:', error)
        this.handleWebSocketCacheMiss(socket, message, cacheKey)
      })
    }
  }

  /**
   * Get API cache statistics
   */
  getStats(): ApiCacheStats {
    let totalRequests = 0
    let totalHits = 0
    let totalTime = 0
    let totalSize = 0

    const topEndpoints = Array.from(this.stats.entries())
      .map(([endpoint, stats]) => {
        totalRequests += stats.requests
        totalHits += stats.hits
        totalTime += stats.totalTime
        totalSize += stats.totalSize

        return {
          endpoint,
          requests: stats.requests,
          hitRate: stats.requests > 0 ? stats.hits / stats.requests : 0,
          avgResponseTime: stats.requests > 0 ? stats.totalTime / stats.requests : 0
        }
      })
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)

    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0
    const avgResponseTime = totalRequests > 0 ? totalTime / totalRequests : 0

    return {
      totalRequests,
      cachedRequests: totalHits,
      hitRate,
      averageResponseTime: avgResponseTime,
      cacheSize: totalSize,
      bandwidth: {
        saved: totalSize * hitRate,
        total: totalSize,
        savingPercentage: hitRate * 100
      },
      topEndpoints
    }
  }

  /**
   * Warm up cache for critical endpoints
   */
  async warmup(): Promise<void> {
    const criticalEndpoints = [
      { path: '/api/trending-campaigns', method: 'GET' },
      { path: '/api/popular-users', method: 'GET' },
      { path: '/api/featured-content', method: 'GET' },
      { path: '/api/marketplace/featured', method: 'GET' },
      { path: '/api/analytics/overview', method: 'GET' }
    ]

    await Promise.allSettled(
      criticalEndpoints.map(async endpoint => {
        try {
          // Simulate requests to warm cache
          const mockReq = { path: endpoint.path, method: endpoint.method, query: {}, headers: {} } as Request
          const rule = this.findMatchingRule(mockReq)
          
          if (rule) {
            const cacheKey = this.generateCacheKey(mockReq, rule)
            console.log(`Warming cache for ${endpoint.path} with key ${cacheKey}`)
            
            // This would typically make an actual request to populate cache
            // For now, we'll just log the intention
          }
        } catch (error) {
          console.error(`Failed to warm cache for ${endpoint.path}:`, error)
        }
      })
    )
  }

  // Private methods

  private initializeDefaultRules(): void {
    const defaultRules: ApiCacheRule[] = [
      {
        endpoint: /^\/api\/public\//,
        method: 'GET',
        strategy: CacheStrategy.CACHE_FIRST,
        ttl: 300, // 5 minutes
        tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
        tags: ['api', 'public'],
        compress: true,
        private: false,
        maxAge: 300,
        staleWhileRevalidate: 60,
        varyBy: ['Accept-Language']
      },
      {
        endpoint: /^\/api\/campaigns/,
        method: 'GET',
        strategy: CacheStrategy.CACHE_FIRST,
        ttl: 1800, // 30 minutes
        tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
        tags: ['api', 'campaigns'],
        compress: true,
        private: false,
        maxAge: 1800,
        staleWhileRevalidate: 300
      },
      {
        endpoint: /^\/api\/users\/[^\/]+$/,
        method: 'GET',
        strategy: CacheStrategy.CACHE_ASIDE,
        ttl: 600, // 10 minutes
        tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
        tags: ['api', 'users'],
        compress: true,
        private: false,
        shouldCache: (req, res) => res.statusCode === 200
      },
      {
        endpoint: /^\/api\/analytics/,
        method: 'GET',
        strategy: CacheStrategy.CACHE_FIRST,
        ttl: 3600, // 1 hour
        tiers: [CacheTier.L1_MEMORY, CacheTier.L2_REDIS],
        tags: ['api', 'analytics'],
        compress: true,
        private: false,
        maxAge: 3600,
        staleWhileRevalidate: 1800,
        rateLimit: {
          windowMs: 60000, // 1 minute
          maxRequests: 100
        }
      }
    ]

    defaultRules.forEach(rule => this.addRule(rule))
  }

  private findMatchingRule(req: Request): ApiCacheRule | null {
    return this.rules.find(rule => {
      const methodMatches = rule.method === 'ALL' || rule.method === req.method
      const pathMatches = typeof rule.endpoint === 'string' 
        ? rule.endpoint === req.path
        : rule.endpoint.test(req.path)
      
      return methodMatches && pathMatches
    }) || null
  }

  private getRulePriority(rule: ApiCacheRule): number {
    // More specific rules get higher priority
    if (typeof rule.endpoint === 'string') return 100
    
    const source = rule.endpoint.source
    const specificity = source.split('\\').length + source.split('/').length
    return specificity
  }

  private generateCacheKey(req: Request, rule: ApiCacheRule): string {
    if (rule.keyGenerator) {
      return rule.keyGenerator(req)
    }

    const components = [
      req.path,
      req.method
    ]

    // Add query parameters
    if (Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map(key => `${key}=${req.query[key]}`)
        .join('&')
      components.push(sortedQuery)
    }

    // Add vary headers
    if (rule.varyBy) {
      const varyComponents = rule.varyBy
        .map(header => `${header}:${req.get(header) || 'none'}`)
        .join('|')
      components.push(varyComponents)
    }

    // Add user context for private caches
    if (rule.private && (req as any).user?.id) {
      components.push(`user:${(req as any).user.id}`)
    }

    const keyString = components.join('::')
    return crypto.createHash('sha256').update(keyString).digest('hex')
  }

  private generateGraphQLCacheKey(query: string, variables: any, operationName?: string): string {
    const components = [
      query.replace(/\s+/g, ' ').trim(),
      JSON.stringify(variables || {}),
      operationName || ''
    ]
    
    const keyString = components.join('::')
    return crypto.createHash('sha256').update(keyString).digest('hex')
  }

  private getGraphQLTTL(query: string): number {
    // Different TTL based on query type
    if (query.includes('user')) return 300 // 5 minutes
    if (query.includes('campaign')) return 1800 // 30 minutes
    if (query.includes('analytics')) return 3600 // 1 hour
    return 600 // 10 minutes default
  }

  private checkRateLimit(req: Request, rateLimit: NonNullable<ApiCacheRule['rateLimit']>): boolean {
    const key = `${req.ip}:${req.path}`
    const now = Date.now()
    const limiter = this.rateLimiters.get(key)

    if (!limiter || now >= limiter.resetTime) {
      this.rateLimiters.set(key, {
        requests: 1,
        resetTime: now + rateLimit.windowMs
      })
      return true
    }

    if (limiter.requests >= rateLimit.maxRequests) {
      return false
    }

    limiter.requests++
    return true
  }

  private getRetryAfter(req: Request, rateLimit: NonNullable<ApiCacheRule['rateLimit']>): number {
    const key = `${req.ip}:${req.path}`
    const limiter = this.rateLimiters.get(key)
    
    if (limiter) {
      return Math.ceil((limiter.resetTime - Date.now()) / 1000)
    }
    
    return Math.ceil(rateLimit.windowMs / 1000)
  }

  private isCacheValid(cachedResponse: any, rule: ApiCacheRule): boolean {
    if (!cachedResponse || !cachedResponse.timestamp) return false
    
    const age = Date.now() - cachedResponse.timestamp
    const maxAge = (rule.maxAge || rule.ttl) * 1000
    
    return age < maxAge
  }

  private async serveCachedResponse(
    req: Request,
    res: Response,
    cachedResponse: any,
    rule: ApiCacheRule,
    cacheKey: string,
    startTime: number
  ): Promise<void> {
    const responseTime = Date.now() - startTime
    
    // Set cache headers
    const age = Math.floor((Date.now() - cachedResponse.timestamp) / 1000)
    const maxAge = rule.maxAge || rule.ttl
    
    res.set({
      'Cache-Control': `max-age=${maxAge}${rule.staleWhileRevalidate ? `, stale-while-revalidate=${rule.staleWhileRevalidate}` : ''}`,
      'Age': age.toString(),
      'X-Cache': 'HIT',
      'X-Cache-Key': cacheKey.substring(0, 16) + '...',
      'X-Response-Time': `${responseTime}ms`,
      'ETag': this.generateETag(cachedResponse.data),
      'Vary': rule.varyBy?.join(', ')
    })

    // Handle conditional requests
    const clientETag = req.get('If-None-Match')
    if (clientETag && clientETag === res.get('ETag')) {
      return res.status(304).end()
    }

    res.json(cachedResponse.data)
  }

  private async interceptResponse(
    req: Request,
    res: Response,
    next: Function,
    rule: ApiCacheRule,
    cacheKey: string,
    startTime: number,
    stats: any
  ): Promise<void> {
    const originalJson = res.json
    const originalSend = res.send

    res.json = function(obj) {
      handleResponse(obj, 'json')
      return originalJson.call(this, obj)
    }

    res.send = function(body) {
      handleResponse(body, 'send')
      return originalSend.call(this, body)
    }

    function handleResponse(data: any, method: string) {
      const responseTime = Date.now() - startTime
      stats.requests++
      stats.misses++
      stats.totalTime += responseTime

      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (!rule.shouldCache || rule.shouldCache(req, res)) {
          const responseData = {
            data,
            timestamp: Date.now(),
            method,
            statusCode: res.statusCode
          }

          const size = Buffer.byteLength(JSON.stringify(responseData))
          stats.totalSize += size

          // Store in cache
          enterpriseCache.set(cacheKey, responseData, {
            key: cacheKey,
            ttl: rule.ttl,
            strategy: rule.strategy,
            tiers: rule.tiers,
            tags: rule.tags,
            compress: rule.compress && size > 1024
          }).catch(error => {
            console.error('Failed to cache response:', error)
          })
        }
      }

      // Set cache headers
      res.set({
        'X-Cache': 'MISS',
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': rule.private ? 'private' : 'public'
      })
    }

    next()
  }

  private handleWebSocketCacheMiss(socket: any, message: any, cacheKey: string): void {
    // This would typically trigger data loading and caching
    console.log(`WebSocket cache miss for key: ${cacheKey}`)
  }

  private getEndpointStats(path: string) {
    if (!this.stats.has(path)) {
      this.stats.set(path, {
        requests: 0,
        hits: 0,
        misses: 0,
        totalTime: 0,
        totalSize: 0
      })
    }
    return this.stats.get(path)!
  }

  private generateETag(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data)
    return crypto.createHash('md5').update(content).digest('hex')
  }
}

function determineTags(path: string, method: string, responseBody: any): string[] {
  const tags: string[] = []

  // API-specific tags
  if (path.includes('/campaigns')) tags.push('campaigns')
  if (path.includes('/users')) tags.push('users')
  if (path.includes('/analytics')) tags.push('analytics')
  if (path.includes('/marketplace')) tags.push('marketplace')

  // Method-based invalidation
  if (method !== 'GET') {
    tags.push('api', 'public')
  }

  return tags
}

// Export singleton instance
export const apiCacheOptimizer = new ApiCacheOptimizer()
export default apiCacheOptimizer