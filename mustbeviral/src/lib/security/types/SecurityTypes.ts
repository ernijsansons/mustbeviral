/**
 * Security Types - All interfaces and types for security modules
 * Grug-approved: Simple, clear types that junior dev can understand
 */

export interface SecurityConfig {
  jwt: {
    secret: string
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256'
    expiresIn: string
    refreshSecret: string
    cacheSize: number
    cacheTTL: number
  }
  rateLimit: {
    windowMs: number
    maxRequests: number
    skipSuccessfulRequests: boolean
    enableDistributed: boolean
    redisUrl?: string
  }
  csrf: {
    enabled: boolean
    cookieName: string
    headerName: string
    secretLength: number
  }
  cors: {
    enabled: boolean
    origins: string[]
    methods: string[]
    allowedHeaders: string[]
  }
  validation: {
    maxBodySize: string
    enableSanitization: boolean
    enableXssProtection: boolean
  }
  session: {
    secret: string
    maxAge: number
    secure: boolean
    httpOnly: boolean
    sameSite: 'strict' | 'lax' | 'none'
  }
}

export interface User {
  id: string
  email: string
  roles: string[]
  permissions: string[]
  sessionId: string
  lastActivity: number
}

export interface SecurityContext {
  user?: User
  requestId: string
  startTime: number
  ipAddress: string
  userAgent: string
  isAuthenticated: boolean
  rateLimitInfo: {
    limit: number
    current: number
    remaining: number
    resetTime: number
  }
}

export interface AuthResult {
  success: boolean
  user?: User
  error?: string
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
  limit: number
  info: SecurityContext['rateLimitInfo']
}

export interface SimpleRedis {
  multi(): {
    zremrangebyscore(key: string, min: string, max: string | number): any
    zcard(key: string): any
    zadd(key: string, score: number, member: string): any
    expire(key: string, seconds: number): any
    exec(): Promise<Array<[Error | null, any]>>
  }
  get(key: string): Promise<string | null>
}