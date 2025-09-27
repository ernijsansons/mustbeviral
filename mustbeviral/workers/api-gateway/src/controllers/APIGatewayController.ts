// API Gateway Controller - Handles gateway operations

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

interface CircuitBreakerResult {
  allowed: boolean;
  reason?: string;
}

interface AuthResult {
  authenticated: boolean;
  userId?: string;
  userRole?: string;
}

interface CachedResponse {
  body: string;
  ttl: number;
}

export class APIGatewayController {
  constructor(private env: any) {}

  // Log incoming request
  async logRequest(request: Request, requestId: string): Promise<void> {
    try {
      const logData = {
        requestId,
        timestamp: Date.now(),
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        userAgent: request.headers.get('User-Agent'),
        ip: request.headers.get('CF-Connecting-IP')
      };

      // Store in analytics queue for processing
      await this.env.API_MONITORING_QUEUE.send({
        type: 'request_log',
        data: logData
      });

    } catch (error) {
      console.error('Error logging request:', error);
    }
  }

  // Check rate limit
  async checkRateLimit(request: Request, requestId: string): Promise<RateLimitResult> {
    try {
      const clientId = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const key = `rate_limit:${clientId}`;

      const limit = parseInt(this.env.RATE_LIMIT_REQUESTS);
      const window = parseInt(this.env.RATE_LIMIT_WINDOW);

      // Get current rate limit data
      const current = await this.env.RATE_LIMITER.get(key);
      const now = Date.now();

      let requestCount = 0;
      let resetTime = now + window * 1000;

      if (current) {
        const data = JSON.parse(current);
        if (now < data.resetTime) {
          requestCount = data.count;
          resetTime = data.resetTime;
        }
      }

      if (requestCount >= limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000)
        };
      }

      // Increment counter
      requestCount++;
      await this.env.RATE_LIMITER.put(key, JSON.stringify({
        count: requestCount,
        resetTime
      }), { expirationTtl: window });

      return {
        allowed: true,
        limit,
        remaining: limit - requestCount,
        resetTime,
        retryAfter: 0
      };

    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Allow request on error
      return {
        allowed: true,
        limit: 100,
        remaining: 99,
        resetTime: Date.now() + 3600000,
        retryAfter: 0
      };
    }
  }

  // Check circuit breaker
  async checkCircuitBreaker(service: string, requestId: string): Promise<CircuitBreakerResult> {
    try {
      const key = `circuit_breaker:${service}`;
      const data = await this.env.CIRCUIT_BREAKER.get(key);

      if (!data) {
        return { allowed: true };
      }

      const circuitData = JSON.parse(data);
      const now = Date.now();

      // Check if circuit is open
      if (circuitData.state === 'open') {
        const timeout = parseInt(this.env.CIRCUIT_BREAKER_TIMEOUT);
        if (now < circuitData.openedAt + timeout * 1000) {
          return {
            allowed: false,
            reason: 'Circuit breaker is open'
          };
        }

        // Move to half-open state
        circuitData.state = 'half-open';
        await this.env.CIRCUIT_BREAKER.put(key, JSON.stringify(circuitData));
      }

      return { allowed: true };

    } catch (error) {
      console.error('Error checking circuit breaker:', error);
      return { allowed: true };
    }
  }

  // Update circuit breaker status
  async updateCircuitBreaker(service: string, success: boolean, requestId: string): Promise<void> {
    try {
      const key = `circuit_breaker:${service}`;
      const data = await this.env.CIRCUIT_BREAKER.get(key);

      const circuitData = data ? JSON.parse(data) : {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailure: 0,
        openedAt: 0
      };

      const threshold = parseInt(this.env.CIRCUIT_BREAKER_THRESHOLD);

      if (success) {
        circuitData.successCount++;
        circuitData.failureCount = Math.max(0, circuitData.failureCount - 1);

        // Close circuit if in half-open state and success
        if (circuitData.state === 'half-open') {
          circuitData.state = 'closed';
          circuitData.failureCount = 0;
        }
      } else {
        circuitData.failureCount++;
        circuitData.lastFailure = Date.now();

        // Open circuit if threshold exceeded
        if (circuitData.failureCount >= threshold) {
          circuitData.state = 'open';
          circuitData.openedAt = Date.now();
        }
      }

      await this.env.CIRCUIT_BREAKER.put(key, JSON.stringify(circuitData));

    } catch (error) {
      console.error('Error updating circuit breaker:', error);
    }
  }

  // Authenticate request
  async authenticateRequest(request: Request, requestId: string): Promise<AuthResult> {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return { authenticated: false };
      }

      const token = authHeader.replace('Bearer ', '');

      // Forward to auth service for validation
      const authResponse = await this.env.AUTH_SERVICE.fetch('http://internal/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Request-ID': requestId
        }
      });

      if (!authResponse.ok) {
        return { authenticated: false };
      }

      const authData = await authResponse.json();

      return {
        authenticated: true,
        userId: authData.userId,
        userRole: authData.role
      };

    } catch (error) {
      console.error('Error authenticating request:', error);
      return { authenticated: false };
    }
  }

  // Get cached response
  async getCachedResponse(path: string, requestId: string): Promise<CachedResponse | null> {
    try {
      const cacheKey = `cache:${path}`;
      const cached = await this.env.API_CACHE.get(cacheKey);

      if (!cached) {
        return null;
      }

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      if (now > cacheData.expiresAt) {
        await this.env.API_CACHE.delete(cacheKey);
        return null;
      }

      return {
        body: cacheData.body,
        ttl: Math.ceil((cacheData.expiresAt - now) / 1000)
      };

    } catch (error) {
      console.error('Error getting cached response:', error);
      return null;
    }
  }

  // Cache response
  async cacheResponse(path: string, response: Response, requestId: string): Promise<void> {
    try {
      const ttl = parseInt(this.env.CACHE_TTL);
      const cacheKey = `cache:${path}`;

      const body = await response.text();
      const cacheData = {
        body,
        expiresAt: Date.now() + ttl * 1000
      };

      await this.env.API_CACHE.put(cacheKey, JSON.stringify(cacheData), {
        expirationTtl: ttl
      });

    } catch (error) {
      console.error('Error caching response:', error);
    }
  }

  // Forward request to service
  async forwardRequest(request: Request, serviceBinding: string, requestId: string): Promise<Response> {
    try {
      const service = this.env[serviceBinding];

      if (!service) {
        throw new Error(`Service binding ${serviceBinding} not found`);
      }

      // Forward the request
      const response = await service.fetch(request);

      return response;

    } catch (error) {
      console.error('Error forwarding request:', error);
      throw error;
    }
  }

  // Log response
  async logResponse(request: Request, response: Response, requestId: string): Promise<void> {
    try {
      const logData = {
        requestId,
        timestamp: Date.now(),
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        contentLength: response.headers.get('Content-Length')
      };

      // Store in analytics queue for processing
      await this.env.API_MONITORING_QUEUE.send({
        type: 'response_log',
        data: logData
      });

    } catch (error) {
      console.error('Error logging response:', error);
    }
  }

  // Log error
  async logError(request: Request, error: any, requestId: string): Promise<void> {
    try {
      const logData = {
        requestId,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: request.url,
        method: request.method
      };

      // Store in error tracking queue
      await this.env.ERROR_TRACKING_QUEUE.send({
        type: 'error_log',
        data: logData
      });

    } catch (err) {
      console.error('Error logging error:', err);
    }
  }

  // Process monitoring messages from queue
  async processMonitoringMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'request_log':
          await this.processRequestLog(message.data);
          break;
        case 'response_log':
          await this.processResponseLog(message.data);
          break;
        case 'error_log':
          await this.processErrorLog(message.data);
          break;
        default:
          console.warn('Unknown monitoring message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing monitoring message:', error);
      throw error;
    }
  }

  private async processRequestLog(data: any): Promise<void> {
    // Process request log data - could store in analytics DB or forward to analytics service
    console.log('Processing request log:', data.requestId);
  }

  private async processResponseLog(data: any): Promise<void> {
    // Process response log data
    console.log('Processing response log:', data.requestId);
  }

  private async processErrorLog(data: any): Promise<void> {
    // Process error log data
    console.error('Processing error log:', data.requestId, data.error);
  }
}