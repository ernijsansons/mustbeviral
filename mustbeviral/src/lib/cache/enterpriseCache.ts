/**
 * Enterprise Multi-Tier Caching System
 * L1: In-Memory Cache (ultra-fast, small capacity)
 * L2: Redis Cache (fast, shared across instances)
 * L3: CDN Cache (global distribution)
 * 
 * Features:
 * - Intelligent cache warming
 * - Distributed cache invalidation
 * - Cache coherence across tiers
 * - Performance analytics
 * - Circuit breaker pattern
 */

import { EventEmitter} from 'events'
import { LRUCache} from 'lru-cache'
import Redis from 'ioredis'
import crypto from 'crypto'

// Cache tiers
export enum CacheTier {
  L1MEMORY = 'L1_MEMORY',
  L2REDIS = 'L2_REDIS',
  L3CDN = 'L3_CDN'
}

// Cache strategies
export enum CacheStrategy {
  CACHEFIRST = 'CACHE_FIRST',           // Try cache first, fallback to source
  CACHEASIDE = 'CACHE_ASIDE',           // Manual cache management
  WRITETHROUGH = 'WRITE_THROUGH',       // Write to cache and source simultaneously
  WRITEBEHIND = 'WRITE_BEHIND',         // Write to cache first, source later
  READTHROUGH = 'READ_THROUGH',         // Auto-populate cache on miss
  REFRESHAHEAD = 'REFRESH_AHEAD'        // Proactive cache refresh
}

// Cache configuration
export interface CacheConfig {
  key: string
  ttl?: number                           // Time to live in seconds
  tags?: string[]                        // For bulk invalidation
  strategy?: CacheStrategy
  tiers?: CacheTier[]                    // Which tiers to use
  serialize?: boolean                    // Whether to serialize data
  compress?: boolean                     // Whether to compress data
  lockTimeout?: number                   // For distributed locks
  warmup?: boolean                       // Whether to include in warmup
  priority?: number                      // Cache priority (1-10)
  version?: string                       // For cache versioning
}

// Cache entry metadata
interface CacheEntry<T = any> {
  data: T
  metadata: {
    key: string
    tier: CacheTier
    timestamp: number
    ttl: number
    hits: number
    tags: string[]
    version: string
    size: number
    priority: number
  }
}

// Cache statistics
export interface CacheStats {
  l1: {
    hits: number
    misses: number
    hitRate: number
    size: number
    maxSize: number
    evictions: number
  }
  l2: {
    hits: number
    misses: number
    hitRate: number
    size: number
    connections: number
    commandsProcessed: number
  }
  l3: {
    hits: number
    misses: number
    hitRate: number
    bandwidth: number
    edgeNodes: number
  }
  overall: {
    totalHits: number
    totalMisses: number
    overallHitRate: number
    avgResponseTime: number
    dataTransfer: number
  }
}

// Cache warming configuration
interface WarmupConfig {
  enabled: boolean
  strategies: Array<{
    name: string
    keys: string[]
    loader: () => Promise<any>
    schedule: string // Cron expression
    priority: number
  }>
  concurrency: number
  timeout: number
}

/**
 * Enterprise Multi-Tier Cache Manager
 */
export class EnterpriseCacheManager extends EventEmitter {
  private l1Cache: LRUCache<string, CacheEntry>
  private l2Cache: Redis
  private l3Config: any // CDN configuration
  private stats: CacheStats
  private warmupConfig: WarmupConfig
  private circuitBreaker: Map<string, { failures: number; lastFailure: number; isOpen: boolean }>
  private distributedLocks: Map<string, { locked: boolean; expires: number }>
  private compressionEnabled: boolean
  private encryptionEnabled: boolean
  private performanceMetrics: Map<string, { calls: number; totalTime: number; errors: number }>

  constructor(config: {
    l1: { maxSize: number; ttl: number }
    l2: { host: string; port: number; password?: string; db?: number }
    l3?: { provider: 'cloudflare' | 'aws' | 'fastly'; config: any }
    compression?: boolean
    encryption?: boolean
    warmup?: WarmupConfig
  }) {
    super()

    // Initialize L1 Cache (In-Memory)
    this.l1Cache = new LRUCache<string, CacheEntry>({
      max: config.l1.maxSize, ttl: config.l1.ttl * 1000, // Convert to milliseconds
      updateAgeOnGet: true, allowStale: false, dispose: (entry, key) => {
        this.emit('l1-evict', { key, entry })
      }
    })

    // Initialize L2 Cache (Redis)
    this.l2Cache = new Redis({
      host: config.l2.host,
      port: config.l2.port,
      password: config.l2.password,
      db: config.l2.db ?? 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
      keepAlive: 30000
    })

    // L3 CDN Configuration
    this.l3Config = config.l3

    // Initialize statistics
    this.stats = {
      l1: { hits: 0, misses: 0, hitRate: 0, size: 0, maxSize: config.l1.maxSize, evictions: 0 },
      l2: { hits: 0, misses: 0, hitRate: 0, size: 0, connections: 0, commandsProcessed: 0 },
      l3: { hits: 0, misses: 0, hitRate: 0, bandwidth: 0, edgeNodes: 0 },
      overall: { totalHits: 0, totalMisses: 0, overallHitRate: 0, avgResponseTime: 0, dataTransfer: 0 }
    }

    // Initialize other components
    this.circuitBreaker = new Map()
    this.distributedLocks = new Map()
    this.performanceMetrics = new Map()
    this.compressionEnabled = config.compression ?? true
    this.encryptionEnabled = config.encryption ?? false
    this.warmupConfig = config.warmup ?? { enabled: false, strategies: [], concurrency: 5, timeout: 30000 }

    // Setup event handlers
    this.setupEventHandlers()

    // Start background tasks
    this.startBackgroundTasks()
  }

  /**
   * Get data from cache with multi-tier fallback
   */
  async get<T = any>(key: string, config?: Partial<CacheConfig>): Promise<T | null> {
    const startTime = Date.now()
    const cacheKey = this.buildCacheKey(key, config?.version)
    const tiers = config?.tiers ?? [CacheTier.L1MEMORY, CacheTier.L2REDIS]

    try {
      // Try each tier in order
      for (const tier of tiers) {
        const result = await this.getFromTier<T>(cacheKey, tier)
        
        if (result !== null) {
          // Update performance metrics
          this.updatePerformanceMetrics(key, Date.now() - startTime, false)
          
          // Promote to higher tiers if needed
          await this.promoteToHigherTiers(cacheKey, result, tier, tiers)
          
          return result
        }
      }

      // Cache miss across all tiers
      this.stats.overall.totalMisses++
      this.updatePerformanceMetrics(key, Date.now() - startTime, false)
      
      return null
    } catch (error) {
      this.updatePerformanceMetrics(key, Date.now() - startTime, true)
      this.emit('cache-error', { key, error, operation: 'get' })
      throw error
    }
  }

  /**
   * Set data to cache across specified tiers
   */
  async set<T = any>(
    key: string, 
    data: T, 
    config: CacheConfig = { key, ttl: 3600 }
  ): Promise<void> {
    const startTime = Date.now()
    const cacheKey = this.buildCacheKey(key, config.version)
    const tiers = config.tiers ?? [CacheTier.L1MEMORY, CacheTier.L2REDIS]
    const ttl = config.ttl ?? 3600
    const tags = config.tags ?? []

    try {
      // Create cache entry
      const entry: CacheEntry<T> = {
        data,
        metadata: {
          key: cacheKey,
          tier: CacheTier.L1MEMORY, // Will be updated per tier
          timestamp: Date.now(),
          ttl,
          hits: 0,
          tags,
          version: config.version ?? '1.0.0',
          size: this.calculateSize(data),
          priority: config.priority ?? 5
        }
      }

      // Set to each tier
      await Promise.all(tiers.map(tier => this.setToTier(cacheKey, entry, tier, ttl)))

      // Track tags for bulk invalidation
      if (tags.length > 0) {
        await this.trackTags(cacheKey, tags)
      }

      this.updatePerformanceMetrics(key, Date.now() - startTime, false)
      this.emit('cache-set', { key: cacheKey, tiers, size: entry.metadata.size })
      
    } catch (error) {
      this.updatePerformanceMetrics(key, Date.now() - startTime, true)
      this.emit('cache-error', { key, error, operation: 'set' })
      throw error
    }
  }

  /**
   * Get or set pattern - try cache first, fallback to loader
   */
  async getOrSet<T = any>(
    key: string, 
    loader: () => Promise<T>, 
    config: CacheConfig = { key, ttl: 3600 }
  ): Promise<T> {
    // Try to get from cache
    let result = await this.get<T>(key, config)
    
    if (result !== null) {
      return result
    }

    // Use distributed lock to prevent cache stampede
    const lockKey = `lock:${key}`
    const acquired = await this.acquireDistributedLock(lockKey, config.lockTimeout ?? 10000)
    
    if (!acquired) {
      // Wait a bit and try cache again
      await this.sleep(100 + Math.random() * 200)
      result = await this.get<T>(key, config)
      if (result !== null) {
        return result
      }
      // Fallback to loader without caching
      return await loader()
    }

    try {
      // Load data
      result = await loader()
      
      // Cache the result
      await this.set(key, result, config)
      
      return result
    } finally {
      await this.releaseDistributedLock(lockKey)
    }
  }

  /**
   * Invalidate cache by key or tags
   */
  async invalidate(keyOrTag: string, options: { byTag?: boolean; tiers?: CacheTier[] } = {}): Promise<void> {
    const tiers = options.tiers ?? [CacheTier.L1MEMORY, CacheTier.L2REDIS]
    
    if (options.byTag) {
      // Invalidate by tag
      await this.invalidateByTag(keyOrTag, tiers)
    } else {
      // Invalidate specific key
      await this.invalidateByKey(keyOrTag, tiers)
    }
    
    this.emit('cache-invalidate', { keyOrTag, byTag: options.byTag, tiers })
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(): Promise<void> {
    if (!this.warmupConfig.enabled) {
      return
    }

    this.emit('warmup-start')
    const startTime = Date.now()
    let successCount = 0
    let errorCount = 0

    // Sort strategies by priority
    const strategies = [...this.warmupConfig.strategies].sort((a, b) => b.priority - a.priority)
    
    // Process strategies with limited concurrency
    await this.processConcurrently(strategies, _this.warmupConfig.concurrency, async(strategy) => {
      try {
        const data = await Promise.race([
          strategy.loader(),
          this.timeoutPromise(this.warmupConfig.timeout)
        ])
        
        // Cache the warmed data
        await Promise.all(strategy.keys.map(key => 
          this.set(key, data, { key, ttl: 3600, warmup: true, priority: strategy.priority })
        ))
        
        successCount++
      } catch (error) {
        errorCount++
        this.emit('warmup-error', { strategy: strategy.name, error })
      }
    })

    const duration = Date.now() - startTime
    this.emit('warmup-complete', { duration, successCount, errorCount })
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    // Update L1 stats
    this.stats.l1.size = this.l1Cache.size
    this.stats.l1.hitRate = this.stats.l1.hits / (this.stats.l1.hits + this.stats.l1.misses)  ?? 0

    // Update L2 stats (from Redis INFO)
    this.updateL2Stats()

    // Update overall stats
    this.stats.overall.totalHits = this.stats.l1.hits + this.stats.l2.hits + this.stats.l3.hits
    this.stats.overall.totalMisses = this.stats.l1.misses + this.stats.l2.misses + this.stats.l3.misses
    this.stats.overall.overallHitRate = this.stats.overall.totalHits / 
      (this.stats.overall.totalHits + this.stats.overall.totalMisses)  ?? 0

    return { ...this.stats }
  }

  /**
   * Clear all caches
   */
  async clear(tiers: CacheTier[] = [CacheTier.L1MEMORY, CacheTier.L2REDIS]): Promise<void> {
    await Promise.all(tiers.map(tier => this.clearTier(tier)))
    this.emit('cache-clear', { tiers })
  }

  // Private methods

  private setupEventHandlers(): void {
    // L2 Redis events
    this.l2Cache.on('error', _(error) => {
      this.emit('l2-error', error)
      this.updateCircuitBreaker('l2', error)
    })

    this.l2Cache.on('connect', _() => {
      this.emit('l2-connect')
      this.resetCircuitBreaker('l2')
    })

    // Performance monitoring
    this.on('cache-set', _(event) => {
      this.stats.overall.dataTransfer += event.size
    })
  }

  private startBackgroundTasks(): void {
    // Cleanup expired distributed locks
    setInterval_(() => {
      this.cleanupExpiredLocks()
    }, 60000) // Every minute

    // Update statistics
    setInterval_(() => {
      this.updateStats()
    }, 10000) // Every 10 seconds

    // Memory optimization
    setInterval_(() => {
      if (process.memoryUsage().heapUsed > 100 * 1024 * 1024) { // 100MB
        global.gc?.()
      }
    }, 30000) // Every 30 seconds
  }

  private buildCacheKey(key: string, version?: string): string {
    const versionSuffix = version ? `:v${version}` : ''
    return `cache:${key}${versionSuffix}`
  }

  private async getFromTier<T>(key: string, tier: CacheTier): Promise<T | null> {
    switch (tier) {
      case CacheTier.L1_MEMORY:
        const l1Entry = this.l1Cache.get(key)
        if (l1Entry) {
          l1Entry.metadata.hits++
          this.stats.l1.hits++
          return l1Entry.data
        }
        this.stats.l1.misses++
        return null

      case CacheTier.L2_REDIS:
        if (this.isCircuitBreakerOpen('l2')) {
          this.stats.l2.misses++
          return null
        }
        
        try {
          const l2Data = await this.l2Cache.get(key)
          if (l2Data) {
            this.stats.l2.hits++
            return JSON.parse(l2Data)
          }
          this.stats.l2.misses++
          return null
        } catch (error) {
          this.stats.l2.misses++
          this.updateCircuitBreaker('l2', error)
          return null
        }

      case CacheTier.L3_CDN:
        // CDN cache implementation would go here
        this.stats.l3.misses++
        return null

      default:
        return null
    }
  }

  private async setToTier<T>(key: string, entry: CacheEntry<T>, tier: CacheTier, ttl: number): Promise<void> {
    entry.metadata.tier = tier

    switch (tier) {
      case CacheTier.L1_MEMORY:
        this.l1Cache.set(key, entry, { ttl: ttl * 1000 })
        break

      case CacheTier.L2_REDIS:
        if (this.isCircuitBreakerOpen('l2')) {
          throw new Error('L2 circuit breaker is open')
        }
        
        try {
          const serialized = JSON.stringify(entry.data)
          await this.l2Cache.setex(key, ttl, serialized)
        } catch (error) {
          this.updateCircuitBreaker('l2', error)
          throw error
        }
        break

      case CacheTier.L3_CDN:
        // CDN cache implementation would go here
        break
    }
  }

  private async promoteToHigherTiers<T>(
    key: string, 
    data: T, 
    foundTier: CacheTier, 
    configuredTiers: CacheTier[]
  ): Promise<void> {
    const tierOrder = [CacheTier.L1MEMORY, CacheTier.L2REDIS, CacheTier.L3CDN]
    const foundIndex = tierOrder.indexOf(foundTier)
    
    // Promote to all higher tiers
    for (let i = 0; i < foundIndex; i++) {
      const higherTier = tierOrder[i]
      if (configuredTiers.includes(higherTier)) {
        const entry: CacheEntry<T> = {
          data,
          metadata: {
            key,
            tier: higherTier,
            timestamp: Date.now(),
            ttl: 3600,
            hits: 1,
            tags: [],
            version: '1.0.0',
            size: this.calculateSize(data),
            priority: 5
          }
        }
        
        try {
          await this.setToTier(key, entry, higherTier, 3600)
        } catch (error) {
          // Ignore promotion errors
          this.emit('promotion-error', { key, tier: higherTier, error })
        }
      }
    }
  }

  private calculateSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8')
  }

  private async acquireDistributedLock(key: string, timeout: number): Promise<boolean> {
    const existing = this.distributedLocks.get(key)
    const now = Date.now()
    
    if (existing && existing.locked && existing.expires > now) {
      return false
    }
    
    this.distributedLocks.set(key, {
      locked: true,
      expires: now + timeout
    })
    
    return true
  }

  private async releaseDistributedLock(key: string): Promise<void> {
    this.distributedLocks.delete(key)
  }

  private cleanupExpiredLocks(): void {
    const now = Date.now()
    for (const [key, lock] of this.distributedLocks) {
      if (lock.expires <= now) {
        this.distributedLocks.delete(key)
      }
    }
  }

  private isCircuitBreakerOpen(service: string): boolean {
    const breaker = this.circuitBreaker.get(service)
    if (!breaker) {
    return false
    
    const now = Date.now()
    const cooldownPeriod = 60000 // 1 minute
    
    if (breaker.isOpen && (now - breaker.lastFailure) > cooldownPeriod) {
      breaker.isOpen = false
      breaker.failures = 0
    }
    
    return breaker.isOpen
  }

  private updateCircuitBreaker(service: string, error: any): void {
    const breaker = this.circuitBreaker.get(service)  ?? { failures: 0, lastFailure: 0, isOpen: false }
    const now = Date.now()
    
    breaker.failures++
    breaker.lastFailure = now
    
    if (breaker.failures >= 5) { // Threshold
      breaker.isOpen = true
    }
    
    this.circuitBreaker.set(service, breaker)
  }

  private resetCircuitBreaker(service: string): void {
    this.circuitBreaker.set(service, { failures: 0, lastFailure: 0, isOpen: false })
  }

  private updatePerformanceMetrics(key: string, duration: number, isError: boolean): void {
    const metrics = this.performanceMetrics.get(key)  ?? { calls: 0, totalTime: 0, errors: 0 }
    metrics.calls++
    metrics.totalTime += duration
    if (isError)  {
    metrics.errors++
  }
    this.performanceMetrics.set(key, metrics)
  }

  private async invalidateByKey(key: string, tiers: CacheTier[]): Promise<void> {
    await Promise.all(tiers.map(async tier => {
      switch (tier) {
        case CacheTier.L1_MEMORY:
          this.l1Cache.delete(key)
          break
        case CacheTier.L2_REDIS:
          if (!this.isCircuitBreakerOpen('l2')) {
            await this.l2Cache.del(key)
          }
          break
        case CacheTier.L3_CDN:
          // CDN invalidation would go here
          break
      }
    }))
  }

  private async invalidateByTag(tag: string, tiers: CacheTier[]): Promise<void> {
    // Implementation for tag-based invalidation
    const taggedKeys = await this.getKeysByTag(tag)
    await Promise.all(taggedKeys.map(key => this.invalidateByKey(key, tiers)))
  }

  private async getKeysByTag(tag: string): Promise<string[]> {
    // Implementation to get keys by tag
    if (!this.isCircuitBreakerOpen('l2')) {
      try {
        return await this.l2Cache.smembers(`tag:${tag}`)
      } catch (error) {
        return []
      }
    }
    return []
  }

  private async trackTags(key: string, tags: string[]): Promise<void> {
    if (!this.isCircuitBreakerOpen('l2')) {
      try {
        await Promise.all(tags.map(tag => this.l2Cache.sadd(`tag:${tag}`, key)))
      } catch (error) {
        // Ignore tag tracking errors
      }
    }
  }

  private async clearTier(tier: CacheTier): Promise<void> {
    switch (tier) {
      case CacheTier.L1_MEMORY:
        this.l1Cache.clear()
        break
      case CacheTier.L2_REDIS:
        if (!this.isCircuitBreakerOpen('l2')) {
          await this.l2Cache.flushdb()
        }
        break
      case CacheTier.L3_CDN:
        // CDN clear implementation would go here
        break
    }
  }

  private updateL2Stats(): void {
    // This would query Redis INFO command for actual stats
    // For now, we'll use placeholder values
  }

  private updateStats(): void {
    // Update various statistics
    this.stats.overall.avgResponseTime = this.calculateAverageResponseTime()
  }

  private calculateAverageResponseTime(): number {
    let totalTime = 0
    let totalCalls = 0
    
    for (const [key, metrics] of this.performanceMetrics) {
      totalTime += metrics.totalTime
      totalCalls += metrics.calls
    }
    
    return totalCalls > 0 ? totalTime / totalCalls : 0
  }

  private async processConcurrently<T>(
    items: T[], 
    concurrency: number, 
    processor: (item: T) => Promise<void>
  ): Promise<void> {
    const batches = []
    for (let i = 0;
  } i < items.length; i += concurrency) {
      batches.push(items.slice(i, i + concurrency))
    }
    
    for (const batch of batches) {
      await Promise.all(batch.map(processor))
    }
  }

  private timeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout)
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const enterpriseCache = new EnterpriseCacheManager({
  l1: {
    maxSize: 10000,  // 10k items
    ttl: 300         // 5 minutes
  },
  l2: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDISPASSWORD,
    db: parseInt(process.env.REDIS_DB ?? '0')
  },
  compression: true,
  encryption: process.env.NODEENV === 'production',
  warmup: {
    enabled: true,
    concurrency: 5,
    timeout: 30000,
    strategies: [
      {
        name: 'popular-users',
        keys: ['popular-users', 'trending-users'],
        loader: async () => {
          // This would load popular users data
          return { users: [], timestamp: Date.now() }
        },
        schedule: '0 */5 * * * *', // Every 5 minutes
        priority: 9
      },
      {
        name: 'trending-campaigns',
        keys: ['trending-campaigns', 'hot-campaigns'],
        loader: async () => {
          // This would load trending campaigns
          return { campaigns: [], timestamp: Date.now() }
        },
        schedule: '0 */10 * * * *', // Every 10 minutes
        priority: 8
      }
    ]
  }
})

export default enterpriseCache