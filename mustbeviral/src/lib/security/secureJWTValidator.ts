/**
 * Secure JWT Validator
 * CVSS 8.1 Fix - Comprehensive JWT signature and expiry verification
 */

export interface JWTValidationResult {
  valid: boolean;
  payload?: any;
  error?: string;
  warnings?: string[];
}

export interface JWTValidationOptions {
  expectedIssuer?: string;
  expectedAudience?: string;
  clockTolerance?: number; // seconds
  maxTokenLifetime?: number; // seconds
}

export class SecureJWTValidator {
  private static readonly SUPPORTED_ALGORITHMS = ['HS256', 'HS384', 'HS512'];
  private static readonly MAX_TOKEN_LIFETIME = 24 * 60 * 60; // 24 hours
  private static readonly DEFAULT_CLOCK_TOLERANCE = 60; // 60 seconds

  /**
   * Generate a JWT token with secure defaults
   */
  static async generateJWT(
    payload: any,
    secret: string,
    algorithm: string = 'HS256'
  ): Promise<string> {
    this.validateAlgorithm(algorithm);
    const header = this.createHeader(algorithm);
    const encodedParts = this.encodeTokenParts(header, payload);
    const signature = await this.createSignature(encodedParts, secret, algorithm);
    return `${encodedParts}.${signature}`;
  }

  private static validateAlgorithm(algorithm: string): void {
    if (!this.SUPPORTED_ALGORITHMS.includes(algorithm)) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  private static createHeader(algorithm: string) {
    return {
      alg: algorithm,
      typ: 'JWT'
    };
  }

  private static encodeTokenParts(header: any, payload: any): string {
    const encodedHeader = this.base64URLEncode(JSON.stringify(header));
    const encodedPayload = this.base64URLEncode(JSON.stringify(payload));
    return `${encodedHeader}.${encodedPayload}`;
  }

  private static async createSignature(
    data: string,
    secret: string,
    algorithm: string
  ): Promise<string> {
    return await this.generateSignature(data, secret, algorithm);
  }

  /**
   * Verify JWT token with comprehensive security checks
   */
  static async verifyJWT(
    token: string,
    secret: string,
    options: JWTValidationOptions = {}
  ): Promise<JWTValidationResult> {
    try {
      const tokenParts = this.parseTokenParts(token);
      if (!tokenParts.valid) {
        return tokenParts;
      }

      const { header, payload, headerB64, payloadB64, signatureB64 } = tokenParts;

      const algorithmCheck = this.validateTokenAlgorithm(header);
      if (!algorithmCheck.valid) {
        return algorithmCheck;
      }

      const signatureCheck = await this.verifyTokenSignature(
        headerB64, payloadB64, signatureB64, secret, header.alg
      );
      if (!signatureCheck.valid) {
        return signatureCheck;
      }

      return this.performFinalValidation(payload, options);

    } catch (error) {
      return {
        valid: false,
        error: `token verification failed: ${error instanceof Error ? error.message : 'unknown error'}`
      };
    }
  }

  private static parseTokenParts(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'invalid JWT format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    try {
      const header = JSON.parse(this.base64URLDecode(headerB64));
      try {
        const payload = JSON.parse(this.base64URLDecode(payloadB64));
        return { valid: true, header, payload, headerB64, payloadB64, signatureB64 };
      } catch {
        return { valid: false, error: 'invalid payload encoding' };
      }
    } catch {
      return { valid: false, error: 'invalid header encoding' };
    }
  }

  private static validateTokenAlgorithm(header: any): JWTValidationResult {
    if (!header.alg) {
      return { valid: false, error: 'missing algorithm in header' };
    }

    if (header.alg === 'none') {
      return { valid: false, error: 'insecure algorithm: none' };
    }

    if (!this.SUPPORTED_ALGORITHMS.includes(header.alg)) {
      return { valid: false, error: `unsupported algorithm: ${header.alg}` };
    }

    return { valid: true };
  }

  private static async verifyTokenSignature(
    headerB64: string,
    payloadB64: string,
    signatureB64: string,
    secret: string,
    algorithm: string
  ): Promise<JWTValidationResult> {
    const expectedSignature = await this.generateSignature(
      `${headerB64}.${payloadB64}`,
      secret,
      algorithm
    );

    if (!this.constantTimeCompare(signatureB64, expectedSignature)) {
      return { valid: false, error: 'signature verification failed' };
    }

    return { valid: true };
  }

  private static performFinalValidation(
    payload: any,
    options: JWTValidationOptions
  ): JWTValidationResult {
    const claimsValidation = this.validateClaims(payload, options);
    if (!claimsValidation.valid) {
      return claimsValidation;
    }

    const warnings = [...(claimsValidation.warnings || [])];

    this.addSecurityWarnings(payload, warnings);

    return {
      valid: true,
      payload,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private static addSecurityWarnings(payload: any, warnings: string[]): void {
    if (payload.exp && payload.iat) {
      const tokenLifetime = payload.exp - payload.iat;
      if (tokenLifetime > 7 * 24 * 60 * 60) { // 7 days
        warnings.push('unusually long expiry time');
      }
    }

    if (this.hasSuspiciousClaims(payload)) {
      warnings.push('suspicious claims detected');
    }
  }

  /**
   * Validate JWT claims
   */
  private static validateClaims(
    payload: any,
    options: JWTValidationOptions
  ): JWTValidationResult {
    const warnings: string[] = [];
    const now = Math.floor(Date.now() / 1000);
    const clockTolerance = options.clockTolerance || this.DEFAULT_CLOCK_TOLERANCE;

    const requiredCheck = this.checkRequiredClaims(payload);
    if (!requiredCheck.valid) {
      return requiredCheck;
    }

    const timeCheck = this.checkTimeClaims(payload, now, clockTolerance);
    if (!timeCheck.valid) {
      return timeCheck;
    }

    const lifetimeCheck = this.checkTokenLifetime(payload, options);
    if (!lifetimeCheck.valid) {
      return lifetimeCheck;
    }

    const audienceCheck = this.checkAudienceAndIssuer(payload, options);
    if (!audienceCheck.valid) {
      return audienceCheck;
    }

    return { valid: true, warnings };
  }

  private static checkRequiredClaims(payload: any): JWTValidationResult {
    if (!payload.sub) {
      return { valid: false, error: 'missing subject claim' };
    }

    if (!payload.exp) {
      return { valid: false, error: 'missing expiry claim' };
    }

    return { valid: true };
  }

  private static checkTimeClaims(
    payload: any,
    now: number,
    clockTolerance: number
  ): JWTValidationResult {
    if (payload.exp <= now - clockTolerance) {
      return { valid: false, error: 'token expired' };
    }

    if (payload.nbf && payload.nbf > now + clockTolerance) {
      return { valid: false, error: 'token not yet valid' };
    }

    if (payload.iat && payload.iat > now + clockTolerance) {
      return { valid: false, error: 'token issued in the future' };
    }

    return { valid: true };
  }

  private static checkTokenLifetime(
    payload: any,
    options: JWTValidationOptions
  ): JWTValidationResult {
    const maxLifetime = options.maxTokenLifetime || this.MAX_TOKEN_LIFETIME;
    if (payload.iat && payload.exp - payload.iat > maxLifetime) {
      return { valid: false, error: 'token lifetime exceeds maximum allowed' };
    }

    return { valid: true };
  }

  private static checkAudienceAndIssuer(
    payload: any,
    options: JWTValidationOptions
  ): JWTValidationResult {
    if (options.expectedIssuer && payload.iss !== options.expectedIssuer) {
      return { valid: false, error: 'invalid issuer' };
    }

    if (options.expectedAudience) {
      const audienceValid = Array.isArray(payload.aud)
        ? payload.aud.includes(options.expectedAudience)
        : payload.aud === options.expectedAudience;

      if (!audienceValid) {
        return { valid: false, error: 'invalid audience' };
      }
    }

    return { valid: true };
  }

  /**
   * Check for suspicious claims that might indicate attacks
   */
  private static hasSuspiciousClaims(payload: any): boolean {
    const suspiciousPatterns = [
      /[<>]/,                    // HTML/XSS patterns
      /[';\"]/,                  // SQL injection patterns
      /\.\.\//,                  // Path traversal
      /%[0-9a-f]{2}/i,          // URL encoding
      /javascript:/i,            // JavaScript protocol
      /data:/i,                  // Data protocol
      /vbscript:/i,              // VBScript protocol
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return suspiciousPatterns.some(pattern => pattern.test(value));
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(checkValue);
      }
      return false;
    };

    return checkValue(payload);
  }

  /**
   * Generate HMAC signature
   */
  private static async generateSignature(
    data: string,
    secret: string,
    algorithm: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const hashAlgorithm = this.getHashAlgorithm(algorithm);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: hashAlgorithm },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return this.base64URLEncode(new Uint8Array(signature));
  }

  /**
   * Get hash algorithm for HMAC
   */
  private static getHashAlgorithm(algorithm: string): string {
    switch (algorithm) {
      case 'HS256': return 'SHA-256';
      case 'HS384': return 'SHA-384';
      case 'HS512': return 'SHA-512';
      default: throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  /**
   * Base64URL encode
   */
  private static base64URLEncode(data: string | Uint8Array): string {
    let base64: string;

    if (typeof data === 'string') {
      base64 = btoa(data);
    } else {
      // Convert Uint8Array to string for btoa
      const binaryString = Array.from(data, byte => String.fromCharCode(byte)).join('');
      base64 = btoa(binaryString);
    }

    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64URL decode
   */
  private static base64URLDecode(base64url: string): string {
    // Add padding if needed
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    try {
      return atob(base64);
    } catch {
      throw new Error('Invalid base64 encoding');
    }
  }

  /**
   * Constant time string comparison to prevent timing attacks
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