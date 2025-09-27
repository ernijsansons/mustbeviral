/**
 * Security Middleware
 * Grug-approved: Simple orchestrator that combines all security services
 * Each step is clear and handles one security concern
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { SecurityConfig, SecurityContext, SimpleRedis } from '../types/SecurityTypes'
import { AuthenticationService } from '../services/AuthenticationService'
import { RateLimitService } from '../services/RateLimitService'
import { CSRFProtectionService } from '../services/CSRFProtectionService'
import { IPSecurityService } from '../services/IPSecurityService'
import { SecurityHeadersService } from '../services/SecurityHeadersService'
import { InputSanitizationService } from '../services/InputSanitizationService'
import { SecurityMetricsCollector } from './SecurityMetricsCollector'

export class SecurityMiddleware {
  private authService: AuthenticationService
  private rateLimitService: RateLimitService
  private csrfService: CSRFProtectionService
  private ipService: IPSecurityService
  private headersService: SecurityHeadersService
  private sanitizationService: InputSanitizationService
  private metricsCollector: SecurityMetricsCollector

  constructor(
    private config: SecurityConfig,
    rateLimitStore: SimpleRedis | null = null,
    sessionStore: SimpleRedis | null = null
  ) {
    this.initServices(rateLimitStore, sessionStore)
  }

  getMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now()
      const context = this.createSecurityContext(req, startTime)

      try {
        await this.processSecurityChecks(req, res, context, next)
      } catch (error) {
        this.handleSecurityError(error, req, res, startTime)
      }
    }
  }

  getSecurityMetrics(): Record<string, any> {
    return this.metricsCollector.getMetrics()
  }

  requirePermission = (permission: string) => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user) return res.status(401).json({ error: 'Authentication required' })
    if (!user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions', required: permission })
    }
    next()
  }

  requireRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user) return res.status(401).json({ error: 'Authentication required' })
    if (!user.roles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient role', required: role, current: user.roles })
    }
    next()
  }

  private async processSecurityChecks(
    req: Request,
    res: Response,
    context: SecurityContext,
    next: NextFunction
  ): Promise<void> {
    // Step 1: IP Security Check
    const ipAllowed = await this.ipService.checkIPSecurity(context.ipAddress)
    if (!ipAllowed) {
      this.sendErrorResponse(res, 'Forbidden', 403, 'IP_BLOCKED')
      return
    }

    // Step 2: Rate Limiting
    const rateLimitResult = await this.rateLimitService.checkRateLimit(req, context)
    if (!rateLimitResult.allowed) {
      this.sendRateLimitResponse(res, rateLimitResult)
      return
    }
    context.rateLimitInfo = rateLimitResult.info

    // Step 3: Authentication (if token provided)
    if (this.hasAuthorizationHeader(req)) {
      const authResult = await this.authService.authenticateRequest(req)
      if (authResult.success && authResult.user) {
        context.user = authResult.user
        context.isAuthenticated = true
        ;(req as any).user = authResult.user
      } else if (authResult.error === 'INVALID_TOKEN') {
        this.sendErrorResponse(res, 'Invalid token', 401, 'INVALID_TOKEN')
        return
      }
    }

    // Step 4: CSRF Protection
    if (this.config.csrf.enabled) {
      const csrfValid = await this.csrfService.validateToken(req, context)
      if (!csrfValid) {
        this.sendErrorResponse(res, 'CSRF token invalid', 403, 'CSRF_INVALID')
        return
      }
    }

    // Step 5: Input Sanitization
    this.sanitizationService.sanitizeRequest(req)

    // Step 6: Set Security Headers
    const csrfToken = this.generateCSRFTokenIfNeeded(context)
    this.headersService.setSecurityHeaders(res, context, csrfToken)

    // Attach security context and proceed
    ;(req as any).security = context
    this.updateMetrics(req.path, Date.now() - context.startTime, false)
    next()
  }

  private createSecurityContext(req: Request, startTime: number): SecurityContext {
    return {
      requestId: this.generateRequestId(),
      startTime,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent') ?? '',
      isAuthenticated: false,
      rateLimitInfo: {
        limit: 0,
        current: 0,
        remaining: 0,
        resetTime: 0
      }
    }
  }

  private generateCSRFTokenIfNeeded(context: SecurityContext): string | undefined {
    if (context.isAuthenticated && this.config.csrf.enabled) {
      return this.csrfService.generateToken(context)
    }
    return undefined
  }

  private hasAuthorizationHeader(req: Request): boolean {
    return !!req.get('Authorization')
  }

  private getClientIP(req: Request): string {
    return req.ip ??
           req.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
           req.get('X-Real-IP') ??
           req.connection.remoteAddress ??
           '127.0.0.1'
  }

  private generateRequestId(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  private sendErrorResponse = (res: Response, message: string, status: number, code?: string) =>
    res.status(status).json({ error: message, ...(code && { code }) })

  private sendRateLimitResponse = (res: Response, result: any) =>
    res.status(429).json({ error: 'Too Many Requests', retryAfter: result.retryAfter, limit: result.limit, remaining: 0 })

  private updateMetrics = (endpoint: string, time: number, isError: boolean) =>
    this.metricsCollector.updateMetrics(endpoint, time, isError)

  private handleSecurityError(error: any, req: Request, res: Response, startTime: number): void {
    this.updateMetrics(req.path, Date.now() - startTime, true)
    console.error('Security middleware error:', error)
    res.status(500).json({ error: 'Internal security error' })
  }

  private initServices(rateLimitStore: SimpleRedis | null, sessionStore: SimpleRedis | null): void {
    this.authService = new AuthenticationService(this.config, sessionStore)
    this.rateLimitService = new RateLimitService(this.config, rateLimitStore)
    this.csrfService = new CSRFProtectionService(this.config)
    this.ipService = new IPSecurityService()
    this.headersService = new SecurityHeadersService(this.config)
    this.sanitizationService = new InputSanitizationService(this.config)
    this.metricsCollector = new SecurityMetricsCollector()
  }
}