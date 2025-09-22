/**
 * Smart Caching and Batching System
 * Intelligent content caching with semantic similarity and batch optimization
 * Dramatically reduces API calls and costs while maintaining quality
 */

export interface CacheEntry {
  id: string;
  key: string;
  content: string;
  metadata: CacheMetadata;
  embedding?: number[];
  hits: number;
  lastAccessed: Date;
  created: Date;
  expires: Date;
}

export interface CacheMetadata {
  platform: string;
  contentType: string;
  topic: string;
  qualityScore: number;
  viralPotential: number;
  tokenCount: number;
  costSavings: number;
  agentName: string;
}

export interface BatchRequest {
  id: string;
  platform: string;
  contentType: string;
  prompt: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  maxTokens: number;
  qualityThreshold: number;
  timeout: number;
  callback?: (result: string) => void;
}

export interface BatchResult {
  requestId: string;
  content: string;
  qualityScore: number;
  tokenCount: number;
  processingTime: number;
  cacheHit: boolean;
  batchSize: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // Time to live in seconds
  semanticThreshold: number; // 0-1, similarity threshold for cache hits
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number; // Max wait time for batching
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalSavings: number;
  averageResponseTime: number;
  topPerformingQueries: Array<{ query: string; hits: number; savings: number }>;
  platformBreakdown: Record<string, { hits: number; savings: number }>;
}

export class SmartCache {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingBatches: Map<string, BatchRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    totalSavings: 0,
    totalResponseTime: 0,
    queryCount: 0
  };

  constructor(private config: CacheConfig) {
    this.startCleanupTimer();
  }

  /**
   * Get content from cache or generate new content with batching
   */
  async getContent(
    platform: string,
    contentType: string,
    prompt: string,
    options: {
      maxTokens?: number;
      qualityThreshold?: number;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      forceRefresh?: boolean;
      timeout?: number;
    } = {}
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(platform, contentType, prompt);

    // Check for exact cache hit first
    if (!options.forceRefresh) {
      const exactHit = this.getExactCacheHit(cacheKey);
      if (exactHit) {
        this.updateCacheStats(exactHit, true, Date.now() - startTime);
        return this.createBatchResult(exactHit, true, Date.now() - startTime, 1);
      }

      // Check for semantic similarity hit
      const semanticHit = await this.getSemanticCacheHit(prompt, platform, contentType);
      if (semanticHit) {
        this.updateCacheStats(semanticHit, true, Date.now() - startTime);
        return this.createBatchResult(semanticHit, true, Date.now() - startTime, 1);
      }
    }

    // No cache hit - add to batch or process immediately
    const priority = options.priority || 'normal';

    if (priority === 'urgent' || !this.config.enableBatching) {
      return await this.processImmediately(platform, contentType, prompt, options, startTime);
    } else {
      return await this.addToBatch(platform, contentType, prompt, options, startTime);
    }
  }

  /**
   * Preload cache with popular content patterns
   */
  async preloadCache(
    patterns: Array<{
      platform: string;
      contentType: string;
      topics: string[];
      priority: number;
    }>
  ): Promise<void> {
    console.log('[SmartCache] Starting cache preload...');

    const sortedPatterns = patterns.sort((a, _b) => b.priority - a.priority);

    for (const pattern of sortedPatterns) {
      for (const topic of pattern.topics) {
        try {
          await this.getContent(pattern.platform, pattern.contentType, topic, {
            priority: 'low',
            maxTokens: 2000
          });
        } catch (error: unknown) {
          console.warn(`[SmartCache] Preload failed for ${pattern.platform}/${topic}: ${error.message}`);
        }
      }
    }

    console.log(`[SmartCache] Preload completed. Cache size: ${this.cache.size}`);
  }

  /**
   * Optimize cache performance by analyzing usage patterns
   */
  optimizeCache(): {
    removedEntries: number;
    consolidatedEntries: number;
    projectedSavings: number;
  } {
    const initialSize = this.cache.size;
    let consolidatedCount = 0;
    let projectedSavings = 0;

    // Remove expired entries
    this.cleanupExpiredEntries();

    // Remove low-performing entries
    const lowPerformingEntries = Array.from(this.cache.values())
      .filter(entry => entry.hits < 2 && this.daysSinceCreated(entry) > 7)
      .sort((a, _b) => a.hits - b.hits);

    // Remove bottom 20% of low-performing entries if cache is near capacity
    if (this.cache.size > this.config.maxSize * 0.8) {
      const toRemove = Math.floor(lowPerformingEntries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(lowPerformingEntries[i].key);
      }
    }

    // Consolidate similar entries
    const entries = Array.from(this.cache.values());
    for (let i = 0; i < entries.length - 1; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const similarity = this.calculateSimilarity(entries[i].content, entries[j].content);
        if (similarity > 0.9 && entries[i].metadata.platform === entries[j].metadata.platform) {
          // Keep the higher-performing entry
          const keepEntry = entries[i].hits > entries[j].hits ? entries[i] : entries[j];
          const removeEntry = entries[i].hits > entries[j].hits ? entries[j] : entries[i];

          this.cache.delete(removeEntry.key);
          consolidatedCount++;
          projectedSavings += removeEntry.metadata.costSavings;
        }
      }
    }

    const removedEntries = initialSize - this.cache.size;

    console.log(`[SmartCache] Optimization complete: ${removedEntries} removed, ${consolidatedCount} consolidated`);

    return { _removedEntries,
      consolidatedEntries: consolidatedCount,
      projectedSavings
    };
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): CacheStats {
    const totalQueries = this.stats.hits + this.stats.misses;
    const hitRate = totalQueries > 0 ? (this.stats.hits / totalQueries) * 100 : 0;

    // Calculate top performing queries
    const queryPerformance = new Map<string, { hits: number; savings: number }>();
    for (const entry of this.cache.values()) {
      const key = `${entry.metadata.platform}/${entry.metadata.contentType}`;
      const current = queryPerformance.get(key) || { hits: 0, savings: 0 };
      queryPerformance.set(key, {
        hits: current.hits + entry.hits,
        savings: current.savings + entry.metadata.costSavings
      });
    }

    const topPerformingQueries = Array.from(queryPerformance.entries())
      .map(([query, stats]) => ({ _query, ...stats }))
      .sort((a, _b) => b.savings - a.savings)
      .slice(0, 10);

    // Platform breakdown
    const platformBreakdown: Record<string, { hits: number; savings: number }> = {};
    for (const entry of this.cache.values()) {
      const platform = entry.metadata.platform;
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { hits: 0, savings: 0 };
      }
      platformBreakdown[platform].hits += entry.hits;
      platformBreakdown[platform].savings += entry.metadata.costSavings;
    }

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      totalSavings: this.stats.totalSavings,
      averageResponseTime: this.stats.queryCount > 0 ? this.stats.totalResponseTime / this.stats.queryCount : 0,
      topPerformingQueries,
      platformBreakdown
    };
  }

  /**
   * Manually invalidate cache entries
   */
  invalidateCache(filters: {
    platform?: string;
    contentType?: string;
    topic?: string;
    olderThan?: Date;
    qualityBelow?: number;
  }): number {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      let shouldInvalidate = false;

      if (filters.platform && entry.metadata.platform !== filters.platform) continue;
      if (filters.contentType && entry.metadata.contentType !== filters.contentType) continue;
      if (filters.topic && !entry.metadata.topic.includes(filters.topic)) continue;
      if (filters.olderThan && entry.created < filters.olderThan) shouldInvalidate = true;
      if (filters.qualityBelow && entry.metadata.qualityScore < filters.qualityBelow) shouldInvalidate = true;

      if (shouldInvalidate || Object.keys(filters).length === 0) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`[SmartCache] Invalidated ${invalidatedCount} cache entries`);
    return invalidatedCount;
  }

  /**
   * Export cache data for analysis
   */
  exportCacheData(): {
    entries: CacheEntry[];
    stats: CacheStats;
    configuration: CacheConfig;
    exportTimestamp: Date;
  } {
    return {
      entries: Array.from(this.cache.values()),
      stats: this.getCacheStats(),
      configuration: this.config,
      exportTimestamp: new Date()
    };
  }

  private generateCacheKey(platform: string, contentType: string, prompt: string): string {
    // Create a deterministic key from the inputs
    const normalized = `${platform}-${contentType}-${prompt.toLowerCase().trim()}`;
    return this.hashString(normalized);
  }

  private getExactCacheHit(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expires < new Date()) {
      if (entry) this.cache.delete(key);
      return null;
    }

    entry.hits++;
    entry.lastAccessed = new Date();
    return entry;
  }

  private async getSemanticCacheHit(
    prompt: string,
    platform: string,
    contentType: string
  ): Promise<CacheEntry | null> {
    if (!this.config.semanticThreshold) return null;

    const promptEmbedding = await this.generateEmbedding(prompt);
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;

    for (const entry of this.cache.values()) {
      if (entry.metadata.platform !== platform || entry.metadata.contentType !== contentType) {
        continue;
      }

      if (entry.expires < new Date()) {
        this.cache.delete(entry.key);
        continue;
      }

      if (!entry.embedding) {
        entry.embedding = await this.generateEmbedding(entry.metadata.topic);
      }

      const similarity = this.cosineSimilarity(promptEmbedding, entry.embedding);

      if (similarity > this.config.semanticThreshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hits++;
      bestMatch.lastAccessed = new Date();
      console.log(`[SmartCache] Semantic cache hit with ${(bestSimilarity * 100).toFixed(1)}% similarity`);
    }

    return bestMatch;
  }

  private async processImmediately(
    platform: string,
    contentType: string,
    prompt: string,
    options: unknown,
    startTime: number
  ): Promise<BatchResult> {
    // Simulate content generation - in production, this would call the actual agent
    const content = await this.generateContent(platform, contentType, prompt, options);
    const processingTime = Date.now() - startTime;

    // Cache the result
    const cacheEntry = this.createCacheEntry(platform, contentType, prompt, content, options);
    this.cache.set(cacheEntry.key, cacheEntry);

    this.updateCacheStats(cacheEntry, false, processingTime);

    return this.createBatchResult(cacheEntry, false, processingTime, 1);
  }

  private async addToBatch(
    platform: string,
    contentType: string,
    prompt: string,
    options: unknown,
    startTime: number
  ): Promise<BatchResult> {
    const batchKey = `${platform}-${contentType}`;
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const request: BatchRequest = {
      id: requestId,
      platform,
      contentType,
      prompt,
      priority: options.priority || 'normal',
      maxTokens: options.maxTokens || 2000,
      qualityThreshold: options.qualityThreshold || 80,
      timeout: options.timeout || 30000
    };

    // Add to batch
    const currentBatch = this.pendingBatches.get(batchKey) || [];
    currentBatch.push(request);
    this.pendingBatches.set(batchKey, currentBatch);

    // Set timer if this is the first request in the batch
    if (currentBatch.length === 1) {
      const timer = setTimeout(() => {
        this.processBatch(batchKey);
      }, this.config.batchTimeout);
      this.batchTimers.set(batchKey, timer);
    }

    // Process immediately if batch is full
    if (currentBatch.length >= this.config.batchSize) {
      const timer = this.batchTimers.get(batchKey);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(batchKey);
      }
      return await this.processBatch(batchKey, requestId);
    }

    // Wait for batch processing
    return new Promise((_resolve) => {
      request.callback = (content: string) => {
        const processingTime = Date.now() - startTime;
        const cacheEntry = this.createCacheEntry(platform, contentType, prompt, content, options);
        this.cache.set(cacheEntry.key, cacheEntry);
        this.updateCacheStats(cacheEntry, false, processingTime);
        resolve(this.createBatchResult(cacheEntry, false, processingTime, currentBatch.length));
      };
    });
  }

  private async processBatch(batchKey: string, specificRequestId?: string): Promise<BatchResult | void> {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.length === 0) return;

    console.log(`[SmartCache] Processing batch of ${batch.length} requests for ${batchKey}`);

    try {
      // Process all requests in the batch
      const results = await Promise.all(
        batch.map(async (_request) => {
          const content = await this.generateContent(
            request.platform,
            request.contentType,
            request.prompt,
            { maxTokens: request.maxTokens, qualityThreshold: request.qualityThreshold }
          );
          return { _request, content };
        })
      );

      // Notify all callbacks
      results.forEach(({ _request, content }) => {
        if (request.callback) {
          request.callback(content);
        }
      });

      // Return specific result if requested
      if (specificRequestId) {
        const result = results.find(r => r.request.id === specificRequestId);
        if (result) {
          const cacheEntry = this.createCacheEntry(
            result.request.platform,
            result.request.contentType,
            result.request.prompt,
            result.content,
            {}
          );
          return this.createBatchResult(cacheEntry, false, 0, batch.length);
        }
      }

    } catch (error: unknown) {
      console.error(`[SmartCache] Batch processing failed: ${error.message}`);
    } finally {
      // Clean up
      this.pendingBatches.delete(batchKey);
      const timer = this.batchTimers.get(batchKey);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(batchKey);
      }
    }
  }

  private async generateContent(
    platform: string,
    contentType: string,
    prompt: string,
    options: unknown
  ): Promise<string> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    // Simulate content generation - in production, this would call the actual agent
    return `Generated ${contentType} content for ${platform}: ${prompt.substring(0, 100)}...`;
  }

  private createCacheEntry(
    platform: string,
    contentType: string,
    prompt: string,
    content: string,
    options: unknown
  ): CacheEntry {
    const key = this.generateCacheKey(platform, contentType, prompt);
    const now = new Date();

    return {
      id: `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      key,
      content,
      metadata: { _platform,
        contentType,
        topic: prompt,
        qualityScore: options.qualityScore || 85,
        viralPotential: options.viralPotential || 75,
        tokenCount: Math.round(content.length / 4),
        costSavings: 0.002, // Estimated savings per cache hit
        agentName: 'SmartCache'
      },
      hits: 1,
      lastAccessed: now,
      created: now,
      expires: new Date(now.getTime() + this.config.defaultTTL * 1000)
    };
  }

  private createBatchResult(
    entry: CacheEntry,
    cacheHit: boolean,
    processingTime: number,
    batchSize: number
  ): BatchResult {
    return {
      requestId: entry.id,
      content: entry.content,
      qualityScore: entry.metadata.qualityScore,
      tokenCount: entry.metadata.tokenCount,
      processingTime,
      cacheHit,
      batchSize
    };
  }

  private updateCacheStats(entry: CacheEntry, isHit: boolean, responseTime: number): void {
    if (isHit) {
      this.stats.hits++;
      this.stats.totalSavings += entry.metadata.costSavings;
    } else {
      this.stats.misses++;
    }

    this.stats.totalResponseTime += responseTime;
    this.stats.queryCount++;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simplified embedding generation - in production, use actual embedding service
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);

    words.forEach((word, _index) => {
      const hash = this.hashString(word);
      embedding[hash % 384] += 1;
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, _val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple text similarity - in production, use more sophisticated methods
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash);
  }

  private daysSinceCreated(entry: CacheEntry): number {
    return (Date.now() - entry.created.getTime()) / (1000 * 60 * 60 * 24);
  }

  private cleanupExpiredEntries(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();

      // Remove oldest entries if cache is over capacity
      if (this.cache.size > this.config.maxSize) {
        const entries = Array.from(this.cache.values())
          .sort((a, _b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

        const toRemove = this.cache.size - this.config.maxSize;
        for (let i = 0; i < toRemove; i++) {
          this.cache.delete(entries[i].key);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Reset cache (for testing)
   */
  resetCache(): void {
    this.cache.clear();
    this.pendingBatches.clear();
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalSavings: 0,
      totalResponseTime: 0,
      queryCount: 0
    };
  }
}