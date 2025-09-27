/**
 * CSRF Protection Service
 * Grug-approved: Simple CSRF token generation and validation
 * No complex crypto, just basic token management that works
 */

import { Request } from 'express'
import crypto from 'crypto'
import { SimpleCache } from '../cache/SimpleCache'
import { SecurityConfig, SecurityContext } from '../types/SecurityTypes'

export class CSRFProtectionService {
  private csrfTokens: SimpleCache<string, string>

  constructor(private config: SecurityConfig) {
    this.initCache()
  }

  generateToken(context: SecurityContext): string {
    const token = this.createRandomToken()
    const key = this.getTokenKey(context)
    this.csrfTokens.set(key, token)
    return token
  }

  async validateToken(req: Request, context: SecurityContext): Promise<boolean> {
    if (!this.requiresCSRFProtection(req)) {
      return true
    }

    const providedToken = this.extractToken(req)
    if (!providedToken) {
      return false
    }

    const expectedToken = this.getStoredToken(context)
    if (!expectedToken) {
      this.generateToken(context) // Generate for next request
      return false
    }

    return this.compareTokens(providedToken, expectedToken)
  }

  private requiresCSRFProtection(req: Request): boolean {
    const method = req.method.toUpperCase()
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  }

  private extractToken(req: Request): string | null {
    const headerToken = req.get(this.config.csrf.headerName)
    const bodyToken = req.body?.csrf
    return headerToken ?? bodyToken ?? null
  }

  private getStoredToken(context: SecurityContext): string | null {
    const key = this.getTokenKey(context)
    return this.csrfTokens.get(key) ?? null
  }

  private getTokenKey(context: SecurityContext): string {
    return context.user?.sessionId ?? context.requestId
  }

  private createRandomToken(): string {
    return crypto
      .randomBytes(this.config.csrf.secretLength)
      .toString('hex')
  }

  private compareTokens(tokenA: string, tokenB: string): boolean {
    if (tokenA.length !== tokenB.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < tokenA.length; i++) {
      result |= tokenA.charCodeAt(i) ^ tokenB.charCodeAt(i)
    }

    return result === 0
  }

  private initCache(): void {
    this.csrfTokens = new SimpleCache({
      max: 50000,
      ttl: 1800000 // 30 minutes
    })
  }
}