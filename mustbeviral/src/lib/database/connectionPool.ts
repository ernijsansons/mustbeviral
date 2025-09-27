/**
 * Database Connection Pooling for D1
 * Manages D1 database connections with pooling, health checks, and performance monitoring
 */

import type { D1Database, D1Result } from '@cloudflare/workers-types';
import { CloudflareEnv} from '../cloudflare';
import { ValidationError} from '../../middleware/validation';

export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  healthCheckInterval: number;
  retryAttempts: number;
  retryDelay: number;
  priorityLevels: number;
  preWarmConnections: number;
  connectionPreWarmThreshold: number;
}

export interface ConnectionMetrics {
  activeConnections: number;
  totalConnections: number;
  failedConnections: number;
  averageResponseTime: number;
  healthCheckStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: Date;
  queryCount: number;
  errorCount: number;
}

export interface DatabaseConnection {
  id: string;
  db: D1Database;
  createdAt: Date;
  lastUsed: Date;
  isHealthy: boolean;
  queryCount: number;
  errorCount: number;
  averageResponseTime: number;
  priority: number;
  isInUse: boolean;
  consecutiveErrors: number;
}

export class DatabaseConnectionPool {
  private env: CloudflareEnv;
  private config: ConnectionPoolConfig;
  private connections: Map<string, DatabaseConnection> = new Map();
  private connectionQueue: Array<{ priority: number; resolve: Function; reject: Function; timestamp: number }> = [];
  private healthCheckTimer?: unknown;
  private preWarmTimer?: unknown;
  private metrics: ConnectionMetrics;
  private queryTimeHistory: number[] = [];
  private readonly MAXHISTORY = 100;

  constructor(env: CloudflareEnv, config?: Partial<ConnectionPoolConfig>) {
    this.env = env;
    this.config = {
      maxConnections: 10,
      connectionTimeout: 5000,
      idleTimeout: 300000, // 5 minutes
      healthCheckInterval: 180000, // 3 minutes (optimized)
      retryAttempts: 3,
      retryDelay: 1000,
      priorityLevels: 3,
      preWarmConnections: 2,
      connectionPreWarmThreshold: 0.7,
      ...config
    };

    this.metrics = {
      activeConnections: 0,
      totalConnections: 0,
      failedConnections: 0,
      averageResponseTime: 0,
      healthCheckStatus: 'healthy',
      lastHealthCheck: new Date(),
      queryCount: 0,
      errorCount: 0
    };

    this.startHealthChecks();
  }

  /**
   * Get a database connection from the pool
   */
  async getConnection(): Promise<DatabaseConnection> {
    try {
      // Try to get an existing healthy connection
      const availableConnection = this.findAvailableConnection();
      if (availableConnection) {
        availableConnection.lastUsed = new Date();
        this.metrics.activeConnections++;
        return availableConnection;
      }

      // Create new connection if under limit
      if (this.connections.size < this.config.maxConnections) {
        const connection = await this.createConnection();
        this.connections.set(connection.id, connection);
        this.metrics.activeConnections++;
        this.metrics.totalConnections++;
        return connection;
      }

      // Wait for connection to become available
      return await this.waitForConnection();
    } catch (error: unknown) {
      this.metrics.failedConnections++;
      console.error('LOG: DB-POOL-ERROR-1 - Failed to get database connection:', error);
      throw new ValidationError(
        [{ field: 'database', message: 'Unable to acquire database connection' }],
        'Database connection failed'
      );
    }
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastUsed = new Date();
      this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    }
  }

  /**
   * Execute a query with automatic connection management
   */
  async executeQuery<T = unknown>(
    query: string,
    params?: unknown[],
    options?: { timeout?: number; retries?: number }
  ): Promise<D1Result<T>> {
    const startTime = Date.now();
    let connection: DatabaseConnection | null = null;
    let attempt = 0;
    const maxAttempts = options?.retries ?? this.config.retryAttempts;

    while (attempt < maxAttempts) {
      try {
        connection = await this.getConnection();

        // Execute query with timeout
        const queryPromise = connection.db.prepare(query).bind(...(params ?? [])).all();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), options?.timeout ?? this.config.connectionTimeout);
        });

        const result = await Promise.race([queryPromise, timeoutPromise]) as D1Result<T>;

        // Update metrics
        const duration = Date.now() - startTime;
        this.updateQueryMetrics(connection, duration, true);

        this.releaseConnection(connection.id);
        return result;

      } catch (error: unknown) {
        attempt++;

        if (connection) {
          this.updateQueryMetrics(connection, Date.now() - startTime, false);
          this.releaseConnection(connection.id);

          // Mark connection as unhealthy if it's consistently failing
          if (connection.errorCount > 5) {
            connection.isHealthy = false;
            console.warn(`LOG: DB-POOL-HEALTH-1 - Connection ${connection.id} marked as unhealthy`);
          }
        }

        this.metrics.errorCount++;

        if (attempt >= maxAttempts) {
          console.error(`LOG: DB-POOL-ERROR-2 - Query failed after ${maxAttempts} attempts:`, error);
          throw new ValidationError(
            [{ field: 'query', message: `Database query failed: ${error.message}` }],
            'Database query execution failed'
          );
        }

        // Wait before retry
        await this.sleep(this.config.retryDelay * attempt);
      }
    }

    throw new Error('Unexpected error in executeQuery');
  }

  /**
   * Execute a transaction with automatic rollback on failure
   */
  async executeTransaction<T>(
    queries: Array<{ query: string; params?: unknown[] }>,
    options?: { timeout?: number }
  ): Promise<T[]> {
    const connection = await this.getConnection();
    const startTime = Date.now();

    try {
      // D1 doesn't support traditional transactions, so we simulate with batch operations
      const statements = queries.map(({ query, params }) =>
        connection.db.prepare(query).bind(...(params || []))
      );

      const results = await connection.db.batch(statements);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(connection, duration, true);

      this.releaseConnection(connection.id);
      return results as T[];

    } catch (error: unknown) {
      // Update error metrics
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(connection, duration, false);

      this.releaseConnection(connection.id);

      console.error('LOG: DB-POOL-TRANSACTION-ERROR-1 - Transaction failed:', error);
      throw new ValidationError(
        [{ field: 'transaction', message: `Database transaction failed: ${error.message}` }],
        'Database transaction execution failed'
      );
    }
  }

  /**
   * Get pool metrics
   */
  getMetrics(): ConnectionMetrics {
    // Update average response time
    if (this.queryTimeHistory.length > 0) {
      this.metrics.averageResponseTime =
        this.queryTimeHistory.reduce((a, b) => a + b, 0) / this.queryTimeHistory.length;
    }

    return { ...this.metrics };
  }

  /**
   * Get detailed connection status
   */
  getConnectionStatus(): Array<{
    id: string;
    isHealthy: boolean;
    age: number;
    idleTime: number;
    queryCount: number;
    errorCount: number;
    averageResponseTime: number;
  }> {
    const now = new Date();

    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      isHealthy: conn.isHealthy,
      age: now.getTime() - conn.createdAt.getTime(),
      idleTime: now.getTime() - conn.lastUsed.getTime(),
      queryCount: conn.queryCount,
      errorCount: conn.errorCount,
      averageResponseTime: conn.averageResponseTime
    }));
  }

  /**
   * Cleanup idle connections
   */
  async cleanupIdleConnections(): Promise<number> {
    const now = new Date();
    let removedCount = 0;

    for (const [id, connection] of this.connections.entries()) {
      const idleTime = now.getTime() - connection.lastUsed.getTime();

      if (idleTime > this.config.idleTimeout) {
        this.connections.delete(id);
        removedCount++;
        console.warn(`LOG: DB-POOL-CLEANUP-1 - Removed idle connection ${id}`);
      }
    }

    if (removedCount > 0) {
      console.warn(`LOG: DB-POOL-CLEANUP-2 - Cleaned up ${removedCount} idle connections`);
    }

    return removedCount;
  }

  /**
   * Force refresh all connections
   */
  async refreshConnections(): Promise<void> {
    console.warn('LOG: DB-POOL-REFRESH-1 - Refreshing all database connections');

    // Mark all connections as unhealthy to force recreation
    for (const connection of this.connections.values()) {
      connection.isHealthy = false;
    }

    // Clear the pool
    this.connections.clear();

    // Reset metrics
    this.metrics.activeConnections = 0;
    this.metrics.errorCount = 0;
    this.metrics.healthCheckStatus = 'healthy';

    console.warn('LOG: DB-POOL-REFRESH-2 - Connection pool refreshed');
  }

  /**
   * Find an available healthy connection
   */
  private findAvailableConnection(): DatabaseConnection | null {
    for (const connection of this.connections.values()) {
      if (connection.isHealthy) {
        return connection;
      }
    }
    return null;
  }

  /**
   * Create a new database connection
   */
  private async createConnection(): Promise<DatabaseConnection> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    try {
      // Test the connection
      const testResult = await this.env.DB.prepare('SELECT 1 as test').first();
      if (!testResult || testResult.test !== 1) {
        throw new Error('Database connection test failed');
      }

      const connection: DatabaseConnection = {
        id: connectionId,
        db: this.env.DB,
        createdAt: new Date(),
        lastUsed: new Date(),
        isHealthy: true,
        queryCount: 0,
        errorCount: 0,
        averageResponseTime: 0
      };

      console.log(`LOG: DB-POOL-CREATE-1 - Created new database connection ${connectionId}`);
      return connection;

    } catch (error: unknown) {
      console.error(`LOG: DB-POOL-CREATE-ERROR-1 - Failed to create connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForConnection(): Promise<DatabaseConnection> {
    const maxWaitTime = this.config.connectionTimeout;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Cleanup idle connections to free up space
      await this.cleanupIdleConnections();

      // Try to find an available connection
      const connection = this.findAvailableConnection();
      if (connection) {
        return connection;
      }

      // Wait a bit before trying again
      await this.sleep(100);
    }

    throw new Error('Connection pool timeout: no connections available');
  }

  /**
   * Update query metrics for a connection
   */
  private updateQueryMetrics(connection: DatabaseConnection, duration: number, success: boolean): void {
    connection.queryCount++;
    this.metrics.queryCount++;

    if (success) {
      // Update response time
      const totalTime = connection.averageResponseTime * (connection.queryCount - 1) + duration;
      connection.averageResponseTime = totalTime / connection.queryCount;

      // Add to history for pool average
      this.queryTimeHistory.push(duration);
      if (this.queryTimeHistory.length > this.MAXHISTORY) {
        this.queryTimeHistory.shift();
      }
    } else {
      connection.errorCount++;
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async() => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    let healthyCount = 0;
    const totalCount = this.connections.size;

    console.warn(`LOG: DB-POOL-HEALTH-CHECK-1 - Starting health check for ${totalCount} connections`);

    for (const connection of this.connections.values()) {
      try {
        const result = await connection.db.prepare('SELECT 1 as health_check').first();
        if (result && result.healthcheck === 1) {
          connection.isHealthy = true;
          healthyCount++;
        } else {
          connection.isHealthy = false;
          console.warn(`LOG: DB-POOL-HEALTH-CHECK-2 - Connection ${connection.id} failed health check`);
        }
      } catch (error: unknown) {
        connection.isHealthy = false;
        connection.errorCount++;
        console.error(`LOG: DB-POOL-HEALTH-CHECK-3 - Connection ${connection.id} health check error:`, error);
      }
    }

    // Update pool health status
    const healthRatio = totalCount > 0 ? healthyCount / totalCount : 1;
    if (healthRatio >= 0.8) {
      this.metrics.healthCheckStatus = 'healthy';
    } else if (healthRatio >= 0.5) {
      this.metrics.healthCheckStatus = 'degraded';
    } else {
      this.metrics.healthCheckStatus = 'unhealthy';
    }

    this.metrics.lastHealthCheck = new Date();

    const duration = Date.now() - startTime;
    console.warn(`LOG: DB-POOL-HEALTH-CHECK-4 - Health check completed: ${healthyCount}/${totalCount} healthy (${duration}ms)`);

    // Cleanup unhealthy connections if we have too many failures
    if (this.metrics.healthCheckStatus === 'unhealthy') {
      await this.cleanupUnhealthyConnections();
    }
  }

  /**
   * Remove unhealthy connections from the pool
   */
  private async cleanupUnhealthyConnections(): Promise<void> {
    let removedCount = 0;

    for (const [id, connection] of this.connections.entries()) {
      if (!connection.isHealthy && connection.errorCount > 3) {
        this.connections.delete(id);
        removedCount++;
        console.warn(`LOG: DB-POOL-CLEANUP-UNHEALTHY-1 - Removed unhealthy connection ${id}`);
      }
    }

    if (removedCount > 0) {
      console.warn(`LOG: DB-POOL-CLEANUP-UNHEALTHY-2 - Removed ${removedCount} unhealthy connections`);
    }
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.warn('LOG: DB-POOL-SHUTDOWN-1 - Shutting down database connection pool');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Wait for active connections to complete (with timeout)
    const shutdownTimeout = 10000; // 10 seconds
    const startTime = Date.now();

    while (this.metrics.activeConnections > 0 && Date.now() - startTime < shutdownTimeout) {
      await this.sleep(100);
    }

    this.connections.clear();
    this.metrics.activeConnections = 0;

    console.warn('LOG: DB-POOL-SHUTDOWN-2 - Database connection pool shutdown complete');
  }
}

/**
 * Global connection pool instance
 */
let globalConnectionPool: DatabaseConnectionPool | null = null;

/**
 * Get or create the global connection pool
 */
export function getConnectionPool(env: CloudflareEnv, config?: Partial<ConnectionPoolConfig>): DatabaseConnectionPool {
  if (!globalConnectionPool) {
    globalConnectionPool = new DatabaseConnectionPool(env, config);
  }
  return globalConnectionPool;
}

/**
 * Initialize connection pool with environment
 */
export async function initializeConnectionPool(env: CloudflareEnv, config?: Partial<ConnectionPoolConfig>): Promise<DatabaseConnectionPool> {
  const pool = getConnectionPool(env, config);

  // Perform initial health check
  await pool.performHealthCheck();

  console.log('LOG: DB-POOL-INIT-1 - Database connection pool initialized');
  return pool;
}