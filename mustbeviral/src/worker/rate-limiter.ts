// Advanced Rate Limiting Service for Cloudflare Workers
// Protects against brute force attacks and API abuse

import { CloudflareEnv } from '../lib/cloudflare';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  reason?: string;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  blockDurationMs: number; // How long to block after exceeding limit
}

export class RateLimiter {
  // Rate limit configurations for different endpoint types
  private static readonly CONFIGS = {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
      blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes after exceeding
    },
    registration: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 registration attempts per hour
      blockDurationMs: 2 * 60 * 60 * 1000 // Block for 2 hours
    },
    general: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
      blockDurationMs: 5 * 60 * 1000 // Block for 5 minutes
    },
    content: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 content operations per minute
      blockDurationMs: 10 * 60 * 1000 // Block for 10 minutes
    },
    ai: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5, // 5 AI requests per minute
      blockDurationMs: 15 * 60 * 1000 // Block for 15 minutes
    }
  };

  /**
   * Check rate limit for authentication endpoints
   */
  static async checkAuthRateLimit(
    identifier: string,
    env: CloudflareEnv
  ): Promise<RateLimitResult> {
    return this.checkRateLimit('auth', identifier, env);
  }

  /**
   * Check rate limit for registration
   */
  static async checkRegistrationRateLimit(
    identifier: string,
    env: CloudflareEnv
  ): Promise<RateLimitResult> {
    return this.checkRateLimit('registration', identifier, env);
  }

  /**
   * Check rate limit for general API usage
   */
  static async checkGeneralRateLimit(
    identifier: string,
    env: CloudflareEnv
  ): Promise<RateLimitResult> {
    return this.checkRateLimit('general', identifier, env);
  }

  /**
   * Check rate limit for content operations
   */
  static async checkContentRateLimit(
    identifier: string,
    env: CloudflareEnv
  ): Promise<RateLimitResult> {
    return this.checkRateLimit('content', identifier, env);
  }

  /**
   * Check rate limit for AI operations
   */
  static async checkAIRateLimit(
    identifier: string,
    env: CloudflareEnv
  ): Promise<RateLimitResult> {
    return this.checkRateLimit('ai', identifier, env);
  }

  /**
   * Core rate limiting logic
   */
  private static async checkRateLimit(
    type: keyof typeof RateLimiter.CONFIGS,
    identifier: string,
    env: CloudflareEnv
  ): Promise<RateLimitResult> {
    const config = this.CONFIGS[type];
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;

    // Create keys for current and previous windows
    const currentKey = `ratelimit:${type}:${identifier}:${windowStart}`;
    const blockKey = `ratelimit:block:${type}:${identifier}`;

    try {
      // Check if currently blocked
      const blockData = await env.KV?.get(blockKey);
      if (blockData) {
        const blockInfo = JSON.parse(blockData);
        if (now < blockInfo.unblockTime) {
          return {
            allowed: false,
            limit: config.maxRequests,
            remaining: 0,
            resetTime: blockInfo.unblockTime,
            reason: 'IP temporarily blocked due to rate limit violation'
          };
        } else {
          // Block period expired, remove block
          await env.KV?.delete(blockKey);
        }
      }

      // Get current request count
      const currentCountData = await env.KV?.get(currentKey);
      const currentCount = currentCountData ? parseInt(currentCountData, 10) : 0;

      // Check if limit exceeded
      if (currentCount >= config.maxRequests) {
        // Block the identifier
        await env.KV?.put(
          blockKey,
          JSON.stringify({
            blockedAt: now,
            unblockTime: now + config.blockDurationMs,
            violations: (blockData ? JSON.parse(blockData).violations + 1 : 1)
          }),
          { expirationTtl: Math.ceil(config.blockDurationMs / 1000) }
        );

        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: windowStart + config.windowMs,
          reason: 'Rate limit exceeded, IP blocked temporarily'
        };
      }

      // Increment counter
      const newCount = currentCount + 1;
      await env.KV?.put(
        currentKey,
        newCount.toString(),
        { expirationTtl: Math.ceil(config.windowMs / 1000) }
      );

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetTime: windowStart + config.windowMs
      };

    } catch (error: unknown) {
      console.error('Rate limiting error:', error);

      // On error, allow request but log the issue
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: windowStart + config.windowMs,
        reason: 'Rate limiting service unavailable'
      };
    }
  }

  /**
   * Extract identifier from request (IP + User-Agent for better uniqueness)
   */
  static getIdentifier(request: Request): string {
    const ip = request.headers.get('cf-connecting-ip') ||
                request.headers.get('x-forwarded-for') ||
                'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create a hash of IP + User-Agent for better fingerprinting
    return this.hashString(`${ip}:${userAgent.substring(0, 50)}`);
  }

  /**
   * Extract user-specific identifier for authenticated requests
   */
  static getUserIdentifier(userId: string, request: Request): string {
    const baseId = this.getIdentifier(request);
    return this.hashString(`user:${userId}:${baseId}`);
  }

  /**
   * Simple hash function for identifiers
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Create rate limit headers for HTTP response
   */
  static createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
      ...(result.reason && { 'X-RateLimit-Reason': result.reason })
    };
  }

  /**
   * Check for suspicious patterns that might indicate an attack
   */
  static async checkSuspiciousActivity(
    identifier: string,
    env: CloudflareEnv,
    endpoint: string
  ): Promise<{ suspicious: boolean; reason?: string }> {
    const now = Date.now();
    const suspiciousKey = `suspicious:${identifier}`;

    try {
      const data = await env.KV?.get(suspiciousKey);
      const suspiciousData = data ? JSON.parse(data) : {
        requests: [],
        firstSeen: now,
        totalRequests: 0,
        uniqueEndpoints: new Set()
      };

      // Add current request
      suspiciousData.requests.push({ timestamp: now, endpoint });
      suspiciousData.totalRequests++;
      suspiciousData.uniqueEndpoints.add(endpoint);

      // Remove old requests (older than 1 hour)
      const oneHourAgo = now - (60 * 60 * 1000);
      suspiciousData.requests = suspiciousData.requests.filter((req: unknown) => req.timestamp > oneHourAgo);

      // Check for suspicious patterns
      const recentRequests = suspiciousData.requests.length;
      const uniqueEndpoints = suspiciousData.uniqueEndpoints.size;

      // Pattern 1: Too many requests in short time
      if (recentRequests > 200) {
        return { suspicious: true, reason: 'Excessive request volume' };
      }

      // Pattern 2: Scanning behavior (many different endpoints)
      if (uniqueEndpoints > 20 && recentRequests > 50) {
        return { suspicious: true, reason: 'Potential scanning behavior' };
      }

      // Pattern 3: Rapid-fire requests (more than 1 per second for extended period)
      const lastMinute = suspiciousData.requests.filter((req: unknown) => req.timestamp > now - 60000);
      if (lastMinute.length > 60) {
        return { suspicious: true, reason: 'Abnormally high request frequency' };
      }

      // Update suspicious data
      await env.KV?.put(
        suspiciousKey,
        JSON.stringify({
          ...suspiciousData,
          uniqueEndpoints: Array.from(suspiciousData.uniqueEndpoints)
        }),
        { expirationTtl: 3600 } // 1 hour TTL
      );

      return { suspicious: false };

    } catch (error: unknown) {
      console.error('Suspicious activity check error:', error);
      return { suspicious: false };
    }
  }
}