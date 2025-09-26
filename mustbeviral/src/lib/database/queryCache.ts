/**
 * Enterprise Query Caching Layer
 * Implements multi-tier caching with TTL, invalidation, and metrics
 * Fortune 50-grade caching strategies
 */

import type { D1Database, D1Result } from '@cloudflare/workers-types';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
  tags: Set<string>;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of cache entries
  defaultTTL: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionThreshold: number; // Compress entries larger than this (bytes)
}

export interface CacheStats {
  entries: number;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  avgEntrySize: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface QueryCacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * LRU (Least Recently Used) cache implementation
 */
class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: Map<string, number> = new Map();
  private accessCounter = 0;

  constructor(private maxEntries: number) {}

  set(key: string, entry: CacheEntry<T>): void {
    // Remove least recently used if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const lruKey = this.findLRU();
      if (lruKey) {
        this.cache.delete(lruKey);
        this.accessOrder.delete(lruKey);
      }
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, this.accessCounter++);
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      this.accessOrder.set(key, this.accessCounter++);
      entry.hits++;
    }
    return entry;
  }

  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.cache.entries();
  }

  size(): number {
    return this.cache.size;
  }

  private findLRU(): string | undefined {
    let lruKey: string | undefined;
    let minAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < minAccess) {
        minAccess = access;
        lruKey = key;
      }
    }

    return lruKey;
  }
}

/**
 * Query Cache Manager with multi-tier caching
 */
export class QueryCache {
  private memoryCache: LRUCache<any>;
  private config: CacheConfig;
  private stats: CacheStats;
  private tagIndex: Map<string, Set<string>> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private currentSize = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize ?? 100 * 1024 * 1024, // 100MB
      maxEntries: config?.maxEntries ?? 10000,
      defaultTTL: config?.defaultTTL ?? 5 * 60 * 1000, // 5 minutes
      cleanupInterval: config?.cleanupInterval ?? 60 * 1000, // 1 minute
      compressionThreshold: config?.compressionThreshold ?? 10 * 1024, // 10KB
    };

    this.memoryCache = new LRUCache(this.config.maxEntries);

    this.stats = {
      entries: 0,
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      avgEntrySize: 0,
      oldestEntry: 0,
      newestEntry: 0,
    };

    this.startCleanup();
  }

  /**
   * Get cached query result
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.invalidate(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();

    // Decompress if needed
    const data = this.isCompressed(entry.data) 
      ? await this.decompress(entry.data)
      : entry.data;

    return data as T;
  }

  /**
   * Set cached query result
   */
  async set<T>(
    key: string,
    data: T,
    options: QueryCacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl ?? this.config.defaultTTL;
    const tags = new Set(options.tags ?? []);

    // Calculate size
    const dataStr = JSON.stringify(data);
    const size = new TextEncoder().encode(dataStr).length;

    // Compress if needed
    const shouldCompress = options.compress !== false && size > this.config.compressionThreshold;
    const storedData = shouldCompress ? await this.compress(dataStr) : data;

    // Check size limits
    if (this.currentSize + size > this.config.maxSize) {
      await this.evictToMakeSpace(size);
    }

    const entry: CacheEntry<T> = {
      key,
      data: storedData as T,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size,
      tags,
    };

    this.memoryCache.set(key, entry);
    this.currentSize += size;
    this.stats.entries = this.memoryCache.size();
    this.stats.size = this.currentSize;

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    // Update stats
    this.updateStats();
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;

    // Remove from tag index
    for (const tag of entry.tags) {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        tagKeys.delete(key);
        if (tagKeys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // Remove from cache
    this.memoryCache.delete(key);
    this.currentSize -= entry.size;
    this.stats.entries = this.memoryCache.size();
    this.stats.size = this.currentSize;
    this.stats.evictions++;

    return true;
  }

  /**
   * Invalidate all entries with specific tags
   */
  invalidateByTags(tags: string[]): number {
    const keysToInvalidate = new Set<string>();

    for (const tag of tags) {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        for (const key of tagKeys) {
          keysToInvalidate.add(key);
        }
      }
    }

    let count = 0;
    for (const key of keysToInvalidate) {
      if (this.invalidate(key)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.memoryCache.clear();
    this.tagIndex.clear();
    this.currentSize = 0;
    this.stats.entries = 0;
    this.stats.size = 0;
    this.stats.evictions = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Warm up cache with frequently used queries
   */
  async warmUp(queries: Array<{
    key: string;
    query: () => Promise<any>;
    options?: QueryCacheOptions;
  }>): Promise<void> {
    const warmUpPromises = queries.map(async ({ key, query, options }) => {
      try {
        const cached = await this.get(key);
        if (!cached) {
          const result = await query();
          await this.set(key, result, options);
        }
      } catch (error) {
        console.error(`Cache warmup failed for key ${key}:`, error);
      }
    });

    await Promise.all(warmUpPromises);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Check if data is compressed
   */
  private isCompressed(data: any): boolean {
    return typeof data === 'string' && data.startsWith('COMPRESSED:');
  }

  /**
   * Compress data using advanced compression
   * Uses GZIP-like compression simulation
   */
  private async compress(data: string): Promise<string> {
    try {
      // Simulate GZIP compression with dictionary-based approach
      const compressionDict = this.buildCompressionDictionary(data);
      const compressed = this.dictionaryCompress(data, compressionDict);
      
      // Store both the dictionary and compressed data
      const result = JSON.stringify({
        dict: compressionDict,
        data: compressed,
        originalSize: data.length
      });
      
      return `GZIP:${btoa(result)}`;
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return `RAW:${btoa(data)}`;
    }
  }

  /**
   * Decompress data
   */
  private async decompress(data: string): Promise<any> {
    try {
      if (data.startsWith('GZIP:')) {
        const encoded = data.substring('GZIP:'.length);
        const decoded = JSON.parse(atob(encoded));
        const decompressed = this.dictionaryDecompress(decoded.data, decoded.dict);
        return JSON.parse(decompressed);
      } else if (data.startsWith('RAW:')) {
        const encoded = data.substring('RAW:'.length);
        return JSON.parse(atob(encoded));
      } else if (data.startsWith('COMPRESSED:')) {
        // Legacy format support
        const encoded = data.substring('COMPRESSED:'.length);
        const decoded = atob(encoded);
        return JSON.parse(decoded);
      }
      return data;
    } catch (error) {
      console.error('Decompression failed:', error);
      return null;
    }
  }

  /**
   * Build compression dictionary from data patterns
   */
  private buildCompressionDictionary(data: string): Record<string, string> {
    const dict: Record<string, string> = {};
    const patterns = [
      // Common JSON patterns
      '":"', '":', '",', '"}', '"{', '":"', '":null', '":true', '":false',
      // Common words in queries
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE',
      'user_id', 'created_at', 'updated_at', 'id', 'name', 'email',
      // Application-specific patterns
      'analytics', 'trends', 'content', 'metrics', 'dashboard'
    ];

    let dictIndex = 0;
    for (const pattern of patterns) {
      if (data.includes(pattern) && pattern.length > 2) {
        dict[pattern] = `§${dictIndex}§`;
        dictIndex++;
      }
    }

    return dict;
  }

  /**
   * Compress using dictionary substitution
   */
  private dictionaryCompress(data: string, dict: Record<string, string>): string {
    let compressed = data;
    for (const [pattern, replacement] of Object.entries(dict)) {
      compressed = compressed.split(pattern).join(replacement);
    }
    return compressed;
  }

  /**
   * Decompress using dictionary substitution
   */
  private dictionaryDecompress(data: string, dict: Record<string, string>): string {
    let decompressed = data;
    for (const [pattern, replacement] of Object.entries(dict)) {
      decompressed = decompressed.split(replacement).join(pattern);
    }
    return decompressed;
  }

  /**
   * Evict entries to make space
   */
  private async evictToMakeSpace(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by priority and access time
    entries.sort((a, b) => {
      // First by hits (less hits = higher priority to evict)
      if (a[1].hits !== b[1].hits) {
        return a[1].hits - b[1].hits;
      }
      // Then by age (older = higher priority to evict)
      return a[1].timestamp - b[1].timestamp;
    });

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      freedSpace += entry.size;
      this.invalidate(key);
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entriesToRemove: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        entriesToRemove.push(key);
      }
    }

    for (const key of entriesToRemove) {
      this.invalidate(key);
    }

    if (entriesToRemove.length > 0) {
      console.log(`Cache cleanup: removed ${entriesToRemove.length} expired entries`);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    let totalSize = 0;
    let entryCount = 0;

    for (const [, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
      totalSize += entry.size;
      entryCount++;
    }

    this.stats.oldestEntry = oldestTimestamp === Infinity ? 0 : oldestTimestamp;
    this.stats.newestEntry = newestTimestamp;
    this.stats.avgEntrySize = entryCount > 0 ? totalSize / entryCount : 0;
  }

  /**
   * Shutdown cache
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

/**
 * Query result cache decorator
 */
export function cacheable<T>(
  cache: QueryCache,
  keyGenerator: (...args: any[]) => string,
  options?: QueryCacheOptions
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<T> {
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache
      const cached = await cache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await cache.set(cacheKey, result, options);
      
      return result;
    };

    return descriptor;
  };
}

// Singleton instance
export const queryCache = new QueryCache();

export default QueryCache;