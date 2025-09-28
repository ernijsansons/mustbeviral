import { CircuitBreakerConfig } from './types';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {
    this.startMonitoring();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.canAttemptRecovery()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - operation rejected');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;

      // If we've had enough successful calls, close the circuit
      if (this.successCount >= 3) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        this.nextAttemptTime = null;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failed during recovery attempt - go back to OPEN
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures - open the circuit
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    }
  }

  private canAttemptRecovery(): boolean {
    return this.nextAttemptTime !== null && Date.now() >= this.nextAttemptTime;
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.checkRecovery();
    }, this.config.monitoringInterval);
  }

  private checkRecovery(): void {
    if (this.state === CircuitBreakerState.OPEN && this.canAttemptRecovery()) {
      // Circuit breaker is ready for a recovery attempt
      // The next operation will transition to HALF_OPEN
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getLastFailureTime(): number | null {
    return this.lastFailureTime;
  }

  getNextAttemptTime(): number | null {
    return this.nextAttemptTime;
  }

  getMetrics(): {
    state: CircuitBreakerState;
    failureCount: number;
    lastFailureTime: number | null;
    nextAttemptTime: number | null;
    successCount: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      successCount: this.successCount
    };
  }

  // Force circuit breaker to specific state (for testing)
  forceState(state: CircuitBreakerState): void {
    this.state = state;

    if (state === CircuitBreakerState.CLOSED) {
      this.failureCount = 0;
      this.lastFailureTime = null;
      this.nextAttemptTime = null;
      this.successCount = 0;
    } else if (state === CircuitBreakerState.OPEN) {
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    }
  }

  // Reset circuit breaker to initial state
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.successCount = 0;
  }

  // Clean up resources
  destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
  }
}