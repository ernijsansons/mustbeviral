/**
 * Enhanced Circuit Breaker Implementation
 * Provides advanced circuit breaker pattern with monitoring and adaptive thresholds
 */

import { CircuitBreakerConfig, CircuitBreakerState, CircuitBreakerMetrics} from '../types/security';

export interface EnhancedCircuitBreakerConfig extends CircuitBreakerConfig {
  healthCheckInterval?: number;
  adaptiveThreshold?: boolean;
  errorClassification?: {
    retryable: Array<string | RegExp>;
    nonRetryable: Array<string | RegExp>;
  };
  backoffStrategy?: 'fixed' | 'exponential' | 'linear';
  maxBackoffTime?: number;
  jitterEnabled?: boolean;
}

export interface CircuitBreakerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  circuitOpenCount: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
}

export class EnhancedCircuitBreaker {
  private config: Required<EnhancedCircuitBreakerConfig>;
  private state: CircuitBreakerState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private requests = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private halfOpenRequests = 0;
  private responseTimeHistory: number[] = [];
  private errorHistory: Array<{ timestamp: Date; error: string; retryable: boolean }> = [];
  private stateChangeHistory: Array<{ timestamp: Date; from: CircuitBreakerState; to: CircuitBreakerState }> = [];
  private healthCheckTimer?: unknown;
  private readonly MAXHISTORY = 100;

  constructor(config: EnhancedCircuitBreakerConfig) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 300000,
      expectedErrors: [],
      healthCheckInterval: 30000,
      adaptiveThreshold: false,
      errorClassification: {
        retryable: [/timeout/i, /connection/i, /network/i, /503/, /502/, /504/],
        nonRetryable: [/400/, /401/, /403/, /404/, /validation/i]
      },
      backoffStrategy: 'exponential',
      maxBackoffTime: 300000,
      jitterEnabled: true,
      ...config
    };

    if (this.config.healthCheckInterval > 0) {
      this.startHealthCheck();
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName?: string,
    timeout?: number
  ): Promise<T> {
    const startTime = Date.now();

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (this.canAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN for ${operationName ?? 'operation'}`,
          this.getTimeUntilNextAttempt()
        );
      }
    }

    // Limit concurrent requests in HALF_OPEN state
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenRequests >= 3) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is HALF_OPEN with maximum concurrent requests`,
          1000
        );
      }
      this.halfOpenRequests++;
    }

    this.requests++;

    try {
      // Execute with timeout if specified
      let result: T;
      if (timeout) {
        result = await this.executeWithTimeout(operation, timeout);
      } else {
        result = await operation();
      }

      // Record success
      const duration = Date.now() - startTime;
      this.recordSuccess(duration);

      return result;

    } catch (error: unknown) {
      // Record failure
      const duration = Date.now() - startTime;
      this.recordFailure(error, duration);

      throw error;
    } finally {
      if (this.state === 'HALF_OPEN') {
        this.halfOpenRequests--;
      }
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(responseTime?: number): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    if (responseTime !== undefined) {
      this.responseTimeHistory.push(responseTime);
      if (this.responseTimeHistory.length > this.MAXHISTORY) {
        this.responseTimeHistory.shift();
      }
    }

    // Reset failures on success in HALF_OPEN state
    if (this.state === 'HALF_OPEN') {
      this.failures = 0;
      this.transitionTo('CLOSED');
    }

    // Adaptive threshold adjustment
    if (this.config.adaptiveThreshold) {
      this.adjustThreshold();
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(error: unknown, responseTime?: number): void {
    this.failures++;
    this.lastFailureTime = new Date();

    // Classify error
    const errorString = error?.message ?? String(error);
    const isRetryable = this.isRetryableError(errorString);

    // Add to error history
    this.errorHistory.push({
      timestamp: new Date(),
      error: errorString,
      retryable: isRetryable
    });

    if (this.errorHistory.length > this.MAXHISTORY) {
      this.errorHistory.shift();
    }

    if (responseTime !== undefined) {
      this.responseTimeHistory.push(responseTime);
      if (this.responseTimeHistory.length > this.MAXHISTORY) {
        this.responseTimeHistory.shift();
      }
    }

    // Only count retryable errors towards circuit opening
    if (isRetryable && this.shouldOpenCircuit()) {
      this.transitionTo('OPEN');
      this.scheduleReset();
    } else if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN state reopens the circuit
      this.transitionTo('OPEN');
      this.scheduleReset();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      requests: this.requests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Get detailed statistics
   */
  getStatistics(): CircuitBreakerStats {
    const totalRequests = this.requests;
    const errorRate = totalRequests > 0 ? (this.failures / totalRequests) * 100 : 0;

    const averageResponseTime = this.responseTimeHistory.length > 0
      ? this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length
      : 0;

    const timeouts = this.errorHistory.filter(e =>
      e.error.toLowerCase().includes('timeout')
    ).length;

    const circuitOpenCount = this.stateChangeHistory.filter(s =>
      s.to === 'OPEN'
    ).length;

    const uptime = this.calculateUptime();

    return { totalRequests,
      successfulRequests: this.successes,
      failedRequests: this.failures,
      timeouts,
      circuitOpenCount,
      averageResponseTime,
      errorRate,
      uptime
    };
  }

  /**
   * Get error analysis
   */
  getErrorAnalysis(): {
    retryableErrors: number;
    nonRetryableErrors: number;
    commonErrors: Array<{ error: string; count: number }>;
    errorTrend: Array<{ timestamp: Date; count: number }>;
  } {
    const retryableErrors = this.errorHistory.filter(e => e.retryable).length;
    const nonRetryableErrors = this.errorHistory.filter(e => !e.retryable).length;

    // Count common errors
    const errorCounts = new Map<string, number>();
    this.errorHistory.forEach(e => {
      const simplified = this.simplifyError(e.error);
      errorCounts.set(simplified, (errorCounts.get(simplified)  ?? 0) + 1);
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Error trend (hourly buckets for last 24 hours)
    const now = new Date();
    const errorTrend: Array<{ timestamp: Date; count: number }> = [];

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const count = this.errorHistory.filter(e =>
        e.timestamp >= hourStart && e.timestamp < hourEnd
      ).length;

      errorTrend.push({ timestamp: hourStart, count });
    }

    return { retryableErrors,
      nonRetryableErrors,
      commonErrors,
      errorTrend
    };
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.halfOpenRequests = 0;
    this.nextAttemptTime = undefined;
    this.transitionTo('CLOSED');
  }

  /**
   * Force circuit to OPEN state
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
    this.scheduleReset();
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    const stats = this.getStatistics();

    // Consider unhealthy if:
    // - Error rate > 50%
    // - Circuit has been open recently
    // - Average response time is very high
    return stats.errorRate < 50 &&
           this.state !== 'OPEN' &&
           stats.averageResponseTime < 10000; // 10 seconds
  }

  /**
   * Shutdown circuit breaker
   */
  shutdown(): void {
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout_(() => {
        reject(new Error(`Operation timeout after ${timeout}ms`));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(errorString: string): boolean {
    const { retryable, nonRetryable} = this.config.errorClassification;

    // Check non-retryable patterns first
    for (const pattern of nonRetryable) {
      if (typeof pattern === 'string' ? errorString.includes(pattern) : pattern.test(errorString)) {
        return false;
      }
    }

    // Check retryable patterns
    for (const pattern of retryable) {
      if (typeof pattern === 'string' ? errorString.includes(pattern) : pattern.test(errorString)) {
        return true;
      }
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Check if circuit should open
   */
  private shouldOpenCircuit(): boolean {
    let threshold = this.config.failureThreshold;

    // Adaptive threshold based on recent success rate
    if (this.config.adaptiveThreshold) {
      const recentSuccessRate = this.calculateRecentSuccessRate();
      if (recentSuccessRate < 0.5) {
        threshold = Math.max(2, Math.floor(threshold * 0.7)); // Lower threshold
      }
    }

    return this.failures >= threshold;
  }

  /**
   * Check if reset attempt can be made
   */
  private canAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
    return true;
  }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Get time until next attempt
   */
  private getTimeUntilNextAttempt(): number {
    if (!this.nextAttemptTime) {
    return 0;
  }
    return Math.max(0, this.nextAttemptTime.getTime() - Date.now());
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;

      // Record state change
      this.stateChangeHistory.push({
        timestamp: new Date(),
        from: oldState,
        to: newState
      });

      if (this.stateChangeHistory.length > this.MAXHISTORY) {
        this.stateChangeHistory.shift();
      }

      // Notify state change
      if (this.config.onStateChange) {
        this.config.onStateChange(newState);
      }

      console.log(`LOG: CIRCUIT-BREAKER-STATE-1 - State changed from ${oldState} to ${newState}`);
    }
  }

  /**
   * Schedule circuit reset
   */
  private scheduleReset(): void {
    const delay = this.calculateBackoffDelay();
    this.nextAttemptTime = new Date(Date.now() + delay);

    console.log(`LOG: CIRCUIT-BREAKER-RESET-1 - Reset scheduled in ${delay}ms`);
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoffDelay(): number {
    const openCount = this.stateChangeHistory.filter(s => s.to === 'OPEN').length;
    let delay: number;

    switch (this.config.backoffStrategy) {
      case 'exponential':
        delay = this.config.resetTimeout * Math.pow(2, Math.min(openCount - 1, 6));
        break;
      case 'linear':
        delay = this.config.resetTimeout * openCount;
        break;
      case 'fixed':
      default:
        delay = this.config.resetTimeout;
        break;
    }

    // Apply maximum backoff time
    delay = Math.min(delay, this.config.maxBackoffTime);

    // Add jitter if enabled
    if (this.config.jitterEnabled) {
      const jitter = Math.random() * delay * 0.1; // Up to 10% jitter
      delay += jitter;
    }

    return Math.floor(delay);
  }

  /**
   * Calculate recent success rate
   */
  private calculateRecentSuccessRate(): number {
    const recentWindow = 60000; // 1 minute
    const cutoff = new Date(Date.now() - recentWindow);

    const recentErrors = this.errorHistory.filter(e => e.timestamp >= cutoff).length;
    const recentTotal = Math.max(1, this.requests); // Avoid division by zero

    return Math.max(0, (recentTotal - recentErrors) / recentTotal);
  }

  /**
   * Adjust threshold based on performance
   */
  private adjustThreshold(): void {
    const stats = this.getStatistics();

    // If error rate is consistently low, we can be more tolerant
    if (stats.errorRate < 10 && this.successes > 100) {
      // Increase threshold slightly (but cap it)
      this.config.failureThreshold = Math.min(
        this.config.failureThreshold + 1,
        20
      );
    }
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(): number {
    if (this.stateChangeHistory.length === 0) {
    return 100;
  }

    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = new Date(Date.now() - timeWindow);

    let downTime = 0;
    let lastOpenTime: Date | null = null;

    for (const change of this.stateChangeHistory) {
      if (change.timestamp < cutoff) {
    continue;
  }

      if (change.to === 'OPEN') {
        lastOpenTime = change.timestamp;
      } else if (change.to === 'CLOSED' && lastOpenTime) {
        downTime += change.timestamp.getTime() - lastOpenTime.getTime();
        lastOpenTime = null;
      }
    }

    // If still open, count time until now
    if (lastOpenTime && this.state === 'OPEN') {
      downTime += Date.now() - lastOpenTime.getTime();
    }

    const upTime = timeWindow - downTime;
    return Math.max(0, (upTime / timeWindow) * 100);
  }

  /**
   * Simplify error message for grouping
   */
  private simplifyError(error: string): string {
    // Remove specific details like URLs, IDs, timestamps
    return error
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID]')
      .replace(/\b\d{13,}\b/g, '[TIMESTAMP]')
      .replace(/\b\d+ms\b/g, '[DURATION]')
      .replace(/\b\d+\.\d+\.\d+\.\d+\b/g, '[IP]');
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval_(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const isHealthy = this.isHealthy();
    const stats = this.getStatistics();

    console.log(`LOG: CIRCUIT-BREAKER-HEALTH-1 - Health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`, {
      state: this.state,
      errorRate: stats.errorRate,
      uptime: stats.uptime,
      averageResponseTime: stats.averageResponseTime
    });

    // Auto-recovery logic for long-open circuits
    if (this.state === 'OPEN' && this.canAttemptReset()) {
      const timeSinceLastFailure = this.lastFailureTime
        ? Date.now() - this.lastFailureTime.getTime()
        : Infinity;

      // If it's been a while since last failure, try half-open
      if (timeSinceLastFailure > this.config.resetTimeout * 2) {
        console.log('LOG: CIRCUIT-BREAKER-AUTO-RECOVERY-1 - Attempting auto-recovery');
        this.transitionTo('HALF_OPEN');
      }
    }
  }
}

/**
 * Circuit breaker open error
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Create a circuit breaker with default configuration
 */
export function createCircuitBreaker(config: Partial<EnhancedCircuitBreakerConfig> = {}): EnhancedCircuitBreaker {
  return new EnhancedCircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 300000,
    ...config
  });
}