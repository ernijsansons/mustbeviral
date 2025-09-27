/**
 * DEPRECATED: This file is now broken down into smaller modules for better maintainability
 * Use the new modular structure instead: import from './index'
 *
 * This file is kept for backward compatibility only.
 * All functionality has been moved to focused, simple modules following Grug's requirements.
 */

// Re-export everything from the new modular structure
export * from './index'

// Keep the old exports for backward compatibility
import { PerformanceOptimizedSecurity as NewSecurityClass, createSecurityConfig } from './index'

// Export the old class name for backward compatibility
export class PerformanceOptimizedSecurity extends NewSecurityClass {}

// Export singleton instance for backward compatibility
export const performanceOptimizedSecurity = new PerformanceOptimizedSecurity(createSecurityConfig())
export default performanceOptimizedSecurity

/*
 * MIGRATION GUIDE:
 *
 * Old way:
 * import { PerformanceOptimizedSecurity } from './performanceOptimizedSecurity'
 *
 * New way (recommended):
 * import { SecurityMiddleware } from './index'
 *
 * The new modular structure provides:
 * - AuthenticationService: JWT and user management
 * - RateLimitService: Distributed rate limiting
 * - CSRFProtectionService: CSRF token handling
 * - IPSecurityService: IP allowlist/blocklist
 * - SecurityHeadersService: Security headers management
 * - InputSanitizationService: XSS protection
 * - SecurityMiddleware: Main orchestrator
 *
 * Benefits:
 * - Each service < 200 lines (Grug approved)
 * - Functions < 20 lines each
 * - Single responsibility per class
 * - Easy to test and maintain
 * - Junior dev friendly at 3am
 */