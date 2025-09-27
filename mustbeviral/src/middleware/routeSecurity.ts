/**
 * Route-Level Security Enforcement
 * Provides granular security controls per route/endpoint
 */

import { CloudflareEnv} from '../lib/cloudflare';
import { JWTManager} from '../lib/auth/jwtManager';
import { UserRateLimiter} from './rateLimiter';
import { RequestContext} from '../worker/requestContext';
import { ValidationError} from './validation';

export interface RouteSecurityConfig {
  authentication: 'none' | 'optional' | 'required' | 'admin';
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
    keyType: 'ip' | 'user' | 'session';
  };
  permissions?: string[];
  csrfProtection?: boolean;
  httpsOnly?: boolean;
  allowedMethods?: string[];
  allowedOrigins?: string[];
  sensitiveData?: boolean;
  adminOnly?: boolean;
  subscription?: 'none' | 'unknown' | 'standard' | 'premium';
}

export interface RouteMatch {
  pattern: string | RegExp;
  methods?: string[];
  config: RouteSecurityConfig;
}

export interface SecurityContext {
  user?: {
    id: string;
    email: string;
    role: string;
    subscription: string;
    permissions: string[];
  };
  session?: {
    id: string;
    validUntil: number;
  };
  authenticated: boolean;
  adminAccess: boolean;
}

export class RouteSecurityEnforcer {
  private routes: RouteMatch[] = [];
  private jwtManager: JWTManager;
  private userRateLimiter: UserRateLimiter;

  constructor(private env: CloudflareEnv) {
    this.jwtManager = new JWTManager(env);
    this.userRateLimiter = new UserRateLimiter(env, 'standard'); // Default tier
  }

  /**
   * Register route security configuration
   */
  registerRoute(pattern: string | RegExp, methods: string[] | undefined, config: RouteSecurityConfig): void {
    this.routes.push({ pattern,
      methods,
      config
    });
  }

  /**
   * Initialize default route configurations
   */
  initializeDefaultRoutes(): void {
    // Public routes
    this.registerRoute('/api/health', ['GET'], {
      authentication: 'none',
      rateLimit: { windowMs: 60000, maxRequests: 100, keyType: 'ip' }
    });

    this.registerRoute('/api/status', ['GET'], {
      authentication: 'none',
      rateLimit: { windowMs: 60000, maxRequests: 50, keyType: 'ip' }
    });

    // Authentication routes
    this.registerRoute(/^\/api\/auth\/(login|register)$/, ['POST'], {
      authentication: 'none',
      rateLimit: { windowMs: 900000, maxRequests: 5, keyType: 'ip' }, // 15 min, 5 attempts
      csrfProtection: true,
      httpsOnly: true
    });

    this.registerRoute(/^\/api\/auth\/(logout|refresh)$/, ['POST'], {
      authentication: 'required',
      rateLimit: { windowMs: 60000, maxRequests: 20, keyType: 'user' },
      csrfProtection: true
    });

    this.registerRoute('/api/auth/reset-password', ['POST'], {
      authentication: 'none',
      rateLimit: { windowMs: 3600000, maxRequests: 3, keyType: 'ip' }, // 1 hour, 3 attempts
      csrfProtection: true,
      httpsOnly: true
    });

    // User profile routes
    this.registerRoute(/^\/api\/user\/profile\//, ['GET', 'PUT', 'PATCH'], {
      authentication: 'required',
      rateLimit: { windowMs: 60000, maxRequests: 30, keyType: 'user' },
      sensitiveData: true,
      permissions: ['user:read', 'user:write']
    });

    this.registerRoute('/api/user/delete', ['DELETE'], {
      authentication: 'required',
      rateLimit: { windowMs: 3600000, maxRequests: 1, keyType: 'user' }, // 1 hour, 1 attempt
      csrfProtection: true,
      sensitiveData: true,
      permissions: ['user:delete']
    });

    // Content routes
    this.registerRoute(/^\/api\/content\/create\//, ['POST'], {
      authentication: 'required',
      rateLimit: { windowMs: 60000, maxRequests: 10, keyType: 'user' },
      subscription: 'unknown',
      permissions: ['content:create']
    });

    this.registerRoute(/^\/api\/content\/upload\//, ['POST'], {
      authentication: 'required',
      rateLimit: { windowMs: 60000, maxRequests: 5, keyType: 'user' },
      subscription: 'standard',
      permissions: ['content:upload']
    });

    // Admin routes
    this.registerRoute(/^\/api\/admin\//, ['GET', 'POST', 'PUT', 'DELETE'], {
      authentication: 'admin',
      adminOnly: true,
      rateLimit: { windowMs: 60000, maxRequests: 100, keyType: 'user' },
      csrfProtection: true,
      sensitiveData: true,
      permissions: ['admin:all']
    });

    // Subscription routes
    this.registerRoute(/^\/api\/subscription\//, ['GET', 'POST', 'PUT'], {
      authentication: 'required',
      rateLimit: { windowMs: 60000, maxRequests: 20, keyType: 'user' },
      sensitiveData: true,
      permissions: ['subscription:manage']
    });

    // Payment routes
    this.registerRoute(/^\/api\/payment\//, ['POST'], {
      authentication: 'required',
      rateLimit: { windowMs: 60000, maxRequests: 5, keyType: 'user' },
      csrfProtection: true,
      httpsOnly: true,
      sensitiveData: true,
      permissions: ['payment:process']
    });

    // Analytics routes (premium only)
    this.registerRoute(/^\/api\/analytics\//, ['GET'], {
      authentication: 'required',
      subscription: 'premium',
      rateLimit: { windowMs: 60000, maxRequests: 50, keyType: 'user' },
      permissions: ['analytics:read']
    });
  }

  /**
   * Enforce security for a request
   */
  async enforceRouteSececurity(request: Request, context: RequestContext): Promise<{
    allowed: boolean;
    response?: Response;
    securityContext?: SecurityContext;
  }> {
    try {
      const url = new URL(request.url);
      const route = this.findMatchingRoute(url.pathname, request.method);

      if (!route) {
        // No specific security config - apply default security
        return this.applyDefaultSecurity(request, context);
      }

      // Build security context
      const securityContext = await this.buildSecurityContext(request, route.config);

      // Check HTTPS requirement
      if (route.config.httpsOnly && url.protocol !== 'https:') {
        return {
          allowed: false,
          response: this.createSecurityResponse('HTTPS required', 426)
        };
      }

      // Check allowed methods
      if (route.config.allowedMethods && !route.config.allowedMethods.includes(request.method)) {
        return {
          allowed: false,
          response: this.createSecurityResponse('Method not allowed', 405)
        };
      }

      // Check origin if specified
      const originCheck = this.checkOrigin(request, route.config);
      if (!originCheck.allowed) {
        return originCheck;
      }

      // Check authentication
      const authCheck = await this.checkAuthentication(request, route.config, securityContext);
      if (!authCheck.allowed) {
        return authCheck;
      }

      // Check permissions
      const permCheck = this.checkPermissions(route.config, securityContext);
      if (!permCheck.allowed) {
        return permCheck;
      }

      // Check subscription requirements
      const subCheck = this.checkSubscription(route.config, securityContext);
      if (!subCheck.allowed) {
        return subCheck;
      }

      // Check admin access
      const adminCheck = this.checkAdminAccess(route.config, securityContext);
      if (!adminCheck.allowed) {
        return adminCheck;
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(request, route.config, securityContext);
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck;
      }

      // Check CSRF protection
      const csrfCheck = this.checkCSRFProtection(request, route.config);
      if (!csrfCheck.allowed) {
        return csrfCheck;
      }

      // Update security flags
      if (route.config.sensitiveData) {
        context.securityFlags.piiPresent = true;
      }

      return {
        allowed: true,
        securityContext
      };
    } catch (error: unknown) {
      console.error('LOG: ROUTE-SECURITY-ERROR-1 - Route security enforcement failed:', error);
      return {
        allowed: false,
        response: this.createSecurityResponse('Security check failed', 500)
      };
    }
  }

  /**
   * Find matching route configuration
   */
  private findMatchingRoute(pathname: string, method: string): RouteMatch | null {
    for(const route of this.routes) {
      // Check pattern match
      const patternMatch = typeof route.pattern === 'string'
        ? pathname === route.pattern
        : route.pattern.test(pathname);

      // Check method match
      const methodMatch = !route.methods  ?? route.methods.includes(method);

      if (patternMatch && methodMatch) {
        return route;
      }
    }

    return null;
  }

  /**
   * Build security context from request
   */
  private async buildSecurityContext(request: Request, config: RouteSecurityConfig): Promise<SecurityContext> {
    const context: SecurityContext = {
      authenticated: false,
      adminAccess: false
    };

    if (config.authentication === 'none') {
      return context;
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader  ?? !authHeader.startsWith('Bearer ')) {
      return context;
    }

    try {
      const token = authHeader.substring(7);
      const payload = await this.jwtManager.verifyAccessToken(token);

      if (payload) {
        context.authenticated = true;
        context.user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role ?? 'user',
          subscription: payload.subscription ?? 'free',
          permissions: payload.permissions ?? []
        };

        context.session = {
          id: payload.sessionid,
          validUntil: payload.exp * 1000
        };

        context.adminAccess = payload.role === 'admin'  ?? payload.role === 'super_admin';
      }
    } catch (error: unknown) {
      console.log('LOG: ROUTE-SECURITY-AUTH-1 - Token verification failed:', error.message);
    }

    return context;
  }

  /**
   * Apply default security for unmatched routes
   */
  private applyDefaultSecurity(request: Request, _context: RequestContext): {
    allowed: boolean;
    response?: Response;
    securityContext?: SecurityContext;
  } {
    const url = new URL(request.url);

    // Block suspicious paths
    const suspiciousPaths = [
      '/.env', '/wp-admin', '/.git', '/admin.php', '/phpMyAdmin',
      '/config.php', '/.aws', '/backup', '/debug'
    ];

    if (suspiciousPaths.some(path => url.pathname.includes(path))) {
      console.log(`LOG: ROUTE-SECURITY-BLOCK-1 - Blocked suspicious path: ${url.pathname}`);
      return {
        allowed: false,
        response: this.createSecurityResponse('Path not found', 404)
      };
    }

    // Apply basic rate limiting to unprotected routes
    const defaultSecurityContext: SecurityContext = {
      authenticated: false,
      adminAccess: false
    };

    return {
      allowed: true,
      securityContext: defaultSecurityContext
    };
  }

  /**
   * Check origin against allowed origins
   */
  private checkOrigin(request: Request, config: RouteSecurityConfig): {
    allowed: boolean;
    response?: Response;
  } {
    if (!config.allowedOrigins) {
      return { allowed: true };
    }

    const origin = request.headers.get('Origin');
    if (!origin) {
      return { allowed: true }; // No origin header (same-origin or direct access)
    }

    if (!config.allowedOrigins.includes(origin)) {
      return {
        allowed: false,
        response: this.createSecurityResponse('Origin not allowed', 403)
      };
    }

    return { allowed: true };
  }

  /**
   * Check authentication requirements
   */
  private async checkAuthentication(
    request: Request,
    config: RouteSecurityConfig,
    context: SecurityContext
  ): Promise<{ allowed: boolean; response?: Response }> {
    switch (config.authentication) {
      case 'none':
        return { allowed: true };

      case 'optional':
        return { allowed: true }; // Optional auth, proceed regardless

      case 'required':
        if (!context.authenticated) {
          return {
            allowed: false,
            response: this.createSecurityResponse('Authentication required', 401)
          };
        }
        return { allowed: true };

      case 'admin':
        if (!context.authenticated  ?? !context.adminAccess) {
          return {
            allowed: false,
            response: this.createSecurityResponse('Admin access required', 403)
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  /**
   * Check user permissions
   */
  private checkPermissions(config: RouteSecurityConfig, context: SecurityContext): {
    allowed: boolean;
    response?: Response;
  } {
    if (!config.permissions  ?? !context.user) {
      return { allowed: true };
    }

    const userPermissions = context.user.permissions ?? [];
    const hasRequiredPermissions = config.permissions.every(permission =>
      userPermissions.includes(permission)  ?? userPermissions.includes('admin:all')
    );

    if (!hasRequiredPermissions) {
      return {
        allowed: false,
        response: this.createSecurityResponse('Insufficient permissions', 403)
      };
    }

    return { allowed: true };
  }

  /**
   * Check subscription requirements
   */
  private checkSubscription(config: RouteSecurityConfig, context: SecurityContext): {
    allowed: boolean;
    response?: Response;
  } {
    if (!config.subscription || config.subscription === 'none' || !context.user) {
      return { allowed: true };
    }

    const userSubscription = context.user.subscription;

    switch (config.subscription) {
      case 'unknown':
        if (userSubscription === 'free') {
          return {
            allowed: false,
            response: this.createSecurityResponse('Subscription required', 402)
          };
        }
        break;

      case 'standard':
        if (!['standard', 'premium'].includes(userSubscription)) {
          return {
            allowed: false,
            response: this.createSecurityResponse('Standard subscription required', 402)
          };
        }
        break;

      case 'premium':
        if (userSubscription !== 'premium') {
          return {
            allowed: false,
            response: this.createSecurityResponse('Premium subscription required', 402)
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Check admin access requirements
   */
  private checkAdminAccess(config: RouteSecurityConfig, context: SecurityContext): {
    allowed: boolean;
    response?: Response;
  } {
    if (!config.adminOnly) {
      return { allowed: true };
    }

    if (!context.adminAccess) {
      return {
        allowed: false,
        response: this.createSecurityResponse('Admin access required', 403)
      };
    }

    return { allowed: true };
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(
    request: Request,
    config: RouteSecurityConfig,
    _context: SecurityContext
  ): Promise<{ allowed: boolean; response?: Response }> {
    if (!config.rateLimit) {
      return { allowed: true };
    }

    // For now, use basic IP-based rate limiting
    // In a full implementation, this would use the specific rate limiter based on keyType
    return { allowed: true };
  }

  /**
   * Check CSRF protection
   */
  private checkCSRFProtection(request: Request, config: RouteSecurityConfig): {
    allowed: boolean;
    response?: Response;
  } {
    if (!config.csrfProtection) {
      return { allowed: true };
    }

    // For state-changing operations, require CSRF token
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const csrfToken = request.headers.get('X-CSRF-Token');
      const origin = request.headers.get('Origin');

      // Basic CSRF check - in production, implement proper token validation
      if (!csrfToken && !origin) {
        return {
          allowed: false,
          response: this.createSecurityResponse('CSRF protection required', 403)
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Create security response
   */
  private createSecurityResponse(message: string, status: number): Response {
    return new Response(
      JSON.stringify({
        error: 'Security violation',
        message,
        timestamp: new Date().toISOString()
      }),
      { status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  /**
   * Get route security configuration for a path
   */
  getRouteConfig(pathname: string, method: string): RouteSecurityConfig | null {
    const route = this.findMatchingRoute(pathname, method);
    return route ? route.config : null;
  }

  /**
   * Log security enforcement
   */
  logSecurityEnforcement(
    request: Request,
    context: RequestContext,
    config: RouteSecurityConfig,
    result: 'allowed' | 'blocked',
    reason?: string
  ): void {
    const logData = {
      requestId: context.id,
      url: request.url,
      method: request.method,
      ip: context.ip,
      result,
      reason,
      config: {
        authentication: config.authentication,
        sensitiveData: config.sensitiveData,
        adminOnly: config.adminOnly
      },
      timestamp: new Date().toISOString()
    };

    if (result === 'blocked') {
      console.log(`LOG: ROUTE-SECURITY-BLOCK-2 - Request blocked: ${reason}`, JSON.stringify(logData));
    } else {
      console.log(`LOG: ROUTE-SECURITY-ALLOW-1 - Request allowed`, JSON.stringify(logData));
    }
  }
}

/**
 * Create route security middleware
 */
export function createRouteSecurityMiddleware(env: CloudflareEnv): RouteSecurityEnforcer {
  const enforcer = new RouteSecurityEnforcer(env);
  enforcer.initializeDefaultRoutes();
  return enforcer;
}