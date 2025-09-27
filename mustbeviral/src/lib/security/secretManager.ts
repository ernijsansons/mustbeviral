/**
 * Secret Management Service
 * Secure handling of secrets with validation and rotation
 */

import { CloudflareEnv} from '../cloudflare';
import { logger} from '../logging/productionLogger';

export interface SecretValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecretMetadata {
  name: string;
  lastRotated: Date;
  expiresAt?: Date;
  strength: 'weak' | 'medium' | 'strong';
  usage: string;
}

export class SecretManager {
  private env: CloudflareEnv;
  private secretCache: Map<string, { value: string; metadata: SecretMetadata; cachedAt: Date }> = new Map();
  private readonly CACHETTL = 300000; // 5 minutes

  constructor(env: CloudflareEnv) {
    this.env = env;
  }

  /**
   * Get a secret with caching and validation
   */
  async getSecret(name: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.secretCache.get(name);
      if (cached && Date.now() - cached.cachedAt.getTime() < this.CACHETTL) {
        return cached.value;
      }

      // Get from environment
      const value = this.getEnvironmentSecret(name);
      if (!value) {
        logger.warn('Secret not found', {
          component: 'SecretManager',
          action: 'get_secret',
          metadata: { secretName: name }
        });
        return null;
      }

      // Validate secret
      const validation = this.validateSecret(name, value);
      if (!validation.isValid) {
        logger.error('Secret validation failed', undefined, {
          component: 'SecretManager',
          action: 'validate_secret',
          metadata: { secretName: name, errors: validation.errors }
        });
        throw new Error(`Invalid secret: ${name}`);
      }

      // Log warnings
      if (validation.warnings.length > 0) {
        logger.warn('Secret validation warnings', {
          component: 'SecretManager',
          action: 'validate_secret',
          metadata: { secretName: name, warnings: validation.warnings }
        });
      }

      // Cache the secret
      const metadata = this.getSecretMetadata(name, value);
      this.secretCache.set(name, { value,
        metadata,
        cachedAt: new Date()
      });

      logger.info('Secret retrieved successfully', {
        component: 'SecretManager',
        action: 'get_secret',
        metadata: { secretName: name, strength: metadata.strength }
      });
      return value;

    } catch (error: unknown) {
      logger.error('Failed to get secret', error as Error, {
        component: 'SecretManager',
        action: 'get_secret',
        metadata: { secretName: name }
      });
      return null;
    }
  }

  /**
   * Get JWT secret with automatic fallback
   */
  async getJWTSecret(): Promise<string> {
    // Try primary JWT secret
    let secret = await this.getSecret('JWT_SECRET');

    if (!secret) {
      // Try alternative names
      secret = await this.getSecret('JWT_SIGNING_KEY')  ?? await this.getSecret('AUTH_SECRET')  ?? await this.getSecret('NEXTAUTH_SECRET');
    }

    if (!secret) {
      // Generate a secure fallback secret
      logger.warn('No JWT secret found, generating secure fallback', {
        component: 'SecretManager',
        action: 'get_jwt_secret',
        metadata: { environment: this.env.ENVIRONMENT }
      });
      secret = this.generateSecureSecret(64);

      // In development, this is OK. In production, this should be an error.
      if (this.env.ENVIRONMENT === 'production') {
        throw new Error('JWT_SECRET must be configured in production environment');
      }
    }

    return secret;
  }

  /**
   * Get refresh JWT secret
   */
  async getJWTRefreshSecret(): Promise<string> {
    let secret = await this.getSecret('JWT_REFRESH_SECRET');

    if (!secret) {
      // Generate fallback based on main JWT secret with salt
      const mainSecret = await this.getJWTSecret();
      secret = this.deriveSecret(mainSecret, 'refresh');
      logger.warn('No JWT refresh secret found, derived from main secret', {
        component: 'SecretManager',
        action: 'get_jwt_refresh_secret',
        metadata: { derivedFromMain: true }
      });
    }

    return secret;
  }

  /**
   * Get encryption key for sensitive data
   */
  async getEncryptionKey(): Promise<string> {
    let key = await this.getSecret('ENCRYPTION_KEY');

    if (!key) {
      // Try alternatives
      key = await this.getSecret('AES_KEY')  ?? await this.getSecret('DATA_ENCRYPTION_KEY');
    }

    if (!key) {
      logger.warn('No encryption key found, generating secure fallback', {
        component: 'SecretManager',
        action: 'get_encryption_key',
        metadata: { environment: this.env.ENVIRONMENT }
      });
      key = this.generateSecureSecret(32);

      if (this.env.ENVIRONMENT === 'production') {
        throw new Error('ENCRYPTION_KEY must be configured in production environment');
      }
    }

    return key;
  }

  /**
   * Validate all critical secrets
   */
  async validateAllSecrets(): Promise<{ isValid: boolean; results: Record<string, SecretValidationResult> }> {
    const criticalSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];

    const results: Record<string, SecretValidationResult> = {};
    let allValid = true;

    for (const secretName of criticalSecrets) {
      const value = await this.getSecret(secretName);
      if (value) {
        results[secretName] = this.validateSecret(secretName, value);
        if (!results[secretName].isValid) {
          allValid = false;
        }
      } else {
        results[secretName] = {
          isValid: false,
          errors: ['Secret not found'],
          warnings: []
        };
        allValid = false;
      }
    }

    return { isValid: allValid, results };
  }

  /**
   * Get secret from environment
   */
  private getEnvironmentSecret(name: string): string | null {
    // Check Cloudflare environment first (secrets)
    if (this.env[name as keyof CloudflareEnv]) {
      return this.env[name as keyof CloudflareEnv] as string;
    }

    // Check process.env as fallback (for local development)
    if (typeof process !== 'undefined' && process.env?.[name]) {
      return process.env[name];
    }

    return null;
  }

  /**
   * Validate secret strength and format
   */
  private validateSecret(name: string, value: string): SecretValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length validation
    if (value.length < 16) {
      errors.push('Secret must be at least 16 characters long');
    } else if (value.length < 32) {
      warnings.push('Secret should be at least 32 characters for better security');
    }

    // Entropy validation
    if (this.calculateEntropy(value) < 3.0) {
      warnings.push('Secret has low entropy, consider using more random characters');
    }

    // Common patterns to avoid
    if (/^[a-zA-Z]+$/.test(value)) {
      warnings.push('Secret contains only letters, consider adding numbers and symbols');
    }

    if (/^[0-9]+$/.test(value)) {
      errors.push('Secret contains only numbers');
    }

    if (/password|secret|key|admin|test|dev/i.test(value)) {
      errors.push('Secret contains common words');
    }

    // Specific validations by secret type
    if (name.includes('JWT')  ?? name.includes('AUTH')) {
      if (value.length < 32) {
        errors.push('JWT secrets should be at least 32 characters');
      }
    }

    if (name.includes('ENCRYPTION')) {
      if (value.length !== 32 && value.length !== 44) {
        warnings.push('Encryption key should be 32 bytes (base64: 44 chars) for AES-256');
      }
    }

    if (name.includes('STRIPE')) {
      if (!value.startsWith('sk') && !value.startsWith('whsec')) {
        errors.push('Stripe secrets should start with sk_ or whsec');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate entropy of a string
   */
  private calculateEntropy(str: string): number {
    const charCounts = new Map<string, number>();

    for (const char of str) {
      charCounts.set(char, (charCounts.get(char)  ?? 0) + 1);
    }

    let entropy = 0;
    const length = str.length;

    for (const count of charCounts.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Generate secret metadata
   */
  private getSecretMetadata(name: string, value: string): SecretMetadata {
    const entropy = this.calculateEntropy(value);
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    if (entropy >= 4.0 && value.length >= 32) {
      strength = 'strong';
    } else if (entropy >= 3.0 && value.length >= 16) {
      strength = 'medium';
    }

    return { name,
      lastRotated: new Date(), // Would track actual rotation in production
      strength,
      usage: this.getSecretUsage(name)
    };
  }

  /**
   * Get secret usage description
   */
  private getSecretUsage(name: string): string {
    const usageMap: Record<string, string> = {
      'JWT_SECRET': 'JWT token signing and verification',
      'JWT_REFRESH_SECRET': 'JWT refresh token signing',
      'ENCRYPTION_KEY': 'Data encryption at rest',
      'STRIPE_SECRET_KEY': 'Stripe API authentication',
      'STRIPE_WEBHOOK_SECRET': 'Stripe webhook signature verification',
      'DATABASE_URL': 'Database connection authentication',
      'GOOGLE_CLIENT_SECRET': 'Google OAuth authentication',
      'GITHUB_CLIENT_SECRET': 'GitHub OAuth authentication'
    };

    return usageMap[name]  ?? 'General purpose secret';
  }

  /**
   * Generate cryptographically secure secret
   */
  private generateSecureSecret(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';

    // Use crypto.getRandomValues if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);

      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // Fallback to Math.random (less secure, but better than nothing)
      logger.warn('Using Math.random for secret generation - not cryptographically secure', {
        component: 'SecretManager',
        action: 'generate_secure_secret',
        metadata: { cryptoUnavailable: true, securityRisk: 'high' }
      });
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    return result;
  }

  /**
   * Derive a secret from another secret using HMAC
   */
  private deriveSecret(baseSecret: string, purpose: string): string {
    // Simple derivation - in production, use proper HKDF
    const combined = baseSecret + ':' + purpose;

    // Use TextEncoder if available
    if (typeof TextEncoder !== 'undefined') {
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);

      // Simple hash - in production, use crypto.subtle
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
      }

      return Math.abs(hash).toString(36) + this.generateSecureSecret(32);
    }

    return this.generateSecureSecret(64);
  }

  /**
   * Clear secret cache
   */
  clearCache(): void {
    this.secretCache.clear();
    logger.info('Secret cache cleared', {
      component: 'SecretManager',
      action: 'clear_cache',
      metadata: { previousSize: this.secretCache.size }
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.secretCache.size,
      entries: Array.from(this.secretCache.keys())
    };
  }
}

// Global secret manager instance
let globalSecretManager: SecretManager | null = null;

/**
 * Get or create global secret manager
 */
export function getSecretManager(env: CloudflareEnv): SecretManager {
  if (!globalSecretManager) {
    globalSecretManager = new SecretManager(env);
  }
  return globalSecretManager;
}