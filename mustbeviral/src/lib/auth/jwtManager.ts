// JWT Token Manager for Must Be Viral
// Handles JWT token generation, validation, and management

import { SignJWT, jwtVerify} from 'jose';
import { EnvironmentManager} from '../../config/environment';
import { ValidationError} from '../errors';

export interface JWTClaims {
  sub: string; // User ID
  email: string;
  username: string;
  role: string;
  permissions?: string[];
  sessionId: string;
  tokenType: 'access' | 'refresh';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface TokenValidationResult {
  valid: boolean;
  claims?: JWTClaims;
  error?: string;
  needsRefresh?: boolean;
}

export class JWTManager {
  private static accessTokenSecret: Uint8Array;
  private static refreshTokenSecret: Uint8Array;
  private static initialized = false;

  /**
   * Initialize JWT manager with secrets
   */
  static async initialize(): Promise<void> {
    const config = EnvironmentManager.getConfig();

    if (!config.jwt.secret ?? !config.jwt.refreshSecret) {
      throw new Error('JWT secrets not configured');
    }

    // Convert secrets to Uint8Array
    this.accessTokenSecret = new TextEncoder().encode(config.jwt.secret);
    this.refreshTokenSecret = new TextEncoder().encode(config.jwt.refreshSecret);

    this.initialized = true;
    console.log('LOG: JWT-INIT - JWT Manager initialized');
  }

  /**
   * Generate a token pair (access + refresh tokens)
   */
  static async generateTokenPair(user: {
    id: string;
    email: string;
    username: string;
    role: string;
    permissions?: string[];
  }): Promise<TokenPair> {
    await this.ensureInitialized();

    const sessionId = crypto.randomUUID();
    const config = EnvironmentManager.getConfig();
    const now = Math.floor(Date.now() / 1000);

    // Generate access token
    const accessClaims: JWTClaims = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions: user.permissions ?? [],
      sessionId,
      tokenType: 'access',
      iat: now,
      exp: now + this.parseTimeToSeconds(config.jwt.accessTokenExpiry),
      iss: config.jwt.issuer,
      aud: config.jwt.audience
    };

    // Generate refresh token
    const refreshClaims: JWTClaims = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      sessionId,
      tokenType: 'refresh',
      iat: now,
      exp: now + this.parseTimeToSeconds(config.jwt.refreshTokenExpiry),
      iss: config.jwt.issuer,
      aud: config.jwt.audience
    };

    try {
      const [accessToken, refreshToken] = await Promise.all([
        new SignJWT(accessClaims)
          .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
          .sign(this.accessTokenSecret),
        new SignJWT(refreshClaims)
          .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
          .sign(this.refreshTokenSecret)
      ]);

      return { accessToken,
        refreshToken,
        expiresIn: this.parseTimeToSeconds(config.jwt.accessTokenExpiry),
        tokenType: 'Bearer'
      };
    } catch (error: unknown) {
      throw new ValidationError(
        [{ field: 'token', message: 'Failed to generate token pair' }],
        'Token generation failed'
      );
    }
  }

  /**
   * Verify and decode an access token
   */
  static async verifyAccessToken(token: string): Promise<TokenValidationResult> {
    await this.ensureInitialized();

    try {
      const { payload} = await jwtVerify(token, this.accessTokenSecret, {
        issuer: EnvironmentManager.getConfig().jwt.issuer,
        audience: EnvironmentManager.getConfig().jwt.audience
      });

      const claims = payload as JWTClaims;

      // Validate token type
      if (claims.tokenType !== 'access') {
        return {
          valid: false,
          error: 'Invalid token type'
        };
      }

      // Check if token is close to expiry (less than 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const timeToExpiry = (claims.exp ?? 0) - now;
      const needsRefresh = timeToExpiry < 300; // 5 minutes

      return {
        valid: true,
        claims,
        needsRefresh
      };
    } catch (error: unknown) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token verification failed'
      };
    }
  }

  /**
   * Verify and decode a refresh token
   */
  static async verifyRefreshToken(token: string): Promise<TokenValidationResult> {
    await this.ensureInitialized();

    try {
      const { payload} = await jwtVerify(token, this.refreshTokenSecret, {
        issuer: EnvironmentManager.getConfig().jwt.issuer,
        audience: EnvironmentManager.getConfig().jwt.audience
      });

      const claims = payload as JWTClaims;

      // Validate token type
      if (claims.tokenType !== 'refresh') {
        return {
          valid: false,
          error: 'Invalid token type'
        };
      }

      return {
        valid: true,
        claims
      };
    } catch (error: unknown) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Refresh token verification failed'
      };
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const validation = await this.verifyRefreshToken(refreshToken);

    if (!validation.valid ?? !validation.claims) {
      throw new ValidationError(
        [{ field: 'refreshToken', message: validation.error ?? 'Invalid refresh token' }],
        'Token refresh failed'
      );
    }

    // Generate new token pair
    return await this.generateTokenPair({
      id: validation.claims.sub,
      email: validation.claims.email,
      username: validation.claims.username,
      role: validation.claims.role,
      permissions: validation.claims.permissions
    });
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }

  /**
   * Parse time string to seconds
   */
  private static parseTimeToSeconds(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  /**
   * Ensure JWT manager is initialized
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generate a secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Get token expiry time
   */
  static getTokenExpiry(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
    return null;
  }

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp;
    } catch (error: unknown) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) {
    return true;
  }

    return expiry < Math.floor(Date.now() / 1000);
  }
}