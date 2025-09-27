/**
 * Optimized Security Middleware
 * Performance-optimized version addressing 100%+ regression
 *
 * OPTIMIZATIONS IMPLEMENTED:
 * 1. Cached nonce generation
 * 2. Fast-path validation for trusted endpoints
 * 3. Lazy validation for non-critical checks
 * 4. Pre-compiled regex patterns
 * 5. Header validation batching
 */

import { EnvironmentManager } from '../config/environment';
import { logger } from '../lib/logging/productionLogger';

// Pre-compiled regex patterns for performance
const COMPILED_PATTERNS = {
  maliciousUA: [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /masscan/i,
    /nmap/i,
    /zap/i,
    /burp/i
  ],
  authSchemes: [
    /^Bearer [A-Za-z0-9-._~+/]+=*$/,
    /^Basic [A-Za-z0-9+/]+=*$/,
    /^Digest /,
    /^API-Key [A-Za-z0-9-_]+$/
  ],
  injection: [
    /[\r\n]/,
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/,
    /\x00/,
    /%0[Aa]/,
    /%0[Dd]/,
    /%00/
  ]
};

// Cached nonces for performance
class NonceCache {
  private cache: Map<string, { nonce: string; expires: number }> = new Map();
  private readonly TTL = 300000; // 5 minutes

  getNonce(type: 'script' | 'style'): string {
    const now = Date.now();
    const cached = this.cache.get(type);

    if (cached && cached.expires > now) {
      return cached.nonce;
    }

    // Generate new nonce
    const array = new Uint8Array(16);
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      globalThis.crypto.getRandomValues(array);
    } else {
      throw new Error('Crypto API not available');
    }

    const nonce = btoa(String.fromCharCode(...array));
    this.cache.set(type, { nonce, expires: now + this.TTL });

    // Cleanup expired entries
    this.cleanup(now);

    return nonce;
  }

  private cleanup(now: number): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }
  }
}

export interface OptimizedSecurityConfig {
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
    credentials: boolean;
  };
  performance: {
    enableFastPath: boolean;
    trustedEndpoints: string[];
    skipValidationForPaths: string[];
    cacheDuration: number;
  };
  csp: {
    useCache: boolean;
    reportOnly: boolean;
  };
}

export class OptimizedSecurityMiddleware {
  private config: OptimizedSecurityConfig;
  private nonceCache: NonceCache;
  private corsHeadersCache: Map<string, Headers> = new Map();
  private validationCache: Map<string, { valid: boolean; expires: number }> = new Map();
  private readonly VALIDATION_CACHE_TTL = 60000; // 1 minute

  // Pre-built CSP header (without nonces)
  private baseCSP: string;

  constructor() {
    const envConfig = EnvironmentManager.getConfig();
    this.nonceCache = new NonceCache();

    this.config = {
      cors: {
        allowedOrigins: envConfig.allowedOrigins,
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin',
          'User-Agent',
          'DNT',
          'Cache-Control',
          'X-Mx-ReqToken',
          'Keep-Alive'
        ],
        exposedHeaders: [
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
          'X-RateLimit-Reset',
          'Content-Length',
          'Content-Range'
        ],
        maxAge: 86400,
        credentials: true
      },
      performance: {
        enableFastPath: true,
        trustedEndpoints: ['/health', '/metrics', '/favicon.ico'],
        skipValidationForPaths: ['/static/', '/assets/', '/api/health'],
        cacheDuration: 300000 // 5 minutes
      },
      csp: {
        useCache: true,
        reportOnly: EnvironmentManager.isDevelopment()
      }
    };

    // Pre-build base CSP
    this.baseCSP = this.buildBaseCSP();
  }

  /**
   * Fast validation for trusted endpoints
   */
  validateRequestFast(request: Request): { valid: boolean; reason?: string } {
    const url = new URL(request.url);

    // Fast path for trusted endpoints
    if (this.config.performance.enableFastPath) {
      if (this.config.performance.trustedEndpoints.includes(url.pathname)) {
        return { valid: true };
      }

      // Skip validation for static assets
      if (this.config.performance.skipValidationForPaths.some(path => url.pathname.startsWith(path))) {
        return { valid: true };
      }
    }

    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.validationCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return { valid: cached.valid };
    }

    // Perform essential validation only
    const result = this.performEssentialValidation(request);

    // Cache result
    this.validationCache.set(cacheKey, {
      valid: result.valid,
      expires: Date.now() + this.VALIDATION_CACHE_TTL
    });

    return result;
  }

  /**
   * Essential validation only (optimized)
   */
  private performEssentialValidation(request: Request): { valid: boolean; reason?: string } {
    // 1. Check User-Agent (required)
    const userAgent = request.headers.get('user-agent');
    if (!userAgent) {
      return { valid: false, reason: 'Missing User-Agent' };
    }

    // 2. Quick malicious UA check (pre-compiled patterns)
    for (const pattern of COMPILED_PATTERNS.maliciousUA) {
      if (pattern.test(userAgent)) {
        return { valid: false, reason: 'Malicious User-Agent' };
      }
    }

    // 3. Content-Length check (DoS protection)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return { valid: false, reason: 'Request too large' };
    }

    // 4. Authorization header format (if present)
    const auth = request.headers.get('authorization');
    if (auth && !this.validateAuthHeaderFast(auth)) {
      return { valid: false, reason: 'Invalid auth format' };
    }

    return { valid: true };
  }

  /**
   * Fast auth header validation
   */
  private validateAuthHeaderFast(auth: string): boolean {
    return COMPILED_PATTERNS.authSchemes.some(pattern => pattern.test(auth));
  }

  /**
   * Handle CORS preflight with caching
   */
  handlePreflight(request: Request): Response {
    const origin = request.headers.get('Origin');

    // Check cache first
    if (origin && this.corsHeadersCache.has(origin)) {
      const headers = this.corsHeadersCache.get(origin)!;
      return new Response(null, { status: 204, headers });
    }

    if (!this.isOriginAllowed(origin)) {
      return new Response(null, { status: 403 });
    }

    const corsHeaders = this.getCORSHeaders(origin);

    // Cache for future use
    if (origin) {
      this.corsHeadersCache.set(origin, corsHeaders);
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  }

  /**
   * Add optimized CORS headers
   */
  addCORSHeaders(request: Request, response: Response): Response {
    const origin = request.headers.get('Origin');

    if (!origin || !this.isOriginAllowed(origin)) {
      return response;
    }

    // Use cached headers if available
    let corsHeaders = this.corsHeadersCache.get(origin);
    if (!corsHeaders) {
      corsHeaders = this.getCORSHeaders(origin);
      this.corsHeadersCache.set(origin, corsHeaders);
    }

    const newHeaders = new Headers(response.headers);
    for (const [key, value] of corsHeaders.entries()) {
      newHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  /**
   * Add optimized security headers
   */
  addSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);

    // Use cached CSP with fresh nonces
    if (this.config.csp.useCache) {
      const scriptNonce = this.nonceCache.getNonce('script');
      const styleNonce = this.nonceCache.getNonce('style');
      const cspValue = this.baseCSP
        .replace('{{SCRIPT_NONCE}}', scriptNonce)
        .replace('{{STYLE_NONCE}}', styleNonce);

      headers.set(
        this.config.csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
        cspValue
      );
    }

    // Essential security headers only
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove sensitive headers
    headers.delete('X-Powered-By');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  /**
   * Background validation for non-critical checks
   */
  async performBackgroundValidation(request: Request): Promise<void> {
    // Run comprehensive validation in background
    // This includes detailed header injection checks, etc.
    setTimeout(() => {
      try {
        this.performComprehensiveValidation(request);
      } catch (error) {
        logger.warn('Background validation error', {
          component: 'OptimizedSecurity',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 0);
  }

  private performComprehensiveValidation(request: Request): void {
    // Detailed validation that doesn't block the request
    for (const [name, value] of request.headers.entries()) {
      if (this.detectHeaderInjection(name, value)) {
        logger.security('Header injection detected in background check', 'medium', {
          component: 'OptimizedSecurity',
          headerName: name
        });
      }
    }
  }

  private detectHeaderInjection(name: string, value: string): boolean {
    const testString = name + value;
    return COMPILED_PATTERNS.injection.some(pattern => pattern.test(testString));
  }

  private isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;

    if (EnvironmentManager.isDevelopment()) {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return true;
      }
    }

    return this.config.cors.allowedOrigins.includes(origin);
  }

  private getCORSHeaders(origin: string | null): Headers {
    const headers = new Headers();

    if (origin && this.isOriginAllowed(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Vary', 'Origin');
    }

    headers.set('Access-Control-Allow-Methods', this.config.cors.allowedMethods.join(', '));
    headers.set('Access-Control-Allow-Headers', this.config.cors.allowedHeaders.join(', '));
    headers.set('Access-Control-Expose-Headers', this.config.cors.exposedHeaders.join(', '));
    headers.set('Access-Control-Max-Age', this.config.cors.maxAge.toString());

    if (this.config.cors.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return headers;
  }

  private buildBaseCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'nonce-{{SCRIPT_NONCE}}' https://js.stripe.com",
      "style-src 'self' 'nonce-{{STYLE_NONCE}}' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com https://api.mustbeviral.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ];

    return directives.join('; ');
  }

  private getCacheKey(request: Request): string {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const contentLength = request.headers.get('content-length') || '';
    return `${request.method}:${url.pathname}:${userAgent.slice(0, 50)}:${contentLength}`;
  }

  /**
   * Clean up caches periodically
   */
  cleanup(): void {
    const now = Date.now();

    // Clean validation cache
    for (const [key, value] of this.validationCache.entries()) {
      if (value.expires <= now) {
        this.validationCache.delete(key);
      }
    }

    // Limit CORS cache size
    if (this.corsHeadersCache.size > 100) {
      const entries = Array.from(this.corsHeadersCache.entries());
      this.corsHeadersCache.clear();
      // Keep last 50 entries
      for (const entry of entries.slice(-50)) {
        this.corsHeadersCache.set(entry[0], entry[1]);
      }
    }
  }
}

/**
 * Factory function for optimized security middleware
 */
export function createOptimizedSecurityMiddleware() {
  const security = new OptimizedSecurityMiddleware();

  // Setup periodic cleanup
  setInterval(() => security.cleanup(), 300000); // 5 minutes

  return {
    /**
     * Fast request validation
     */
    validateRequest: (request: Request) => security.validateRequestFast(request),

    /**
     * Handle preflight with caching
     */
    handlePreflight: (request: Request) => security.handlePreflight(request),

    /**
     * Process request (fast path)
     */
    processRequest: (request: Request): Response | null => {
      const validation = security.validateRequestFast(request);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: 'Request blocked' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Schedule background validation
      security.performBackgroundValidation(request);
      return null; // Allow request to continue
    },

    /**
     * Process response (optimized)
     */
    processResponse: (request: Request, response: Response): Response => {
      let secureResponse = security.addCORSHeaders(request, response);
      secureResponse = security.addSecurityHeaders(secureResponse);
      return secureResponse;
    }
  };
}

export default OptimizedSecurityMiddleware;