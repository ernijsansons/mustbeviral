import { AIResponse, CacheEntry } from '../providers/types';

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // seconds
  compressionThreshold: number; // bytes
  enableCompression: boolean;
  enableStats: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  totalSize: number;
  hitRate: number;
  averageItemSize: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry<AIResponse>> = new Map();
  private accessOrder: string[] = []; // For LRU eviction
  private stats: CacheStats;
  private readonly config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize || 1000,
      defaultTTL: config?.defaultTTL || 3600, // 1 hour
      compressionThreshold: config?.compressionThreshold || 1024, // 1KB
      enableCompression: config?.enableCompression || true,
      enableStats: config?.enableStats || true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalSize: 0,
      hitRate: 0,
      averageItemSize: 0
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  async get(key: string): Promise<AIResponse | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.updateStats('miss');
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.updateStats('miss');
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    // Increment hit count
    entry.hits++;

    // Decompress if needed
    const data = await this.decompress(entry.data);

    this.updateStats('hit');
    return data;
  }

  async set(key: string, value: AIResponse, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.config.defaultTTL;
    const timestamp = Date.now();

    // Compress if needed
    const compressedData = await this.compress(value);

    const entry: CacheEntry<AIResponse> = {
      data: compressedData,
      timestamp,
      ttl: actualTTL,
      hits: 0
    };

    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Store the entry
    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    this.updateStats('set');
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    return !this.isExpired(entry);
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.cache.delete(key);
    if (existed) {
      this.removeFromAccessOrder(key);
    }
    return existed;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.resetStats();
  }

  getStats(): CacheStats {
    // Update calculated stats
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    this.stats.totalSize = this.cache.size;

    this.stats.averageItemSize = this.cache.size > 0
      ? this.calculateTotalMemorySize() / this.cache.size
      : 0;

    return { ...this.stats };
  }

  getSize(): number {
    return this.cache.size;
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache entries sorted by most recently used
  getMostRecentKeys(limit = 10): string[] {
    return this.accessOrder.slice(-limit).reverse();
  }

  // Get cache entries sorted by most hits
  getMostPopularKeys(limit = 10): string[] {
    const entries = Array.from(this.cache.entries());
    return entries
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, limit)
      .map(([key]) => key);
  }

  private isExpired(entry: CacheEntry<AIResponse>): boolean {
    return Date.now() > entry.timestamp + (entry.ttl * 1000);
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recent)
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    // Remove least recently used (first in array)
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private async compress(data: AIResponse): Promise<AIResponse> {
    if (!this.config.enableCompression) {
      return data;
    }

    const size = this.calculateItemSize(data);
    if (size < this.config.compressionThreshold) {
      return data;
    }

    // Simple compression: just JSON stringify for now
    // In production, you might want to use actual compression like gzip
    try {
      const compressed = JSON.stringify(data);
      return data; // Return original for now, actual compression would go here
    } catch (error) {
      console.warn('Compression failed:', error);
      return data;
    }
  }

  private async decompress(data: AIResponse): Promise<AIResponse> {
    // For now, just return the data as-is
    // In production, this would handle actual decompression
    return data;
  }

  private calculateItemSize(item: any): number {
    // Rough size calculation
    return JSON.stringify(item).length * 2; // Assuming UTF-16
  }

  private calculateTotalMemorySize(): number {
    let totalSize = 0;
    for (const [key, entry] of this.cache) {
      totalSize += key.length * 2; // UTF-16
      totalSize += this.calculateItemSize(entry);
    }
    return totalSize;
  }

  private updateStats(operation: 'hit' | 'miss' | 'set'): void {
    if (!this.config.enableStats) {
      return;
    }

    switch (operation) {
      case 'hit':
        this.stats.hits++;
        break;
      case 'miss':
        this.stats.misses++;
        break;
      case 'set':
        this.stats.sets++;
        break;
    }
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalSize: 0,
      hitRate: 0,
      averageItemSize: 0
    };
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private cleanupExpired(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  // Batch operations for performance
  async getBatch(keys: string[]): Promise<Array<{ key: string; value: AIResponse | null }>> {
    const results = await Promise.all(
      keys.map(async key => ({
        key,
        value: await this.get(key)
      }))
    );

    return results;
  }

  async setBatch(entries: Array<{ key: string; value: AIResponse; ttl?: number }>): Promise<void> {
    await Promise.all(
      entries.map(entry => this.set(entry.key, entry.value, entry.ttl))
    );
  }

  // Export cache for persistence
  exportCache(): Record<string, CacheEntry<AIResponse>> {
    const exportData: Record<string, CacheEntry<AIResponse>> = {};

    for (const [key, entry] of this.cache) {
      if (!this.isExpired(entry)) {
        exportData[key] = entry;
      }
    }

    return exportData;
  }

  // Import cache from persistence
  async importCache(data: Record<string, CacheEntry<AIResponse>>): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];

    for (const [key, entry] of Object.entries(data)) {
      if (!this.isExpired(entry)) {
        this.cache.set(key, entry);
        this.accessOrder.push(key);
      }
    }
  }
}