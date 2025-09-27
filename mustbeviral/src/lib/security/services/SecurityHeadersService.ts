/**
 * Security Headers Service
 * Grug-approved: Simple security headers management
 * Sets standard headers without complex logic
 */

import { Response } from 'express'
import { SecurityConfig, SecurityContext } from '../types/SecurityTypes'

export class SecurityHeadersService {
  constructor(private config: SecurityConfig) {}

  setSecurityHeaders(res: Response, context: SecurityContext, csrfToken?: string): void {
    const headers = this.buildHeaders(context, csrfToken)
    res.set(headers)
  }

  private buildHeaders(context: SecurityContext, csrfToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Request-ID': context.requestId,
      'X-Response-Time': this.calculateResponseTime(context)
    }

    this.addRateLimitHeaders(headers, context)
    this.addCSRFHeaders(headers, context, csrfToken)

    return headers
  }

  private calculateResponseTime(context: SecurityContext): string {
    const responseTime = Date.now() - context.startTime
    return `${responseTime}ms`
  }

  private addRateLimitHeaders(headers: Record<string, string>, context: SecurityContext): void {
    if (!context.rateLimitInfo) {
      return
    }

    headers['X-RateLimit-Limit'] = context.rateLimitInfo.limit.toString()
    headers['X-RateLimit-Remaining'] = context.rateLimitInfo.remaining.toString()
    headers['X-RateLimit-Reset'] = Math.ceil(context.rateLimitInfo.resetTime / 1000).toString()
  }

  private addCSRFHeaders(headers: Record<string, string>, context: SecurityContext, csrfToken?: string): void {
    if (!this.shouldIncludeCSRFToken(context)) {
      return
    }

    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }
  }

  private shouldIncludeCSRFToken(context: SecurityContext): boolean {
    return context.isAuthenticated && this.config.csrf.enabled
  }
}