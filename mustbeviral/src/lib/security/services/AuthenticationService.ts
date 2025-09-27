/**
 * Authentication Service
 * Grug-approved: Simple JWT verification and user loading
 * Each function does ONE thing and is easy to understand
 */

import { Request } from 'express'
import crypto from 'crypto'
import { SimpleCache } from '../cache/SimpleCache'
import { SecurityConfig, User, AuthResult, SimpleRedis } from '../types/SecurityTypes'

export class AuthenticationService {
  private jwtCache: SimpleCache<string, any>
  private userCache: SimpleCache<string, User>
  private blacklistCache: SimpleCache<string, boolean>
  private sessionStore: SimpleRedis | null

  constructor(
    private config: SecurityConfig,
    sessionStore: SimpleRedis | null = null
  ) {
    this.sessionStore = sessionStore
    this.initCaches()
  }

  async authenticateRequest(req: Request): Promise<AuthResult> {
    const token = this.extractToken(req)
    if (!token) {
      return { success: false, error: 'MISSING_TOKEN' }
    }

    const decoded = await this.verifyToken(token)
    if (!decoded) {
      return { success: false, error: 'INVALID_TOKEN' }
    }

    const user = await this.loadUser(decoded.userId)
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' }
    }

    const sessionValid = await this.checkSession(user.sessionId)
    if (!sessionValid) {
      return { success: false, error: 'SESSION_EXPIRED' }
    }

    return { success: true, user }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }
    return authHeader.slice(7)
  }

  private async verifyToken(token: string): Promise<any | null> {
    const cacheKey = this.hashToken(token)

    let decoded = this.jwtCache.get(cacheKey)
    if (decoded) {
      return decoded
    }

    if (this.isTokenBlacklisted(token)) {
      return null
    }

    try {
      decoded = this.parseJWT(token)
      this.jwtCache.set(cacheKey, decoded)
      return decoded
    } catch {
      return null
    }
  }

  private parseJWT(token: string): any {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired')
    }

    return payload
  }

  private async loadUser(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`
    let user = this.userCache.get(cacheKey)

    if (!user) {
      user = await this.loadUserFromDatabase(userId)
      if (user) {
        this.userCache.set(cacheKey, user)
      }
    }

    return user
  }

  private async loadUserFromDatabase(userId: string): Promise<User | null> {
    // Mock implementation - replace with actual database call
    return {
      id: userId,
      email: `user${userId}@example.com`,
      roles: ['user'],
      permissions: ['read'],
      sessionId: crypto.randomUUID(),
      lastActivity: Date.now()
    }
  }

  private async checkSession(sessionId: string): Promise<boolean> {
    if (!this.sessionStore) {
      return true // Fallback when Redis not available
    }

    try {
      const session = await this.sessionStore.get(`session:${sessionId}`)
      return session !== null
    } catch {
      return true // Fail open
    }
  }

  private isTokenBlacklisted(token: string): boolean {
    return this.blacklistCache.has(token)
  }

  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')
      .substring(0, 32)
  }

  private initCaches(): void {
    this.jwtCache = new SimpleCache({
      max: this.config.jwt.cacheSize,
      ttl: this.config.jwt.cacheTTL * 1000
    })

    this.userCache = new SimpleCache({
      max: 10000,
      ttl: 300000 // 5 minutes
    })

    this.blacklistCache = new SimpleCache({
      max: 100000,
      ttl: 3600000 // 1 hour
    })
  }
}