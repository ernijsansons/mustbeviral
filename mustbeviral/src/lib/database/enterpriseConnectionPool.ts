/**
 * Enterprise Database Connection Pool
 * High-performance connection management with auto-scaling, load balancing,
 * and intelligent query routing for Must Be Viral V2
 */

import { Pool, PoolClient, PoolConfig} from 'pg';
import { EventEmitter} from 'events';

export interface ConnectionPoolConfig extends PoolConfig {
  // Basic pool settings
  min?: number;
  max?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  
  // Enterprise features
  readOnlyReplicas?: string[];
  writeOnlyPrimary?: string;
  autoScaling?: {
    enabled: boolean;
    minConnections: number;
    maxConnections: number;
    scaleUpThreshold: number;    // CPU/connection ratio to scale up
    scaleDownThreshold: number;  // CPU/connection ratio to scale down
    scaleUpCooldown: number;     // Cooldown period in ms
    scaleDownCooldown: number;   // Cooldown period in ms
  };
  
  // Health monitoring
  healthCheck?: {
    enabled: boolean;
    interval: number;           // Health check interval in ms
    timeout: number;           // Query timeout for health checks
    query: string;             // Health check query
    retries: number;           // Retry attempts before marking unhealthy
  };
  
  // Query routing
  queryRouting?: {
    enabled: boolean;
    readQueries: string[];     // Patterns for read queries
    writeQueries: string[];    // Patterns for write queries
    analyticsQueries: string[]; // Patterns for analytics queries
  };
  
  // Performance monitoring
  monitoring?: {
    enabled: boolean;
    slowQueryThreshold: number; // Log queries slower than this (ms)
    metricsInterval: number;    // Metrics collection interval
    maxMetricsHistory: number;  // Max metrics entries to keep
  };
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  slowQueries: number;
  errorCount: number;
  avgQueryTime: number;
  connectionErrors: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
}

export interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  pool: string;
  error?: string;
  rows?: number;
}

/**
 * Load balancer for database connections
 */
class DatabaseLoadBalancer {
  private readPools: Map<string, Pool> = new Map();
  private writePools: Map<string, Pool> = new Map();
  private analyticsPools: Map<string, Pool> = new Map();
  private currentReadIndex = 0;
  private currentAnalyticsIndex = 0;
  private poolMetrics: Map<string, ConnectionMetrics> = new Map();

  constructor(private config: ConnectionPoolConfig) {}

  addReadPool(name: string, pool: Pool) {
    this.readPools.set(name, pool);
    this.initializeMetrics(name, pool);
  }

  addWritePool(name: string, pool: Pool) {
    this.writePools.set(name, pool);
    this.initializeMetrics(name, pool);
  }

  addAnalyticsPool(name: string, pool: Pool) {
    this.analyticsPools.set(name, pool);
    this.initializeMetrics(name, pool);
  }

  private initializeMetrics(name: string, pool: Pool) {
    this.poolMetrics.set(name, {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      slowQueries: 0,
      errorCount: 0,
      avgQueryTime: 0,
      connectionErrors: 0,
      lastHealthCheck: new Date(),
      isHealthy: true
    });
  }

  /**
   * Get the best read pool based on load balancing strategy
   */
  getReadPool(): { pool: Pool; name: string } | null {
    const readPools = Array.from(this.readPools.entries());
    if (readPools.length === 0) {
    return null;
  }

    // Round-robin with health awareness
    let attempts = 0;
    while (attempts < readPools.length) {
      const [name, pool] = readPools[this.currentReadIndex % readPools.length];
      this.currentReadIndex++;

      const metrics = this.poolMetrics.get(name);
      if (metrics?.isHealthy) {
        return { pool, name };
      }
      attempts++;
    }

    // Fallback to primary if no healthy read replicas
    const writePools = Array.from(this.writePools.entries());
    return writePools.length > 0 ? { pool: writePools[0][1], name: writePools[0][0] } : null;
  }

  /**
   * Get the write pool (usually primary)
   */
  getWritePool(): { pool: Pool; name: string } | null {
    const writePools = Array.from(this.writePools.entries());
    if (writePools.length === 0) {
    return null;
  }

    // Use the first healthy write pool
    for (const [name, pool] of writePools) {
      const metrics = this.poolMetrics.get(name);
      if (metrics?.isHealthy) {
        return { pool, name };
      }
    }

    // Return first pool even if marked unhealthy (write operations are critical)
    return { pool: writePools[0][1], name: writePools[0][0] };
  }

  /**
   * Get analytics pool optimized for heavy queries
   */
  getAnalyticsPool(): { pool: Pool; name: string } | null {
    const analyticsPools = Array.from(this.analyticsPools.entries());
    if (analyticsPools.length === 0) {
      // Fallback to read pool
      return this.getReadPool();
    }

    // Load-based selection for analytics
    let bestPool: { pool: Pool; name: string } | null = null;
    let lowestLoad = Infinity;

    for (const [name, pool] of analyticsPools) {
      const metrics = this.poolMetrics.get(name);
      if (metrics?.isHealthy) {
        const load = (metrics.activeConnections / metrics.totalConnections)  ?? 0;
        if (load < lowestLoad) {
          lowestLoad = load;
          bestPool = { pool, name };
        }
      }
    }

    return bestPool ?? this.getReadPool();
  }

  updateMetrics(poolName: string, metrics: Partial<ConnectionMetrics>) {
    const current = this.poolMetrics.get(poolName);
    if (current) {
      this.poolMetrics.set(poolName, { ...current, ...metrics });
    }
  }

  getMetrics(): Map<string, ConnectionMetrics> {
    return new Map(this.poolMetrics);
  }
}

/**
 * Query router to determine optimal connection strategy
 */
class QueryRouter {
  private readPatterns: RegExp[];
  private writePatterns: RegExp[];
  private analyticsPatterns: RegExp[];

  constructor(config: ConnectionPoolConfig) {
    const routing = config.queryRouting ?? {};
    
    this.readPatterns = (routing.readQueries ?? [
      'SELECT.*FROM(?!.*INSERT|UPDATE|DELETE)',
      'WITH.*SELECT',
      'EXPLAIN\\s+SELECT',
      'SHOW\\s+',
      'DESCRIBE\\s+'
    ]).map(pattern => new RegExp(pattern, 'i'));

    this.writePatterns = (routing.writeQueries ?? [
      'INSERT\\s+',
      'UPDATE\\s+',
      'DELETE\\s+',
      'CREATE\\s+',
      'ALTER\\s+',
      'DROP\\s+',
      'TRUNCATE\\s+',
      'BEGIN\\s*;',
      'COMMIT\\s*;',
      'ROLLBACK\\s*;'
    ]).map(pattern => new RegExp(pattern, 'i'));

    this.analyticsPatterns = (routing.analyticsQueries ?? [
      'SELECT.*COUNT\\(.*\\)',
      'SELECT.*SUM\\(.*\\)',
      'SELECT.*AVG\\(.*\\)',
      'SELECT.*MAX\\(.*\\)',
      'SELECT.*MIN\\(.*\\)',
      'SELECT.*GROUP\\s+BY',
      'SELECT.*ORDER\\s+BY.*LIMIT',
      'WITH\\s+RECURSIVE',
      'SELECT.*JOIN.*JOIN' // Multiple joins indicate complex analytics
    ]).map(pattern => new RegExp(pattern, 'i'));
  }

  routeQuery(query: string): 'read' | 'write' | 'analytics' {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');

    // Check for write operations first (most critical)
    for (const pattern of this.writePatterns) {
      if (pattern.test(normalizedQuery)) {
        return 'write';
      }
    }

    // Check for analytics queries
    for (const pattern of this.analyticsPatterns) {
      if (pattern.test(normalizedQuery)) {
        return 'analytics';
      }
    }

    // Default to read for SELECT and other safe operations
    return 'read';
  }
}

/**
 * Enterprise Connection Pool Manager
 */
export class EnterpriseConnectionPool extends EventEmitter {
  private loadBalancer: DatabaseLoadBalancer;
  private queryRouter: QueryRouter;
  private config: ConnectionPoolConfig;
  private queryMetrics: QueryMetrics[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private lastScaleOperation = 0;
  private isShuttingDown = false;

  constructor(config: ConnectionPoolConfig) {
    super();
    this.config = {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 2000,
      ...config
    };

    this.loadBalancer = new DatabaseLoadBalancer(this.config);
    this.queryRouter = new QueryRouter(this.config);
    
    this.initialize();
  }

  private async initialize() {
    // Create primary write pool
    if (this.config.writeOnlyPrimary ?? this.config.host) {
      const writeConfig = {
        ...this.config,
        host: this.config.writeOnlyPrimary ?? this.config.host,
        max: Math.max(this.config.max! * 0.6, 10) // 60% of connections for writes
      };
      const writePool = new Pool(writeConfig);
      this.loadBalancer.addWritePool('primary', writePool);
    }

    // Create read replica pools
    if (this.config.readOnlyReplicas && this.config.readOnlyReplicas.length > 0) {
      const readConnectionsPerReplica = Math.ceil(this.config.max! * 0.3 / this.config.readOnlyReplicas.length);
      
      for (let i = 0; i < this.config.readOnlyReplicas.length; i++) {
        const replicaHost = this.config.readOnlyReplicas[i];
        const readConfig = {
          ...this.config,
          host: replicaHost,
          max: readConnectionsPerReplica,
          application_name: `mustbeviral_read_${i}`
        };
        const readPool = new Pool(readConfig);
        this.loadBalancer.addReadPool(`read_replica_${i}`, readPool);
      }
    }

    // Create analytics pool (can be same as read replicas but with different settings)
    const analyticsConfig = {
      ...this.config,
      host: this.config.readOnlyReplicas?.[0]  ?? this.config.host,
      max: Math.max(this.config.max! * 0.1, 2), // 10% for analytics
      statement_timeout: 300000, // 5 minutes for analytics queries
      application_name: 'mustbeviral_analytics'
    };
    const analyticsPool = new Pool(analyticsConfig);
    this.loadBalancer.addAnalyticsPool('analytics', analyticsPool);

    this.startHealthChecks();
    this.startMetricsCollection();
    
    console.warn('🗄️ Enterprise connection pool initialized');
    console.warn(`📊 Write pools: 1, Read pools: ${this.config.readOnlyReplicas?.length ?? 0}, Analytics pools: 1`);
  }

  /**
   * Execute a query with automatic routing and performance tracking
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number; duration: number; pool: string }> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    const startTime = Date.now();
    const queryType = this.queryRouter.routeQuery(text);
    let poolInfo: { pool: Pool; name: string } | null = null;
    let client: PoolClient | null = null;

    try {
      // Get appropriate pool based on query type
      switch (queryType) {
        case 'read':
          poolInfo = this.loadBalancer.getReadPool();
          break;
        case 'write':
          poolInfo = this.loadBalancer.getWritePool();
          break;
        case 'analytics':
          poolInfo = this.loadBalancer.getAnalyticsPool();
          break;
      }

      if (!poolInfo) {
        throw new Error(`No available ${queryType} connection pool`);
      }

      // Acquire connection and execute query
      client = await poolInfo.pool.connect();
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;

      // Record metrics
      this.recordQueryMetrics({
        query: text.substring(0, 200), // Truncate for storage
        executionTime: duration,
        timestamp: new Date(),
        pool: poolInfo.name,
        rows: result.rowCount
      });

      // Update pool metrics
      const metrics = this.loadBalancer.getMetrics().get(poolInfo.name);
      if (metrics) {
        metrics.totalQueries++;
        metrics.avgQueryTime = (metrics.avgQueryTime * (metrics.totalQueries - 1) + duration) / metrics.totalQueries;
        
        if (duration > (this.config.monitoring?.slowQueryThreshold ?? 1000)) {
          metrics.slowQueries++;
          console.warn(`🐌 Slow query detected (${duration}ms): ${text.substring(0, 100)}...`);
        }

        this.loadBalancer.updateMetrics(poolInfo.name, metrics);
      }

      this.emit('query_executed', { query: text, duration, pool: poolInfo.name, queryType });
      
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        duration,
        pool: poolInfo.name
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record error metrics
      this.recordQueryMetrics({
        query: text.substring(0, 200),
        executionTime: duration,
        timestamp: new Date(),
        pool: poolInfo?.name ?? 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (poolInfo) {
        const metrics = this.loadBalancer.getMetrics().get(poolInfo.name);
        if (metrics) {
          metrics.errorCount++;
          this.loadBalancer.updateMetrics(poolInfo.name, metrics);
        }
      }

      this.emit('query_error', { query: text, error, duration, pool: poolInfo?.name });
      throw error;

    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute a transaction with automatic retry and connection management
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: { retries?: number; timeout?: number } = {}
  ): Promise<T> {
    const { retries = 3, timeout = 30000} = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const poolInfo = this.loadBalancer.getWritePool();
      if (!poolInfo) {
        throw new Error('No available write connection pool for transaction');
      }

      const client = await poolInfo.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        const result = await Promise.race([
          callback(client),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Transaction timeout')), timeout)
          )
        ]);
        
        await client.query('COMMIT');
        
        this.emit('transaction_completed', { pool: poolInfo.name, attempt });
        return result;

      } catch (error) {
        lastError = error as Error;
        
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }

        this.emit('transaction_error', { 
          pool: poolInfo.name, 
          attempt, 
          error: lastError.message,
          willRetry: attempt < retries
        });

        if (attempt === retries) {
          throw lastError;
        }

        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));

      } finally {
        client.release();
      }
    }

    throw lastError ?? new Error('Transaction failed');
  }

  /**
   * Get a specific client for complex operations
   */
  async getClient(type: 'read' | 'write' | 'analytics' = 'read'): Promise<{ client: PoolClient; poolName: string; release: () => void }> {
    let poolInfo: { pool: Pool; name: string } | null = null;

    switch (type) {
      case 'read':
        poolInfo = this.loadBalancer.getReadPool();
        break;
      case 'write':
        poolInfo = this.loadBalancer.getWritePool();
        break;
      case 'analytics':
        poolInfo = this.loadBalancer.getAnalyticsPool();
        break;
    }

    if (!poolInfo) {
      throw new Error(`No available ${type} connection pool`);
    }

    const client = await poolInfo.pool.connect();
    
    return {
      client,
      poolName: poolInfo.name,
      release: () => client.release()
    };
  }

  private recordQueryMetrics(metrics: QueryMetrics) {
    this.queryMetrics.push(metrics);
    
    // Keep only recent metrics to prevent memory leaks
    const maxHistory = this.config.monitoring?.maxMetricsHistory ?? 10000;
    if (this.queryMetrics.length > maxHistory) {
      this.queryMetrics = this.queryMetrics.slice(-maxHistory);
    }
  }

  private startHealthChecks() {
    if (!this.config.healthCheck?.enabled) {return;}

    const interval = this.config.healthCheck.interval ?? 30000;
    const query = this.config.healthCheck.query ?? 'SELECT 1';
    const timeout = this.config.healthCheck.timeout ?? 5000;

    this.healthCheckInterval = setInterval(async() => {
      const pools = this.loadBalancer.getMetrics();
      
      for (const [poolName, metrics] of pools) {
        try {
          await Promise.race([
            this.query(query),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), timeout)
            )
          ]);
          
          metrics.isHealthy = true;
          metrics.lastHealthCheck = new Date();
          this.loadBalancer.updateMetrics(poolName, metrics);

        } catch (error) {
          console.warn(`❌ Health check failed for pool ${poolName}:`, error);
          metrics.isHealthy = false;
          metrics.connectionErrors++;
          this.loadBalancer.updateMetrics(poolName, metrics);
          
          this.emit('pool_unhealthy', { poolName, error });
        }
      }
    }, interval);
  }

  private startMetricsCollection() {
    if (!this.config.monitoring?.enabled) {return;}

    const interval = this.config.monitoring.metricsInterval ?? 60000;

    this.metricsInterval = setInterval_(() => {
      this.collectPoolMetrics();
      this.evaluateAutoScaling();
    }, interval);
  }

  private collectPoolMetrics() {
    const pools = this.loadBalancer.getMetrics();
    const overallMetrics = {
      totalPools: pools.size,
      healthyPools: Array.from(pools.values()).filter(m => m.isHealthy).length,
      totalQueries: Array.from(pools.values()).reduce((sum, m) => sum + m.totalQueries, 0),
      totalErrors: Array.from(pools.values()).reduce((sum, m) => sum + m.errorCount, 0),
      avgQueryTime: Array.from(pools.values()).reduce((sum, m) => sum + m.avgQueryTime, 0) / pools.size,
      recentSlowQueries: this.queryMetrics.filter(m => 
        Date.now() - m.timestamp.getTime() < 300000 && // Last 5 minutes
        m.executionTime > (this.config.monitoring?.slowQueryThreshold ?? 1000)
      ).length
    };

    this.emit('metrics_collected', overallMetrics);
  }

  private evaluateAutoScaling() {
    if (!this.config.autoScaling?.enabled) {return;}

    const now = Date.now();
    const cooldown = Math.max(
      this.config.autoScaling.scaleUpCooldown ?? 300000,
      this.config.autoScaling.scaleDownCooldown ?? 600000
    );

    if (now - this.lastScaleOperation < cooldown) {return;}

    const pools = this.loadBalancer.getMetrics();
    const totalConnections = Array.from(pools.values()).reduce((sum, m) => sum + m.totalConnections, 0);
    const activeConnections = Array.from(pools.values()).reduce((sum, m) => sum + m.activeConnections, 0);
    const utilizationRate = activeConnections / totalConnections;

    console.warn(`📊 Connection utilization: ${(utilizationRate * 100).toFixed(1)}% (${activeConnections}/${totalConnections})`);

    // Scale up if utilization is high
    if (utilizationRate > (this.config.autoScaling.scaleUpThreshold ?? 0.8) &&
        totalConnections < this.config.autoScaling.maxConnections) {
      console.warn('📈 Scaling up connection pools...');
      this.scaleUp();
      this.lastScaleOperation = now;
    }
    // Scale down if utilization is low
    else if (utilizationRate < (this.config.autoScaling.scaleDownThreshold ?? 0.3)  {
    &&
  }
             totalConnections > this.config.autoScaling.minConnections) {
      console.warn('📉 Scaling down connection pools...');
      this.scaleDown();
      this.lastScaleOperation = now;
    }
  }

  private scaleUp() {
    // Implementation would adjust pool sizes
    this.emit('scaling_up');
  }

  private scaleDown() {
    // Implementation would adjust pool sizes
    this.emit('scaling_down');
  }

  /**
   * Get comprehensive metrics for monitoring
   */
  getMetrics() {
    const pools = this.loadBalancer.getMetrics();
    const recentMetrics = this.queryMetrics.filter(m => 
      Date.now() - m.timestamp.getTime() < 300000 // Last 5 minutes
    );

    return {
      pools: Object.fromEntries(pools),
      queries: {
        total: recentMetrics.length,
        errors: recentMetrics.filter(m => m.error).length,
        slow: recentMetrics.filter(m => m.executionTime > (this.config.monitoring?.slowQueryThreshold ?? 1000)).length,
        avgExecutionTime: recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length ?? 0
      },
      routing: {
        read: recentMetrics.filter(m => m.pool.includes('read')).length,
        write: recentMetrics.filter(m => m.pool.includes('primary')).length,
        analytics: recentMetrics.filter(m => m.pool.includes('analytics')).length
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.warn('🛑 Shutting down enterprise connection pool...');
    this.isShuttingDown = true;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all pools
    const pools = this.loadBalancer.getMetrics();
    const shutdownPromises: Promise<void>[] = [];

    for (const [poolName] of pools) {
      // In a real implementation, we'd get the actual pool instances and call pool.end()
      console.warn(`📴 Closing pool: ${poolName}`);
    }

    await Promise.all(shutdownPromises);
    console.warn('✅ Enterprise connection pool shutdown complete');
  }
}

// Singleton instance for application use
let globalPool: EnterpriseConnectionPool | null = null;

export function createEnterprisePool(config: ConnectionPoolConfig): EnterpriseConnectionPool {
  if (globalPool) {
    throw new Error('Enterprise connection pool already exists. Use getEnterprisePool() instead.');
  }
  
  globalPool = new EnterpriseConnectionPool(config);
  return globalPool;
}

export function getEnterprisePool(): EnterpriseConnectionPool | null {
  return globalPool;
}

export async function shutdownEnterprisePool(): Promise<void> {
  if (globalPool) {
    await globalPool.shutdown();
    globalPool = null;
  }
}

export default EnterpriseConnectionPool;