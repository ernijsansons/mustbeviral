export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size: number;
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  version: string;
  source: string;
  compressed: boolean;
  encrypted: boolean;
  checksumSHA256?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
  entryCount: number;
  avgAccessTime: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  compressionThreshold: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  encryptionKey?: string;
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'fifo';
  persistToDisk: boolean;
  diskPath?: string;
  syncInterval: number;
}

export interface DistributedCacheConfig extends CacheConfig {
  nodes: string[];
  replicationFactor: number;
  consistencyLevel: 'eventual' | 'strong';
  shardingStrategy: 'hash' | 'range' | 'directory';
}

export interface CachePattern {
  pattern: string | RegExp;
  ttl?: number;
  tags?: string[];
  compression?: boolean;
  encryption?: boolean;
}

export class AdvancedCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessTimes: Map<string, number[]> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    hitRate: 0,
    memoryUsage: 0,
    entryCount: 0,
    avgAccessTime: 0
  };
  private patterns: CachePattern[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: CacheConfig) {
    this.startCleanupTimer();
    this.startStatsCalculation();

    if (config.persistToDisk) {
      this.loadFromDisk();
      this.startDiskSync();
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      this.recordAccessTime(key, Date.now() - startTime);
      return null;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      this.recordAccessTime(key, Date.now() - startTime);
      return null;
    }

    this.stats.hits++;
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    let value = entry.value;

    if (entry.metadata.compressed) {
      value = await this.decompress(value);
    }

    if (entry.metadata.encrypted) {
      value = await this.decrypt(value);
    }

    this.recordAccessTime(key, Date.now() - startTime);
    return value;
  }

  async set<T = unknown>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
      encrypt?: boolean;
    }
  ): Promise<void> {
    const pattern = this.getPatternForKey(key);
    const ttl = options?.ttl ?? pattern?.ttl ?? this.config.defaultTTL;
    const tags = options?.tags ?? pattern?.tags ?? [];
    const shouldCompress = options?.compress ?? pattern?.compression ?? this.config.enableCompression;
    const shouldEncrypt = options?.encrypt ?? pattern?.encryption ?? this.config.enableEncryption;

    let processedValue = value;
    let size = this.calculateSize(value);

    if (shouldCompress && size > this.config.compressionThreshold) {
      processedValue = await this.compress(processedValue);
      size = this.calculateSize(processedValue);
    }

    if (shouldEncrypt) {
      processedValue = await this.encrypt(processedValue);
      size = this.calculateSize(processedValue);
    }

    const entry: CacheEntry<T> = { key,
      value: processedValue,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
      size,
      metadata: {
        version: '1.0',
        source: 'advanced-cache',
        compressed: shouldCompress && size > this.config.compressionThreshold,
        encrypted: shouldEncrypt,
        checksumSHA256: await this.calculateChecksum(processedValue)
      }
    };

    this.evictIfNecessary(size);
    this.cache.set(key, entry);
    this.scheduleExpiration(key, ttl);
    this.updateMemoryUsage();
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
    return false;
  }

    this.cache.delete(key);
    this.clearTimer(key);
    this.updateMemoryUsage();
    return true;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  clear(): void {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.updateMemoryUsage();
  }

  async invalidateByTag(tag: string): Promise<number> {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  async invalidateByPattern(pattern: string | RegExp): Promise<number> {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  addPattern(pattern: CachePattern): void {
    this.patterns.push(pattern);
  }

  removePattern(pattern: string | RegExp): void {
    this.patterns = this.patterns.filter(p =>
      JSON.stringify(p.pattern) !== JSON.stringify(pattern)
    );
  }

  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key = > this.get<T>(key)));
  }

  async mset<T = unknown>(entries: Array<{ key: string; value: T; options?: unknown }>): Promise<void> {
    await Promise.all(
      entries.map(({ key, value, options }) => this.set(key, value, options))
    );
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const current = await this.get<number>(key)  ?? 0;
    const newValue = current + amount;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T> | T,
    options?: unknown
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
    return cached;
  }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getKeys(pattern?: string | RegExp): string[] {
    const keys = Array.from(this.cache.keys());

    if (!pattern) {
    return keys;
  }

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return keys.filter(key => regex.test(key));
  }

  getEntries(pattern?: string | RegExp): CacheEntry[] {
    const keys = this.getKeys(pattern);
    return keys.map(key => this.cache.get(key)!).filter(Boolean);
  }

  async warmup(data: Array<{ key: string; value: unknown; options?: unknown }>): Promise<void> {
    await this.mset(data);
  }

  exportData(): Array<{ key: string; value: unknown; metadata: CacheMetadata }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key,
      value: entry.value,
      metadata: entry.metadata
    }));
  }

  async importData(data: Array<{ key: string; value: unknown; options?: unknown }>): Promise<void> {
    await this.mset(data);
  }

  private getPatternForKey(key: string): CachePattern | undefined {
    return this.patterns.find(pattern => {
      if (typeof pattern.pattern === 'string') {
        return new RegExp(pattern.pattern).test(key);
      }
      return pattern.pattern.test(key);
    });
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private evictIfNecessary(newEntrySize: number): void {
    if (!this.needsEviction(newEntrySize)) {return;}

    const entries = Array.from(this.cache.entries());
    const entriesToEvict = this.selectEntriesForEviction(entries, newEntrySize);

    entriesToEvict.forEach(([key]) => {
      this.cache.delete(key);
      this.clearTimer(key);
      this.stats.evictions++;
    });
  }

  private needsEviction(newEntrySize: number): boolean {
    const currentSize = this.stats.memoryUsage;
    return currentSize + newEntrySize > this.config.maxSize;
  }

  private selectEntriesForEviction(
    entries: [string, CacheEntry][],
    requiredSpace: number
  ): [string, CacheEntry][] {
    let freedSpace = 0;
    const toEvict: [string, CacheEntry][] = [];

    const sortedEntries = this.sortEntriesByEvictionPolicy(entries);

    for (const entry of sortedEntries) {
      toEvict.push(entry);
      freedSpace += entry[1].size;

      if (freedSpace >= requiredSpace) {
    break;
  }
    }

    return toEvict;
  }

  private sortEntriesByEvictionPolicy(
    entries: [string, CacheEntry][]
  ): [string, CacheEntry][] {
    switch (this.config.evictionPolicy) {
      case 'lru':
        return entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      case 'lfu':
        return entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
      case 'ttl':
        return entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      case 'fifo':
        return entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      default:
        return entries;
    }
  }

  private scheduleExpiration(key: string, ttl: number): void {
    this.clearTimer(key);

    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  private updateMemoryUsage(): void {
    this.stats.memoryUsage = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
    this.stats.entryCount = this.cache.size;
  }

  private calculateSize(value: unknown): number {
    return JSON.stringify(value).length * 2; // Rough estimate
  }

  private async compress(value: unknown): Promise<unknown> {
    // Placeholder for compression logic
    return value;
  }

  private async decompress(value: unknown): Promise<unknown> {
    // Placeholder for decompression logic
    return value;
  }

  private async encrypt(value: unknown): Promise<unknown> {
    // Placeholder for encryption logic
    return value;
  }

  private async decrypt(value: unknown): Promise<unknown> {
    // Placeholder for decryption logic
    return value;
  }

  private async calculateChecksum(value: unknown): Promise<string> {
    // Placeholder for checksum calculation
    return 'placeholder-checksum';
  }

  private recordAccessTime(key: string, time: number): void {
    if (!this.accessTimes.has(key)) {
      this.accessTimes.set(key, []);
    }

    const times = this.accessTimes.get(key)!;
    times.push(time);

    if (times.length > 100) {
      times.shift();
    }
  }

  private startCleanupTimer(): void {
    setInterval_(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  private startStatsCalculation(): void {
    setInterval_(() => {
      this.calculateStats();
    }, 10000); // Update stats every 10 seconds
  }

  private startDiskSync(): void {
    if (!this.config.persistToDisk) {return;}

    setInterval_(() => {
      this.saveToDisk();
    }, this.config.syncInterval);
  }

  private cleanup(): void {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  private calculateStats(): void {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    const allAccessTimes = Array.from(this.accessTimes.values()).flat();
    this.stats.avgAccessTime = allAccessTimes.length > 0
      ? allAccessTimes.reduce((sum, time) => sum + time, 0) / allAccessTimes.length
      : 0;

    this.updateMemoryUsage();
  }

  private async loadFromDisk(): Promise<void> {
    // Placeholder for disk persistence
  }

  private async saveToDisk(): Promise<void> {
    // Placeholder for disk persistence
  }
}

export class DistributedCache extends AdvancedCache {
  private nodes: Map<string, AdvancedCache> = new Map();
  private hashRing: string[] = [];

  constructor(private distributedConfig: DistributedCacheConfig) {
    super(distributedConfig);
    this.initializeNodes();
    this.buildHashRing();
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const nodes = this.getNodesForKey(key);

    for (const nodeId of nodes) {
      const node = this.nodes.get(nodeId);
      if (node) {
        const value = await node.get<T>(key);
        if (value !== null) {
          return value;
        }
      }
    }

    return null;
  }

  async set<T = unknown>(key: string, value: T, options?: unknown): Promise<void> {
    const nodes = this.getNodesForKey(key);
    const replicationNodes = nodes.slice(0, this.distributedConfig.replicationFactor);

    if (this.distributedConfig.consistencyLevel === 'strong') {
      await Promise.all(
        replicationNodes.map(nodeId => {
          const node = this.nodes.get(nodeId);
          return node ? node.set(key, value, options) : Promise.resolve();
        })
      );
    } else {
      replicationNodes.forEach(nodeId => {
        const node = this.nodes.get(nodeId);
        if (node) {
          node.set(key, value, options).catch(console.error);
        }
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    const nodes = this.getNodesForKey(key);
    let deleted = false;

    for (const nodeId of nodes) {
      const node = this.nodes.get(nodeId);
      if (node?.delete(key)) {
        deleted = true;
      }
    }

    return deleted;
  }

  private initializeNodes(): void {
    this.distributedConfig.nodes.forEach(nodeId => {
      this.nodes.set(nodeId, new AdvancedCache(this.distributedConfig));
    });
  }

  private buildHashRing(): void {
    const virtualNodes = 100;
    this.hashRing = [];

    this.distributedConfig.nodes.forEach(nodeId => {
      for (let i = 0; i < virtualNodes; i++) {
        this.hashRing.push(`${nodeId}:${i}`);
      }
    });

    this.hashRing.sort();
  }

  private getNodesForKey(key: string): string[] {
    const hash = this.hashKey(key);
    const position = this.findPosition(hash);
    const nodes: string[] = [];

    for (let i = 0; i < this.distributedConfig.replicationFactor; i++) {
      const nodePosition = (position + i) % this.hashRing.length;
      const virtualNode = this.hashRing[nodePosition];
      const nodeId = virtualNode.split(':')[0];

      if (!nodes.includes(nodeId)) {
        nodes.push(nodeId);
      }
    }

    return nodes;
  }

  private hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private findPosition(hash: number): number {
    let left = 0;
    let right = this.hashRing.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midHash = this.hashKey(this.hashRing[mid]);

      if (midHash === hash) {
        return mid;
      } else if (midHash < hash) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return left % this.hashRing.length;
  }
}

export const createCache = (config: Partial<CacheConfig> = {}): AdvancedCache => {
  const defaultConfig: CacheConfig = {
    maxSize: 100 * 1024 * 1024, // 100MB
    defaultTTL: 3600000, // 1 hour
    compressionThreshold: 1024, // 1KB
    enableCompression: true,
    enableEncryption: false,
    evictionPolicy: 'lru',
    persistToDisk: false,
    syncInterval: 30000 // 30 seconds
  };

  return new AdvancedCache({ ...defaultConfig, ...config });
};

export const createDistributedCache = (
  config: Partial<DistributedCacheConfig> = {}
): DistributedCache => {
  const defaultConfig: DistributedCacheConfig = {
    maxSize: 100 * 1024 * 1024,
    defaultTTL: 3600000,
    compressionThreshold: 1024,
    enableCompression: true,
    enableEncryption: false,
    evictionPolicy: 'lru',
    persistToDisk: false,
    syncInterval: 30000,
    nodes: ['node1', 'node2', 'node3'],
    replicationFactor: 2,
    consistencyLevel: 'eventual',
    shardingStrategy: 'hash'
  };

  return new DistributedCache({ ...defaultConfig, ...config });
};