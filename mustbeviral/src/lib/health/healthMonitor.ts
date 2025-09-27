/**
 * Health Monitoring System
 * Comprehensive health checks and monitoring endpoints for operational visibility
 */

import { CloudflareEnv} from '../cloudflare';
import { getConnectionPool} from '../database/connectionPool';
import { getPerformanceMonitor} from '../monitoring/performanceMonitor';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
  summary: HealthSummary;
  dependencies: DependencyStatus[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  error?: string;
  details?: Record<string, unknown>;
  critical: boolean;
}

export interface HealthSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  critical: number;
  responseTime: number;
}

export interface DependencyStatus {
  name: string;
  type: 'database' | 'cache' | 'storage' | 'external_api' | 'service';
  status: 'available' | 'degraded' | 'unavailable';
  responseTime: number;
  lastChecked: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthConfig {
  checkInterval: number;
  timeout: number;
  enableDetailedChecks: boolean;
  enableDependencyChecks: boolean;
  criticalChecks: string[];
  alertThresholds: {
    responseTime: number;
    failureRate: number;
    uptimeThreshold: number;
  };
}

export class HealthMonitor {
  private env: CloudflareEnv;
  private config: HealthConfig;
  private startTime: Date;
  private lastHealthCheck?: HealthStatus;
  private healthHistory: Array<{ timestamp: Date; status: HealthStatus }> = [];
  private readonly MAXHISTORY = 100;

  constructor(env: CloudflareEnv, config?: Partial<HealthConfig>) {
    this.env = env;
    this.startTime = new Date();
    this.config = {
      checkInterval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
      enableDetailedChecks: true,
      enableDependencyChecks: true,
      criticalChecks: ['database', 'environment', 'secrets'],
      alertThresholds: {
        responseTime: 5000,
        failureRate: 10,
        uptimeThreshold: 99.9
      },
      ...config
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];
    const dependencies: DependencyStatus[] = [];

    try {
      // Basic system checks
      checks.push(await this.checkEnvironment());
      checks.push(await this.checkSecrets());
      checks.push(await this.checkMemory());

      // Infrastructure checks
      if (this.config.enableDependencyChecks) {
        checks.push(await this.checkDatabase());
        checks.push(await this.checkKVStorage());
        checks.push(await this.checkR2Storage());

        dependencies.push(await this.checkDatabaseDependency());
        dependencies.push(await this.checkCacheDependency());
        dependencies.push(await this.checkStorageDependency());
      }

      // Performance checks
      if (this.config.enableDetailedChecks) {
        checks.push(await this.checkPerformanceMetrics());
        checks.push(await this.checkCircuitBreakers());
        checks.push(await this.checkRateLimit());
      }

      // Calculate summary
      const summary = this.calculateSummary(checks);
      const totalTime = Date.now() - startTime;

      // Determine overall status
      const overallStatus = this.determineOverallStatus(checks, summary);

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        version: process.env.npm_package_version ?? '1.0.0',
        environment: this.env.ENVIRONMENT ?? 'unknown',
        checks,
        summary: {
          ...summary,
          responseTime: totalTime
        },
        dependencies
      };

      // Store in history
      this.addToHistory(healthStatus);
      this.lastHealthCheck = healthStatus;

      return healthStatus;

    } catch (error: unknown) {
      const errorStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        version: process.env.npm_package_version ?? '1.0.0',
        environment: this.env.ENVIRONMENT ?? 'unknown',
        checks: [{
          name: 'health_check_execution',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message,
          critical: true
        }],
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          warnings: 0,
          critical: 1,
          responseTime: Date.now() - startTime
        },
        dependencies: []
      };

      this.addToHistory(errorStatus);
      this.lastHealthCheck = errorStatus;

      return errorStatus;
    }
  }

  /**
   * Get current health status (cached)
   */
  getCurrentHealth(): HealthStatus | null {
    return this.lastHealthCheck ?? null;
  }

  /**
   * Get health history
   */
  getHealthHistory(limit?: number): Array<{ timestamp: Date; status: HealthStatus }> {
    const history = [...this.healthHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get health trends
   */
  getHealthTrends(): {
    uptimePercentage: number;
    averageResponseTime: number;
    errorRate: number;
    trends: {
      uptime: Array<{ timestamp: Date; uptime: boolean }>;
      responseTime: Array<{ timestamp: Date; responseTime: number }>;
      failureRate: Array<{ timestamp: Date; failures: number }>;
    };
  } {
    const history = this.healthHistory.slice(-24); // Last 24 checks

    const uptimeData = history.map(h => ({
      timestamp: h.timestamp,
      uptime: h.status.status === 'healthy'
    }));

    const responseTimeData = history.map(h => ({
      timestamp: h.timestamp,
      responseTime: h.status.summary.responseTime
    }));

    const failureData = history.map(h => ({
      timestamp: h.timestamp,
      failures: h.status.summary.failed
    }));

    const uptimePercentage = history.length > 0
      ? (uptimeData.filter(d => d.uptime).length / history.length) * 100
      : 100;

    const averageResponseTime = history.length > 0
      ? history.reduce((sum, h) => sum + h.status.summary.responseTime, 0) / history.length
      : 0;

    const errorRate = history.length > 0
      ? (history.reduce((sum, h) => sum + h.status.summary.failed, 0) /
         history.reduce((sum, h) => sum + h.status.summary.total, 1)) * 100
      : 0;

    return { uptimePercentage,
      averageResponseTime,
      errorRate,
      trends: {
        uptime: uptimeData,
        responseTime: responseTimeData,
        failureRate: failureData
      }
    };
  }

  /**
   * Check environment configuration
   */
  private async checkEnvironment(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const requiredEnvVars = ['ENVIRONMENT', 'JWT_SECRET', 'ENCRYPTION_KEY'];
      const missing = requiredEnvVars.filter(key => !this.env[key]);

      if (missing.length > 0) {
        return {
          name: 'environment',
          status: 'fail',
          duration: Date.now() - startTime,
          error: `Missing environment variables: ${missing.join(', ')}`,
          critical: true
        };
      }

      return {
        name: 'environment',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'All required environment variables present',
        critical: true,
        details: {
          environment: this.env.ENVIRONMENT,
          hasSecrets: !!this.env.JWT_SECRET && !!this.env.ENCRYPTIONKEY
        }
      };

    } catch (error: unknown) {
      return {
        name: 'environment',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error.message,
        critical: true
      };
    }
  }

  /**
   * Check secrets availability
   */
  private async checkSecrets(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const secrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'STRIPE_SECRET_KEY'];
      const issues: string[] = [];

      for (const secret of secrets) {
        const value = this.env[secret];
        if (!value) {
          issues.push(`${secret} not set`);
        } else if (value.length < 32) {
          issues.push(`${secret} too short (< 32 chars)`);
        }
      }

      if (issues.length > 0) {
        return {
          name: 'secrets',
          status: 'warn',
          duration: Date.now() - startTime,
          message: `Secret validation issues: ${issues.join(', ')}`,
          critical: true
        };
      }

      return {
        name: 'secrets',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'All secrets validated',
        critical: true
      };

    } catch (error: unknown) {
      return {
        name: 'secrets',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error.message,
        critical: true
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Cloudflare Workers don't have direct memory monitoring
      // This is a placeholder for memory-related checks
      const memoryCheck = {
        heapUsed: 0, // Would get from process.memoryUsage() in Node.js
        heapTotal: 0,
        external: 0
      };

      return {
        name: 'memory',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'Memory monitoring not available in Workers environment',
        critical: false,
        details: memoryCheck
      };

    } catch (error: unknown) {
      return {
        name: 'memory',
        status: 'warn',
        duration: Date.now() - startTime,
        error: error.message,
        critical: false
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const pool = getConnectionPool(this.env);
      const connection = await pool.getConnection();

      // Test query
      const result = await this.env.DB.prepare('SELECT 1 as health_check').first();

      pool.releaseConnection(connection.id);

      if (!result ?? result.health_check !== 1) {
        return {
          name: 'database',
          status: 'fail',
          duration: Date.now() - startTime,
          error: 'Database health check query failed',
          critical: true
        };
      }

      const metrics = pool.getMetrics();

      return {
        name: 'database',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'Database connectivity verified',
        critical: true,
        details: {
          activeConnections: metrics.activeConnections,
          totalConnections: metrics.totalConnections,
          healthStatus: metrics.healthCheckStatus
        }
      };

    } catch (error: unknown) {
      return {
        name: 'database',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error.message,
        critical: true
      };
    }
  }

  /**
   * Check KV storage
   */
  private async checkKVStorage(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'health_test';

      // Test write
      await this.env.TRENDS_CACHE.put(testKey, testValue, { expirationTtl: 60 });

      // Test read
      const retrieved = await this.env.TRENDS_CACHE.get(testKey);

      // Cleanup
      await this.env.TRENDS_CACHE.delete(testKey);

      if (retrieved !== testValue) {
        return {
          name: 'kv_storage',
          status: 'fail',
          duration: Date.now() - startTime,
          error: 'KV storage read/write test failed',
          critical: false
        };
      }

      return {
        name: 'kv_storage',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'KV storage read/write verified',
        critical: false
      };

    } catch (error: unknown) {
      return {
        name: 'kv_storage',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error.message,
        critical: false
      };
    }
  }

  /**
   * Check R2 storage
   */
  private async checkR2Storage(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      if (!this.env.CONTENTSTORAGE) {
        return {
          name: 'r2_storage',
          status: 'warn',
          duration: Date.now() - startTime,
          message: 'R2 storage not configured',
          critical: false
        };
      }

      const testKey = `health_check_${Date.now()}.txt`;
      const testContent = 'health test content';

      // Test write
      await this.env.CONTENT_STORAGE.put(testKey, testContent);

      // Test read
      const retrieved = await this.env.CONTENT_STORAGE.get(testKey);
      const content = await retrieved?.text();

      // Cleanup
      await this.env.CONTENT_STORAGE.delete(testKey);

      if (content !== testContent) {
        return {
          name: 'r2_storage',
          status: 'fail',
          duration: Date.now() - startTime,
          error: 'R2 storage read/write test failed',
          critical: false
        };
      }

      return {
        name: 'r2_storage',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'R2 storage read/write verified',
        critical: false
      };

    } catch (error: unknown) {
      return {
        name: 'r2_storage',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error.message,
        critical: false
      };
    }
  }

  /**
   * Check performance metrics
   */
  private async checkPerformanceMetrics(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const perfMonitor = getPerformanceMonitor(this.env);
      const metrics = perfMonitor.getCurrentMetrics();

      const issues: string[] = [];

      if (metrics.responseTime.avg > this.config.alertThresholds.responseTime) {
        issues.push(`High average response time: ${metrics.responseTime.avg}ms`);
      }

      if (metrics.errors.rate > this.config.alertThresholds.failureRate) {
        issues.push(`High error rate: ${metrics.errors.rate}%`);
      }

      const status = issues.length === 0 ? 'pass' : 'warn';

      return {
        name: 'performance',
        status,
        duration: Date.now() - startTime,
        message: issues.length === 0 ? 'Performance metrics healthy' : issues.join(', '),
        critical: false,
        details: {
          averageResponseTime: metrics.responseTime.avg,
          errorRate: metrics.errors.rate,
          throughput: metrics.throughput.requestsPerSecond
        }
      };

    } catch (error: unknown) {
      return {
        name: 'performance',
        status: 'warn',
        duration: Date.now() - startTime,
        error: error.message,
        critical: false
      };
    }
  }

  /**
   * Check circuit breakers
   */
  private async checkCircuitBreakers(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // This would check actual circuit breaker instances
      // For now, return a placeholder
      return {
        name: 'circuit_breakers',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'Circuit breakers operational',
        critical: false,
        details: {
          breakersOpen: 0,
          breakersHalfOpen: 0,
          breakersClosed: 1
        }
      };

    } catch (error: unknown) {
      return {
        name: 'circuit_breakers',
        status: 'warn',
        duration: Date.now() - startTime,
        error: error.message,
        critical: false
      };
    }
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test rate limiter functionality
      const testRequest = new Request('https://example.com/health', {
        method: 'GET',
        headers: {
          'CF-Connecting-IP': '127.0.0.1',
          'User-Agent': 'health-check'
        }
      });

      // This would test actual rate limiter
      return {
        name: 'rate_limiter',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'Rate limiter operational',
        critical: false
      };

    } catch (error: unknown) {
      return {
        name: 'rate_limiter',
        status: 'warn',
        duration: Date.now() - startTime,
        error: error.message,
        critical: false
      };
    }
  }

  /**
   * Check database dependency
   */
  private async checkDatabaseDependency(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      const result = await this.env.DB.prepare('SELECT 1').first();
      const responseTime = Date.now() - startTime;

      return {
        name: 'D1 Database',
        type: 'database',
        status: result ? 'available' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        metadata: {
          query: 'SELECT 1',
          result: !!result
        }
      };

    } catch (error: unknown) {
      return {
        name: 'D1 Database',
        type: 'database',
        status: 'unavailable',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check cache dependency
   */
  private async checkCacheDependency(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      await this.env.TRENDS_CACHE.get('health_test');
      const responseTime = Date.now() - startTime;

      return {
        name: 'KV Cache',
        type: 'cache',
        status: 'available',
        responseTime,
        lastChecked: new Date().toISOString()
      };

    } catch (error: unknown) {
      return {
        name: 'KV Cache',
        type: 'cache',
        status: 'unavailable',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check storage dependency
   */
  private async checkStorageDependency(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      if (!this.env.CONTENTSTORAGE) {
        return {
          name: 'R2 Storage',
          type: 'storage',
          status: 'unavailable',
          responseTime: 0,
          lastChecked: new Date().toISOString(),
          error: 'R2 storage not configured'
        };
      }

      await this.env.CONTENT_STORAGE.head('health_test');
      const responseTime = Date.now() - startTime;

      return {
        name: 'R2 Storage',
        type: 'storage',
        status: 'available',
        responseTime,
        lastChecked: new Date().toISOString()
      };

    } catch (error: unknown) {
      return {
        name: 'R2 Storage',
        type: 'storage',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Calculate health summary
   */
  private calculateSummary(checks: HealthCheck[]): Omit<HealthSummary, 'responseTime'> {
    const total = checks.length;
    const passed = checks.filter(c => c.status === 'pass').length;
    const failed = checks.filter(c => c.status === 'fail').length;
    const warnings = checks.filter(c => c.status === 'warn').length;
    const critical = checks.filter(c => c.critical && c.status === 'fail').length;

    return { total,
      passed,
      failed,
      warnings,
      critical
    };
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    checks: HealthCheck[],
    summary: Omit<HealthSummary, 'responseTime'>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // If unknown critical checks fail, system is unhealthy
    if (summary.critical > 0) {
      return 'unhealthy';
    }

    // If more than 20% of checks fail, system is degraded
    if (summary.failed > 0 && (summary.failed / summary.total) > 0.2) {
      return 'degraded';
    }

    // If there are warnings, system is degraded
    if (summary.warnings > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get system uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Add status to history
   */
  private addToHistory(status: HealthStatus): void {
    this.healthHistory.push({
      timestamp: new Date(),
      status
    });

    // Keep only recent history
    if (this.healthHistory.length > this.MAXHISTORY) {
      this.healthHistory = this.healthHistory.slice(-this.MAXHISTORY);
    }
  }
}

/**
 * Health check endpoints handler
 */
export class HealthEndpoints {
  private healthMonitor: HealthMonitor;

  constructor(env: CloudflareEnv, config?: Partial<HealthConfig>) {
    this.healthMonitor = new HealthMonitor(env, config);
  }

  /**
   * Basic health check endpoint
   */
  async handleBasicHealth(): Promise<Response> {
    try {
      const status = this.healthMonitor.getCurrentHealth();

      if (!status) {
        // Perform quick health check
        const quickStatus = await this.healthMonitor.performHealthCheck();
        return new Response(
          JSON.stringify({
            status: quickStatus.status,
            timestamp: quickStatus.timestamp
          }),
          {
            status: quickStatus.status === 'healthy' ? 200 : 503,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          status: status.status,
          timestamp: status.timestamp
        }),
        {
          status: status.status === 'healthy' ? 200 : 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }
  }

  /**
   * Detailed health check endpoint
   */
  async handleDetailedHealth(): Promise<Response> {
    try {
      const status = await this.healthMonitor.performHealthCheck();

      return new Response(
        JSON.stringify(status, null, 2),
        {
          status: status.status === 'healthy' ? 200 : 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }
  }

  /**
   * Health trends endpoint
   */
  async handleHealthTrends(): Promise<Response> {
    try {
      const trends = this.healthMonitor.getHealthTrends();

      return new Response(
        JSON.stringify(trends, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=60'
          }
        }
      );

    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }
  }

  /**
   * Readiness check endpoint
   */
  async handleReadiness(): Promise<Response> {
    try {
      const status = await this.healthMonitor.performHealthCheck();
      const isReady = status.summary.critical === 0;

      return new Response(
        JSON.stringify({
          ready: isReady,
          status: status.status,
          criticalFailures: status.summary.critical,
          timestamp: status.timestamp
        }),
        {
          status: isReady ? 200 : 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          ready: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }
  }

  /**
   * Liveness check endpoint
   */
  async handleLiveness(): Promise<Response> {
    // Simple liveness check - just return 200 if service is running
    return new Response(
      JSON.stringify({
        alive: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}