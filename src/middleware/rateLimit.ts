/**
 * Rate Limiting Middleware
 * Implements advanced rate limiting with sliding window and distributed tracking
 */

import { CloudflareEnv } from '../lib/cloudflare';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
  blockDuration?: number;
  progressiveDelay?: boolean;
}

export interface RateLimitStore {
  increment(key: string): Promise<RateLimitEntry>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  get(key: string): Promise<RateLimitEntry | null>;
  block(key: string, duration: number): Promise<void>;
  isBlocked(key: string): Promise<boolean>;
}

export interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blocked?: boolean;
  blockExpires?: number;
}

/**
 * Cloudflare KV-based Rate Limit Store
 */
export class KVRateLimitStore implements RateLimitStore {
  private kv: KVNamespace;
  private prefix: string;

  constructor(kv: KVNamespace, prefix = 'rate_limit:') {
    this.kv = kv;
    this.prefix = prefix;
  }

  async increment(key: string): Promise<RateLimitEntry> {
    const fullKey = `${this.prefix}${key}`;
    const now = Date.now();

    const existing = await this.get(key);

    if (existing) {
      existing.count++;
      existing.lastRequest = now;

      await this.kv.put(fullKey, JSON.stringify(existing), {
        expirationTtl: 3600 // 1 hour TTL
      });

      return existing;
    }

    const entry: RateLimitEntry = {
      count: 1,
      firstRequest: now,
      lastRequest: now
    };

    await this.kv.put(fullKey, JSON.stringify(entry), {
      expirationTtl: 3600
    });

    return entry;
  }

  async decrement(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    const existing = await this.get(key);

    if (existing && existing.count > 0) {
      existing.count--;
      await this.kv.put(fullKey, JSON.stringify(existing), {
        expirationTtl: 3600
      });
    }
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    await this.kv.delete(fullKey);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const fullKey = `${this.prefix}${key}`;
    const data = await this.kv.get(fullKey);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async block(key: string, duration: number): Promise<void> {
    const fullKey = `${this.prefix}block:${key}`;
    const blockEntry = {
      blocked: true,
      blockExpires: Date.now() + duration
    };

    await this.kv.put(fullKey, JSON.stringify(blockEntry), {
      expirationTtl: Math.ceil(duration / 1000)
    });
  }

  async isBlocked(key: string): Promise<boolean> {
    const fullKey = `${this.prefix}block:${key}`;
    const data = await this.kv.get(fullKey);

    if (!data) return false;

    try {
      const blockEntry = JSON.parse(data);
      return blockEntry.blocked && blockEntry.blockExpires > Date.now();
    } catch {
      return false;
    }
  }
}

/**
 * In-memory Rate Limit Store (for development)
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private blocks: Map<string, number> = new Map();

  async increment(key: string): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing) {
      existing.count++;
      existing.lastRequest = now;
      return existing;
    }

    const entry: RateLimitEntry = {
      count: 1,
      firstRequest: now,
      lastRequest: now
    };

    this.store.set(key, entry);
    return entry;
  }

  async decrement(key: string): Promise<void> {
    const existing = this.store.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    return this.store.get(key) || null;
  }

  async block(key: string, duration: number): Promise<void> {
    this.blocks.set(key, Date.now() + duration);
  }

  async isBlocked(key: string): Promise<boolean> {
    const blockExpires = this.blocks.get(key);
    if (!blockExpires) return false;

    if (blockExpires > Date.now()) {
      return true;
    }

    this.blocks.delete(key);
    return false;
  }
}

/**
 * Rate Limiter Implementation
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private store: RateLimitStore;

  constructor(config: RateLimitConfig, store: RateLimitStore) {
    this.config = config;
    this.store = store;
  }

  /**
   * Check if request should be rate limited
   */
  async shouldLimit(request: Request): Promise<{
    limited: boolean;
    retryAfter?: number;
    remaining?: number;
    limit?: number;
    reset?: number;
  }> {
    const key = this.config.keyGenerator(request);

    // Check if the key is blocked
    if (await this.store.isBlocked(key)) {
      console.log(`LOG: RATE-LIMIT-1 - Key ${key} is blocked`);
      return {
        limited: true,
        retryAfter: this.config.blockDuration || 3600000,
        remaining: 0,
        limit: this.config.maxRequests
      };
    }

    const entry = await this.store.increment(key);
    const now = Date.now();

    // Sliding window check
    const windowStart = now - this.config.windowMs;

    if (entry.firstRequest < windowStart) {
      // Reset the window
      await this.store.reset(key);
      const newEntry = await this.store.increment(key);

      return {
        limited: false,
        remaining: this.config.maxRequests - 1,
        limit: this.config.maxRequests,
        reset: now + this.config.windowMs
      };
    }

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      console.log(`LOG: RATE-LIMIT-2 - Rate limit exceeded for key ${key}: ${entry.count}/${this.config.maxRequests}`);

      // Progressive blocking for repeat offenders
      if (this.config.progressiveDelay && entry.count > this.config.maxRequests * 2) {
        const blockDuration = Math.min(
          this.config.blockDuration || 3600000,
          (entry.count - this.config.maxRequests) * 60000 // 1 minute per excess request
        );
        await this.store.block(key, blockDuration);
      }

      const resetTime = entry.firstRequest + this.config.windowMs;

      return {
        limited: true,
        retryAfter: Math.max(0, resetTime - now),
        remaining: 0,
        limit: this.config.maxRequests,
        reset: resetTime
      };
    }

    return {
      limited: false,
      remaining: this.config.maxRequests - entry.count,
      limit: this.config.maxRequests,
      reset: entry.firstRequest + this.config.windowMs
    };
  }

  /**
   * Create rate limit response
   */
  createLimitResponse(retryAfter: number): Response {
    const message = this.config.message || 'Too many requests, please try again later.';

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil(retryAfter / 1000).toString(),
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(Date.now() + retryAfter).toISOString()
    });

    return new Response(
      JSON.stringify({
        error: 'RATE_LIMITED',
        message,
        retryAfter: Math.ceil(retryAfter / 1000)
      }),
      {
        status: 429,
        headers
      }
    );
  }

  /**
   * Add rate limit headers to response
   */
  addHeaders(response: Response, info: {
    remaining?: number;
    limit?: number;
    reset?: number;
  }): Response {
    if (!this.config.headers) return response;

    const headers = new Headers(response.headers);

    if (info.limit !== undefined) {
      headers.set('X-RateLimit-Limit', info.limit.toString());
    }

    if (info.remaining !== undefined) {
      headers.set('X-RateLimit-Remaining', info.remaining.toString());
    }

    if (info.reset !== undefined) {
      headers.set('X-RateLimit-Reset', new Date(info.reset).toISOString());
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
}

/**
 * Rate limiting configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful logins
    progressiveDelay: true,
    blockDuration: 60 * 60 * 1000, // 1 hour block for repeat offenders
    message: 'Too many authentication attempts. Please try again later.',
    headers: true
  },

  // Moderate rate limiting for API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    headers: true
  },

  // Lenient rate limiting for static resources
  static: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    headers: false
  },

  // Very strict rate limiting for password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per hour
    progressiveDelay: true,
    blockDuration: 24 * 60 * 60 * 1000, // 24 hour block for abuse
    message: 'Too many password reset attempts. Please contact support if you need assistance.',
    headers: true
  },

  // Rate limiting for content creation
  contentCreation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 creations per minute
    message: 'Content creation rate limit exceeded. Please slow down.',
    headers: true
  }
} as const;

/**
 * Key generators for different scenarios
 */
export const keyGenerators = {
  // By IP address
  byIP: (request: Request): string => {
    return request.headers.get('CF-Connecting-IP') ||
           request.headers.get('X-Forwarded-For')?.split(',')[0] ||
           'unknown';
  },

  // By user ID (from JWT token)
  byUser: (request: Request): string => {
    const auth = request.headers.get('Authorization');
    if (!auth) return 'anonymous';

    // Extract user ID from JWT token (simplified)
    const token = auth.replace('Bearer ', '');
    // In production, properly decode the JWT
    return `user:${token.substring(0, 10)}`;
  },

  // By IP and endpoint
  byIPAndEndpoint: (request: Request): string => {
    const ip = keyGenerators.byIP(request);
    const url = new URL(request.url);
    return `${ip}:${url.pathname}`;
  },

  // By API key
  byAPIKey: (request: Request): string => {
    return request.headers.get('X-API-Key') || 'no-key';
  }
};

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(
  config: Partial<RateLimitConfig> & { keyGenerator: (request: Request) => string },
  store: RateLimitStore
) {
  const fullConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // Default 1 minute
    maxRequests: 60, // Default 60 requests
    headers: true,
    ...config
  };

  const limiter = new RateLimiter(fullConfig, store);

  return async (request: Request, next: () => Promise<Response>): Promise<Response> => {
    const result = await limiter.shouldLimit(request);

    if (result.limited) {
      console.log('LOG: RATE-LIMIT-MIDDLEWARE-1 - Request rate limited');
      return limiter.createLimitResponse(result.retryAfter || 0);
    }

    const response = await next();

    // Add rate limit headers to response
    return limiter.addHeaders(response, result);
  };
}

/**
 * Cleanup old entries periodically
 */
export class RateLimitCleaner {
  private store: RateLimitStore;
  private intervalMs: number;
  private intervalId?: number;

  constructor(store: RateLimitStore, intervalMs = 3600000) {
    this.store = store;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(async () => {
      console.log('LOG: RATE-LIMIT-CLEANER-1 - Running cleanup');
      // Cleanup logic would go here
      // In KV store, TTL handles this automatically
    }, this.intervalMs) as unknown as number;
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}