/**
 * Rate Limiting Middleware
 * Integrates multi-layer rate limiting into the application
 */

import { RateLimiter } from '../lib/security/rateLimiter';
import type { Context, Next } from 'hono';

const rateLimiter = new RateLimiter();

export interface RateLimitOptions {
  endpoint?: string;
  useIp?: boolean;
  useUserId?: boolean;
  weight?: number;
  customLimits?: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
  options: RateLimitOptions = {}
) {
  return async (c: Context, next: Next) => {
    try {
      // Determine identifier
      let identifier: string;

      if (options.useUserId && c.get('user')) {
        identifier = c.get('user').userId;
      } else if (options.useIp !== false) {
        identifier = getClientIp(c) || 'unknown';
      } else {
        identifier = 'anonymous';
      }

      // Determine endpoint
      const endpoint = options.endpoint || getEndpointFromPath(c.req.path);

      // Check global rate limit first
      const globalResult = await rateLimiter.checkGlobalRateLimit(endpoint);
      if (!globalResult.allowed) {
        return respondWithRateLimit(c, globalResult, 'Global rate limit exceeded');
      }

      // Check user/IP specific rate limit
      const result = options.weight
        ? await rateLimiter.checkWeightedRateLimit(
            identifier,
            endpoint,
            options.weight,
            options.customLimits
          )
        : await rateLimiter.checkRateLimit(
            identifier,
            endpoint,
            options.customLimits
          );

      // Add rate limit headers to response
      Object.entries(rateLimiter.getRateLimitHeaders(result)).forEach(
        ([key, value]) => c.header(key, value)
      );

      if (!result.allowed) {
        return respondWithRateLimit(c, result);
      }

      // Check IP-based rate limit as additional layer
      if (options.useIp !== false) {
        const ip = getClientIp(c);
        if (ip) {
          const ipResult = await rateLimiter.checkIpRateLimit(ip, endpoint);
          if (!ipResult.allowed) {
            return respondWithRateLimit(c, ipResult, 'IP rate limit exceeded');
          }
        }
      }

      await next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // On error, allow request but log for monitoring
      await next();
    }
  };
}

/**
 * Strict rate limiting for sensitive endpoints
 */
export function strictRateLimit(endpoint: string) {
  return rateLimitMiddleware({
    endpoint,
    useIp: true,
    useUserId: true,
    customLimits: {
      windowMs: 60000, // 1 minute
      maxRequests: 5 // Very strict limit
    }
  });
}

/**
 * AI endpoint rate limiting (expensive operations)
 */
export function aiRateLimit() {
  return rateLimitMiddleware({
    endpoint: 'ai',
    useUserId: true,
    weight: 10, // Each AI request counts as 10 regular requests
    customLimits: {
      windowMs: 60000,
      maxRequests: 10 // 10 AI requests per minute
    }
  });
}

/**
 * Authentication rate limiting
 */
export function authRateLimit() {
  return rateLimitMiddleware({
    endpoint: 'auth',
    useIp: true,
    customLimits: {
      windowMs: 300000, // 5 minutes
      maxRequests: 5 // 5 auth attempts per 5 minutes
    }
  });
}

/**
 * Upload rate limiting
 */
export function uploadRateLimit() {
  return rateLimitMiddleware({
    endpoint: 'upload',
    useUserId: true,
    weight: 5, // Each upload counts as 5 requests
    customLimits: {
      windowMs: 300000, // 5 minutes
      maxRequests: 10 // 10 uploads per 5 minutes
    }
  });
}

/**
 * Helper to get client IP
 */
function getClientIp(c: Context): string | null {
  // Check various headers for real IP
  const headers = [
    'CF-Connecting-IP', // Cloudflare
    'X-Forwarded-For',
    'X-Real-IP',
    'X-Client-IP'
  ];

  for (const header of headers) {
    const value = c.req.header(header);
    if (value) {
      // Handle comma-separated IPs
      const ip = value.split(',')[0].trim();
      if (isValidIp(ip)) {
        return ip;
      }
    }
  }

  return null;
}

/**
 * Validate IP address
 */
function isValidIp(ip: string): boolean {
  // Simple IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Simple IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Determine endpoint category from path
 */
function getEndpointFromPath(path: string): string {
  if (path.startsWith('/api/auth')) return 'auth';
  if (path.startsWith('/api/ai') || path.includes('/generate')) return 'ai';
  if (path.startsWith('/api/upload')) return 'upload';
  if (path.startsWith('/api/payment')) return 'payment';
  if (path.startsWith('/api/content')) return 'content';
  return 'api';
}

/**
 * Respond with rate limit error
 */
function respondWithRateLimit(
  c: Context,
  result: any,
  message: string = 'Rate limit exceeded'
) {
  return c.json(
    {
      error: message,
      retryAfter: result.retryAfter,
      resetTime: result.resetTime
    },
    429
  );
}

export default rateLimitMiddleware;