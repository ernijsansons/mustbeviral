/**
 * Rate Limiting Middleware
 * Provides multi-tier rate limiting with different strategies
 */

import { CloudflareEnv } from '../lib/cloudflare';
import { EnvironmentManager } from '../config/environment';
import { ValidationError } from './validation';

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyGenerator?: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class RateLimiter {
  private kv: KVNamespace;
  private config: RateLimitConfig;

  constructor(env: CloudflareEnv, config: RateLimitConfig) {
    this.kv = env.TRENDS_CACHE; // Using existing KV namespace
    this.config = {
      windowMs: 60000, // Default 1 minute
      maxRequests: 100, // Default 100 requests
      keyGenerator: this.defaultKeyGenerator,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later',
      statusCode: 429,
      ...config
    };
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(request: Request): Promise<RateLimitResult> {
    try {
      const key = this.generateKey(request);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Get current rate limit data
      const entry = await this.getRateLimitEntry(key);

      // If no entry exists or window has expired, create new entry
      if (!entry || entry.resetTime <= now) {
        const newEntry: RateLimitEntry = {
          count: 1,
          resetTime: now + this.config.windowMs,
          firstRequest: now
        };

        await this.setRateLimitEntry(key, newEntry);

        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetTime: newEntry.resetTime
        };
      }

      // Check if limit exceeded
      if (entry.count >= this.config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

        console.log(`LOG: RATE-LIMIT-1 - Rate limit exceeded for key: ${key}`);

        return {
          allowed: false,
          remaining: 0,
          resetTime: entry.resetTime,
          retryAfter
        };
      }

      // Increment count
      entry.count++;
      await this.setRateLimitEntry(key, entry);

      return {
        allowed: true,
        remaining: this.config.maxRequests - entry.count,
        resetTime: entry.resetTime
      };
    } catch (error: unknown) {
      console.error('LOG: RATE-LIMIT-ERROR-1 - Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs
      };
    }
  }

  /**
   * Generate cache key for rate limiting
   */
  private generateKey(request: Request): string {
    if (this.config.keyGenerator) {
      return `rate_limit:${this.config.keyGenerator(request)}`;
    }
    return `rate_limit:${this.defaultKeyGenerator(request)}`;
  }

  /**
   * Default key generator (IP address)
   */
  private defaultKeyGenerator(request: Request): string {
    return request.headers.get('CF-Connecting-IP') ||
           request.headers.get('X-Forwarded-For') ||
           'unknown';
  }

  /**
   * Get rate limit entry from KV
   */
  private async getRateLimitEntry(key: string): Promise<RateLimitEntry | null> {
    try {
      const data = await this.kv.get(key, 'json');
      return data as RateLimitEntry | null;
    } catch (error: unknown) {
      console.error('LOG: RATE-LIMIT-ERROR-2 - Failed to get rate limit entry:', error);
      return null;
    }
  }

  /**
   * Set rate limit entry in KV
   */
  private async setRateLimitEntry(key: string, entry: RateLimitEntry): Promise<void> {
    try {
      const ttl = Math.ceil((entry.resetTime - Date.now()) / 1000) + 60; // Add 60s buffer
      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: Math.max(ttl, 60)
      });
    } catch (error: unknown) {
      console.error('LOG: RATE-LIMIT-ERROR-3 - Failed to set rate limit entry:', error);
    }
  }

  /**
   * Create rate limit response
   */
  createRateLimitResponse(result: RateLimitResult): Response {
    const headers = {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
      'Content-Type': 'application/json'
    };

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return new Response(
      JSON.stringify({
        error: this.config.message,
        retryAfter: result.retryAfter
      }),
      {
        status: this.config.statusCode || 429,
        headers
      }
    );
  }
}

/**
 * Multi-tier rate limiter
 */
export class MultiTierRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  constructor(private env: CloudflareEnv) {}

  /**
   * Add a rate limiter tier
   */
  addTier(name: string, config: RateLimitConfig): void {
    this.limiters.set(name, new RateLimiter(this.env, config));
  }

  /**
   * Check all rate limit tiers
   */
  async checkAllTiers(request: Request): Promise<RateLimitResult> {
    for (const [tierName, limiter] of this.limiters.entries()) {
      const result = await limiter.checkRateLimit(request);

      if (!result.allowed) {
        console.log(`LOG: RATE-LIMIT-MULTI-1 - Rate limit exceeded on tier: ${tierName}`);
        return result;
      }
    }

    // Return the most restrictive remaining count
    let minRemaining = Infinity;
    let latestResetTime = 0;

    for (const [, limiter] of this.limiters.entries()) {
      const result = await limiter.checkRateLimit(request);
      minRemaining = Math.min(minRemaining, result.remaining);
      latestResetTime = Math.max(latestResetTime, result.resetTime);
    }

    return {
      allowed: true,
      remaining: minRemaining === Infinity ? 100 : minRemaining,
      resetTime: latestResetTime || Date.now() + 60000
    };
  }

  /**
   * Create rate limit response from unknown tier
   */
  createRateLimitResponse(result: RateLimitResult): Response {
    // Use the first limiter's config for response format
    const firstLimiter = this.limiters.values().next().value as RateLimiter;
    return firstLimiter.createRateLimitResponse(result);
  }
}

/**
 * Adaptive rate limiter that adjusts based on load
 */
export class AdaptiveRateLimiter {
  private baseLimiter: RateLimiter;
  private loadThreshold = 0.8; // Adjust limits when at 80% capacity
  private adaptiveMultiplier = 0.5; // Reduce limits by 50% under high load

  constructor(env: CloudflareEnv, baseConfig: RateLimitConfig) {
    this.baseLimiter = new RateLimiter(env, baseConfig);
  }

  /**
   * Check rate limit with adaptive adjustment
   */
  async checkRateLimit(request: Request, currentLoad: number = 0): Promise<RateLimitResult> {
    const result = await this.baseLimiter.checkRateLimit(request);

    // If system is under high load, be more restrictive
    if (currentLoad > this.loadThreshold) {
      const adjustedLimit = Math.floor(this.baseLimiter.config.maxRequests * this.adaptiveMultiplier);
      const adjustedRemaining = Math.floor(result.remaining * this.adaptiveMultiplier);

      if (result.remaining > adjustedLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: result.resetTime,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        };
      }

      return {
        ...result,
        remaining: adjustedRemaining
      };
    }

    return result;
  }
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(env: CloudflareEnv) {
  const config = EnvironmentManager.getConfig();

  // Create multi-tier rate limiter
  const multiLimiter = new MultiTierRateLimiter(env);

  // Global rate limit (per IP)
  multiLimiter.addTier('global', {
    windowMs: config.rateLimits.windowMs,
    maxRequests: config.rateLimits.maxRequests,
    keyGenerator: (_request) => request.headers.get('CF-Connecting-IP') || 'unknown'
  });

  // API rate limit (more restrictive for API endpoints)
  multiLimiter.addTier('api', {
    windowMs: 60000, // 1 minute
    maxRequests: 50,
    keyGenerator: (_request) => {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        return `api:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
      }
      return 'non-api'; // Skip for non-API requests
    }
  });

  // Authentication rate limit (very restrictive for auth endpoints)
  multiLimiter.addTier('auth', {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (_request) => {
      const url = new URL(request.url);
      if (url.pathname.includes('/auth/')) {
        return `auth:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
      }
      return 'non-auth'; // Skip for non-auth requests
    }
  });

  return async (request: Request): Promise<Response | null> => {
    try {
      const result = await multiLimiter.checkAllTiers(request);

      if (!result.allowed) {
        // Log rate limit violation
        console.log('LOG: RATE-LIMIT-MIDDLEWARE-1 - Request blocked by rate limiter');

        // Create security event for monitoring
        const securityEvent = {
          type: 'rate_limit_exceeded',
          ip: request.headers.get('CF-Connecting-IP'),
          userAgent: request.headers.get('User-Agent'),
          url: request.url,
          timestamp: new Date().toISOString()
        };

        console.log('LOG: RATE-LIMIT-SECURITY-1 - Security event:', JSON.stringify(securityEvent));

        return multiLimiter.createRateLimitResponse(result);
      }

      // Add rate limit headers to successful responses
      request.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      request.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

      return null; // Allow request to continue
    } catch (error: unknown) {
      console.error('LOG: RATE-LIMIT-MIDDLEWARE-ERROR-1 - Rate limit middleware failed:', error);
      return null; // Fail open - allow request if middleware fails
    }
  };
}

/**
 * User-specific rate limiter
 */
export class UserRateLimiter {
  private limiter: RateLimiter;

  constructor(env: CloudflareEnv, userTier: 'free' | 'standard' | 'premium') {
    const limits = this.getTierLimits(userTier);

    this.limiter = new RateLimiter(env, {
      windowMs: 3600000, // 1 hour
      maxRequests: limits.requestsPerHour,
      keyGenerator: (_request) => {
        // Extract user ID from Authorization header
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7);
            const payload = JSON.parse(atob(token.split('.')[1]));
            return `user:${payload.sub}:${userTier}`;
          } catch (error: unknown) {
            return 'anonymous';
          }
        }
        return 'anonymous';
      }
    });
  }

  private getTierLimits(tier: 'free' | 'standard' | 'premium') {
    switch (tier) {
      case 'free':
        return { requestsPerHour: 100 };
      case 'standard':
        return { requestsPerHour: 500 };
      case 'premium':
        return { requestsPerHour: 2000 };
      default:
        return { requestsPerHour: 100 };
    }
  }

  async checkRateLimit(request: Request): Promise<RateLimitResult> {
    return this.limiter.checkRateLimit(request);
  }
}

/**
 * Geographic rate limiter
 */
export function createGeographicRateLimiter(env: CloudflareEnv) {
  // More restrictive limits for certain countries/regions
  const restrictedRegions = new Set(['CN', 'RU', 'KP']); // Example restricted regions

  return new RateLimiter(env, {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // Very restrictive
    keyGenerator: (_request) => {
      const country = request.headers.get('CF-IPCountry') || 'XX';
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

      if (restrictedRegions.has(country)) {
        return `restricted:${country}:${ip}`;
      }

      return 'allowed'; // Skip rate limiting for allowed regions
    }
  });
}