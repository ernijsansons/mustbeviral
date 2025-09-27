/**
 * Security Headers and CORS Middleware
 * Provides comprehensive security headers and proper CORS configuration
 */

import { EnvironmentManager} from '../config/environment';
import { ValidationError} from './validation';
import { logger} from '../lib/logging/productionLogger';

// Generate cryptographically secure nonce for CSP
function generateNonce(): string {
  // Use Web Crypto API (available in both Node.js and browsers)
  const array = new Uint8Array(16);

  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(array);
  } else if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Throw error if crypto API is not available
    // This ensures we never use insecure random values
    throw new Error('Crypto API not available. Cannot generate secure nonce for CSP.');
  }

  return btoa(String.fromCharCode(...array));
}

export interface SecurityConfig {
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
    credentials: boolean;
  };
  csp: {
    directives: Record<string, string[]>;
    reportUri?: string;
    reportOnly?: boolean;
  };
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor() {
    const envConfig = EnvironmentManager.getConfig();

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
          'Keep-Alive',
          'X-Requested-With'
        ],
        exposedHeaders: [
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
          'X-RateLimit-Reset',
          'Content-Length',
          'Content-Range'
        ],
        maxAge: 86400, // 24 hours
        credentials: true
      },
      csp: {
        directives: {
          'default-src': ["'self'"],
          'script-src': [
            "'self'",
            // Only allow specific trusted CDN sources with SRI where possible
            'https://cdn.jsdelivr.net',
            'https://unpkg.com',
            'https://js.stripe.com',
            "'strict-dynamic'"  // Allows scripts loaded by trusted scripts
          ],
          'style-src': [
            "'self'",
            // Only allow specific trusted style sources
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net'
          ],
          'font-src': [
            "'self'",
            'data:',
            'https://fonts.gstatic.com',
            'https://cdn.jsdelivr.net'
          ],
          'img-src': [
            "'self'",
            'data:',
            'https:',
            'blob:'
          ],
          'connect-src': [
            "'self'",
            'https://api.stripe.com',
            'https://api.mustbeviral.com',
            'wss://ws.mustbeviral.com'
          ],
          'media-src': ["'self'", 'https:', 'data:'],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'frame-src': [
            "'self'",
            'https://js.stripe.com',
            'https://hooks.stripe.com'
          ],
          'manifest-src': ["'self'"],
          'worker-src': ["'self'", 'blob:']
        },
        reportUri: '/api/csp-report',
        reportOnly: EnvironmentManager.isDevelopment()
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    };
  }

  /**
   * Handle CORS preflight requests
   */
  handlePreflight(request: Request): Response {
    const origin = request.headers.get('Origin');
    const method = request.headers.get('Access-Control-Request-Method');
    const headers = request.headers.get('Access-Control-Request-Headers');

    logger.info('CORS preflight request', {
      component: 'SecurityMiddleware',
      action: 'handleCORSPreflight',
      metadata: { origin, method, headers }
    });

    // Check if origin is allowed
    if (!this.isOriginAllowed(origin)) {
      logger.warn('CORS origin not allowed', {
        component: 'SecurityMiddleware',
        action: 'corsOriginBlocked',
        metadata: { origin }
      });
      return new Response(null, { status: 403 });
    }

    // Check if method is allowed
    if (method && !this.config.cors.allowedMethods.includes(method)) {
      logger.warn('CORS method not allowed', {
        component: 'SecurityMiddleware',
        action: 'corsMethodBlocked',
        metadata: { method }
      });
      return new Response(null, { status: 405 });
    }

    const corsHeaders = this.getCORSHeaders(origin);

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  /**
   * Add CORS headers to response
   */
  addCORSHeaders(request: Request, response: Response): Response {
    const origin = request.headers.get('Origin');

    if (!this.isOriginAllowed(origin)) {
      return response;
    }

    const corsHeaders = this.getCORSHeaders(origin);
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
   * Add comprehensive security headers
   */
  addSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);

    // Content Security Policy with nonces
    const scriptNonce = generateNonce();
    const styleNonce = generateNonce();
    const cspValue = this.buildCSPHeader(scriptNonce, styleNonce);
    if (this.config.csp.reportOnly) {
      headers.set('Content-Security-Policy-Report-Only', cspValue);
    } else {
      headers.set('Content-Security-Policy', cspValue);
    }

    // Store nonces for use in response body
    headers.set('X-Script-Nonce', scriptNonce);
    headers.set('X-Style-Nonce', styleNonce);

    // HTTP Strict Transport Security
    const hstsValue = `max-age=${this.config.hsts.maxAge}` +
      (this.config.hsts.includeSubDomains ? '; includeSubDomains' : '') +
      (this.config.hsts.preload ? '; preload' : '');
    headers.set('Strict-Transport-Security', hstsValue);

    // X-Content-Type-Options
    headers.set('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    headers.set('X-Frame-Options', 'DENY');

    // X-XSS-Protection
    headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    headers.set('Permissions-Policy', [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'speaker=(self)',
      'vibrate=()',
      'fullscreen=(self)',
      'sync-xhr=()'
    ].join(', '));

    // Cross-Origin Policies
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Cache Control for sensitive endpoints
    const url = new URL(response.url ?? 'https://example.com');
    if (url.pathname.includes('/auth/')  ?? url.pathname.includes('/api/user/')) {
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    }

    // Server header (security through obscurity)
    headers.set('Server', 'CloudFlare');

    // Remove potentially sensitive headers
    headers.delete('X-Powered-By');
    headers.delete('Server');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string | null): boolean {
    if(!origin) {
      return false; // No origin header in request
    }

    // Allow localhost in development
    if (EnvironmentManager.isDevelopment()) {
      if (origin.startsWith('http://localhost:')  ?? origin.startsWith('http://127.0.0.1:')) {
        return true;
      }
    }

    return this.config.cors.allowedOrigins.includes(origin);
  }

  /**
   * Get CORS headers for allowed origin
   */
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

  /**
   * Generate nonces for CSP
   */
  generateNonces(): { scriptNonce: string; styleNonce: string } {
    return {
      scriptNonce: generateNonce(),
      styleNonce: generateNonce()
    };
  }

  /**
   * Build Content Security Policy header value
   */
  private buildCSPHeader(scriptNonce?: string, styleNonce?: string): string {
    const directives: string[] = [];

    for (const [directive, sources] of Object.entries(this.config.csp.directives)) {
      const finalSources = [...sources];

      // Add nonces for script and style directives
      if (directive === 'script-src' && scriptNonce) {
        finalSources.push(`'nonce-${scriptNonce}'`);
      }
      if (directive === 'style-src' && styleNonce) {
        finalSources.push(`'nonce-${styleNonce}'`);
      }

      directives.push(`${directive} ${finalSources.join(' ')}`);
    }

    if (this.config.csp.reportUri) {
      directives.push(`report-uri ${this.config.csp.reportUri}`);
    }

    return directives.join('; ');
  }

  /**
   * Validate request for security issues
   */
  validateRequest(request: Request): { valid: boolean; reason?: string } {
    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url'
    ];

    for (const header of suspiciousHeaders) {
      if (request.headers.has(header)) {
        logger.warn('Suspicious header detected', {
          component: 'SecurityMiddleware',
          action: 'suspiciousHeaderDetected',
          metadata: { header }
        });
        return {
          valid: false,
          reason: `Suspicious header: ${header}`
        };
      }
    }

    // Validate security headers
    const headerValidation = this.validateSecurityHeaders(request);
    if (!headerValidation.valid) {
      return headerValidation;
    }

    // Check User-Agent
    const userAgent = request.headers.get('user-agent');
    if (!userAgent) {
      logger.warn('Missing User-Agent header', {
        component: 'SecurityMiddleware',
        action: 'missingUserAgent'
      });
      return {
        valid: false,
        reason: 'Missing User-Agent header'
      };
    }

    // Check for known malicious User-Agents
    const maliciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /masscan/i,
      /nmap/i,
      /zap/i,
      /burp/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(userAgent)) {
        logger.warn('Malicious User-Agent detected', {
          component: 'SecurityMiddleware',
          action: 'maliciousUserAgent',
          metadata: { userAgent }
        });
        return {
          valid: false,
          reason: 'Malicious User-Agent detected'
        };
      }
    }

    // Check request size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      logger.warn('Request size too large', {
        component: 'SecurityMiddleware',
        action: 'requestTooLarge',
        metadata: { contentLength }
      });
      return {
        valid: false,
        reason: 'Request too large'
      };
    }

    return { valid: true };
  }

  /**
   * Validate security-related headers
   */
  validateSecurityHeaders(request: Request): { valid: boolean; reason?: string } {
    const url = new URL(request.url);

    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');

      if (!contentType) {
        logger.warn('Missing Content-Type for state-changing request', {
          component: 'SecurityMiddleware',
          action: 'missingContentType'
        });
        return {
          valid: false,
          reason: 'Missing Content-Type header for state-changing request'
        };
      }

      // Validate Content-Type matches expected formats
      const allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ];

      const baseContentType = contentType.split(';')[0].trim();
      if (!allowedContentTypes.some(allowed => baseContentType.startsWith(allowed))) {
        logger.warn('Suspicious Content-Type detected', {
          component: 'SecurityMiddleware',
          action: 'suspiciousContentType',
          metadata: { contentType }
        });
        return {
          valid: false,
          reason: `Invalid Content-Type: ${baseContentType}`
        };
      }
    }

    // Validate Authorization header format if present
    const authorization = request.headers.get('authorization');
    if (authorization) {
      if (!this.validateAuthorizationHeader(authorization)) {
        logger.warn('Invalid Authorization header format', {
          component: 'SecurityMiddleware',
          action: 'invalidAuthFormat'
        });
        return {
          valid: false,
          reason: 'Invalid Authorization header format'
        };
      }
    }

    // Check for header injection attempts
    for (const [name, value] of request.headers.entries()) {
      if (this.detectHeaderInjection(name, value)) {
        logger.warn('Header injection attempt detected', {
          component: 'SecurityMiddleware',
          action: 'headerInjectionDetected',
          metadata: { headerName: name }
        });
        return {
          valid: false,
          reason: `Header injection detected in ${name}`
        };
      }
    }

    // Validate Host header
    const host = request.headers.get('host');
    if (host && !this.validateHostHeader(host, url)) {
      logger.warn('Invalid Host header', {
        component: 'SecurityMiddleware',
        action: 'invalidHostHeader',
        metadata: { host }
      });
      return {
        valid: false,
        reason: 'Invalid Host header'
      };
    }

    // Check for HTTP method override attacks
    const methodOverride = request.headers.get('x-http-method-override');
    if (methodOverride && !this.validateMethodOverride(methodOverride)) {
      logger.warn('Invalid method override', {
        component: 'SecurityMiddleware',
        action: 'invalidMethodOverride',
        metadata: { methodOverride }
      });
      return {
        valid: false,
        reason: 'Invalid method override'
      };
    }

    return { valid: true };
  }

  /**
   * Validate Authorization header format
   */
  private validateAuthorizationHeader(authorization: string): boolean {
    // Check for common schemes
    const validSchemes = [
      /^Bearer [A-Za-z0-9-._~+/]+=*$/,  // JWT/Bearer token
      /^Basic [A-Za-z0-9+/]+=*$/,        // Basic auth
      /^Digest /,                        // Digest auth
      /^API-Key [A-Za-z0-9-_]+$/       // API Key
    ];

    return validSchemes.some(scheme => scheme.test(authorization));
  }

  /**
   * Detect header injection attempts
   */
  private detectHeaderInjection(name: string, value: string): boolean {
    // Check for line breaks, null bytes, and other injection characters
    const injectionPatterns = [
      /[\r\n]/,           // CRLF injection
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/, // Control characters
      /\x00/,             // Null bytes
      /%0[Aa]/,           // URL-encoded line feeds
      /%0[Dd]/,           // URL-encoded carriage returns
      /%00/               // URL-encoded null bytes
    ];

    const testString = name + value;
    return injectionPatterns.some(pattern => pattern.test(testString));
  }

  /**
   * Validate Host header
   */
  private validateHostHeader(host: string, url: URL): boolean {
    // Remove port if present
    const hostWithoutPort = host.split(':')[0];
    const urlHostWithoutPort = url.hostname;

    // Allow exact match or wildcard subdomain match
    return hostWithoutPort === urlHostWithoutPort || hostWithoutPort.endsWith('.' + urlHostWithoutPort);
  }

  /**
   * Validate HTTP method override
   */
  private validateMethodOverride(method: string): boolean {
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    return allowedMethods.includes(method.toUpperCase());
  }

  /**
   * Create security violation response
   */
  createSecurityViolationResponse(reason: string, request?: Request): Response {
    const userAgent = request?.headers.get('user-agent') ?? 'unknown';
    const ip = request?.headers.get('cf-connecting-ip') ?? request?.headers.get('x-forwarded-for') ?? 'unknown';
    
    logger.security('Security violation detected', 'high', {
      component: 'SecurityMiddleware',
      action: 'securityViolation',
      metadata: { reason, userAgent, ip }
    });

    return new Response(
      JSON.stringify({
        error: 'Security violation detected',
        message: 'Request blocked for security reasons'
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}

/**
 * Create security middleware
 */
export function createSecurityMiddleware() {
  const security = new SecurityMiddleware();

  return {
    /**
     * Handle preflight requests
     */
    handlePreflight: (request: Request): Response => {
      return security.handlePreflight(request);
    },

    /**
     * Process request security
     */
    processRequest: (request: Request): Response | null = > {
      // Validate request for security issues
      const validation = security.validateRequest(request);
      if (!validation.valid) {
        return security.createSecurityViolationResponse(validation.reason ?? 'Unknown security violation', request);
      }

      return null; // Allow request to continue
    },

    /**
     * Process response security
     */
    processResponse: (request: Request, response: Response): Response => {
      // Add CORS headers
      let secureResponse = security.addCORSHeaders(request, response);

      // Add security headers
      secureResponse = security.addSecurityHeaders(secureResponse);

      return secureResponse;
    },

    /**
     * Get security middleware for CSP reporting
     */
    handleCSPReport: async (request: Request): Promise<Response> => {
      try {
        const report = await request.json();
        logger.security('CSP violation reported', 'medium', {
          component: 'SecurityMiddleware',
          action: 'cspViolation',
          metadata: { report }
        });

        // Store CSP report for analysis
        // In production, you might want to send this to a logging service

        return new Response('', { status: 204 });
      } catch (error: unknown) {
        logger.error('Failed to process CSP report', error instanceof Error ? error : new Error(String(error)), {
          component: 'SecurityMiddleware',
          action: 'cspReportError'
        });
        return new Response('Bad Request', { status: 400 });
      }
    }
  };
}

/**
 * Security headers for different content types
 */
export function getContentTypeSecurityHeaders(contentType: string): Headers {
  const headers = new Headers();

  switch (contentType) {
    case 'text/html':
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      break;

    case 'application/json':
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Cache-Control', 'no-store');
      break;

    case 'application/javascript':
    case 'text/javascript':
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      break;

    case 'text/css':
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      break;

    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
    case 'image/webp':
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      break;
  }

  return headers;
}

/**
 * Check if request is from a bot
 */
export function isBotRequest(request: Request): boolean {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() ?? '';

  const botPatterns = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'telegrambot'
  ];

  return botPatterns.some(pattern => userAgent.includes(pattern));
}

// Duplicate function removed - using generateNonce from top of file