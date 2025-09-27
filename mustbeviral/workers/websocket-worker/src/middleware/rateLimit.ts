// Rate limiting middleware for WebSocket Worker
// Prevents abuse and ensures fair usage

export interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  resetTime?: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  maxConnections: number;
  messageRateLimit: number;
}

export class RateLimitMiddleware {
  private env: unknown;
  private config: RateLimitConfig;

  // In-memory stores for rate limiting(in production, use Durable Objects or external store)
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private messageCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(env: unknown) {
    this.env = env;
    this.config = {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: parseInt(env.MAX_REQUESTS_PER_MINUTE  ?? '60'),
      maxConnections: parseInt(env.MAX_CONNECTIONS_PER_IP  ?? '20'),
      messageRateLimit: parseInt(env.MESSAGE_RATE_LIMIT  ?? '60')
    };

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  async checkLimit(clientIP: string, _request: Request): Promise<RateLimitResult> {
    const now = Date.now();

    // Get or create request count for this IP
    let requestData = this.requestCounts.get(clientIP);

    if (!requestData || requestData.resetTime <= now) {
      // Initialize or reset the window
      requestData = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.requestCounts.set(clientIP, requestData);
    }

    // Increment request count
    requestData.count++;

    // Check if limit exceeded
    if (requestData.count > this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: requestData.resetTime,
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
      };
    }

    return {
      allowed: true,
      remaining: this.config.maxRequests - requestData.count,
      resetTime: requestData.resetTime
    };
  }

  async checkConnectionLimit(clientIP: string): Promise<RateLimitResult> {
    const currentConnections = this.connectionCounts.get(clientIP)  ?? 0;

    if (currentConnections >= this.config.maxConnections) {
      return {
        allowed: false,
        remaining: 0
      };
    }

    return {
      allowed: true,
      remaining: this.config.maxConnections - currentConnections
    };
  }

  incrementConnectionCount(clientIP: string): void {
    const current = this.connectionCounts.get(clientIP)  ?? 0;
    this.connectionCounts.set(clientIP, current + 1);
  }

  decrementConnectionCount(clientIP: string): void {
    const current = this.connectionCounts.get(clientIP)  ?? 0;
    if (current > 0) {
      this.connectionCounts.set(clientIP, current - 1);
    }

    // Clean up if no connections
    if (current <= 1) {
      this.connectionCounts.delete(clientIP);
    }
  }

  async checkMessageLimit(clientIP: string, userId?: string): Promise<RateLimitResult> {
    const key = userId  ?? clientIP;
    const now = Date.now();

    // Get or create message count for this user/IP
    let messageData = this.messageCounts.get(key);

    if (!messageData || messageData.resetTime <= now) {
      // Initialize or reset the window
      messageData = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.messageCounts.set(key, messageData);
    }

    // Increment message count
    messageData.count++;

    // Check if limit exceeded
    if (messageData.count > this.config.messageRateLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: messageData.resetTime,
        retryAfter: Math.ceil((messageData.resetTime - now) / 1000)
      };
    }

    return {
      allowed: true,
      remaining: this.config.messageRateLimit - messageData.count,
      resetTime: messageData.resetTime
    };
  }

  createRateLimitResponse(result: RateLimitResult): Response {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': (result.remaining  ?? 0).toString()
    });

    if (result.resetTime) {
      headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    }

    if (result.retryAfter) {
      headers.set('Retry-After', result.retryAfter.toString());
    }

    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests',
      retryAfter: result.retryAfter,
      timestamp: new Date().toISOString()
    }), {
      status: 429,
      headers
    });
  }

  // Advanced rate limiting for different user types
  async checkUserRateLimit(userId: string, userRole: string, action: string): Promise<RateLimitResult> {
    // Different limits based on user role
    const roleMultipliers = {
      'admin': 5,
      'premium': 3,
      'user': 1,
      'guest': 0.5
    };

    const multiplier = roleMultipliers[userRole as keyof typeof roleMultipliers]  ?? 1;
    const adjustedLimit = Math.floor(this.config.messageRateLimit * multiplier);

    const now = Date.now();
    const key = `${userId}:${action}`;

    let data = this.messageCounts.get(key);

    if (!data || data.resetTime <= now) {
      data = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.messageCounts.set(key, data);
    }

    data.count++;

    if (data.count > adjustedLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      };
    }

    return {
      allowed: true,
      remaining: adjustedLimit - data.count,
      resetTime: data.resetTime
    };
  }

  // Burst protection - allows short bursts but enforces longer-term limits
  async checkBurstLimit(clientIP: string): Promise<RateLimitResult> {
    const shortWindow = 10 * 1000; // 10 seconds
    const burstLimit = 20; // 20 requests in 10 seconds

    const now = Date.now();
    const key = `burst:${clientIP}`;

    let burstData = this.requestCounts.get(key);

    if (!burstData || burstData.resetTime <= now) {
      burstData = {
        count: 0,
        resetTime: now + shortWindow
      };
      this.requestCounts.set(key, burstData);
    }

    burstData.count++;

    if (burstData.count > burstLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: burstData.resetTime,
        retryAfter: Math.ceil((burstData.resetTime - now) / 1000)
      };
    }

    return {
      allowed: true,
      remaining: burstLimit - burstData.count,
      resetTime: burstData.resetTime
    };
  }

  // Progressive penalties for repeat offenders
  async checkPenaltyLimit(clientIP: string): Promise<RateLimitResult> {
    // This would typically be stored in a persistent store
    // For now, using in-memory tracking

    const violations = this.getViolationCount(clientIP);

    if (violations > 5) {
      // Temporary ban for repeat offenders
      return {
        allowed: false,
        remaining: 0,
        retryAfter: 300 // 5 minutes
      };
    }

    return { allowed: true };
  }

  private getViolationCount(_clientIP: string): number {
    // In a real implementation, this would check a persistent store
    // for the number of rate limit violations in the past hour/day
    return 0;
  }

  private cleanup(): void {
    const now = Date.now();

    // Clean up expired request counts
    for (const [key, data] of this.requestCounts.entries()) {
      if (data.resetTime <= now) {
        this.requestCounts.delete(key);
      }
    }

    // Clean up expired message counts
    for (const [key, data] of this.messageCounts.entries()) {
      if (data.resetTime <= now) {
        this.messageCounts.delete(key);
      }
    }

    // Clean up zero connection counts
    for (const [key, count] of this.connectionCounts.entries()) {
      if (count <= 0) {
        this.connectionCounts.delete(key);
      }
    }
  }

  // Get current rate limit status for debugging/monitoring
  getStats(): {
    activeIPs: number;
    totalConnections: number;
    requestCounts: number;
    messageCounts: number;
  } {
    return {
      activeIPs: this.connectionCounts.size,
      totalConnections: Array.from(this.connectionCounts.values()).reduce((sum, _count) => sum + count, 0),
      requestCounts: this.requestCounts.size,
      messageCounts: this.messageCounts.size
    };
  }
}