# API Rate Limiting Implementation Guide - Must Be Viral V2

## Overview

Comprehensive rate limiting strategy to protect the API from abuse, ensure fair usage, and maintain service availability for all users.

## Rate Limiting Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Client Request                         │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│               Cloudflare Rate Limiting                    │
│                  (DDoS Protection)                        │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  IP-Based Rate Limiting                   │
│                    (Global Limits)                        │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                 User-Based Rate Limiting                  │
│                    (Authenticated)                        │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                Endpoint-Specific Limits                   │
│                  (Resource Protection)                    │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    API Processing                         │
└──────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Core Rate Limiter Class

```typescript
// src/lib/rateLimit/RateLimiter.ts
import { Redis } from 'ioredis';
import { createHash } from 'crypto';

export interface RateLimitOptions {
  windowMs: number;          // Time window in milliseconds
  maxRequests: number;        // Maximum requests per window
  keyPrefix?: string;         // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;  // Return rate limit info in headers
  legacyHeaders?: boolean;    // Return legacy X-RateLimit headers
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export class RateLimiter {
  private redis: Redis;
  private options: Required<RateLimitOptions>;

  constructor(redis: Redis, options: RateLimitOptions) {
    this.redis = redis;
    this.options = {
      keyPrefix: 'ratelimit:',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      standardHeaders: true,
      legacyHeaders: false,
      ...options
    };
  }

  /**
   * Check if request is allowed based on rate limit
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = this.getKey(identifier);
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    // Use Redis sorted set for sliding window
    const pipeline = this.redis.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Add current request
    const requestId = `${now}-${Math.random()}`;
    pipeline.zadd(key, now, requestId);

    // Count requests in current window
    pipeline.zcard(key);

    // Set expiry
    pipeline.expire(key, Math.ceil(this.options.windowMs / 1000));

    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number || 0;

    const allowed = count <= this.options.maxRequests;
    const remaining = Math.max(0, this.options.maxRequests - count);
    const resetTime = new Date(now + this.options.windowMs);

    // If not allowed, calculate retry after
    let retryAfter: number | undefined;
    if (!allowed) {
      // Get the oldest request that would need to expire
      const oldestRelevant = await this.redis.zrange(
        key,
        this.options.maxRequests - 1,
        this.options.maxRequests - 1,
        'WITHSCORES'
      );

      if (oldestRelevant.length >= 2) {
        const timestamp = parseInt(oldestRelevant[1]);
        retryAfter = Math.ceil((timestamp + this.options.windowMs - now) / 1000);
      }
    }

    return {
      allowed,
      limit: this.options.maxRequests,
      remaining,
      resetTime,
      retryAfter
    };
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    await this.redis.del(key);
  }

  /**
   * Get current usage for identifier
   */
  async getUsage(identifier: string): Promise<number> {
    const key = this.getKey(identifier);
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    return await this.redis.zcount(key, windowStart, now);
  }

  private getKey(identifier: string): string {
    return `${this.options.keyPrefix}${identifier}`;
  }
}
```

### 2. Tiered Rate Limiting Strategy

```typescript
// src/lib/rateLimit/TieredRateLimiter.ts
export enum UserTier {
  FREE = 'free',
  CREATOR = 'creator',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export interface TierLimits {
  requests: number;
  aiGenerations: number;
  contentCreations: number;
  apiCalls: number;
  uploadMb: number;
}

export class TieredRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();
  private redis: Redis;

  private tierConfigs: Record<UserTier, TierLimits> = {
    [UserTier.FREE]: {
      requests: 60,           // per minute
      aiGenerations: 5,       // per hour
      contentCreations: 10,   // per hour
      apiCalls: 100,         // per hour
      uploadMb: 10           // per day
    },
    [UserTier.CREATOR]: {
      requests: 200,
      aiGenerations: 20,
      contentCreations: 50,
      apiCalls: 500,
      uploadMb: 100
    },
    [UserTier.PRO]: {
      requests: 500,
      aiGenerations: 100,
      contentCreations: 200,
      apiCalls: 2000,
      uploadMb: 500
    },
    [UserTier.ENTERPRISE]: {
      requests: 2000,
      aiGenerations: 1000,
      contentCreations: 1000,
      apiCalls: 10000,
      uploadMb: 5000
    }
  };

  constructor(redis: Redis) {
    this.redis = redis;
    this.initializeLimiters();
  }

  private initializeLimiters() {
    // General request limiter (per minute)
    this.limiters.set('requests', new RateLimiter(this.redis, {
      windowMs: 60 * 1000,
      maxRequests: 60,
      keyPrefix: 'rl:requests:'
    }));

    // AI generation limiter (per hour)
    this.limiters.set('ai', new RateLimiter(this.redis, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: 'rl:ai:'
    }));

    // Content creation limiter (per hour)
    this.limiters.set('content', new RateLimiter(this.redis, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: 'rl:content:'
    }));

    // API calls limiter (per hour)
    this.limiters.set('api', new RateLimiter(this.redis, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 100,
      keyPrefix: 'rl:api:'
    }));

    // Upload limiter (per day)
    this.limiters.set('upload', new RateLimiter(this.redis, {
      windowMs: 24 * 60 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: 'rl:upload:'
    }));
  }

  async checkLimit(
    userId: string,
    userTier: UserTier,
    limitType: keyof TierLimits
  ): Promise<RateLimitResult> {
    const limiter = this.getLimiterForType(limitType, userTier);
    return await limiter.checkLimit(userId);
  }

  private getLimiterForType(
    limitType: keyof TierLimits,
    userTier: UserTier
  ): RateLimiter {
    const limits = this.tierConfigs[userTier];

    const windowMs = this.getWindowForType(limitType);
    const maxRequests = limits[limitType];

    return new RateLimiter(this.redis, {
      windowMs,
      maxRequests,
      keyPrefix: `rl:${userTier}:${limitType}:`
    });
  }

  private getWindowForType(limitType: keyof TierLimits): number {
    switch (limitType) {
      case 'requests':
        return 60 * 1000; // 1 minute
      case 'aiGenerations':
      case 'contentCreations':
      case 'apiCalls':
        return 60 * 60 * 1000; // 1 hour
      case 'uploadMb':
        return 24 * 60 * 60 * 1000; // 1 day
      default:
        return 60 * 1000;
    }
  }
}
```

### 3. Express Middleware Implementation

```typescript
// src/middleware/rateLimitMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { TieredRateLimiter, UserTier } from '../lib/rateLimit/TieredRateLimiter';
import { RateLimitResult } from '../lib/rateLimit/RateLimiter';

export interface RateLimitMiddlewareOptions {
  limitType: 'requests' | 'aiGenerations' | 'contentCreations' | 'apiCalls' | 'uploadMb';
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  customKeyGenerator?: (req: Request) => string;
  customErrorMessage?: string | ((result: RateLimitResult) => string);
}

export function createRateLimitMiddleware(
  rateLimiter: TieredRateLimiter,
  options: RateLimitMiddlewareOptions
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user info from request
      const userId = req.user?.id || req.ip;
      const userTier = req.user?.tier || UserTier.FREE;

      // Custom key generation
      const identifier = options.customKeyGenerator
        ? options.customKeyGenerator(req)
        : userId;

      // Check rate limit
      const result = await rateLimiter.checkLimit(
        identifier,
        userTier,
        options.limitType
      );

      // Set rate limit headers
      if (result) {
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());

        // Standard headers (RFC 6585)
        res.setHeader('RateLimit-Limit', result.limit);
        res.setHeader('RateLimit-Remaining', result.remaining);
        res.setHeader('RateLimit-Reset', Math.floor(result.resetTime.getTime() / 1000));
      }

      if (!result.allowed) {
        // Set Retry-After header
        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter);
        }

        // Get error message
        const message = typeof options.customErrorMessage === 'function'
          ? options.customErrorMessage(result)
          : options.customErrorMessage || 'Too many requests, please try again later.';

        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter
        });
      }

      // Track response for conditional skipping
      if (options.skipSuccessfulRequests || options.skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(data) {
          const shouldSkip =
            (options.skipSuccessfulRequests && res.statusCode < 400) ||
            (options.skipFailedRequests && res.statusCode >= 400);

          if (shouldSkip) {
            // Refund the rate limit
            rateLimiter.refund(identifier, userTier, options.limitType);
          }

          return originalSend.call(this, data);
        };
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}
```

### 4. Distributed Rate Limiting

```typescript
// src/lib/rateLimit/DistributedRateLimiter.ts
export class DistributedRateLimiter {
  private nodes: Redis[];
  private consistentHash: ConsistentHash;

  constructor(redisNodes: Redis[]) {
    this.nodes = redisNodes;
    this.consistentHash = new ConsistentHash(redisNodes.map((_, i) => `node-${i}`));
  }

  async checkLimit(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    // Get the appropriate node using consistent hashing
    const nodeIndex = this.consistentHash.getNode(identifier);
    const redis = this.nodes[nodeIndex];

    const limiter = new RateLimiter(redis, options);
    return await limiter.checkLimit(identifier);
  }

  /**
   * Synchronize rate limit data across nodes
   */
  async synchronize(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`;
    const sourceNode = this.nodes[0];
    const data = await sourceNode.get(key);

    if (data) {
      await Promise.all(
        this.nodes.slice(1).map(node => node.set(key, data))
      );
    }
  }
}

class ConsistentHash {
  private ring: Map<number, string> = new Map();
  private sorted: number[] = [];
  private virtualNodes = 150;

  constructor(nodes: string[]) {
    nodes.forEach(node => {
      for (let i = 0; i < this.virtualNodes; i++) {
        const hash = this.hash(`${node}:${i}`);
        this.ring.set(hash, node);
      }
    });

    this.sorted = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  getNode(key: string): number {
    const hash = this.hash(key);

    // Binary search for the first node with hash >= key hash
    let left = 0;
    let right = this.sorted.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sorted[mid] === hash) {
        return parseInt(this.ring.get(this.sorted[mid])!.split('-')[1]);
      }
      if (this.sorted[mid] < hash) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // Wrap around to the first node
    const nodeHash = this.sorted[left % this.sorted.length];
    return parseInt(this.ring.get(nodeHash)!.split('-')[1]);
  }

  private hash(key: string): number {
    return createHash('md5').update(key).digest().readUInt32BE(0);
  }
}
```

### 5. Cloudflare Workers Rate Limiting

```typescript
// workers/rate-limit-worker.ts
export interface Env {
  RATE_LIMIT: KVNamespace;
  RATE_LIMIT_DURABLE: DurableObjectNamespace;
}

export class RateLimitDurableObject {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/check') {
      return this.checkRateLimit(request);
    } else if (path === '/reset') {
      return this.resetRateLimit(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async checkRateLimit(request: Request): Promise<Response> {
    const { identifier, limit, window } = await request.json() as {
      identifier: string;
      limit: number;
      window: number;
    };

    const now = Date.now();
    const windowStart = now - window;

    // Get current state
    const requests = await this.state.storage.get<number[]>(`requests:${identifier}`) || [];

    // Filter out old requests
    const validRequests = requests.filter(timestamp => timestamp > windowStart);

    // Add current request
    validRequests.push(now);

    // Check if limit exceeded
    const allowed = validRequests.length <= limit;

    // Store updated state
    await this.state.storage.put(`requests:${identifier}`, validRequests);

    // Set alarm to clean up old data
    await this.state.storage.setAlarm(now + window);

    return Response.json({
      allowed,
      count: validRequests.length,
      limit,
      remaining: Math.max(0, limit - validRequests.length),
      resetTime: new Date(now + window).toISOString()
    });
  }

  private async resetRateLimit(request: Request): Promise<Response> {
    const { identifier } = await request.json() as { identifier: string };
    await this.state.storage.delete(`requests:${identifier}`);
    return Response.json({ success: true });
  }

  async alarm() {
    // Clean up old data
    const now = Date.now();
    const keys = await this.state.storage.list();

    for (const [key, value] of keys) {
      if (key.startsWith('requests:')) {
        const requests = value as number[];
        const filtered = requests.filter(timestamp => timestamp > now - 3600000); // Keep last hour

        if (filtered.length === 0) {
          await this.state.storage.delete(key);
        } else {
          await this.state.storage.put(key, filtered);
        }
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Extract identifier from request
    const identifier = request.headers.get('CF-Connecting-IP') ||
                      request.headers.get('X-Forwarded-For') ||
                      'unknown';

    // Rate limit configuration based on path
    const url = new URL(request.url);
    const limits = this.getLimitsForPath(url.pathname);

    // Check rate limit using Durable Object
    const id = env.RATE_LIMIT_DURABLE.idFromName(identifier);
    const rateLimiter = env.RATE_LIMIT_DURABLE.get(id);

    const response = await rateLimiter.fetch(
      new Request('https://rate-limit/check', {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          limit: limits.limit,
          window: limits.window
        })
      })
    );

    const result = await response.json() as any;

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(limits.window / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(limits.window / 1000)),
            'X-RateLimit-Limit': String(limits.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': result.resetTime
          }
        }
      );
    }

    // Continue to origin
    return fetch(request);
  },

  getLimitsForPath(pathname: string): { limit: number; window: number } {
    // AI generation endpoints - strict limits
    if (pathname.startsWith('/api/ai/generate')) {
      return { limit: 5, window: 3600000 }; // 5 per hour
    }

    // Payment endpoints - very strict
    if (pathname.startsWith('/api/payments')) {
      return { limit: 10, window: 60000 }; // 10 per minute
    }

    // Auth endpoints - moderate
    if (pathname.startsWith('/api/auth')) {
      return { limit: 20, window: 60000 }; // 20 per minute
    }

    // Content creation - moderate
    if (pathname.startsWith('/api/content') && pathname !== '/api/content/public') {
      return { limit: 30, window: 60000 }; // 30 per minute
    }

    // Public endpoints - lenient
    if (pathname.startsWith('/api/content/public')) {
      return { limit: 100, window: 60000 }; // 100 per minute
    }

    // Default
    return { limit: 60, window: 60000 }; // 60 per minute
  }
};
```

### 6. Rate Limit Configuration

```yaml
# config/rate-limits.yml
tiers:
  free:
    global:
      requests_per_minute: 60
      requests_per_hour: 1000
    endpoints:
      /api/auth/login:
        per_minute: 5
        per_hour: 20
      /api/auth/register:
        per_minute: 3
        per_day: 10
      /api/content:
        per_minute: 10
        per_hour: 50
      /api/ai/generate:
        per_hour: 5
        per_day: 20
      /api/upload:
        per_hour: 5
        max_size_mb: 10

  creator:
    global:
      requests_per_minute: 200
      requests_per_hour: 5000
    endpoints:
      /api/auth/login:
        per_minute: 10
        per_hour: 50
      /api/content:
        per_minute: 30
        per_hour: 200
      /api/ai/generate:
        per_hour: 20
        per_day: 100
      /api/upload:
        per_hour: 20
        max_size_mb: 100

  pro:
    global:
      requests_per_minute: 500
      requests_per_hour: 20000
    endpoints:
      /api/content:
        per_minute: 100
        per_hour: 1000
      /api/ai/generate:
        per_hour: 100
        per_day: 500
      /api/upload:
        per_hour: 50
        max_size_mb: 500

  enterprise:
    global:
      requests_per_minute: 2000
      requests_per_hour: 100000
    endpoints:
      /api/content:
        per_minute: 500
        per_hour: 10000
      /api/ai/generate:
        per_hour: 1000
        per_day: 10000
      /api/upload:
        per_hour: 200
        max_size_mb: 5000

bypass:
  ips:
    - "10.0.0.0/8"      # Internal network
    - "192.168.0.0/16"  # Private network
  user_ids:
    - "admin-user-id"
  api_keys:
    - "internal-service-key"
```

### 7. Rate Limit Analytics

```typescript
// src/lib/rateLimit/RateLimitAnalytics.ts
export class RateLimitAnalytics {
  private redis: Redis;
  private metrics: MetricsCollector;

  constructor(redis: Redis, metrics: MetricsCollector) {
    this.redis = redis;
    this.metrics = metrics;
  }

  async recordRateLimitHit(
    userId: string,
    endpoint: string,
    allowed: boolean,
    tier: UserTier
  ): Promise<void> {
    const timestamp = Date.now();
    const hour = Math.floor(timestamp / 3600000) * 3600000;

    // Record in Redis for analytics
    const key = `rl:analytics:${hour}`;
    const data = {
      userId,
      endpoint,
      allowed,
      tier,
      timestamp
    };

    await this.redis.zadd(key, timestamp, JSON.stringify(data));
    await this.redis.expire(key, 86400); // Keep for 24 hours

    // Send to metrics system
    this.metrics.recordRateLimitEvent(endpoint, tier, allowed);

    // Alert on suspicious patterns
    if (!allowed) {
      await this.checkForAbuse(userId, endpoint);
    }
  }

  private async checkForAbuse(userId: string, endpoint: string): Promise<void> {
    const recentKey = `rl:abuse:${userId}`;
    const count = await this.redis.incr(recentKey);

    if (count === 1) {
      await this.redis.expire(recentKey, 300); // 5 minute window
    }

    // Alert if user hits rate limit too frequently
    if (count > 10) {
      console.warn(`Potential abuse detected from user ${userId} on ${endpoint}`);

      // Send alert
      await this.sendAbuseAlert(userId, endpoint, count);

      // Consider temporary ban
      if (count > 50) {
        await this.temporaryBan(userId);
      }
    }
  }

  private async temporaryBan(userId: string): Promise<void> {
    const banKey = `rl:ban:${userId}`;
    await this.redis.setex(banKey, 3600, 'banned'); // 1 hour ban
    console.error(`User ${userId} temporarily banned for rate limit abuse`);
  }

  private async sendAbuseAlert(
    userId: string,
    endpoint: string,
    count: number
  ): Promise<void> {
    // Send to monitoring system
    await fetch(process.env.ALERT_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'RATE_LIMIT_ABUSE',
        severity: count > 50 ? 'critical' : 'warning',
        userId,
        endpoint,
        violations: count,
        timestamp: new Date().toISOString()
      })
    });
  }

  async getUsageStats(userId: string): Promise<any> {
    const now = Date.now();
    const dayAgo = now - 86400000;

    const stats = {
      requests: {
        last_hour: 0,
        last_day: 0
      },
      rate_limit_hits: {
        last_hour: 0,
        last_day: 0
      },
      endpoints: {} as Record<string, number>
    };

    // Aggregate usage data
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const hour = Math.floor((now - i * 3600000) / 3600000) * 3600000;
      hours.push(`rl:analytics:${hour}`);
    }

    for (const key of hours) {
      const data = await this.redis.zrangebyscore(
        key,
        dayAgo,
        now
      );

      for (const entry of data) {
        const parsed = JSON.parse(entry);
        if (parsed.userId === userId) {
          stats.requests.last_day++;

          if (parsed.timestamp > now - 3600000) {
            stats.requests.last_hour++;
          }

          if (!parsed.allowed) {
            stats.rate_limit_hits.last_day++;
            if (parsed.timestamp > now - 3600000) {
              stats.rate_limit_hits.last_hour++;
            }
          }

          stats.endpoints[parsed.endpoint] =
            (stats.endpoints[parsed.endpoint] || 0) + 1;
        }
      }
    }

    return stats;
  }
}
```

### 8. Testing Rate Limits

```typescript
// __tests__/rateLimit.test.ts
import { RateLimiter } from '../src/lib/rateLimit/RateLimiter';
import Redis from 'ioredis-mock';

describe('Rate Limiter', () => {
  let redis: Redis;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    redis = new Redis();
    rateLimiter = new RateLimiter(redis, {
      windowMs: 60000,
      maxRequests: 10
    });
  });

  afterEach(async () => {
    await redis.flushall();
  });

  test('allows requests within limit', async () => {
    for (let i = 0; i < 10; i++) {
      const result = await rateLimiter.checkLimit('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9 - i);
    }
  });

  test('blocks requests exceeding limit', async () => {
    // Use up the limit
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkLimit('user1');
    }

    // Next request should be blocked
    const result = await rateLimiter.checkLimit('user1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
  });

  test('sliding window works correctly', async () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkLimit('user1');
    }

    // Wait half the window
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Should be able to make 5 more
    for (let i = 0; i < 5; i++) {
      const result = await rateLimiter.checkLimit('user1');
      expect(result.allowed).toBe(true);
    }

    // But not more
    const result = await rateLimiter.checkLimit('user1');
    expect(result.allowed).toBe(false);
  });

  test('different users have separate limits', async () => {
    // User 1 uses their limit
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkLimit('user1');
    }

    // User 2 should still be allowed
    const result = await rateLimiter.checkLimit('user2');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  test('reset clears rate limit', async () => {
    // Use up limit
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkLimit('user1');
    }

    // Reset
    await rateLimiter.reset('user1');

    // Should be allowed again
    const result = await rateLimiter.checkLimit('user1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });
});
```

## Load Testing Rate Limits

```javascript
// load-tests/rate-limit-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    burst_test: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 1000,
      maxDuration: '30s',
    },
    sustained_test: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
    },
  },
};

export default function() {
  const responses = http.batch([
    ['GET', 'https://api.mustbeviral.com/api/content/public'],
    ['GET', 'https://api.mustbeviral.com/api/auth/status'],
    ['POST', 'https://api.mustbeviral.com/api/content',
      JSON.stringify({ title: 'Test', body: 'Content' }),
      { headers: { 'Content-Type': 'application/json' }}
    ],
  ]);

  responses.forEach(response => {
    check(response, {
      'status is not 429': (r) => r.status !== 429,
      'has rate limit headers': (r) =>
        r.headers['X-RateLimit-Limit'] !== undefined,
    });

    if (response.status === 429) {
      console.log(`Rate limited! Retry after: ${response.headers['Retry-After']}`);
      sleep(parseInt(response.headers['Retry-After'] || '1'));
    }
  });
}
```

## Rate Limiting Best Practices

### 1. Progressive Rate Limiting
- Start with lenient limits
- Monitor actual usage patterns
- Gradually adjust based on data
- Different limits for different endpoints

### 2. User Communication
- Clear error messages
- Show current usage in UI
- Provide upgrade options
- Document limits in API docs

### 3. Monitoring & Alerts
- Track rate limit hits
- Alert on abuse patterns
- Monitor performance impact
- Regular review of limits

### 4. Graceful Degradation
- Fail open if rate limiter fails
- Cache rate limit decisions
- Use multiple backend stores
- Implement circuit breakers

## Deployment Checklist

- [ ] Redis cluster deployed
- [ ] Rate limit middleware configured
- [ ] Cloudflare rate limiting enabled
- [ ] Monitoring dashboards created
- [ ] Alert rules configured
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Client-side retry logic implemented
- [ ] Admin bypass configured
- [ ] Analytics tracking enabled

---

**Important**: Rate limiting is crucial for API stability. Start with conservative limits and adjust based on actual usage patterns.