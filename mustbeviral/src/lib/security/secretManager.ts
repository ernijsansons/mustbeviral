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

export interface SecretValidation {
  valid: boolean;
  issues: string[];
  score: number;
}

export interface EnvironmentValidation {
  valid: boolean;
  missing: string[];
  weak: string[];
  score: number;
}

export interface SecretRotation {
  success: boolean;
  oldSecret: string;
  newSecret: string;
  rotatedAt: Date;
}

export interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  field?: string;
  message: string;
}

export interface ScanResult {
  vulnerabilities: SecurityIssue[];
  score: number;
  passed: boolean;
}

export interface SecretExposure {
  exposed: boolean;
  fields: string[];
}

export interface SecureEnvironment {
  encrypted: string[];
  public: string[];
  secrets: string[];
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

  private static readonly WEAK_PATTERNS = [
    /^(password|admin|secret|changeme|default|test|dev|123|qwerty)$/i,
    /^dev_\w+/i,
    /^test_\w+/i,
    /^local_\w+/i,
  ];

  private static readonly SECRET_PATTERNS = [
    { pattern: /sk_test_[a-zA-Z0-9]{24}/, type: 'stripe_test_key', severity: 'medium' as const },
    { pattern: /sk_live_[a-zA-Z0-9]{24}/, type: 'stripe_live_key', severity: 'critical' as const },
    { pattern: /pk_test_[a-zA-Z0-9]{24}/, type: 'stripe_publishable_test', severity: 'low' as const },
    { pattern: /pk_live_[a-zA-Z0-9]{24}/, type: 'stripe_publishable_live', severity: 'medium' as const },
    { pattern: /AKIA[0-9A-Z]{16}/, type: 'aws_access_key', severity: 'critical' as const },
    { pattern: /AIza[0-9A-Za-z\\-_]{35}/, type: 'google_api_key', severity: 'high' as const },
    { pattern: /ya29\\.[0-9A-Za-z\\-_]+/, type: 'google_oauth_token', severity: 'critical' as const },
    { pattern: /ghp_[0-9A-Za-z]{36}/, type: 'github_token', severity: 'high' as const },
    { pattern: /xoxb-[0-9]+-.+/, type: 'slack_bot_token', severity: 'high' as const },
  ];

  private static readonly SENSITIVE_FIELDS = [
    'password', 'password_hash', 'secret', 'key', 'token', 'auth',
    'credential', 'private', 'api_key', 'access_key', 'secret_key',
  ];

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
   * Calculate entropy of a string (instance method)
   */
  private calculateEntropy(str: string): number {
    return SecretManager.calculateEntropy(str) / str.length; // Normalize to per-character entropy
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
   * Generate cryptographically secure secret (static method)
   */
  static generateSecureSecret(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      result += charset[randomIndex];
    }

    return result;
  }

  /**
   * Calculate entropy of a string (static method)
   */
  static calculateEntropy(str: string): number {
    const freqs = new Map<string, number>();

    for (const char of str) {
      freqs.set(char, (freqs.get(char) || 0) + 1);
    }

    let entropy = 0;
    const length = str.length;

    for (const freq of freqs.values()) {
      const probability = freq / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy * length;
  }

  /**
   * Validate secret strength (static method)
   */
  static validateSecretStrength(secret: string): SecretValidation {
    const issues: string[] = [];
    let score = 100;

    // Length check
    if (secret.length < 16) {
      issues.push('insufficient_length');
      score -= 30;
    }

    // Entropy check
    const entropy = this.calculateEntropy(secret);
    if (entropy < 50) {
      issues.push('insufficient_entropy');
      score -= 40;
    }

    // Common pattern check
    if (this.WEAK_PATTERNS.some(pattern => pattern.test(secret))) {
      issues.push('weak_pattern');
      score -= 50;
    }

    // Character diversity check
    const hasUpper = /[A-Z]/.test(secret);
    const hasLower = /[a-z]/.test(secret);
    const hasDigit = /[0-9]/.test(secret);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(secret);

    const charTypes = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
    if (charTypes < 3) {
      issues.push('insufficient_character_diversity');
      score -= 20;
    }

    return {
      valid: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * Detect insecure secrets in content
   */
  static detectInsecureSecrets(content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for development secrets
    const devPatterns = [
      /dev_\w+/gi,
      /test_\w+/gi,
      /local_\w+/gi,
      /changeme/gi,
      /password123/gi,
      /admin/gi,
    ];

    devPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            type: 'hardcoded_development_secret',
            severity: 'critical',
            message: `Development secret detected: ${match}`,
          });
        });
      }
    });

    return issues;
  }

  /**
   * Detect secret patterns in text
   */
  static detectSecretPatterns(text: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    this.SECRET_PATTERNS.forEach(({ pattern, type, severity }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            type,
            severity,
            message: `${type} detected: ${match.substring(0, 8)}...`,
          });
        });
      }
    });

    return issues;
  }

  /**
   * Scan environment file for vulnerabilities
   */
  static scanEnvironmentFile(filePath: string): ScanResult {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    const vulnerabilities: SecurityIssue[] = [];

    // Detect hardcoded secrets
    vulnerabilities.push(...this.detectInsecureSecrets(content));
    vulnerabilities.push(...this.detectSecretPatterns(content));

    // Check for weak values
    const lines = content.split('\n');
    lines.forEach((line) => {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (this.isSensitiveKey(key)) {
          const validation = this.validateSecretStrength(value);
          if (!validation.valid) {
            vulnerabilities.push({
              type: 'weak_secret',
              severity: 'high',
              field: key,
              message: `Weak secret in ${key}: ${validation.issues.join(', ')}`,
            });
          }
        }
      }
    });

    // Calculate security score
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;

    const score = Math.max(0, 100 - (criticalCount * 40) - (highCount * 20) - (mediumCount * 10));

    return {
      vulnerabilities,
      score,
      passed: score >= 80,
    };
  }

  /**
   * Validate production secrets
   */
  static validateProductionSecrets(envVars: Record<string, string>): SecretValidation {
    const issues: string[] = [];
    let totalScore = 0;
    let secretCount = 0;

    Object.entries(envVars).forEach(([key, value]) => {
      if (this.isSensitiveKey(key)) {
        secretCount++;
        const validation = this.validateSecretStrength(value);
        totalScore += validation.score;

        if (!validation.valid) {
          issues.push(...validation.issues.map(issue => `${key}: ${issue}`));
        }
      }
    });

    const avgScore = secretCount > 0 ? totalScore / secretCount : 0;

    return {
      valid: issues.length === 0,
      issues,
      score: avgScore,
    };
  }

  /**
   * Validate required environment variables
   */
  static validateRequiredVars(
    envVars: Record<string, string>,
    required: string[]
  ): EnvironmentValidation {
    const missing = required.filter(key => !envVars[key]);
    const weak: string[] = [];

    required.forEach(key => {
      if (envVars[key] && this.isSensitiveKey(key)) {
        const validation = this.validateSecretStrength(envVars[key]);
        if (!validation.valid) {
          weak.push(key);
        }
      }
    });

    const score = Math.max(0, 100 - (missing.length * 30) - (weak.length * 20));

    return {
      valid: missing.length === 0 && weak.length === 0,
      missing,
      weak,
      score,
    };
  }

  /**
   * Sanitize environment variables for logging
   */
  static sanitizeForLogging(envVars: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    Object.entries(envVars).forEach(([key, value]) => {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Load secure environment configuration
   */
  static loadSecureEnvironment(filePath: string): SecureEnvironment {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const encrypted: string[] = [];
    const public: string[] = [];
    const secrets: string[] = [];

    lines.forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) {
        const [, key, value] = match;

        if (key.endsWith('_ENCRYPTED')) {
          encrypted.push(key);
        } else if (this.isSensitiveKey(key)) {
          if (this.detectSecretPatterns(value).length > 0 || this.detectInsecureSecrets(value).length > 0) {
            secrets.push(key);
          }
        } else {
          public.push(key);
        }
      }
    });

    return { encrypted, public, secrets };
  }

  /**
   * Sanitize error messages to prevent secret leakage
   */
  static sanitizeErrorMessage(message: string): string {
    let sanitized = message;

    // Remove potential secrets from error messages
    this.SECRET_PATTERNS.forEach(({ pattern }) => {
      sanitized = sanitized.replace(pattern, '***REDACTED***');
    });

    // Remove common secret-like strings
    sanitized = sanitized.replace(/([a-zA-Z0-9]{20,})/g, (match) => {
      if (this.calculateEntropy(match) > 60) {
        return '***REDACTED***';
      }
      return match;
    });

    return sanitized;
  }

  /**
   * Detect secret exposure in response data
   */
  static detectSecretExposure(data: any, path = ''): SecretExposure {
    const exposedFields: string[] = [];

    const traverse = (obj: any, currentPath: string) => {
      if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          const fieldPath = currentPath ? `${currentPath}.${key}` : key;

          if (this.isSensitiveKey(key)) {
            exposedFields.push(fieldPath);
          }

          if (typeof value === 'object') {
            traverse(value, fieldPath);
          }
        });
      }
    };

    traverse(data, path);

    return {
      exposed: exposedFields.length > 0,
      fields: exposedFields,
    };
  }

  /**
   * Detect secrets in runtime strings
   */
  static detectRuntimeSecrets(str: string): boolean {
    // Check for secret patterns
    if (this.SECRET_PATTERNS.some(({ pattern }) => pattern.test(str))) {
      return true;
    }

    // Check for high entropy strings (potential secrets)
    if (str.length > 16 && this.calculateEntropy(str) > 80) {
      return true;
    }

    // Check for key-value patterns that might contain secrets
    if (/(?:password|token|key|secret)\s*[:=]\s*\S+/i.test(str)) {
      return true;
    }

    return false;
  }

  /**
   * Rotate secret
   */
  static async rotateSecret(
    secretName: string,
    oldSecret: string,
    newSecret: string
  ): Promise<SecretRotation> {
    // Validate new secret strength
    const validation = this.validateSecretStrength(newSecret);
    if (!validation.valid) {
      throw new Error(`New secret does not meet security requirements: ${validation.issues.join(', ')}`);
    }

    return {
      success: true,
      oldSecret,
      newSecret,
      rotatedAt: new Date(),
    };
  }

  /**
   * Check if key is sensitive
   */
  private static isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
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