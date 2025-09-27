/**
 * Security Module Entry Point
 * Grug-approved: Simple exports with backward compatibility
 * Clean interface that replaces the monolithic security file
 */

import { SecurityMiddleware } from './middleware/SecurityMiddleware'
import { createSecurityConfig } from './config/SecurityConfig'
import { AuthenticationService } from './services/AuthenticationService'
import { IPSecurityService } from './services/IPSecurityService'

// Export types
export * from './types/SecurityTypes'

// Export services for advanced usage
export { AuthenticationService } from './services/AuthenticationService'
export { RateLimitService } from './services/RateLimitService'
export { CSRFProtectionService } from './services/CSRFProtectionService'
export { IPSecurityService } from './services/IPSecurityService'
export { SecurityHeadersService } from './services/SecurityHeadersService'
export { InputSanitizationService } from './services/InputSanitizationService'

// Export utilities
export { SimpleCache } from './cache/SimpleCache'
export { SecurityMetricsCollector } from './middleware/SecurityMetricsCollector'

// Export main middleware and config
export { SecurityMiddleware } from './middleware/SecurityMiddleware'
export { createSecurityConfig } from './config/SecurityConfig'

// Backward compatibility - create default instance
const defaultConfig = createSecurityConfig()
const securityMiddleware = new SecurityMiddleware(defaultConfig)

// Export the same interface as the old PerformanceOptimizedSecurity
export class PerformanceOptimizedSecurity {
  private middleware: SecurityMiddleware
  private authService: AuthenticationService
  private ipService: IPSecurityService

  constructor(config = defaultConfig) {
    this.middleware = new SecurityMiddleware(config)
    this.authService = new AuthenticationService(config)
    this.ipService = new IPSecurityService()
  }

  securityMiddleware() {
    return this.middleware.getMiddleware()
  }

  async authenticateRequest(req: any) {
    return this.authService.authenticateRequest(req)
  }

  requirePermission(permission: string) {
    return this.middleware.requirePermission(permission)
  }

  requireRole(role: string) {
    return this.middleware.requireRole(role)
  }

  getSecurityMetrics() {
    const metrics = this.middleware.getSecurityMetrics()
    // Add cache stats for backward compatibility
    return {
      ...metrics,
      cacheStats: {
        jwt: { size: 0 },
        user: { size: 0 },
        blacklist: { size: 0 },
        csrf: { size: 0 }
      },
      securityCounts: {
        ipWhitelist: this.ipService.getWhitelistSize(),
        ipBlacklist: this.ipService.getBlacklistSize()
      }
    }
  }

  // Expose internal services for testing
  get ipWhitelist() {
    return {
      add: (ip: string) => this.ipService.addToWhitelist(ip),
      has: (ip: string) => this.ipService['ipWhitelist'].has(ip)
    }
  }

  get ipBlacklist() {
    return {
      add: (ip: string) => this.ipService.addToBlacklist(ip),
      has: (ip: string) => this.ipService['ipBlacklist'].has(ip)
    }
  }

  get blacklistCache() {
    return {
      set: (key: string, value: boolean) => this.ipService['blacklistCache'].set(key, value),
      has: (key: string) => this.ipService['blacklistCache'].has(key)
    }
  }

  async checkIPSecurity(ip: string) {
    return this.ipService.checkIPSecurity(ip)
  }

  // Mock methods for testing compatibility
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }

  private generateRequestId(): string {
    return require('crypto').randomBytes(16).toString('hex')
  }

  private hashToken(token: string): string {
    return require('crypto').createHash('sha256').update(token).digest('hex').substring(0, 32)
  }

  private getClientIP(req: any): string {
    return req.ip ?? req.get?.('X-Forwarded-For')?.split(',')[0]?.trim() ?? '127.0.0.1'
  }
}

// Export default instance for backward compatibility
export const performanceOptimizedSecurity = new PerformanceOptimizedSecurity()
export default performanceOptimizedSecurity