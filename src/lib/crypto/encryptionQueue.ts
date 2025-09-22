/**
 * Encryption Performance Optimization
 * Implements batching, caching, and worker optimization for field-level encryption
 */

import { _FieldEncryption, EncryptedField } from './encryption';
import { CloudflareEnv } from '../cloudflare';

export interface EncryptionJob {
  id: string;
  operation: 'encrypt' | 'decrypt';
  data: {
    value: string;
    fieldName?: string;
  } | {
    encryptedField: EncryptedField;
    fieldName?: string;
  };
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

export interface EncryptionCacheEntry {
  key: string;
  encryptedData: EncryptedField;
  plainData?: string;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface EncryptionMetrics {
  totalOperations: number;
  cacheHits: number;
  cacheMisses: number;
  averageEncryptionTime: number;
  averageDecryptionTime: number;
  queueSize: number;
  processingTime: number;
  errorCount: number;
}

export class EncryptionPerformanceOptimizer {
  private env: CloudflareEnv;
  private queue: EncryptionJob[] = [];
  private cache: Map<string, EncryptionCacheEntry> = new Map();
  private processing = false;
  private batchSize = 50;
  private processingInterval = 100; // ms
  private cacheMaxSize = 1000;
  private cacheTTL = 300000; // 5 minutes
  private metrics: EncryptionMetrics;
  private encryptionTimes: number[] = [];
  private decryptionTimes: number[] = [];
  private readonly MAX_TIME_HISTORY = 100;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.metrics = {
      totalOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageEncryptionTime: 0,
      averageDecryptionTime: 0,
      queueSize: 0,
      processingTime: 0,
      errorCount: 0
    };

    this.startProcessing();
    this.startCacheCleanup();
  }

  /**
   * Queue encryption operation with optimizations
   */
  async encryptField(
    value: string,
    fieldName?: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<EncryptedField> {
    // Check cache first
    const cacheKey = this.generateCacheKey('encrypt', value, fieldName);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached.encryptedData;
    }

    this.metrics.cacheMisses++;

    // For high priority or small values, process immediately
    if (priority === 'high' || value.length < 100) {
      return this.encryptImmediately(value, fieldName);
    }

    // Queue for batch processing
    return new Promise((resolve, _reject) => {
      const job: EncryptionJob = {
        id: this.generateJobId(),
        operation: 'encrypt',
        data: { _value, fieldName },
        priority,
        createdAt: new Date(),
        resolve,
        reject
      };

      this.addToQueue(job);
    });
  }

  /**
   * Queue decryption operation with optimizations
   */
  async decryptField(
    encryptedField: EncryptedField,
    fieldName?: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    // Check cache first
    const cacheKey = this.generateCacheKey('decrypt', encryptedField.value, fieldName);
    const cached = this.getFromCache(cacheKey);
    if (cached && cached.plainData) {
      this.metrics.cacheHits++;
      return cached.plainData;
    }

    this.metrics.cacheMisses++;

    // For high priority, process immediately
    if (priority === 'high') {
      return this.decryptImmediately(encryptedField, fieldName);
    }

    // Queue for batch processing
    return new Promise((resolve, _reject) => {
      const job: EncryptionJob = {
        id: this.generateJobId(),
        operation: 'decrypt',
        data: { _encryptedField, fieldName },
        priority,
        createdAt: new Date(),
        resolve,
        reject
      };

      this.addToQueue(job);
    });
  }

  /**
   * Batch encrypt multiple fields
   */
  async encryptFields<T extends Record<string, unknown>>(
    data: T,
    fieldsToEncrypt: (keyof T)[],
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<T> {
    const startTime = Date.now();

    // Group operations by priority and size
    const immediateOps: Promise<unknown>[] = [];
    const queuedOps: Promise<unknown>[] = [];
    const result = { ...data };

    for (const fieldName of fieldsToEncrypt) {
      const value = data[fieldName];
      if (value && typeof value === 'string') {
        const cacheKey = this.generateCacheKey('encrypt', value, String(fieldName));
        const cached = this.getFromCache(cacheKey);

        if (cached) {
          result[fieldName] = cached.encryptedData;
          this.metrics.cacheHits++;
        } else {
          this.metrics.cacheMisses++;

          if (priority === 'high' || value.length < 100) {
            immediateOps.push(
              this.encryptImmediately(value, String(fieldName)).then(encrypted => {
                result[fieldName] = encrypted;
              })
            );
          } else {
            queuedOps.push(
              this.encryptField(value, String(fieldName), priority).then(encrypted => {
                result[fieldName] = encrypted;
              })
            );
          }
        }
      }
    }

    // Process all operations
    await Promise.all([...immediateOps, ...queuedOps]);

    const duration = Date.now() - startTime;
    console.log(`LOG: ENCRYPTION-BATCH-1 - Batch encrypted ${fieldsToEncrypt.length} fields in ${duration}ms`);

    return result;
  }

  /**
   * Batch decrypt multiple fields
   */
  async decryptFields<T extends Record<string, unknown>>(
    data: T,
    fieldsToDecrypt: (keyof T)[],
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<T> {
    const startTime = Date.now();

    const immediateOps: Promise<unknown>[] = [];
    const queuedOps: Promise<unknown>[] = [];
    const result = { ...data };

    for (const fieldName of fieldsToDecrypt) {
      const encryptedField = data[fieldName] as EncryptedField;
      if (encryptedField && typeof encryptedField === 'object' && encryptedField.value) {
        const cacheKey = this.generateCacheKey('decrypt', encryptedField.value, String(fieldName));
        const cached = this.getFromCache(cacheKey);

        if (cached && cached.plainData) {
          result[fieldName] = cached.plainData;
          this.metrics.cacheHits++;
        } else {
          this.metrics.cacheMisses++;

          if (priority === 'high') {
            immediateOps.push(
              this.decryptImmediately(encryptedField, String(fieldName)).then(decrypted => {
                result[fieldName] = decrypted;
              })
            );
          } else {
            queuedOps.push(
              this.decryptField(encryptedField, String(fieldName), priority).then(decrypted => {
                result[fieldName] = decrypted;
              })
            );
          }
        }
      }
    }

    await Promise.all([...immediateOps, ...queuedOps]);

    const duration = Date.now() - startTime;
    console.log(`LOG: ENCRYPTION-BATCH-2 - Batch decrypted ${fieldsToDecrypt.length} fields in ${duration}ms`);

    return result;
  }

  /**
   * Pre-warm cache with commonly used values
   */
  async preWarmCache(commonValues: Array<{ value: string; fieldName?: string }>): Promise<void> {
    console.log(`LOG: ENCRYPTION-CACHE-WARM-1 - Pre-warming cache with ${commonValues.length} values`);

    const promises = commonValues.map(async ({ _value, fieldName }) => {
      try {
        const encrypted = await this.encryptImmediately(value, fieldName);
        const cacheKey = this.generateCacheKey('encrypt', value, fieldName);
        this.addToCache(cacheKey, encrypted, value);
      } catch (error: unknown) {
        console.warn(`LOG: ENCRYPTION-CACHE-WARM-ERROR-1 - Failed to pre-warm ${fieldName}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('LOG: ENCRYPTION-CACHE-WARM-2 - Cache pre-warming completed');
  }

  /**
   * Get performance metrics
   */
  getMetrics(): EncryptionMetrics {
    // Update average times
    if (this.encryptionTimes.length > 0) {
      this.metrics.averageEncryptionTime =
        this.encryptionTimes.reduce((a, _b) => a + b, 0) / this.encryptionTimes.length;
    }

    if (this.decryptionTimes.length > 0) {
      this.metrics.averageDecryptionTime =
        this.decryptionTimes.reduce((a, _b) => a + b, 0) / this.decryptionTimes.length;
    }

    this.metrics.queueSize = this.queue.length;

    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    size: number;
    hitRate: number;
    oldestEntry: Date | null;
    mostAccessed: { key: string; count: number } | null;
  } {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0;

    let oldestEntry: Date | null = null;
    let mostAccessed: { key: string; count: number } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }

      if (!mostAccessed || entry.accessCount > mostAccessed.count) {
        mostAccessed = { _key, count: entry.accessCount };
      }
    }

    return {
      size: this.cache.size,
      hitRate,
      oldestEntry,
      mostAccessed
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('LOG: ENCRYPTION-CACHE-CLEAR-1 - Encryption cache cleared');
  }

  /**
   * Flush queue (process all pending operations immediately)
   */
  async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    console.log(`LOG: ENCRYPTION-QUEUE-FLUSH-1 - Flushing ${this.queue.length} queued operations`);

    const allJobs = [...this.queue];
    this.queue = [];

    await this.processBatch(allJobs);

    console.log('LOG: ENCRYPTION-QUEUE-FLUSH-2 - Queue flush completed');
  }

  /**
   * Encrypt immediately without queuing
   */
  private async encryptImmediately(value: string, fieldName?: string): Promise<EncryptedField> {
    const startTime = Date.now();

    try {
      const encrypted = await FieldEncryption.encryptField(value, fieldName);

      // Cache the result
      const cacheKey = this.generateCacheKey('encrypt', value, fieldName);
      this.addToCache(cacheKey, encrypted, value);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateEncryptionMetrics(duration, true);

      return encrypted;
    } catch (error: unknown) {
      this.updateEncryptionMetrics(Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Decrypt immediately without queuing
   */
  private async decryptImmediately(encryptedField: EncryptedField, fieldName?: string): Promise<string> {
    const startTime = Date.now();

    try {
      const decrypted = await FieldEncryption.decryptField(encryptedField, fieldName);

      // Cache the result
      const cacheKey = this.generateCacheKey('decrypt', encryptedField.value, fieldName);
      this.addToCache(cacheKey, encryptedField, decrypted);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateDecryptionMetrics(duration, true);

      return decrypted;
    } catch (error: unknown) {
      this.updateDecryptionMetrics(Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Add job to queue with priority sorting
   */
  private addToQueue(job: EncryptionJob): void {
    // Insert based on priority
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const jobPriority = priorityOrder[job.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[this.queue[i].priority] > jobPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, job);

    // Limit queue size
    if (this.queue.length > 1000) {
      const removed = this.queue.splice(900); // Remove oldest jobs
      removed.forEach(job => {
        job.reject(new Error('Queue overflow: operation cancelled'));
      });
    }
  }

  /**
   * Start background processing
   */
  private startProcessing(): void {
    setInterval(async () => {
      if (!this.processing && this.queue.length > 0) {
        await this.processQueue();
      }
    }, this.processingInterval);
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    const startTime = Date.now();

    try {
      const batch = this.queue.splice(0, this.batchSize);
      if (batch.length > 0) {
        await this.processBatch(batch);
      }
    } catch (error: unknown) {
      console.error('LOG: ENCRYPTION-QUEUE-ERROR-1 - Queue processing error:', error);
    } finally {
      this.processing = false;
      this.metrics.processingTime = Date.now() - startTime;
    }
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(jobs: EncryptionJob[]): Promise<void> {
    const promises = jobs.map(async (_job) => {
      try {
        let result: unknown;

        if (job.operation === 'encrypt') {
          const { _value, fieldName } = job.data as { value: string; fieldName?: string };
          result = await this.encryptImmediately(value, fieldName);
        } else {
          const { _encryptedField, fieldName } = job.data as { encryptedField: EncryptedField; fieldName?: string };
          result = await this.decryptImmediately(encryptedField, fieldName);
        }

        job.resolve(result);
      } catch (error: unknown) {
        this.metrics.errorCount++;
        job.reject(error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(operation: string, value: string, fieldName?: string): string {
    const hasher = crypto.subtle || crypto;
    const data = `${operation}:${fieldName || 'default'}:${value}`;

    // Simple hash for cache key (not cryptographic)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `enc_${hash.toString(36)}`;
  }

  /**
   * Generate job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get value from cache
   */
  private getFromCache(key: string): EncryptionCacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt.getTime() > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = new Date();

    return entry;
  }

  /**
   * Add value to cache
   */
  private addToCache(key: string, encryptedData: EncryptedField, plainData?: string): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.cacheMaxSize) {
      this.evictOldestEntries();
    }

    const entry: EncryptionCacheEntry = { _key,
      encryptedData,
      plainData,
      createdAt: new Date(),
      accessCount: 1,
      lastAccessed: new Date()
    };

    this.cache.set(key, entry);
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    const toRemove = Math.floor(this.cacheMaxSize * 0.2); // Remove 20%
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Update encryption metrics
   */
  private updateEncryptionMetrics(duration: number, success: boolean): void {
    this.metrics.totalOperations++;

    if (success) {
      this.encryptionTimes.push(duration);
      if (this.encryptionTimes.length > this.MAX_TIME_HISTORY) {
        this.encryptionTimes.shift();
      }
    } else {
      this.metrics.errorCount++;
    }
  }

  /**
   * Update decryption metrics
   */
  private updateDecryptionMetrics(duration: number, success: boolean): void {
    this.metrics.totalOperations++;

    if (success) {
      this.decryptionTimes.push(duration);
      if (this.decryptionTimes.length > this.MAX_TIME_HISTORY) {
        this.decryptionTimes.shift();
      }
    } else {
      this.metrics.errorCount++;
    }
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Every minute
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt.getTime() > this.cacheTTL) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`LOG: ENCRYPTION-CACHE-CLEANUP-1 - Removed ${removedCount} expired cache entries`);
    }
  }

  /**
   * Shutdown optimizer
   */
  async shutdown(): Promise<void> {
    console.log('LOG: ENCRYPTION-OPTIMIZER-SHUTDOWN-1 - Shutting down encryption optimizer');

    // Process remaining queue
    await this.flushQueue();

    // Clear cache
    this.clearCache();

    console.log('LOG: ENCRYPTION-OPTIMIZER-SHUTDOWN-2 - Encryption optimizer shutdown complete');
  }
}

/**
 * Global encryption optimizer instance
 */
let globalEncryptionOptimizer: EncryptionPerformanceOptimizer | null = null;

/**
 * Get or create global encryption optimizer
 */
export function getEncryptionOptimizer(env: CloudflareEnv): EncryptionPerformanceOptimizer {
  if (!globalEncryptionOptimizer) {
    globalEncryptionOptimizer = new EncryptionPerformanceOptimizer(env);
  }
  return globalEncryptionOptimizer;
}