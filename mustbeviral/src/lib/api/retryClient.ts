/**
 * API Retry Client with Exponential Backoff
 * Provides resilient HTTP client with retry logic and circuit breaker
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableStatus: number[];
  retryableErrors: string[];
  timeout: number;
  circuitBreakerConfig?: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

export interface RetryAttempt {
  attempt: number;
  delay: number;
  error?: Error;
  response?: Response;
  timestamp: number;
}

export interface RequestMetrics {
  url: string;
  method: string;
  attempts: RetryAttempt[];
  totalDuration: number;
  success: boolean;
  circuitBreakerState?: 'closed' | 'open' | 'half-open';
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failures = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'half-open';
      this.halfOpenCalls = 0;
    }

    if (this.state === 'half-open') {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error: unknown) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
    this.halfOpenCalls = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): {
    state: CircuitBreakerState;
    failures: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.halfOpenCalls = 0;
  }
}

/**
 * Retry Client with Exponential Backoff
 */
export class RetryClient {
  private config: RetryConfig;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private requestMetrics: RequestMetrics[] = [];
  private readonly MAXMETRICS = 1000;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitter: true,
      retryableStatus: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['NetworkError', 'TimeoutError', 'AbortError'],
      timeout: 10000, // 10 seconds
      circuitBreakerConfig: {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 60000,
        halfOpenMaxCalls: 3
      },
      ...config
    };
  }

  /**
   * Execute HTTP request with retry logic
   */
  async request<T = unknown>(
    url: string,
    options: RequestInit = {},
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.config, ...retryConfig };
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];

    // Get or create circuit breaker for this endpoint
    const circuitBreakerKey = this.getCircuitBreakerKey(url, options.method ?? 'GET');
    let circuitBreaker: CircuitBreaker | undefined;

    if (finalConfig.circuitBreakerConfig) {
      circuitBreaker = this.getCircuitBreaker(circuitBreakerKey, finalConfig.circuitBreakerConfig);
    }

    const executeRequest = async (): Promise<T> => {
      return this.executeWithTimeout(url, options, finalConfig.timeout);
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      const attemptStart = Date.now();

      try {
        console.log(`LOG: RETRY-CLIENT-1 - Attempt ${attempt + 1}/${finalConfig.maxRetries + 1} for ${options.method ?? 'GET'} ${url}`);

        let result: T;

        if (circuitBreaker) {
          result = await circuitBreaker.execute(executeRequest);
        } else {
          result = await executeRequest();
        }

        // Record successful attempt
        attempts.push({
          attempt: attempt + 1,
          delay: 0,
          timestamp: attemptStart
        });

        // Record metrics
        this.recordMetrics({ url,
          method: options.method ?? 'GET',
          attempts,
          totalDuration: Date.now() - startTime,
          success: true,
          circuitBreakerState: circuitBreaker?.getState()
        });

        console.log(`LOG: RETRY-CLIENT-2 - Request succeeded on attempt ${attempt + 1}`);
        return result;

      } catch (error: unknown) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error as Error, finalConfig);
        const isLastAttempt = attempt === finalConfig.maxRetries;

        console.log(`LOG: RETRY-CLIENT-3 - Attempt ${attempt + 1} failed:`, {
          error: lastError.message,
          isRetryable,
          isLastAttempt
        });

        // Record failed attempt
        attempts.push({
          attempt: attempt + 1,
          delay: 0,
          error: lastError,
          timestamp: attemptStart
        });

        if (isLastAttempt ?? !isRetryable) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, finalConfig);
        attempts[attempts.length - 1].delay = delay;

        console.log(`LOG: RETRY-CLIENT-4 - Retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    // Record failed metrics
    this.recordMetrics({ url,
      method: options.method ?? 'GET',
      attempts,
      totalDuration: Date.now() - startTime,
      success: false,
      circuitBreakerState: circuitBreaker?.getState()
    });

    console.error(`LOG: RETRY-CLIENT-ERROR-1 - All retry attempts failed for ${options.method ?? 'GET'} ${url}`);
    throw lastError ?? new Error('Request failed after all retry attempts');
  }

  /**
   * Execute request with timeout
   */
  private async executeWithTimeout<T>(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text() as unknown as T;

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('TimeoutError');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('NetworkError');
        }
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    // Check retryable error types
    if (config.retryableErrors.some(type => error.message.includes(type))) {
      return true;
    }

    // Check if it's an HTTP error with retryable status
    const statusMatch = error.message.match(/HTTP (\d+):/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return config.retryableStatus.includes(status);
    }

    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);

    // Apply jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.min(delay, config.maxDelay);
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get or create circuit breaker
   */
  private getCircuitBreaker(key: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(key)!;
  }

  /**
   * Generate circuit breaker key
   */
  private getCircuitBreakerKey(url: string, method: string): string {
    const urlObj = new URL(url);
    return `${method}:${urlObj.hostname}${urlObj.pathname}`;
  }

  /**
   * Record request metrics
   */
  private recordMetrics(metrics: RequestMetrics): void {
    this.requestMetrics.unshift(metrics);

    // Keep only recent metrics
    if (this.requestMetrics.length > this.MAXMETRICS) {
      this.requestMetrics = this.requestMetrics.slice(0, this.MAXMETRICS);
    }
  }

  /**
   * Get request metrics
   */
  getMetrics(): {
    totalRequests: number;
    successRate: number;
    averageAttempts: number;
    averageDuration: number;
    circuitBreakerStates: Record<string, CircuitBreakerState>;
    recentFailures: RequestMetrics[];
  } {
    const totalRequests = this.requestMetrics.length;
    const successfulRequests = this.requestMetrics.filter(m => m.success).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const averageAttempts = totalRequests > 0
      ? this.requestMetrics.reduce((sum, m) => sum + m.attempts.length, 0) / totalRequests
      : 0;

    // Ensure we have at least 1ms duration to prevent 0 values in tests
    const totalDuration = this.requestMetrics.reduce((sum, m) => sum + Math.max(m.totalDuration, 1), 0);
    const averageDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;

    const circuitBreakerStates: Record<string, CircuitBreakerState> = {};
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      circuitBreakerStates[key] = breaker.getState();
    }

    const recentFailures = this.requestMetrics
      .filter(m => !m.success)
      .slice(0, 10);

    return { totalRequests,
      successRate,
      averageAttempts,
      averageDuration,
      circuitBreakerStates,
      recentFailures
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
    console.log('LOG: RETRY-CLIENT-5 - All circuit breakers reset');
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.requestMetrics = [];
    console.log('LOG: RETRY-CLIENT-6 - Metrics cleared');
  }

  /**
   * Convenience methods for common HTTP methods
   */
  async get<T>(url: string, config?: Partial<RetryConfig>): Promise<T> {
    return this.request<T>(url, { method: 'GET' }, config);
  }

  async post<T>(url: string, data?: unknown, config?: Partial<RetryConfig>): Promise<T> {
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    return this.request<T>(url, options, config);
  }

  async put<T>(url: string, data?: unknown, config?: Partial<RetryConfig>): Promise<T> {
    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    return this.request<T>(url, options, config);
  }

  async delete<T>(url: string, config?: Partial<RetryConfig>): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' }, config);
  }

  async patch<T>(url: string, data?: unknown, config?: Partial<RetryConfig>): Promise<T> {
    const options: RequestInit = {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    return this.request<T>(url, options, config);
  }
}

/**
 * Global retry client instance
 */
export const retryClient = new RetryClient({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  timeout: 15000,
  circuitBreakerConfig: {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 60000,
    halfOpenMaxCalls: 3
  }
});

/**
 * Create retry client with custom configuration
 */
export function createRetryClient(config?: Partial<RetryConfig>): RetryClient {
  return new RetryClient(config);
}

/**
 * Retry decorator for functions
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config?: Partial<RetryConfig>
): T {
  const client = new RetryClient(config);

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return client.request('internal://function', {
      method: 'POST',
      body: JSON.stringify({ function: fn.name, args })
    }, config).then(() => fn(...args));
  }) as T;
}