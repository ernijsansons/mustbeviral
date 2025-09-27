/**
 * Secure Cookie-based Authentication Service
 * Implements HTTP-only cookies for JWT storage to prevent XSS attacks
 * Fortune 50-grade security implementation
 */

import { SignJWT, jwtVerify, type JWTPayload} from 'jose';
import type { AuthUser } from '../auth';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge?: number;
  domain?: string;
  path?: string;
}

export interface AuthTokenPayload extends JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  sessionId?: string;
}

export class SecureCookieAuth {
  private static readonly COOKIENAME = 'auth_token';
  private static readonly REFRESHCOOKIENAME = 'refresh_token';
  private static readonly ACCESSTOKENEXPIRY = '15m'; // Short-lived access token
  private static readonly REFRESHTOKENEXPIRY = '7d'; // Long-lived refresh token
  private static jwtSecret: Uint8Array;

  /**
   * Initialize with JWT secret
   */
  static init(secret: string): void {
    this.jwtSecret = new TextEncoder().encode(secret);
  }

  /**
   * Generate secure cookie options based on environment
   */
  static getCookieOptions(isProduction: boolean = true): CookieOptions {
    return {
      httpOnly: true, // Prevent JavaScript access (XSS protection)
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: isProduction ? '.mustbeviral.com' : undefined
    };
  }

  /**
   * Create access and refresh tokens
   */
  static async createTokenPair(user: AuthUser, sessionId?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessExpiry: Date;
    refreshExpiry: Date;
  }> {
    const now = Date.now();

    // Create access token (short-lived)
    const accessToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      sessionId,
      type: 'access'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.ACCESSTOKENEXPIRY)
      .setJti(crypto.randomUUID())
      .sign(this.jwtSecret);

    // Create refresh token (long-lived)
    const refreshToken = await new SignJWT({
      userId: user.id,
      sessionId,
      type: 'refresh'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.REFRESHTOKENEXPIRY)
      .setJti(crypto.randomUUID())
      .sign(this.jwtSecret);

    return {
      accessToken,
      refreshToken,
      accessExpiry: new Date(now + 15 * 60 * 1000), // 15 minutes
      refreshExpiry: new Date(now + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }

  /**
   * Verify and decode token
   */
  static async verifyToken(token: string): Promise<AuthTokenPayload | null> {
    try {
      const { payload} = await jwtVerify(token, this.jwtSecret);
      return payload as AuthTokenPayload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Generate Set-Cookie headers for authentication
   */
  static generateSetCookieHeaders(
    tokens: { accessToken: string; refreshToken: string },
    isProduction: boolean = true
  ): Headers {
    const headers = new Headers();
    const options = this.getCookieOptions(isProduction);

    // Access token cookie
    headers.append('Set-Cookie', this.serializeCookie(
      this.COOKIENAME,
      tokens.accessToken,
      { ...options, maxAge: 15 * 60 * 1000 } // 15 minutes
    ));

    // Refresh token cookie (separate, more restrictive)
    headers.append('Set-Cookie', this.serializeCookie(
      this.REFRESHCOOKIENAME,
      tokens.refreshToken,
      { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
    ));

    // CSRF token (accessible to JavaScript for double-submit pattern)
    const csrfToken = crypto.randomUUID();
    headers.append('Set-Cookie', this.serializeCookie(
      'csrf_token',
      csrfToken,
      { ...options, httpOnly: false } // Allow JS access for CSRF token
    ));

    headers.append('X-CSRF-Token', csrfToken);

    return headers;
  }

  /**
   * Clear authentication cookies (logout)
   */
  static generateClearCookieHeaders(): Headers {
    const headers = new Headers();

    // Clear all auth-related cookies
    headers.append('Set-Cookie', `${this.COOKIENAME}=; Max-Age=0; Path=/`);
    headers.append('Set-Cookie', `${this.REFRESHCOOKIENAME}=; Max-Age=0; Path=/`);
    headers.append('Set-Cookie', `csrftoken=; Max-Age=0; Path=/`);

    return headers;
  }

  /**
   * Extract token from cookie header
   */
  static extractTokenFromCookies(cookieHeader: string | null): {
    accessToken?: string;
    refreshToken?: string;
    csrfToken?: string;
  } {
    if (!cookieHeader) {
    return {};
  }

    const cookies = this.parseCookies(cookieHeader);

    return {
      accessToken: cookies[this.COOKIENAME],
      refreshToken: cookies[this.REFRESHCOOKIENAME],
      csrfToken: cookies['csrf_token']
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    accessExpiry: Date;
  } | null> {
    const payload = await this.verifyToken(refreshToken);

    if (!payload ?? payload.type !== 'refresh') {
      return null;
    }

    // Generate new access token
    const accessToken = await new SignJWT({
      userId: payload.userId,
      sessionId: payload.sessionId,
      type: 'access'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.ACCESSTOKENEXPIRY)
      .setJti(crypto.randomUUID())
      .sign(this.jwtSecret);

    return {
      accessToken,
      accessExpiry: new Date(Date.now() + 15 * 60 * 1000)
    };
  }

  /**
   * Serialize cookie with options
   */
  private static serializeCookie(
    name: string,
    value: string,
    options: CookieOptions
  ): string {
    let cookie = `${name}=${value}`;

    if (options.maxAge) {
      cookie += `; Max-Age=${Math.floor(options.maxAge / 1000)}`;
    }

    if (options.domain) {
      cookie += `; Domain=${options.domain}`;
    }

    cookie += `; Path=${options.path ?? '/'}`;

    if (options.httpOnly) {
      cookie += '; HttpOnly';
    }

    if (options.secure) {
      cookie += '; Secure';
    }

    if (options.sameSite) {
      cookie += `; SameSite=${options.sameSite}`;
    }

    return cookie;
  }

  /**
   * Parse cookie header string with security validation
   */
  private static parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};

    try {
      cookieHeader.split(';').forEach(cookie => {
        const trimmedCookie = cookie.trim();
        if (!trimmedCookie) {return;}
        
        const separatorIndex = trimmedCookie.indexOf('=');
        if (separatorIndex === -1) {return;}
        
        const name = trimmedCookie.substring(0, separatorIndex).trim();
        const value = trimmedCookie.substring(separatorIndex + 1).trim();
        
        if (!name ?? !value) {return;}
        
        // Validate cookie name (prevent header injection)
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          console.warn(`Invalid cookie name detected: ${name}`);
          return;
        }
        
        // Decode value safely
        try {
          cookies[name] = decodeURIComponent(value);
        } catch (decodeError) {
          console.warn(`Failed to decode cookie value for ${name}:`, decodeError);
        }
      });
    } catch (error) {
      console.error('Cookie parsing error:', error);
    }

    return cookies;
  }

  /**
   * Validate CSRF token (double-submit pattern)
   */
  static validateCsrfToken(
    cookieCsrfToken: string | undefined,
    headerCsrfToken: string | undefined
  ): boolean {
    if (!cookieCsrfToken ?? !headerCsrfToken) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return this.constantTimeCompare(cookieCsrfToken, headerCsrfToken);
  }

  /**
   * Constant-time string comparison
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

export default SecureCookieAuth;