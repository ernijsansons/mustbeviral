/**
 * Secret Management Configuration
 * Centralizes all secret access through Cloudflare Secrets Manager
 */

export interface Secrets {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ENCRYPTION_KEY: string;
  DATABASE_URL?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export class SecretManager {
  private static instance: SecretManager;
  private secrets: Map<string, string> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  /**
   * Initialize secrets from Cloudflare environment
   */
  async initialize(env: unknown): Promise<void> {
    if (this.initialized) return;

    // Check if we're in local development mode
    const isLocalDev = env.ENVIRONMENT === 'development' || !env.ENVIRONMENT;

    // Required secrets - fail fast if missing in production
    const requiredSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'ENCRYPTION_KEY'
    ];

    for (const key of requiredSecrets) {
      const value = env[key];
      if (!value) {
        if (isLocalDev) {
          // In local development, use placeholder values for development
          console.warn(`LOG: SECRETS-DEV-WARNING - Using placeholder for ${key} in local development`);
          this.secrets.set(key, `dev_placeholder_${key.toLowerCase()}_${Date.now()}`);
        } else {
          throw new Error(`Required secret ${key} is not configured in environment`);
        }
      } else {
        this.secrets.set(key, value);
      }
    }

    // Optional secrets
    const optionalSecrets = [
      'DATABASE_URL',
      'GOOGLE_CLIENT_SECRET',
      'GITHUB_CLIENT_SECRET'
    ];

    for (const key of optionalSecrets) {
      if (env[key]) {
        this.secrets.set(key, env[key]);
      }
    }

    this.initialized = true;
    console.log(`LOG: SECRETS-INIT - Secrets initialized for ${isLocalDev ? 'development' : 'production'} mode`);
  }

  /**
   * Get a secret value
   */
  getSecret(key: keyof Secrets): string {
    if (!this.initialized) {
      throw new Error('SecretManager not initialized. Call initialize() first');
    }

    const secret = this.secrets.get(key);
    if (!secret) {
      throw new Error(`Secret ${key} not found`);
    }

    return secret;
  }

  /**
   * Check if a secret exists
   */
  hasSecret(key: keyof Secrets): boolean {
    return this.secrets.has(key);
  }

  /**
   * Get all configured secret keys (for debugging - never log values!)
   */
  getConfiguredKeys(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Validate all required secrets are present
   */
  validateSecrets(): { valid: boolean; missing: string[] } {
    const required = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'ENCRYPTION_KEY'
    ];

    const missing = required.filter(key => !this.secrets.has(key));

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

export const secretManager = SecretManager.getInstance();