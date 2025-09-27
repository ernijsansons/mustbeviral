/**
 * Request Correlation & Logging System
 * Provides unique request tracking and contextual logging
 */

import { CloudflareEnv} from '../lib/cloudflare';
import { SecurityLogger} from '../lib/audit/securityLogger';

export interface RequestContext {
  id: string;
  startTime: number;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  userId?: string;
  sessionId?: string;
  origin?: string;
  country?: string;
  ray?: string; // Cloudflare Ray ID
  metadata: Record<string, unknown>;
  securityFlags: SecurityFlags;
}

export interface SecurityFlags {
  suspicious: boolean;
  rateLimited: boolean;
  authenticationRequired: boolean;
  piiPresent: boolean;
  crossOrigin: boolean;
  maliciousUserAgent: boolean;
  geoRestricted: boolean;
}

export interface RequestMetrics {
  duration: number;
  statusCode: number;
  responseSize?: number;
  errorType?: string;
  cacheHit?: boolean;
  dbQueries?: number;
  kvReads?: number;
  kvWrites?: number;
}

export class RequestCorrelation {
  private static contexts = new Map<string, RequestContext>();
  private static readonly MAXCONTEXTS = 10000; // Prevent memory leaks
  private static readonly CLEANUPINTERVAL = 300000; // 5 minutes

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `req_${timestamp}_${random}`;
  }

  /**
   * Create request context
   */
  static createContext(request: Request, env: CloudflareEnv): RequestContext {
    const requestId = this.generateRequestId();
    const url = new URL(request.url);

    const context: RequestContext = {
      id: requestId,
      startTime: Date.now(),
      ip: request.headers.get('CF-Connecting-IP')  ?? 'unknown',
      userAgent: request.headers.get('User-Agent')  ?? 'unknown',
      method: request.method,
      url: request.url,
      origin: request.headers.get('Origin')  ?? undefined,
      country: request.headers.get('CF-IPCountry')  ?? undefined,
      ray: request.headers.get('CF-Ray') || undefined,
      metadata: {},
      securityFlags: this.analyzeSecurityFlags(request)
    };

    // Extract user information if available
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        context.userId = payload.sub;
        context.sessionId = payload.sessionid;
      } catch (error: unknown) {
        // Invalid token format - ignore
      }
    }

    // Store context
    this.contexts.set(requestId, context);
    this.cleanupOldContexts();

    // Log request start
    this.logRequestStart(context);

    return context;
  }

  /**
   * Get request context
   */
  static getContext(requestId: string): RequestContext | undefined {
    return this.contexts.get(requestId);
  }

  /**
   * Update request context
   */
  static updateContext(requestId: string, updates: Partial<RequestContext>): void {
    const context = this.contexts.get(requestId);
    if (context) {
      Object.assign(context, updates);
    }
  }

  /**
   * Add metadata to request context
   */
  static addMetadata(requestId: string, key: string, value: unknown): void {
    const context = this.contexts.get(requestId);
    if (context) {
      context.metadata[key] = value;
    }
  }

  /**
   * Complete request and log metrics
   */
  static completeRequest(requestId: string, response: Response, metrics?: Partial<RequestMetrics>): void {
    const context = this.contexts.get(requestId);
    if (!context) {return;}

    const endTime = Date.now();
    const duration = endTime - context.startTime;

    const requestMetrics: RequestMetrics = { duration,
      statusCode: response.status,
      responseSize: parseInt(response.headers.get('Content-Length')  ?? '0'),
      cacheHit: response.headers.get('CF-Cache-Status') === 'HIT',
      ...metrics
    };

    // Log request completion
    this.logRequestCompletion(context, requestMetrics);

    // Log security events if flagged
    if (this.hasSecurityConcerns(context)) {
      this.logSecurityConcerns(context, requestMetrics);
    }

    // Cleanup context
    this.contexts.delete(requestId);
  }

  /**
   * Analyze security flags for request
   */
  private static analyzeSecurityFlags(request: Request): SecurityFlags {
    const userAgent = request.headers.get('User-Agent')?.toLowerCase()  ?? '';
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // Check for malicious user agents
    const maliciousPatterns = [
      'sqlmap', 'nikto', 'nessus', 'masscan', 'nmap', 'zap', 'burp',
      'curl', 'wget', 'python-requests', 'go-http-client'
    ];
    const maliciousUserAgent = maliciousPatterns.some(pattern => userAgent.includes(pattern));

    // Check for suspicious patterns
    const suspiciousPatterns = [
      '../', '..\\', '<script', 'javascript:', 'vbscript:', 'onload=',
      'union select', 'drop table', 'insert into', 'delete from'
    ];
    const suspicious = suspiciousPatterns.some(pattern =>
      request.url.toLowerCase().includes(pattern)  ?? userAgent.includes(pattern)
    );

    // Check for cross-origin requests
    const crossOrigin = origin && !origin.includes(url.hostname);

    // Check if authentication is required
    const authRequired = url.pathname.startsWith('/api/user/')  ?? url.pathname.startsWith('/api/auth/')  ?? url.pathname.includes('/protected/');

    // Check for geo restrictions
    const restrictedCountries = ['CN', 'RU', 'KP', 'IR'];
    const country = request.headers.get('CF-IPCountry')  ?? '';
    const geoRestricted = restrictedCountries.includes(country);

    return { suspicious,
      rateLimited: false, // Will be updated by rate limiter
      authenticationRequired: authRequired,
      piiPresent: false, // Will be updated when PII is detected
      crossOrigin: crossOrigin ?? false,
      maliciousUserAgent,
      geoRestricted
    };
  }

  /**
   * Check if request has security concerns
   */
  private static hasSecurityConcerns(context: RequestContext): boolean {
    const flags = context.securityFlags;
    return flags.suspicious ?? flags.maliciousUserAgent ?? flags.rateLimited ?? flags.geoRestricted;
  }

  /**
   * Log request start
   */
  private static logRequestStart(context: RequestContext): void {
    const logData = {
      requestId: context.id,
      method: context.method,
      url: context.url,
      ip: context.ip,
      userAgent: context.userAgent,
      origin: context.origin,
      country: context.country,
      ray: context.ray,
      userId: context.userId,
      securityFlags: context.securityFlags,
      timestamp: new Date().toISOString()
    };

    console.log(`LOG: REQUEST-START-1 - ${context.method} ${context.url}`, JSON.stringify(logData));

    // Log security flags if unknown are present
    if (this.hasSecurityConcerns(context)) {
      console.log(`LOG: REQUEST-SECURITY-FLAGS-1 - Security concerns detected for ${context.id}`,
                 JSON.stringify(context.securityFlags));
    }
  }

  /**
   * Log request completion
   */
  private static logRequestCompletion(context: RequestContext, metrics: RequestMetrics): void {
    const logData = {
      requestId: context.id,
      method: context.method,
      url: context.url,
      statusCode: metrics.statusCode,
      duration: metrics.duration,
      responseSize: metrics.responseSize,
      cacheHit: metrics.cacheHit,
      ip: context.ip,
      userId: context.userId,
      metadata: context.metadata,
      timestamp: new Date().toISOString()
    };

    const logLevel = metrics.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`LOG: REQUEST-COMPLETE-${logLevel === 'ERROR' ? 'ERROR' : '1'} - ${context.method} ${context.url} ${metrics.statusCode} ${metrics.duration}ms`,
               JSON.stringify(logData));

    // Log slow requests
    if (metrics.duration > 5000) { // 5 seconds
      console.warn(`LOG: REQUEST-SLOW-1 - Slow request detected for ${context.id}: ${metrics.duration}ms`);
    }

    // Log large responses
    if (metrics.responseSize && metrics.responseSize > 10 * 1024 * 1024) { // 10MB
      console.warn(`LOG: REQUEST-LARGE-RESPONSE-1 - Large response for ${context.id}: ${metrics.responseSize} bytes`);
    }
  }

  /**
   * Log security concerns
   */
  private static logSecurityConcerns(context: RequestContext, metrics: RequestMetrics): void {
    const securityEvent = {
      type: 'security_concern',
      requestId: context.id,
      ip: context.ip,
      userAgent: context.userAgent,
      url: context.url,
      country: context.country,
      securityFlags: context.securityFlags,
      statusCode: metrics.statusCode,
      duration: metrics.duration,
      timestamp: new Date().toISOString()
    };

    console.log(`LOG: REQUEST-SECURITY-CONCERN-1 - Security concern for ${context.id}`,
               JSON.stringify(securityEvent));

    // Use SecurityLogger for persistent logging
    SecurityLogger.logSecurityEvent(securityEvent.type, securityEvent);
  }

  /**
   * Cleanup old contexts to prevent memory leaks
   */
  private static cleanupOldContexts(): void {
    if (this.contexts.size <= this.MAXCONTEXTS) {return;}

    const now = Date.now();
    const cutoff = now - this.CLEANUPINTERVAL;

    for (const [id, context] of this.contexts.entries()) {
      if (context.startTime < cutoff) {
        this.contexts.delete(id);
      }
    }

    console.log(`LOG: REQUEST-CLEANUP-1 - Cleaned up old request contexts, remaining: ${this.contexts.size}`);
  }

  /**
   * Get active request count
   */
  static getActiveRequestCount(): number {
    return this.contexts.size;
  }

  /**
   * Get request statistics
   */
  static getRequestStatistics(): {
    activeRequests: number;
    securityConcerns: number;
    crossOriginRequests: number;
    authRequiredRequests: number;
  } {
    const contexts = Array.from(this.contexts.values());

    return {
      activeRequests: contexts.length,
      securityConcerns: contexts.filter(c => this.hasSecurityConcerns(c)).length,
      crossOriginRequests: contexts.filter(c => c.securityFlags.crossOrigin).length,
      authRequiredRequests: contexts.filter(c => c.securityFlags.authenticationRequired).length
    };
  }
}

/**
 * Request Context Middleware
 */
export class RequestContextMiddleware {
  private env: CloudflareEnv;
  private securityLogger: SecurityLogger;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.securityLogger = new SecurityLogger(env);
  }

  /**
   * Process incoming request and create context
   */
  async processRequest(request: Request): Promise<{ request: Request; context: RequestContext }> {
    // Create request context
    const context = RequestCorrelation.createContext(request, this.env);

    // Add request ID to headers for downstream services
    const modifiedRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'X-Request-ID': context.id,
        'X-Request-Start': context.startTime.toString()
      }
    });

    // Log security events immediately if high-risk
    if (context.securityFlags.maliciousUserAgent ?? context.securityFlags.suspicious) {
      await this.securityLogger.logSecurityEvent('suspicious_request', {
        requestId: context.id,
        ip: context.ip,
        userAgent: context.userAgent,
        url: context.url,
        securityFlags: context.securityFlags,
        timestamp: new Date().toISOString()
      });
    }

    return { request: modifiedRequest, context };
  }

  /**
   * Process response and complete request tracking
   */
  async processResponse(context: RequestContext, response: Response): Promise<Response> {
    // Calculate metrics
    const duration = Date.now() - context.startTime;
    const metrics: RequestMetrics = { duration,
      statusCode: response.status,
      responseSize: parseInt(response.headers.get('Content-Length')  ?? '0'),
      cacheHit: response.headers.get('CF-Cache-Status') === 'HIT'
    };

    // Add correlation headers to response
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-Request-ID': context.id,
        'X-Response-Time': `${duration}ms`
      }
    });

    // Complete request tracking
    RequestCorrelation.completeRequest(context.id, modifiedResponse, metrics);

    return modifiedResponse;
  }

  /**
   * Handle request errors
   */
  async handleError(context: RequestContext, error: Error): Promise<void> {
    const duration = Date.now() - context.startTime;

    // Log error with context
    console.error(`LOG: REQUEST-ERROR-1 - Request ${context.id} failed after ${duration}ms:`, {
      requestId: context.id,
      error: error.message,
      stack: error.stack,
      url: context.url,
      ip: context.ip,
      duration,
      timestamp: new Date().toISOString()
    });

    // Log security event for errors that might indicate attacks
    if (error.message.includes('SQL')  ?? error.message.includes('injection')  ?? error.message.includes('XSS')  ?? context.securityFlags.suspicious) {

      await this.securityLogger.logSecurityEvent('request_error_suspicious', {
        requestId: context.id,
        error: error.message,
        ip: context.ip,
        userAgent: context.userAgent,
        url: context.url,
        securityFlags: context.securityFlags,
        timestamp: new Date().toISOString()
      });
    }

    // Complete request tracking with error
    const errorMetrics: RequestMetrics = { duration,
      statusCode: 500,
      errorType: error.constructor.name
    };

    RequestCorrelation.completeRequest(context.id, new Response('', { status: 500 }), errorMetrics);
  }
}

/**
 * Helper function to get current request context from headers
 */
export function getCurrentRequestId(request: Request): string | null {
  return request.headers.get('X-Request-ID');
}

/**
 * Helper function to log with request context
 */
export function logWithContext(requestId: string, level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
  const context = RequestCorrelation.getContext(requestId);
  const logData = { requestId,
    message,
    data,
    context: context ? {
      url: context.url,
      ip: context.ip,
      userId: context.userId
    } : undefined,
    timestamp: new Date().toISOString()
  };

  switch (level) {
    case 'info':
      console.log(`LOG: CONTEXT-INFO-1 - ${message}`, JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(`LOG: CONTEXT-WARN-1 - ${message}`, JSON.stringify(logData));
      break;
    case 'error':
      console.error(`LOG: CONTEXT-ERROR-1 - ${message}`, JSON.stringify(logData));
      break;
  }
}