/**
 * Advanced Rate Limiting Service
 * Multi-layer rate limiting with intelligent threat detection
 * Fortune 50-grade DDoS and abuse protection
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Prefix for storage keys
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // Seconds until next request allowed
}

export interface SlidingWindowEntry {
  timestamp: number;
  weight: number;
}

export class RateLimiter {
  private storage: Map<string, SlidingWindowEntry[]> = new Map();
  private blacklist: Set<string> = new Set();
  private suspiciousActivity: Map<string, number> = new Map();

  // Default configurations for different endpoints
  private static readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    api: { windowMs: 60000, maxRequests: 60 }, // 60 requests per minute
    auth: { windowMs: 300000, maxRequests: 5 }, // 5 auth attempts per 5 minutes
    content: { windowMs: 60000, maxRequests: 30 }, // 30 content requests per minute
    ai: { windowMs: 60000, maxRequests: 10 }, // 10 AI requests per minute
    payment: { windowMs: 3600000, maxRequests: 20 }, // 20 payment attempts per hour
    upload: { windowMs: 300000, maxRequests: 10 }, // 10 uploads per 5 minutes
  };

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    identifier: string,
    endpoint: string,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    // Check if identifier is blacklisted
    if (this.blacklist.has(identifier)) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetTime: new Date(Date.now() + 3600000), // 1 hour penalty
        retryAfter: 3600
      };
    }

    // Get configuration for endpoint
    const config = {
      ...RateLimiter.DEFAULT_CONFIGS[endpoint],
      ...customConfig
    };

    const key = `${config.keyPrefix ?? endpoint}:${identifier}`;
    const now = Date.now();

    // Get or create sliding window for this key
    let entries = this.storage.get(key)  ?? [];

    // Remove expired entries
    entries = entries.filter(entry =>
      now - entry.timestamp < config.windowMs
    );

    // Calculate total weight in current window
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

    // Check if limit exceeded
    if (totalWeight >= config.maxRequests) {
      // Track suspicious activity
      this.trackSuspiciousActivity(identifier);

      const oldestEntry = entries[0];
      const resetTime = new Date(oldestEntry.timestamp + config.windowMs);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter
      };
    }

    // Add new entry
    entries.push({
      timestamp: now,
      weight: 1
    });

    // Update storage
    this.storage.set(key, entries);

    // Clean up old data periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - totalWeight - 1,
      resetTime: new Date(now + config.windowMs)
    };
  }

  /**
   * Advanced rate limiting with weighted requests
   */
  async checkWeightedRateLimit(
    identifier: string,
    endpoint: string,
    weight: number,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const config = {
      ...RateLimiter.DEFAULT_CONFIGS[endpoint],
      ...customConfig
    };

    const key = `${config.keyPrefix ?? endpoint}:${identifier}`;
    const now = Date.now();

    let entries = this.storage.get(key)  ?? [];
    entries = entries.filter(entry => now - entry.timestamp < config.windowMs);

    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

    if (totalWeight + weight > config.maxRequests) {
      this.trackSuspiciousActivity(identifier);

      const resetTime = entries.length > 0
        ? new Date(entries[0].timestamp + config.windowMs)
        : new Date(now + config.windowMs);

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - totalWeight),
        resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now) / 1000)
      };
    }

    entries.push({
      timestamp: now,
      weight
    });

    this.storage.set(key, entries);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - totalWeight - weight,
      resetTime: new Date(now + config.windowMs)
    };
  }

  /**
   * Distributed rate limiting with token bucket algorithm
   */
  async checkTokenBucket(
    identifier: string,
    endpoint: string,
    tokensRequired: number = 1
  ): Promise<RateLimitResult> {
    const config = RateLimiter.DEFAULT_CONFIGS[endpoint];
    const key = `bucket:${endpoint}:${identifier}`;

    const bucket = this.getOrCreateBucket(key, config.maxRequests);
    const now = Date.now();

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const refillRate = config.maxRequests / config.windowMs;
    const tokensToAdd = Math.floor(timePassed * refillRate);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(
        config.maxRequests,
        bucket.tokens + tokensToAdd
      );
      bucket.lastRefill = now;
    }

    // Check if enough tokens available
    if (bucket.tokens < tokensRequired) {
      const tokensNeeded = tokensRequired - bucket.tokens;
      const timeToWait = Math.ceil(tokensNeeded / refillRate);

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: Math.floor(bucket.tokens),
        resetTime: new Date(now + timeToWait),
        retryAfter: Math.ceil(timeToWait / 1000)
      };
    }

    // Consume tokens
    bucket.tokens -= tokensRequired;

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: Math.floor(bucket.tokens),
      resetTime: new Date(now + config.windowMs)
    };
  }

  /**
   * IP-based rate limiting
   */
  async checkIpRateLimit(
    ip: string,
    endpoint: string
  ): Promise<RateLimitResult> {
    // Stricter limits for IP-based checking
    const config = {
      ...RateLimiter.DEFAULT_CONFIGS[endpoint],
      maxRequests: Math.floor(RateLimiter.DEFAULT_CONFIGS[endpoint].maxRequests * 0.5)
    };

    return this.checkRateLimit(ip, endpoint, config);
  }

  /**
   * Global rate limiting across all users
   */
  async checkGlobalRateLimit(endpoint: string): Promise<RateLimitResult> {
    const config = {
      windowMs: 1000, // 1 second window
      maxRequests: 100 // 100 requests per second globally
    };

    return this.checkRateLimit('global', endpoint, config);
  }

  /**
   * Anomaly detection for suspicious patterns
   */
  private detectAnomaly(identifier: string, requests: SlidingWindowEntry[]): boolean {
    if (requests.length < 10) {
    return false;
  }

    // Check for burst patterns (many requests in short time)
    const recentRequests = requests.slice(-10);
    const timeSpan = recentRequests[9].timestamp - recentRequests[0].timestamp;

    if (timeSpan < 1000) { // 10 requests in less than 1 second
      return true;
    }

    // Check for consistent high-frequency patterns
    const intervals = [];
    for (let i = 1; i < recentRequests.length; i++) {
      intervals.push(recentRequests[i].timestamp - recentRequests[i - 1].timestamp);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) =>
      sum + Math.pow(interval - avgInterval, 2), 0
    ) / intervals.length;

    // Low variance indicates bot-like behavior
    if (variance < 100) {
      return true;
    }

    return false;
  }

  /**
   * Track suspicious activity
   */
  private trackSuspiciousActivity(identifier: string) {
    const count = (this.suspiciousActivity.get(identifier)  ?? 0) + 1;
    this.suspiciousActivity.set(identifier, count);

    // Auto-blacklist after threshold
    if (count >= 10) {
      this.blacklist.add(identifier);
      console.warn(`Blacklisted identifier due to suspicious activity: ${identifier}`);
    }
  }

  /**
   * Add identifier to blacklist
   */
  blacklistIdentifier(identifier: string, duration: number = 3600000) {
    this.blacklist.add(identifier);

    // Auto-remove from blacklist after duration
    setTimeout_(() => {
      this.blacklist.delete(identifier);
      this.suspiciousActivity.delete(identifier);
    }, duration);
  }

  /**
   * Get rate limit headers for response
   */
  getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toISOString()
    };

    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Cleanup old entries
   */
  private cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, entries] of this.storage.entries()) {
      const validEntries = entries.filter(entry =>
        now - entry.timestamp < maxAge
      );

      if (validEntries.length === 0) {
        this.storage.delete(key);
      } else if (validEntries.length < entries.length) {
        this.storage.set(key, validEntries);
      }
    }
  }

  /**
   * Get or create token bucket
   */
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

  private getOrCreateBucket(key: string, maxTokens: number) {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: maxTokens,
        lastRefill: Date.now()
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  /**
   * Reset rate limits for identifier
   */
  reset(identifier: string, endpoint?: string) {
    if (endpoint) {
      this.storage.delete(`${endpoint}:${identifier}`);
    } else {
      // Reset all endpoints for identifier
      for (const key of this.storage.keys()) {
        if (key.endsWith(`:${identifier}`)) {
          this.storage.delete(key);
        }
      }
    }

    this.blacklist.delete(identifier);
    this.suspiciousActivity.delete(identifier);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      totalKeys: this.storage.size,
      blacklistedCount: this.blacklist.size,
      suspiciousCount: this.suspiciousActivity.size,
      buckets: this.buckets.size
    };
  }
}

// Singleton instance for global use
export const globalRateLimiter = new RateLimiter();

export default RateLimiter;