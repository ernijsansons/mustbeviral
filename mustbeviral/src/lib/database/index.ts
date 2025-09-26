/**
 * Enterprise Database Layer
 * Integrated database service with optimization, caching, and monitoring
 * Fortune 50-grade database management
 */

export { QueryOptimizer, queryOptimizer, DataLoader, createUserLoader, createPostLoader } from './queryOptimizer';
export { DatabaseConnectionPool, getConnectionPool, initializeConnectionPool } from './connectionPool';
export { QueryCache, queryCache, cacheable } from './queryCache';
export { DatabaseMonitor, databaseMonitor } from './monitor';

export type {
  QueryOptions,
  BatchLoader,
  ConnectionPoolConfig,
  ConnectionMetrics,
  DatabaseConnection,
  CacheEntry,
  CacheConfig,
  CacheStats,
  QueryCacheOptions,
  DatabaseMetrics,
  QueryPerformanceMetrics,
  ErrorMetrics,
  AlertRule,
  Alert,
  MonitorConfig,
} from './queryOptimizer';

import type { CloudflareEnv } from '../cloudflare';
import { DatabaseConnectionPool, getConnectionPool } from './connectionPool';
import { QueryCache, queryCache } from './queryCache';
import { DatabaseMonitor, databaseMonitor } from './monitor';
import { QueryOptimizer, queryOptimizer } from './queryOptimizer';

/**
 * Integrated Database Service
 * Combines connection pooling, query optimization, caching, and monitoring
 */
export class DatabaseService {
  private connectionPool: DatabaseConnectionPool;
  private queryCache: QueryCache;
  private monitor: DatabaseMonitor;
  private optimizer: QueryOptimizer;
  private env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.connectionPool = getConnectionPool(env, {
      maxConnections: 20,
      connectionTimeout: 10000,
      healthCheckInterval: 30000,
    });
    this.queryCache = queryCache;
    this.monitor = databaseMonitor;
    this.optimizer = queryOptimizer;
  }

  /**
   * Execute optimized query with caching and monitoring
   */
  async query<T = any>(
    sql: string,
    params?: any[],
    options?: {
      cache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
      tags?: string[];
      timeout?: number;
      retries?: number;
    }
  ): Promise<T[]> {
    const startTime = Date.now();
    const cacheKey = options?.cacheKey || await this.generateCacheKey(sql, params);

    try {
      // Try cache first if caching is enabled
      if (options?.cache !== false) {
        const cached = await this.queryCache.get<T[]>(cacheKey);
        if (cached) {
          this.monitor.recordQuery(sql, Date.now() - startTime, true);
          return cached;
        }
      }

      // Execute query through connection pool
      const result = await this.connectionPool.executeQuery<T>(
        sql,
        params,
        {
          timeout: options?.timeout,
          retries: options?.retries,
        }
      );

      const duration = Date.now() - startTime;
      const rows = result.results || [];

      // Cache result if caching is enabled
      if (options?.cache !== false && result.success) {
        await this.queryCache.set(
          cacheKey,
          rows,
          {
            ttl: options?.cacheTTL,
            tags: options?.tags,
          }
        );
      }

      // Record metrics
      this.monitor.recordQuery(sql, duration, result.success);

      return rows as T[];
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitor.recordQuery(sql, duration, false, error as Error);
      throw error;
    }
  }

  /**
   * Execute transaction with monitoring
   */
  async transaction<T>(
    queries: Array<{ sql: string; params?: any[] }>,
    options?: { timeout?: number }
  ): Promise<T[]> {
    const startTime = Date.now();
    const transactionQueries = queries.map(({ sql, params }) => ({
      query: sql,
      params,
    }));

    try {
      const results = await this.connectionPool.executeTransaction<T>(
        transactionQueries,
        options
      );

      const duration = Date.now() - startTime;
      this.monitor.recordQuery(
        `TRANSACTION(${queries.length} queries)`,
        duration,
        true
      );

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitor.recordQuery(
        `TRANSACTION(${queries.length} queries)`,
        duration,
        false,
        error as Error
      );
      throw error;
    }
  }

  /**
   * Batch load with optimization and caching
   */
  async batchLoad<K, V>(
    keys: K[],
    loaderName: string,
    batchLoadFn?: (keys: K[]) => Promise<V[]>,
    options?: {
      maxBatchSize?: number;
      cache?: boolean;
      cacheKey?: (key: K) => string;
      cacheTTL?: number;
    }
  ): Promise<V[]> {
    let loader = this.optimizer.getLoader<K, V>(loaderName);

    if (!loader && batchLoadFn) {
      loader = this.optimizer.createLoader(
        loaderName,
        batchLoadFn,
        {
          maxBatchSize: options?.maxBatchSize,
          cache: options?.cache,
        }
      );
    }

    if (!loader) {
      throw new Error(`Loader ${loaderName} not found and no batch function provided`);
    }

    return loader.loadMany(keys);
  }

  /**
   * Load users with relations (optimized)
   */
  async loadUsersWithRelations(
    userIds: string[],
    relations: string[] = []
  ): Promise<any[]> {
    return this.optimizer.batchLoadUsersWithRelations(userIds, relations);
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateCache(tags: string[]): Promise<number> {
    return this.queryCache.invalidateByTags(tags);
  }

  /**
   * Warm up cache with common queries
   */
  async warmUpCache(queries: Array<{
    key: string;
    query: () => Promise<any>;
    ttl?: number;
    tags?: string[];
  }>): Promise<void> {
    const cacheQueries = queries.map(({ key, query, ttl, tags }) => ({
      key,
      query,
      options: { ttl, tags },
    }));

    await this.queryCache.warmUp(cacheQueries);
  }

  /**
   * Get comprehensive database health
   */
  getHealth(): {
    connectionPool: any;
    cache: any;
    monitor: any;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const connectionStats = this.connectionPool.getMetrics();
    const cacheStats = this.queryCache.getStats();
    const healthReport = this.monitor.generateHealthReport();

    return {
      connectionPool: {
        ...connectionStats,
        connections: this.connectionPool.getConnectionStatus(),
      },
      cache: cacheStats,
      monitor: {
        ...healthReport,
        metrics: this.monitor.getCurrentMetrics(connectionStats, cacheStats),
        alerts: this.monitor.getAlerts(),
      },
      overall: healthReport.overallHealth,
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    connection: any;
    cache: any;
    performance: any;
  } {
    const connectionStats = this.connectionPool.getMetrics();
    const cacheStats = this.queryCache.getStats();
    const currentMetrics = this.monitor.getCurrentMetrics(connectionStats, cacheStats);

    return {
      connection: connectionStats,
      cache: cacheStats,
      performance: currentMetrics.queryPerformance,
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit = 10): any[] {
    const metrics = this.monitor.getCurrentMetrics();
    return metrics.queryPerformance.slowQueries.slice(-limit);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): any[] {
    const metrics = this.monitor.getCurrentMetrics();
    return metrics.errorRates.recentErrors.slice(-limit);
  }

  /**
   * Force refresh connections
   */
  async refreshConnections(): Promise<void> {
    await this.connectionPool.refreshConnections();
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    this.queryCache.clear();
    this.optimizer.clearAll();
  }

  /**
   * Generate cache key for SQL query
   */
  private async generateCacheKey(sql: string, params?: any[]): Promise<string> {
    const paramStr = params ? JSON.stringify(params) : '';
    const hash = await this.secureHash(sql + paramStr);
    return `query:${hash}`;
  }

  /**
   * Secure hash function for cache keys using Web Crypto API
   */
  private async secureHash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    
    let hashBuffer: ArrayBuffer;
    
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
      // Use Web Crypto API (available in Cloudflare Workers and modern browsers)
      hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    } else {
      // Fallback to simple hash (not recommended for production)
      console.warn('No secure hash function available, using simple hash');
      return this.fallbackHash(str);
    }
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * Fallback hash function (only used when no secure alternatives are available)
   */
  private fallbackHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await this.connectionPool.shutdown();
    this.queryCache.shutdown();
    this.monitor.shutdown();
    this.optimizer.clearAll();
  }
}

/**
 * Create database service instance
 */
export function createDatabaseService(env: CloudflareEnv): DatabaseService {
  return new DatabaseService(env);
}

/**
 * Global database service instance
 */
let globalDatabaseService: DatabaseService | null = null;

/**
 * Get or create global database service
 */
export function getDatabaseService(env: CloudflareEnv): DatabaseService {
  if (!globalDatabaseService) {
    globalDatabaseService = new DatabaseService(env);
  }
  return globalDatabaseService;
}

export default DatabaseService;