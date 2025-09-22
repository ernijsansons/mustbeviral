// Security Middleware for Cloudflare Workers
// Implements security headers, CORS, CSRF protection, and more

import { CloudflareEnv } from '../lib/cloudflare';

export interface SecurityConfig {
  allowedOrigins: string[];
  environment: 'development' | 'production';
  enableCSRF: boolean;
}

export class SecurityMiddleware {
  private static readonly PRODUCTION_ORIGINS = [
    'https://mustbeviral.com',
    'https://www.mustbeviral.com',
    'https://app.mustbeviral.com'
  ];

  private static readonly DEVELOPMENT_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  /**
   * Get security headers for response
   */
  static getSecurityHeaders(env: CloudflareEnv, origin?: string): Record<string, string> {
    const config = this.getSecurityConfig(env);
    const isValidOrigin = this.isValidOrigin(origin, config);

    const headers: Record<string, string> = {
      // CORS headers (restrictive)
      'Access-Control-Allow-Origin': isValidOrigin ? origin! : 'null',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400', // 24 hours

      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

      // Content Security Policy
      'Content-Security-Policy': this.getCSPPolicy(config),

      // Strict Transport Security (HTTPS only)
      ...(config.environment === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      }),

      // Cache control for sensitive endpoints
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    return headers;
  }

  /**
   * Validate CORS request
   */
  static validateCORSRequest(request: Request, env: CloudflareEnv): {
    valid: boolean;
    headers?: Record<string, string>;
    error?: string;
  } {
    const origin = request.headers.get('origin');
    const config = this.getSecurityConfig(env);

    // For same-origin requests (no origin header), allow
    if (!origin) {
      return { valid: true };
    }

    if (!this.isValidOrigin(origin, config)) {
      return {
        valid: false,
        error: 'CORS: Origin not allowed',
        headers: {
          'Access-Control-Allow-Origin': 'null'
        }
      };
    }

    // Check preflight request
    if (request.method === 'OPTIONS') {
      const requestMethod = request.headers.get('access-control-request-method');
      const requestHeaders = request.headers.get('access-control-request-headers');

      if (requestMethod && !this.isAllowedMethod(requestMethod)) {
        return {
          valid: false,
          error: 'CORS: Method not allowed'
        };
      }

      if (requestHeaders && !this.areAllowedHeaders(requestHeaders)) {
        return {
          valid: false,
          error: 'CORS: Headers not allowed'
        };
      }
    }

    return {
      valid: true,
      headers: this.getSecurityHeaders(env, origin)
    };
  }

  /**
   * Generate and validate CSRF tokens
   */
  static async generateCSRFToken(userId: string, env: CloudflareEnv): Promise<string> {
    const timestamp = Date.now();
    const data = `${userId}:${timestamp}`;

    // Create HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const signatureBase64 = this.arrayBufferToBase64(signature);

    return `${btoa(data)}.${signatureBase64}`;
  }

  /**
   * Validate CSRF token
   */
  static async validateCSRFToken(
    token: string,
    userId: string,
    env: CloudflareEnv
  ): Promise<boolean> {
    try {
      const [dataB64, signatureB64] = token.split('.');
      if (!dataB64 || !signatureB64) {
        return false;
      }

      const data = atob(dataB64);
      const [tokenUserId, timestampStr] = data.split(':');

      // Verify user ID matches
      if (tokenUserId !== userId) {
        return false;
      }

      // Check token age (max 1 hour)
      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      if (now - timestamp > 60 * 60 * 1000) {
        return false;
      }

      // Verify signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signature = this.base64ToArrayBuffer(signatureB64);
      const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));

      return valid;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize response data to prevent information leakage
   */
  static sanitizeResponse(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponse(item));
    }

    const sanitized: unknown = {};
    for (const [key, value] of Object.entries(data)) {
      // Remove sensitive fields
      if (this.isSensitiveField(key)) {
        continue;
      }

      if (typeof value === 'object') {
        sanitized[key] = this.sanitizeResponse(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if request is suspicious
   */
  static isSuspiciousRequest(request: Request): { suspicious: boolean; reason?: string } {
    const userAgent = request.headers.get('user-agent') || '';
    const contentType = request.headers.get('content-type') || '';

    // Check for suspicious user agents
    const suspiciousUserAgents = [
      'sqlmap', 'nikto', 'nmap', 'masscan', 'nessus',
      'burpsuite', 'zaproxy', 'gobuster', 'dirb'
    ];

    if (suspiciousUserAgents.some(ua => userAgent.toLowerCase().includes(ua))) {
      return { suspicious: true, reason: 'Suspicious user agent' };
    }

    // Check for malformed content type
    if (request.method === 'POST' && !contentType) {
      return { suspicious: true, reason: 'Missing content type' };
    }

    // Check for excessively long headers
    for (const [key, value] of request.headers.entries()) {
      if (value.length > 8192) {
        return { suspicious: true, reason: 'Excessively long header' };
      }
    }

    return { suspicious: false };
  }

  /**
   * Private helper methods
   */
  private static getSecurityConfig(env: CloudflareEnv): SecurityConfig {
    const environment = env.ENVIRONMENT === 'production' ? 'production' : 'development';
    const allowedOrigins = environment === 'production'
      ? this.PRODUCTION_ORIGINS
      : [...this.PRODUCTION_ORIGINS, ...this.DEVELOPMENT_ORIGINS];

    return { _allowedOrigins,
      environment,
      enableCSRF: environment === 'production'
    };
  }

  private static isValidOrigin(origin: string | null, config: SecurityConfig): boolean {
    if (!origin) return false;
    return config.allowedOrigins.includes(origin);
  }

  private static isAllowedMethod(method: string): boolean {
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    return allowedMethods.includes(method.toUpperCase());
  }

  private static areAllowedHeaders(headers: string): boolean {
    const allowedHeaders = [
      'content-type', 'authorization', 'x-csrf-token',
      'x-requested-with', 'accept', 'origin'
    ];

    const requestedHeaders = headers.toLowerCase().split(',').map(h => h.trim());
    return requestedHeaders.every(header => allowedHeaders.includes(header));
  }

  private static getCSPPolicy(config: SecurityConfig): string {
    const basePolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.stripe.com https://*.workers.dev",
      "frame-src https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    if (config.environment === 'development') {
      // More permissive for development
      basePolicy.push("connect-src 'self' ws: wss: http: https:");
    }

    return basePolicy.join('; ');
  }

  private static isSensitiveField(key: string): boolean {
    const sensitiveFields = [
      'password', 'password_hash', 'token', 'secret',
      'key', 'private', 'credential', 'auth'
    ];

    return sensitiveFields.some(field => key.toLowerCase().includes(field));
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}