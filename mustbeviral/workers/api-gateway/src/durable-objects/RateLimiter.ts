// Rate Limiter Durable Object
// Handles distributed rate limiting across multiple instances

interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
  burst?: number;
}

interface ClientLimitData {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class RateLimiter {
  private state: DurableObjectState;
  private env: any;
  private limits: Map<string, ClientLimitData> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;

    // Clean up expired entries periodically
    this.scheduleCleanup();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/check':
        return this.handleCheck(request);
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
      const { clientId, config } = await request.json() as { clientId: string; config: RateLimitConfig };

      if (!clientId || !config) {
        return new Response('Client ID and config are required', { status: 400 });
      }

      const result = await this.checkLimit(clientId, config);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error checking rate limit:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleReset(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { clientId } = await request.json() as { clientId: string };

      if (!clientId) {
        return new Response('Client ID is required', { status: 400 });
      }

      this.limits.delete(clientId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleStatus(request: Request): Promise<Response> {
    const status = {
      activeClients: this.limits.size,
      timestamp: Date.now(),
      clients: Array.from(this.limits.entries()).map(([clientId, data]) => ({
        clientId,
        count: data.count,
        resetTime: data.resetTime,
        remaining: Math.max(0, data.resetTime - Date.now())
      }))
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async checkLimit(clientId: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter: number;
  }> {
    const now = Date.now();
    const windowMs = config.window * 1000;

    let clientData = this.limits.get(clientId);

    // Initialize or reset if window expired
    if (!clientData || now >= clientData.resetTime) {
      clientData = {
        count: 0,
        resetTime: now + windowMs,
        firstRequest: now
      };
      this.limits.set(clientId, clientData);
    }

    // Check if limit exceeded
    if (clientData.count >= config.requests) {
      return {
        allowed: false,
        limit: config.requests,
        remaining: 0,
        resetTime: clientData.resetTime,
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      };
    }

    // Increment counter
    clientData.count++;

    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests - clientData.count,
      resetTime: clientData.resetTime,
      retryAfter: 0
    };
  }

  private scheduleCleanup(): Promise<void> {
    // Clean up expired entries every 5 minutes
    return new Promise((resolve) => {
      setInterval(() => {
        const now = Date.now();
        for (const [clientId, data] of this.limits.entries()) {
          if (now >= data.resetTime + 60000) { // 1 minute grace period
            this.limits.delete(clientId);
          }
        }
      }, 300000); // 5 minutes
      resolve();
    });
  }
}