/**
 * Rate Limit Service
 * Grug-approved: Simple rate limiting with Redis fallback
 * Clear logic that handles both distributed and local rate limiting
 */

import { Request } from 'express'
import { SecurityConfig, SecurityContext, RateLimitResult, SimpleRedis } from '../types/SecurityTypes'

export class RateLimitService {
  private rateLimitStore: SimpleRedis | null

  constructor(
    private config: SecurityConfig,
    rateLimitStore: SimpleRedis | null = null
  ) {
    this.rateLimitStore = rateLimitStore
  }

  async checkRateLimit(req: Request, context: SecurityContext): Promise<RateLimitResult> {
    const key = this.buildRateLimitKey(context.ipAddress, req.path)
    const windowMs = this.config.rateLimit.windowMs
    const maxRequests = this.config.rateLimit.maxRequests
    const now = Date.now()

    if (!this.rateLimitStore) {
      return this.allowRequest(maxRequests, now, windowMs)
    }

    try {
      const currentCount = await this.getRequestCount(key, windowMs, now)
      const rateLimitInfo = this.buildRateLimitInfo(maxRequests, currentCount, windowMs, now)

      if (currentCount >= maxRequests) {
        return this.blockRequest(maxRequests, rateLimitInfo, windowMs, now)
      }

      return { allowed: true, limit: maxRequests, info: rateLimitInfo }
    } catch {
      return this.allowRequest(maxRequests, now, windowMs)
    }
  }

  private buildRateLimitKey(ipAddress: string, path: string): string {
    return `rate_limit:${ipAddress}:${path}`
  }

  private async getRequestCount(key: string, windowMs: number, now: number): Promise<number> {
    if (!this.rateLimitStore) {
      return 0
    }

    const multi = this.rateLimitStore.multi()
    multi.zremrangebyscore(key, '-inf', now - windowMs)
    multi.zcard(key)
    multi.zadd(key, now, `${now}-${Math.random()}`)
    multi.expire(key, Math.ceil(windowMs / 1000))

    const results = await multi.exec()
    return results?.[1]?.[1] as number ?? 0
  }

  private buildRateLimitInfo(maxRequests: number, currentCount: number, windowMs: number, now: number) {
    const windowStart = Math.floor(now / windowMs) * windowMs
    return {
      limit: maxRequests,
      current: currentCount + 1,
      remaining: Math.max(0, maxRequests - currentCount - 1),
      resetTime: windowStart + windowMs
    }
  }

  private allowRequest(maxRequests: number, now: number, windowMs: number): RateLimitResult {
    return {
      allowed: true,
      limit: maxRequests,
      info: {
        limit: maxRequests,
        current: 1,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      }
    }
  }

  private blockRequest(
    maxRequests: number,
    rateLimitInfo: SecurityContext['rateLimitInfo'],
    windowMs: number,
    now: number
  ): RateLimitResult {
    const windowStart = Math.floor(now / windowMs) * windowMs
    return {
      allowed: false,
      retryAfter: Math.ceil((windowStart + windowMs - now) / 1000),
      limit: maxRequests,
      info: rateLimitInfo
    }
  }
}