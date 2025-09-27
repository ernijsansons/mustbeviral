// Circuit Breaker Durable Object
// Handles circuit breaking for service calls

interface CircuitBreakerConfig {
  threshold: number;
  timeout: number; // in seconds
  resetTimeout: number; // in seconds
}

interface CircuitState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  openedAt: number;
  lastRequestTime: number;
}

export class CircuitBreaker {
  private state: DurableObjectState;
  private env: any;
  private circuits: Map<string, CircuitState> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/check':
        return this.handleCheck(request);
      case '/record':
        return this.handleRecord(request);
      case '/reset':
        return this.handleReset(request);
      case '/status':
        return this.handleStatus(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleCheck(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { serviceId, config } = await request.json() as { serviceId: string; config: CircuitBreakerConfig };

      if (!serviceId || !config) {
        return new Response('Service ID and config are required', { status: 400 });
      }

      const result = this.checkCircuit(serviceId, config);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error checking circuit breaker:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleRecord(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { serviceId, success, config } = await request.json() as { serviceId: string; success: boolean; config: CircuitBreakerConfig };

      if (!serviceId || success === undefined || !config) {
        return new Response('Service ID, success status, and config are required', { status: 400 });
      }

      this.recordResult(serviceId, success, config);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error recording circuit breaker result:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleReset(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { serviceId } = await request.json() as { serviceId: string };

      if (!serviceId) {
        return new Response('Service ID is required', { status: 400 });
      }

      this.resetCircuit(serviceId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error resetting circuit breaker:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleStatus(request: Request): Promise<Response> {
    const status = {
      activeCircuits: this.circuits.size,
      timestamp: Date.now(),
      circuits: Array.from(this.circuits.entries()).map(([serviceId, state]) => ({
        serviceId,
        state: state.state,
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailureTime: state.lastFailureTime,
        openedAt: state.openedAt
      }))
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private checkCircuit(serviceId: string, config: CircuitBreakerConfig): {
    allowed: boolean;
    state: string;
    reason?: string;
  } {
    const now = Date.now();
    let circuit = this.circuits.get(serviceId);

    // Initialize circuit if not exists
    if (!circuit) {
      circuit = {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        openedAt: 0,
        lastRequestTime: now
      };
      this.circuits.set(serviceId, circuit);
    }

    circuit.lastRequestTime = now;

    switch (circuit.state) {
      case 'closed':
        return { allowed: true, state: 'closed' };

      case 'open':
        const timeoutMs = config.timeout * 1000;
        if (now - circuit.openedAt >= timeoutMs) {
          // Move to half-open
          circuit.state = 'half-open';
          circuit.successCount = 0;
          return { allowed: true, state: 'half-open' };
        }
        return {
          allowed: false,
          state: 'open',
          reason: 'Circuit breaker is open'
        };

      case 'half-open':
        return { allowed: true, state: 'half-open' };

      default:
        return { allowed: true, state: 'closed' };
    }
  }

  private recordResult(serviceId: string, success: boolean, config: CircuitBreakerConfig): void {
    const now = Date.now();
    let circuit = this.circuits.get(serviceId);

    if (!circuit) {
      circuit = {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        openedAt: 0,
        lastRequestTime: now
      };
      this.circuits.set(serviceId, circuit);
    }

    if (success) {
      circuit.successCount++;

      if (circuit.state === 'half-open') {
        // Success in half-open state - close the circuit
        circuit.state = 'closed';
        circuit.failureCount = 0;
      } else if (circuit.state === 'closed') {
        // Gradually reduce failure count on success
        circuit.failureCount = Math.max(0, circuit.failureCount - 1);
      }
    } else {
      circuit.failureCount++;
      circuit.lastFailureTime = now;

      if (circuit.state === 'closed' && circuit.failureCount >= config.threshold) {
        // Open the circuit
        circuit.state = 'open';
        circuit.openedAt = now;
      } else if (circuit.state === 'half-open') {
        // Failure in half-open state - reopen the circuit
        circuit.state = 'open';
        circuit.openedAt = now;
      }
    }
  }

  private resetCircuit(serviceId: string): void {
    const circuit = this.circuits.get(serviceId);
    if (circuit) {
      circuit.state = 'closed';
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.lastFailureTime = 0;
      circuit.openedAt = 0;
    }
  }
}