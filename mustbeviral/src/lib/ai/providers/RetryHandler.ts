import { AIProviderError, RetryConfig } from './types';

export interface RetryAttempt {
  attempt: number;
  delay: number;
  error: Error;
  timestamp: Date;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  attempts: RetryAttempt[];
  totalTime: number;
  lastError?: Error;
}

export class RetryHandler {
  private readonly defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    retryableErrors: [
      'rate limit',
      'timeout',
      'network',
      'service unavailable',
      'internal error',
      'bad gateway',
      'gateway timeout',
      'overloaded'
    ]
  };

  constructor(private config: Partial<RetryConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  async execute<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.config, ...customConfig };
    const attempts: RetryAttempt[] = [];
    const startTime = Date.now();

    for (let attempt = 1; attempt <= finalConfig.maxAttempts!; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        const retryAttempt: RetryAttempt = {
          attempt,
          delay: 0,
          error: error as Error,
          timestamp: new Date()
        };

        attempts.push(retryAttempt);

        // Check if this is the last attempt
        if (attempt === finalConfig.maxAttempts) {
          return {
            success: false,
            attempts,
            totalTime: Date.now() - startTime,
            lastError: error as Error
          };
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error, finalConfig)) {
          return {
            success: false,
            attempts,
            totalTime: Date.now() - startTime,
            lastError: error as Error
          };
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, finalConfig);
        retryAttempt.delay = delay;

        console.log(
          `Attempt ${attempt} failed, retrying in ${delay}ms: ${(error as Error).message}`
        );

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      attempts,
      totalTime: Date.now() - startTime,
      lastError: new Error('Unexpected retry completion')
    };
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    // Check if it's an AIProviderError with retryable flag
    if (error instanceof AIProviderError) {
      return error.retryable;
    }

    // Check error message against retryable patterns
    const errorMessage = error.message.toLowerCase();
    return config.retryableErrors!.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff with jitter
    const baseDelay = config.baseDelay!;
    const multiplier = config.backoffMultiplier!;
    const maxDelay = config.maxDelay!;

    // Calculate exponential delay
    let delay = baseDelay * Math.pow(multiplier, attempt - 1);

    // Add jitter (random variation) to avoid thundering herd
    const jitter = delay * 0.1 * Math.random(); // 10% jitter
    delay += jitter;

    // Cap at maximum delay
    return Math.min(delay, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Static utility methods for common retry patterns
  static async withRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const handler = new RetryHandler(config);
    const result = await handler.execute(operation, config);

    if (result.success && result.result !== undefined) {
      return result.result;
    }

    throw result.lastError || new Error('Retry failed');
  }

  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> {
    return RetryHandler.withRetry(operation, {
      maxAttempts,
      baseDelay,
      backoffMultiplier: 2
    });
  }

  static async withLinearBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000
  ): Promise<T> {
    return RetryHandler.withRetry(operation, {
      maxAttempts,
      baseDelay: delay,
      backoffMultiplier: 1
    });
  }

  static async withCustomDelay<T>(
    operation: () => Promise<T>,
    delays: number[]
  ): Promise<T> {
    for (let i = 0; i < delays.length; i++) {
      try {
        return await operation();
      } catch (error) {
        // If this is the last attempt, throw the error
        if (i === delays.length - 1) {
          throw error;
        }

        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }

    throw new Error('All retry attempts exhausted');
  }

  // Create a retry-enabled version of a function
  static createRetryableFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    config?: Partial<RetryConfig>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      return RetryHandler.withRetry(() => fn(...args), config);
    };
  }

  // Rate-limited retry (respects rate limit reset times)
  static async withRateLimitRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const handler = new RetryHandler({
      ...config,
      retryableErrors: [...(config?.retryableErrors || []), 'rate limit', '429']
    });

    return handler.execute(async () => {
      try {
        return await operation();
      } catch (error) {
        // If it's a rate limit error, extract reset time and wait
        if (error instanceof AIProviderError && error.statusCode === 429) {
          // In a real implementation, you'd parse the reset time from headers
          const resetTime = this.extractRateLimitResetTime(error);
          if (resetTime) {
            const waitTime = resetTime.getTime() - Date.now();
            if (waitTime > 0 && waitTime < 60000) { // Wait up to 1 minute
              console.log(`Rate limited, waiting ${waitTime}ms until reset`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        throw error;
      }
    }).then(result => {
      if (result.success && result.result !== undefined) {
        return result.result;
      }
      throw result.lastError || new Error('Rate limit retry failed');
    });
  }

  private static extractRateLimitResetTime(error: AIProviderError): Date | null {
    // This would parse rate limit reset time from error details
    // Implementation depends on the specific provider's error format
    return null;
  }
}

// Decorator for automatic retry
export function retry(config?: Partial<RetryConfig>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return RetryHandler.withRetry(
        () => originalMethod.apply(this, args),
        config
      );
    };

    return descriptor;
  };
}

// Utility class for managing retry policies per provider
export class ProviderRetryPolicies {
  private static policies: Map<string, RetryConfig> = new Map([
    ['cloudflare', {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['rate limit', 'timeout', 'internal error', 'service unavailable']
    }],
    ['openai', {
      maxAttempts: 4,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['rate limit', 'timeout', 'overloaded', 'service_unavailable']
    }],
    ['anthropic', {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 20000,
      backoffMultiplier: 2,
      retryableErrors: ['rate_limit_error', 'overloaded_error', 'api_error']
    }]
  ]);

  static getPolicy(provider: string): RetryConfig {
    return this.policies.get(provider) || {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      retryableErrors: ['rate limit', 'timeout', 'network', 'internal error']
    };
  }

  static setPolicy(provider: string, policy: RetryConfig): void {
    this.policies.set(provider, policy);
  }
}