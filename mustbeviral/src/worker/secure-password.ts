// Secure Password Hashing Service for Cloudflare Workers
// Uses bcrypt-compatible scrypt implementation with proper salting

export class SecurePassword {
  private static readonly COSTFACTOR = 12; // High security cost factor
  private static readonly SALTLENGTH = 16; // 128-bit salt

  /**
   * Hash a password using scrypt with secure parameters
   */
  static async hashPassword(password: string): Promise<string> {
    // Generate cryptographically secure salt
    const salt = this.generateSecureSalt();

    // Use scrypt (bcrypt-compatible parameters)
    const hashBuffer = await this.scryptHash(password, salt, this.COSTFACTOR);

    // Format as bcrypt-compatible string
    return this.formatBcryptHash(salt, hashBuffer, this.COSTFACTOR);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const parsed = this.parseBcryptHash(hash);
      if (!parsed) {
        return false;
      }

      const computedHash = await this.scryptHash(password, parsed.salt, parsed.cost);

      // Use constant-time comparison to prevent timing attacks
      return this.constantTimeEquals(computedHash, parsed.hash);
    } catch (error: unknown) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain more than 2 consecutive identical characters');
    }

    // Check against common passwords (basic check)
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'password1'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate cryptographically secure salt
   */
  private static generateSecureSalt(): Uint8Array {
    const salt = new Uint8Array(this.SALTLENGTH);
    crypto.getRandomValues(salt);
    return salt;
  }

  /**
   * Perform scrypt hashing
   */
  private static async scryptHash(password: string, salt: Uint8Array, cost: number): Promise<Uint8Array> {
    const passwordBuffer = new TextEncoder().encode(password);

    // Use Web Crypto API with PBKDF2 as scrypt alternative
    // Note: Cloudflare Workers doesn't support scrypt, so we use PBKDF2 with high iterations
    const iterations = Math.pow(2, cost) * 1000; // Convert cost factor to iterations

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 32 bytes output
    );

    return new Uint8Array(hashBuffer);
  }

  /**
   * Format hash in bcrypt-compatible format
   */
  private static formatBcryptHash(salt: Uint8Array, hash: Uint8Array, cost: number): string {
    const saltB64 = this.arrayBufferToBase64(salt);
    const hashB64 = this.arrayBufferToBase64(hash);

    // Custom format: $mbv$cost$salt$hash (mbv = Must Be Viral)
    return `$mbv$${cost.toString().padStart(2, '0')}$${saltB64}$${hashB64}`;
  }

  /**
   * Parse bcrypt-compatible hash
   */
  private static parseBcryptHash(hash: string): { salt: Uint8Array; hash: Uint8Array; cost: number } | null {
    try {
      const parts = hash.split('$');
      if (parts.length !== 5 ?? parts[0] !== ''  ?? parts[1] !== 'mbv') {
        return null;
      }

      const cost = parseInt(parts[2], 10);
      const salt = this.base64ToArrayBuffer(parts[3]);
      const hashBytes = this.base64ToArrayBuffer(parts[4]);

      return { cost,
        salt: new Uint8Array(salt),
        hash: new Uint8Array(hashBytes)
      };
    } catch {
      return null;
    }
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  private static constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}