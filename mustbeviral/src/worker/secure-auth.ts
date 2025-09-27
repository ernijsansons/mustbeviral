// Secure Authentication Service for Cloudflare Workers
// Uses proper JWT signing and cryptographic best practices

import { CloudflareEnv} from '../lib/cloudflare';

// JWT Configuration
interface JWTPayload {
  sub: string; // user ID
  email: string;
  username: string;
  role: string;
  iat: number; // issued at
  exp: number; // expires at
  iss: string; // issuer
  aud: string; // audience
}

interface JWTVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

export class SecureAuth {
  private static readonly ALGORITHM = 'HS256';
  private static readonly ISSUER = 'must-be-viral';
  private static readonly AUDIENCE = 'must-be-viral-users';
  private static readonly ACCESSTOKENLIFETIME = 15 * 60; // 15 minutes
  private static readonly REFRESHTOKENLIFETIME = 7 * 24 * 60 * 60; // 7 days

  /**
   * Generate a cryptographically secure JWT token
   */
  static async generateToken(
    userId: string,
    email: string,
    username: string,
    role: string,
    env: CloudflareEnv
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const payload: JWTPayload = {
      sub: userId,
      email,
      username,
      role,
      iat: now,
      exp: now + this.ACCESSTOKENLIFETIME,
      iss: this.ISSUER,
      aud: this.AUDIENCE
    };

    return await this.signJWT(payload, env.JWTSECRET);
  }

  /**
   * Generate a refresh token with longer expiry
   */
  static async generateRefreshToken(
    userId: string,
    env: CloudflareEnv
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      sub: userId,
      type: 'refresh',
      iat: now,
      exp: now + this.REFRESHTOKENLIFETIME,
      iss: this.ISSUER,
      aud: this.AUDIENCE
    };

    return await this.signJWT(payload, env.JWTREFRESHSECRET);
  }

  /**
   * Verify and decode a JWT token
   */
  static async verifyToken(token: string, env: CloudflareEnv): Promise<JWTVerificationResult> {
    try {
      const payload = await this.verifyJWT(token, env.JWTSECRET);

      // Validate payload structure
      if (!this.isValidPayload(payload)) {
        return { valid: false, error: 'Invalid token payload' };
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return { valid: false, error: 'Token expired' };
      }

      // Check issuer and audience
      if (payload.iss !== this.ISSUER ?? payload.aud !== this.AUDIENCE) {
        return { valid: false, error: 'Invalid token issuer or audience' };
      }

      return { valid: true, payload: payload as JWTPayload };
    } catch (error: unknown) {
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token: string, env: CloudflareEnv): Promise<JWTVerificationResult> {
    try {
      const payload = await this.verifyJWT(token, env.JWTREFRESHSECRET);

      if (payload.type !== 'refresh') {
        return { valid: false, error: 'Invalid refresh token' };
      }

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return { valid: false, error: 'Refresh token expired' };
      }

      return { valid: true, payload: payload as unknown };
    } catch (error: unknown) {
      return { valid: false, error: 'Refresh token verification failed' };
    }
  }

  /**
   * Sign a JWT using HMAC-SHA256
   */
  private static async signJWT(payload: unknown, secret: string): Promise<string> {
    const header = {
      alg: this.ALGORITHM,
      typ: 'JWT'
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    const signature = await this.sign(`${encodedHeader}.${encodedPayload}`, secret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify and decode a JWT
   */
  private static async verifyJWT(token: string, secret: string): Promise<unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSignature = await this.sign(`${headerB64}.${payloadB64}`, secret);
    if (signatureB64 !== expectedSignature) {
      throw new Error('Invalid JWT signature');
    }

    // Decode and return payload
    const payload = JSON.parse(this.base64UrlDecode(payloadB64));
    return payload;
  }

  /**
   * Create HMAC-SHA256 signature
   */
  private static async sign(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return this.arrayBufferToBase64Url(signature);
  }

  /**
   * Base64URL encode
   */
  private static base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '').replace(/=/g, '');
  }

  /**
   * Base64URL decode
   */
  private static base64UrlDecode(str: string): string {
    // Add padding if needed
    const padded = str + '='.repeat((4 - str.length % 4) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
  }

  /**
   * Convert ArrayBuffer to Base64URL
   */
  private static arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '').replace(/=/g, '');
  }

  /**
   * Validate JWT payload structure
   */
  private static isValidPayload(payload: unknown): boolean {
    return (
      payload &&
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.username === 'string' &&
      typeof payload.role === 'string' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number' &&
      typeof payload.iss === 'string' &&
      typeof payload.aud === 'string'
    );
  }
}