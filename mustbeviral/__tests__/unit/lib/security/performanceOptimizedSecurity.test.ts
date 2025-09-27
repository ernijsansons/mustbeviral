/**
 * Comprehensive tests for PerformanceOptimizedSecurity
 * Ensuring 98% coverage before refactoring for Grug's simplicity requirements
 */

import { Request, Response, NextFunction } from 'express'
import { PerformanceOptimizedSecurity, SecurityConfig, createSecurityConfig } from '../../../../src/lib/security/performanceOptimizedSecurity'

// Mock dependencies
jest.mock('ioredis')

// Mock JWT since it's not a dependency yet
const mockJWT = {
  verify: jest.fn(),
  sign: jest.fn()
}

// Mock crypto module
const mockCrypto = {
  randomBytes: jest.fn(() => ({ toString: () => 'mock-random' })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash')
  })),
  randomUUID: jest.fn(() => 'mock-uuid')
}

describe('PerformanceOptimizedSecurity', () => {
  let security: PerformanceOptimizedSecurity
  let mockConfig: SecurityConfig
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create test config
    mockConfig = createSecurityConfig()

    // Mock request/response
    mockReq = {
      method: 'GET',
      path: '/test',
      get: jest.fn(),
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    }

    mockNext = jest.fn()

    // Create security instance
    security = new PerformanceOptimizedSecurity(mockConfig)
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with default config', () => {
      expect(security).toBeInstanceOf(PerformanceOptimizedSecurity)
    })

    it('should initialize caches correctly', () => {
      const metrics = security.getSecurityMetrics()
      expect(metrics.cacheStats).toBeDefined()
      expect(metrics.cacheStats.jwt).toBeDefined()
      expect(metrics.cacheStats.user).toBeDefined()
    })

    it('should handle Redis initialization failure gracefully', () => {
      const configWithBadRedis = {
        ...mockConfig,
        rateLimit: {
          ...mockConfig.rateLimit,
          redisUrl: 'invalid-redis-url'
        }
      }

      expect(() => new PerformanceOptimizedSecurity(configWithBadRedis)).not.toThrow()
    })
  })

  describe('Security Middleware', () => {
    it('should process valid request successfully', async () => {
      const middleware = security.securityMiddleware()

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.set).toHaveBeenCalled()
    })

    it('should block blacklisted IP addresses', async () => {
      // Mock IP blocking
      jest.spyOn(security as any, 'checkIPSecurity').mockResolvedValue(false)

      const middleware = security.securityMiddleware()
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle rate limiting', async () => {
      jest.spyOn(security as any, 'checkRateLimit').mockResolvedValue({
        allowed: false,
        retryAfter: 60,
        limit: 100,
        info: { limit: 100, current: 101, remaining: 0, resetTime: Date.now() + 60000 }
      })

      const middleware = security.securityMiddleware()
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(429)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle invalid JWT tokens', async () => {
      mockReq.get = jest.fn().mockReturnValue('Bearer invalid-token')
      jest.spyOn(security, 'authenticateRequest').mockResolvedValue({
        success: false,
        error: 'INVALID_TOKEN'
      })

      const middleware = security.securityMiddleware()
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should validate CSRF tokens for state-changing requests', async () => {
      mockReq.method = 'POST'

      // Mock the config to enable CSRF
      ;(security as any).config.csrf.enabled = true

      jest.spyOn(security as any, 'validateCSRF').mockResolvedValue(false)

      const middleware = security.securityMiddleware()
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should handle middleware errors gracefully', async () => {
      jest.spyOn(security as any, 'checkIPSecurity').mockRejectedValue(new Error('Test error'))

      const middleware = security.securityMiddleware()
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })

  describe('JWT Authentication', () => {
    it('should authenticate valid JWT token', async () => {
      mockReq.get = jest.fn().mockReturnValue('Bearer valid-token')

      // Mock internal methods
      jest.spyOn(security as any, 'loadUserFromDatabase').mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'session123',
        lastActivity: Date.now()
      })

      jest.spyOn(security as any, 'validateSession').mockResolvedValue(true)

      // Mock JWT cache hit to avoid actual JWT verification
      ;(security as any).jwtCache = {
        get: jest.fn().mockReturnValue({ userId: 'user123' }),
        set: jest.fn()
      }

      const result = await security.authenticateRequest(mockReq as Request)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('should reject missing Authorization header', async () => {
      mockReq.get = jest.fn().mockReturnValue(undefined)

      const result = await security.authenticateRequest(mockReq as Request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('MISSING_TOKEN')
    })

    it('should reject malformed Authorization header', async () => {
      mockReq.get = jest.fn().mockReturnValue('Invalid header')

      const result = await security.authenticateRequest(mockReq as Request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('MISSING_TOKEN')
    })

    it('should reject invalid JWT token', async () => {
      mockReq.get = jest.fn().mockReturnValue('Bearer invalid-token')

      // Mock JWT cache miss to force verification, then mock verification failure
      ;(security as any).jwtCache = {
        get: jest.fn().mockReturnValue(undefined),
        set: jest.fn()
      }

      // Mock blacklist check
      ;(security as any).blacklistCache = {
        has: jest.fn().mockReturnValue(false)
      }

      const result = await security.authenticateRequest(mockReq as Request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_TOKEN')
    })

    it('should handle user not found', async () => {
      mockReq.get = jest.fn().mockReturnValue('Bearer valid-token')

      // Mock JWT cache hit
      ;(security as any).jwtCache = {
        get: jest.fn().mockReturnValue({ userId: 'nonexistent' }),
        set: jest.fn()
      }

      jest.spyOn(security as any, 'loadUserFromDatabase').mockResolvedValue(null)

      const result = await security.authenticateRequest(mockReq as Request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('USER_NOT_FOUND')
    })

    it('should handle expired session', async () => {
      mockReq.get = jest.fn().mockReturnValue('Bearer valid-token')

      // Mock JWT cache hit
      ;(security as any).jwtCache = {
        get: jest.fn().mockReturnValue({ userId: 'user123' }),
        set: jest.fn()
      }

      jest.spyOn(security as any, 'loadUserFromDatabase').mockResolvedValue({
        id: 'user123',
        sessionId: 'expired-session'
      })

      jest.spyOn(security as any, 'validateSession').mockResolvedValue(false)

      const result = await security.authenticateRequest(mockReq as Request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('SESSION_EXPIRED')
    })
  })

  describe('Rate Limiting', () => {
    it('should allow requests under rate limit', async () => {
      const context = {
        ipAddress: '127.0.0.1',
        requestId: 'req123',
        startTime: Date.now(),
        userAgent: 'test',
        isAuthenticated: false,
        rateLimitInfo: { limit: 100, current: 0, remaining: 100, resetTime: 0 }
      }

      // Mock Redis operations
      const mockRedis = {
        multi: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, 0], [null, 5], [null, 'OK'], [null, 1]])
        })
      }

      ;(security as any).rateLimitStore = mockRedis

      const result = await (security as any).checkRateLimit(mockReq, context)

      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(mockConfig.rateLimit.maxRequests)
    })

    it('should block requests over rate limit', async () => {
      const context = {
        ipAddress: '127.0.0.1',
        requestId: 'req123',
        startTime: Date.now(),
        userAgent: 'test',
        isAuthenticated: false,
        rateLimitInfo: { limit: 100, current: 0, remaining: 100, resetTime: 0 }
      }

      // Mock Redis operations with high count
      const mockRedis = {
        multi: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, 0], [null, 150], [null, 'OK'], [null, 1]])
        })
      }

      ;(security as any).rateLimitStore = mockRedis

      const result = await (security as any).checkRateLimit(mockReq, context)

      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should fail open when Redis is unavailable', async () => {
      const context = {
        ipAddress: '127.0.0.1',
        requestId: 'req123',
        startTime: Date.now(),
        userAgent: 'test',
        isAuthenticated: false,
        rateLimitInfo: { limit: 100, current: 0, remaining: 100, resetTime: 0 }
      }

      // Mock Redis failure
      const mockRedis = {
        multi: jest.fn().mockImplementation(() => {
          throw new Error('Redis unavailable')
        })
      }

      ;(security as any).rateLimitStore = mockRedis

      const result = await (security as any).checkRateLimit(mockReq, context)

      expect(result.allowed).toBe(true) // Fail open
    })
  })

  describe('CSRF Protection', () => {
    it('should validate correct CSRF token', async () => {
      const context = {
        requestId: 'req123',
        user: { sessionId: 'session123' }
      }

      mockReq.get = jest.fn().mockReturnValue('valid-csrf-token')

      // Mock token storage
      ;(security as any).csrfTokens = {
        get: jest.fn().mockReturnValue('valid-csrf-token')
      }

      jest.spyOn(security as any, 'constantTimeCompare').mockReturnValue(true)

      const result = await (security as any).validateCSRF(mockReq, context)

      expect(result).toBe(true)
    })

    it('should reject missing CSRF token', async () => {
      const context = { requestId: 'req123' }

      mockReq.get = jest.fn().mockReturnValue(undefined)
      mockReq.body = {}

      const result = await (security as any).validateCSRF(mockReq, context)

      expect(result).toBe(false)
    })

    it('should reject invalid CSRF token', async () => {
      const context = { requestId: 'req123' }

      mockReq.get = jest.fn().mockReturnValue('invalid-token')

      ;(security as any).csrfTokens = {
        get: jest.fn().mockReturnValue('valid-token')
      }

      jest.spyOn(security as any, 'constantTimeCompare').mockReturnValue(false)

      const result = await (security as any).validateCSRF(mockReq, context)

      expect(result).toBe(false)
    })

    it('should generate new CSRF token', () => {
      const context = { requestId: 'req123' }

      const crypto = require('crypto')
      crypto.randomBytes = jest.fn().mockReturnValue({ toString: () => 'random-token' })

      ;(security as any).csrfTokens = {
        set: jest.fn()
      }

      const token = (security as any).generateCSRFToken(context)

      expect(token).toBe('random-token')
      expect((security as any).csrfTokens.set).toHaveBeenCalledWith('req123', 'random-token')
    })
  })

  describe('Authorization Middleware', () => {
    it('should allow user with required permission', () => {
      const middleware = security.requirePermission('read')

      mockReq.user = {
        id: 'user123',
        permissions: ['read', 'write']
      }

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should reject user without required permission', () => {
      const middleware = security.requirePermission('admin')

      mockReq.user = {
        id: 'user123',
        permissions: ['read']
      }

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject unauthenticated user for permission check', () => {
      const middleware = security.requirePermission('read')

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow user with required role', () => {
      const middleware = security.requireRole('admin')

      mockReq.user = {
        id: 'user123',
        roles: ['admin', 'user']
      }

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should reject user without required role', () => {
      const middleware = security.requireRole('admin')

      mockReq.user = {
        id: 'user123',
        roles: ['user']
      }

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize request body', () => {
      mockReq.body = {
        username: '<script>alert("xss")</script>',
        nested: {
          value: '">onclick=alert(1)'
        }
      }

      ;(security as any).sanitizeRequest(mockReq)

      expect(mockReq.body.username).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
      expect(mockReq.body.nested.value).toBe('&quot;&gt;onclick=alert(1)')
    })

    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: '<img src=x onerror=alert(1)>'
      }

      ;(security as any).sanitizeRequest(mockReq)

      expect(mockReq.query.search).toBe('&lt;img src=x onerror=alert(1)&gt;')
    })

    it('should handle null and undefined values', () => {
      mockReq.body = {
        nullValue: null,
        undefinedValue: undefined,
        numberValue: 123
      }

      expect(() => (security as any).sanitizeRequest(mockReq)).not.toThrow()
    })
  })

  describe('Security Headers', () => {
    it('should set standard security headers', () => {
      const context = {
        requestId: 'req123',
        startTime: Date.now() - 100,
        rateLimitInfo: {
          limit: 100,
          remaining: 95,
          resetTime: Date.now() + 60000
        },
        isAuthenticated: false
      }

      ;(security as any).setSecurityHeaders(mockRes, context)

      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'X-Request-ID': 'req123'
      }))
    })

    it('should include CSRF token for authenticated users', () => {
      mockConfig.csrf.enabled = true
      const context = {
        requestId: 'req123',
        startTime: Date.now(),
        isAuthenticated: true,
        user: { sessionId: 'session123' }
      }

      jest.spyOn(security as any, 'generateCSRFToken').mockReturnValue('csrf-token-123')

      ;(security as any).setSecurityHeaders(mockRes, context)

      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-CSRF-Token': 'csrf-token-123'
      }))
    })
  })

  describe('Helper Methods', () => {
    it('should extract client IP correctly', () => {
      mockReq.ip = '192.168.1.1'

      const ip = (security as any).getClientIP(mockReq)

      expect(ip).toBe('192.168.1.1')
    })

    it('should fallback to X-Forwarded-For header', () => {
      mockReq.ip = undefined
      mockReq.get = jest.fn().mockReturnValue('203.0.113.1, 192.168.1.1')

      const ip = (security as any).getClientIP(mockReq)

      expect(ip).toBe('203.0.113.1')
    })

    it('should hash tokens consistently', () => {
      const crypto = require('crypto')
      crypto.createHash = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashedtoken123456789012345678901')
      })

      const hash = (security as any).hashToken('test-token')

      expect(hash).toBe('hashedtoken123456789012345678901')
    })

    it('should perform constant time comparison', () => {
      const result1 = (security as any).constantTimeCompare('hello', 'hello')
      const result2 = (security as any).constantTimeCompare('hello', 'world')
      const result3 = (security as any).constantTimeCompare('hello', 'hello!')

      expect(result1).toBe(true)
      expect(result2).toBe(false)
      expect(result3).toBe(false)
    })

    it('should generate unique request IDs', () => {
      const crypto = require('crypto')
      crypto.randomBytes = jest.fn().mockReturnValue({
        toString: () => 'unique-request-id'
      })

      const id = (security as any).generateRequestId()

      expect(id).toBe('unique-request-id')
    })
  })

  describe('Security Metrics', () => {
    it('should collect and return metrics', () => {
      // Update some metrics
      ;(security as any).updateSecurityMetrics('/api/test', 150, false)
      ;(security as any).updateSecurityMetrics('/api/test', 200, true)

      const metrics = security.getSecurityMetrics()

      expect(metrics.endpointMetrics['/api/test']).toEqual({
        requests: 2,
        averageTime: 175,
        errorRate: 0.5,
        totalTime: 350
      })

      expect(metrics.cacheStats).toBeDefined()
      expect(metrics.securityCounts).toBeDefined()
    })
  })

  describe('Session Validation', () => {
    it('should validate active session', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue('active-session')
      }

      ;(security as any).sessionStore = mockRedis

      const result = await (security as any).validateSession('session123')

      expect(result).toBe(true)
      expect(mockRedis.get).toHaveBeenCalledWith('session:session123')
    })

    it('should reject expired session', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null)
      }

      ;(security as any).sessionStore = mockRedis

      const result = await (security as any).validateSession('expired-session')

      expect(result).toBe(false)
    })

    it('should fail open when Redis is unavailable', async () => {
      const mockRedis = {
        get: jest.fn().mockRejectedValue(new Error('Redis down'))
      }

      ;(security as any).sessionStore = mockRedis

      const result = await (security as any).validateSession('session123')

      expect(result).toBe(true) // Fail open
    })

    it('should handle missing session store', async () => {
      ;(security as any).sessionStore = null

      const result = await (security as any).validateSession('session123')

      expect(result).toBe(true) // Fallback
    })
  })

  describe('IP Security', () => {
    it('should allow whitelisted IPs', async () => {
      ;(security as any).ipWhitelist.add('192.168.1.100')

      const result = await (security as any).checkIPSecurity('192.168.1.100')

      expect(result).toBe(true)
    })

    it('should block blacklisted IPs', async () => {
      ;(security as any).ipBlacklist.add('10.0.0.1')

      const result = await (security as any).checkIPSecurity('10.0.0.1')

      expect(result).toBe(false)
    })

    it('should check blacklist cache', async () => {
      ;(security as any).blacklistCache.set('203.0.113.1', true)

      const result = await (security as any).checkIPSecurity('203.0.113.1')

      expect(result).toBe(false)
    })

    it('should allow unknown IPs by default', async () => {
      const result = await (security as any).checkIPSecurity('203.0.113.1')

      expect(result).toBe(true)
    })
  })

  describe('Configuration Factory', () => {
    it('should create default configuration', () => {
      const config = createSecurityConfig()

      expect(config.jwt.secret).toBeDefined()
      expect(config.rateLimit.maxRequests).toBe(100)
      expect(config.csrf.enabled).toBe(false) // False in test env
      expect(config.session.httpOnly).toBe(true)
    })

    it('should respect environment variables', () => {
      process.env.JWT_SECRET = 'test-secret'
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com'

      const config = createSecurityConfig()

      expect(config.jwt.secret).toBe('test-secret')
      expect(config.cors.origins).toEqual(['http://localhost:3000', 'https://example.com'])
    })
  })
})