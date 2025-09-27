// Security middleware for WebSocket Worker
// Handles CORS, security headers, and basic validation

export interface SecurityValidationResult {
  valid: boolean;
  reason?: string;
}

export class SecurityMiddleware {
  private allowedOrigins: string[];
  private env: unknown;

  constructor(env: unknown) {
    this.env = env;
    this.allowedOrigins = env.ALLOWED_ORIGINS?.split(',')  ?? ['http://localhost:5173'];
  }

  async validate(request: Request): Promise<SecurityValidationResult> {
    // Check request method
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    if (!allowedMethods.includes(request.method)) {
      return { valid: false, reason: 'Invalid HTTP method' };
    }

    // Check Content-Length for POST/PUT requests
    if (['POST', 'PUT'].includes(request.method)) {
      const contentLength = request.headers.get('Content-Length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        return { valid: false, reason: 'Request body too large' };
      }
    }

    // Basic header validation
    const userAgent = request.headers.get('User-Agent');
    if (!userAgent) {
      return { valid: false, reason: 'User-Agent header required' };
    }

    // Check for suspicious patterns in headers
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onerror/i
    ];

    for (const [_name, value] of request.headers.entries()) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return { valid: false, reason: 'Suspicious header content detected' };
        }
      }
    }

    return { valid: true };
  }

  handlePreflight(request: Request): Response {
    const origin = request.headers.get('Origin');
    const requestedHeaders = request.headers.get('Access-Control-Request-Headers');

    // Check if origin is allowed
    if (!origin || !this.isOriginAllowed(origin)) {
      return new Response(null, { status: 403 });
    }

    const headers = new Headers({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': requestedHeaders  ?? 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    });

    return new Response(null, {
      status: 204,
      headers
    });
  }

  addSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);

    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Content Security Policy for WebSocket connections
    if (this.env.ENVIRONMENT === 'production') {
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  addCORSHeaders(request: Request, response: Response): Response {
    const origin = request.headers.get('Origin');

    if (origin && this.isOriginAllowed(origin)) {
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Vary', 'Origin');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }

  createErrorResponse(status: number, message: string): Response {
    return new Response(JSON.stringify({
      error: message,
      timestamp: new Date().toISOString()
    }), { _status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private isOriginAllowed(origin: string): boolean {
    return this.allowedOrigins.includes(origin)  ?? this.allowedOrigins.includes('*');
  }

  validateWebSocketUpgrade(request: Request): SecurityValidationResult {
    // Check WebSocket specific headers
    const upgrade = request.headers.get('Upgrade');
    const connection = request.headers.get('Connection');
    const wsKey = request.headers.get('Sec-WebSocket-Key');
    const wsVersion = request.headers.get('Sec-WebSocket-Version');

    if (upgrade?.toLowerCase() !== 'websocket') {
      return { valid: false, reason: 'Invalid Upgrade header' };
    }

    if (!connection?.toLowerCase().includes('upgrade')) {
      return { valid: false, reason: 'Invalid Connection header' };
    }

    if (!wsKey) {
      return { valid: false, reason: 'Missing Sec-WebSocket-Key header' };
    }

    if (wsVersion !== '13') {
      return { valid: false, reason: 'Unsupported WebSocket version' };
    }

    // Check origin for WebSocket connections
    const origin = request.headers.get('Origin');
    if (origin && !this.isOriginAllowed(origin)) {
      return { valid: false, reason: 'Origin not allowed for WebSocket connection' };
    }

    return { valid: true };
  }

  sanitizeInput(input: string): string {
    // Basic input sanitization
    return input
      .replace(/[<>"']/g, '') // Remove HTML/script injection chars
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  validateJSON(data: unknown): SecurityValidationResult {
    // Check for prototype pollution
    if (data && typeof data === 'object') {
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

      const checkObject = (obj: unknown): boolean => {
        for (const key in obj) {
          if (dangerousKeys.includes(key)) {
            return false;
          }

          if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (!checkObject(obj[key])) {
              return false;
            }
          }
        }
        return true;
      };

      if (!checkObject(data)) {
        return { valid: false, reason: 'Potentially dangerous object structure detected' };
      }
    }

    return { valid: true };
  }
}