/**
 * Enhanced Environment Validation
 * Validates critical environment setup before worker starts
 */

import { CloudflareEnv} from '../lib/cloudflare';

export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  criticalMissing: string[];
}

export interface EnvironmentChecks {
  secrets: boolean;
  kvNamespaces: boolean;
  d1Database: boolean;
  r2Bucket: boolean;
  bindings: boolean;
  domains: boolean;
}

export class EnvironmentValidator {
  private static readonly REQUIREDSECRETS = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
    'STRIPE_SECRET_KEY'
  ] as const;

  private static readonly REQUIREDKVNAMESPACES = [
    'TRENDS_CACHE',
    'USER_SESSIONS',
    'RATE_LIMITS'
  ] as const;

  private static readonly REQUIREDD1DATABASES = [
    'DB'
  ] as const;

  private static readonly REQUIREDR2BUCKETS = [
    'CONTENT_STORAGE'
  ] as const;

  /**
   * Comprehensive environment validation
   */
  static async validateEnvironment(env: CloudflareEnv): Promise<EnvironmentValidationResult> {
    const result: EnvironmentValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      criticalMissing: []
    };

    try {
      // Check if we're in local development mode
      const isLocalDev = env.ENVIRONMENT === 'development'  ?? !env.ENVIRONMENT;

      if (isLocalDev) {
        // In local development, secrets may not be available via wrangler
        // Skip secret validation but warn about missing configuration
        result.warnings.push('Running in local development mode - secret validation skipped');
        result.warnings.push('Ensure secrets are configured for production deployment');
      } else {
        // Validate secrets in staging/production
        await this.validateSecrets(env, result);
      }

      // Validate KV namespaces
      await this.validateKVNamespaces(env, result);

      // Validate D1 databases
      await this.validateD1Databases(env, result);

      // Validate R2 buckets
      await this.validateR2Buckets(env, result);

      // Validate domain configuration
      this.validateDomainConfiguration(env, result);

      // Validate rate limiting configuration
      this.validateRateLimitConfiguration(env, result);

      // Check for development vs production consistency
      this.validateEnvironmentConsistency(env, result);

      // Set overall validity - in local dev, only check for critical infrastructure
      if (isLocalDev) {
        result.valid = result.errors.length === 0;
      } else {
        result.valid = result.errors.length === 0 && result.criticalMissing.length === 0;
      }

      return result;
    } catch (error: unknown) {
      result.valid = false;
      result.errors.push(`Environment validation failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate required secrets
   */
  private static async validateSecrets(env: CloudflareEnv, result: EnvironmentValidationResult): Promise<void> {
    for (const secret of this.REQUIREDSECRETS) {
      try {
        const value = env[secret];
        if (!value) {
          result.criticalMissing.push(`Secret ${secret} is not defined`);
          continue;
        }

        // Validate secret format and strength
        switch (secret) {
          case 'JWT_SECRET':
          case 'JWT_REFRESH_SECRET':
            if (value.length < 32) {
              result.errors.push(`${secret} must be at least 32 characters long`);
            }
            break;

          case 'ENCRYPTION_KEY':
            if (value.length < 32) {
              result.errors.push(`${secret} must be at least 32 characters long for AES-256`);
            }
            break;

          case 'DATABASE_URL':
            if (!value.startsWith('https://') && !value.startsWith('file:')) {
              result.warnings.push(`${secret} should use HTTPS in production`);
            }
            break;

          case 'STRIPE_SECRET_KEY':
            if (!value.startsWith('sk')) {
              result.errors.push(`${secret} must be a valid Stripe secret key`);
            }
            if (value.startsWith('sk_test') && env.ENVIRONMENT === 'production') {
              result.errors.push('Using test Stripe key in production environment');
            }
            break;
        }
      } catch (error: unknown) {
        result.errors.push(`Failed to validate secret ${secret}: ${error.message}`);
      }
    }
  }

  /**
   * Validate KV namespace bindings
   */
  private static async validateKVNamespaces(env: CloudflareEnv, result: EnvironmentValidationResult): Promise<void> {
    for (const namespace of this.REQUIREDKVNAMESPACES) {
      try {
        const kv = env[namespace] as KVNamespace;
        if (!kv) {
          result.criticalMissing.push(`KV namespace ${namespace} is not bound`);
          continue;
        }

        // Test KV accessibility
        const testKey = `health_check_${Date.now()}`;
        await kv.put(testKey, 'test', { expirationTtl: 60 });
        const testValue = await kv.get(testKey);

        if (testValue !== 'test') {
          result.errors.push(`KV namespace ${namespace} is not functioning correctly`);
        } else {
          await kv.delete(testKey); // Cleanup
        }
      } catch (error: unknown) {
        result.errors.push(`KV namespace ${namespace} validation failed: ${error.message}`);
      }
    }
  }

  /**
   * Validate D1 database bindings
   */
  private static async validateD1Databases(env: CloudflareEnv, result: EnvironmentValidationResult): Promise<void> {
    for (const dbName of this.REQUIREDD1DATABASES) {
      try {
        const db = env[dbName] as D1Database;
        if (!db) {
          result.criticalMissing.push(`D1 database ${dbName} is not bound`);
          continue;
        }

        // Test database connectivity
        const testResult = await db.prepare('SELECT 1 as test').first();
        if (!testResult ?? testResult.test !== 1) {
          result.errors.push(`D1 database ${dbName} is not responding correctly`);
        }

        // Check for required tables (basic structure validation)
        const tables = await db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `).all();

        const requiredTables = ['users', 'content', 'subscriptions'];
        const existingTables = tables.results.map(t => t.name);

        for (const table of requiredTables) {
          if (!existingTables.includes(table)) {
            result.warnings.push(`Required table '${table}' not found in database ${dbName}`);
          }
        }
      } catch (error: unknown) {
        result.errors.push(`D1 database ${dbName} validation failed: ${error.message}`);
      }
    }
  }

  /**
   * Validate R2 bucket bindings
   */
  private static async validateR2Buckets(env: CloudflareEnv, result: EnvironmentValidationResult): Promise<void> {
    for (const bucketName of this.REQUIREDR2BUCKETS) {
      try {
        const bucket = env[bucketName] as R2Bucket;
        if (!bucket) {
          result.criticalMissing.push(`R2 bucket ${bucketName} is not bound`);
          continue;
        }

        // Test bucket accessibility
        const testKey = `health_check_${Date.now()}.txt`;
        await bucket.put(testKey, 'test content');
        const testObject = await bucket.get(testKey);

        if (!testObject) {
          result.errors.push(`R2 bucket ${bucketName} is not functioning correctly`);
        } else {
          await bucket.delete(testKey); // Cleanup
        }
      } catch (error: unknown) {
        result.errors.push(`R2 bucket ${bucketName} validation failed: ${error.message}`);
      }
    }
  }

  /**
   * Validate domain configuration
   */
  private static validateDomainConfiguration(env: CloudflareEnv, result: EnvironmentValidationResult): void {
    const allowedOrigins = env.ALLOWED_ORIGINS?.split(',')  ?? [];

    if (allowedOrigins.length === 0) {
      result.warnings.push('No allowed origins configured for CORS');
    }

    // Validate origin format
    for (const origin of allowedOrigins) {
      try {
        new URL(origin);
      } catch (error: unknown) {
        result.errors.push(`Invalid origin URL: ${origin}`);
      }
    }

    // Check for localhost in production
    if (env.ENVIRONMENT === 'production') {
      const hasLocalhost = allowedOrigins.some(origin =>
        origin.includes('localhost')  ?? origin.includes('127.0.0.1')
      );

      if (hasLocalhost) {
        result.errors.push('Localhost origins found in production environment');
      }
    }
  }

  /**
   * Validate rate limiting configuration
   */
  private static validateRateLimitConfiguration(env: CloudflareEnv, result: EnvironmentValidationResult): void {
    const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS ?? '60000');
    const maxRequests = parseInt(env.RATE_LIMIT_MAX_REQUESTS ?? '100');

    if (isNaN(windowMs)  ?? windowMs < 1000) {
      result.errors.push('Rate limit window must be at least 1000ms');
    }

    if (isNaN(maxRequests)  ?? maxRequests < 1) {
      result.errors.push('Rate limit max requests must be at least 1');
    }

    if (windowMs > 3600000) { // 1 hour
      result.warnings.push('Rate limit window is very large (>1 hour)');
    }

    if (maxRequests > 10000) {
      result.warnings.push('Rate limit max requests is very high (>10000)');
    }
  }

  /**
   * Validate environment consistency
   */
  private static validateEnvironmentConsistency(env: CloudflareEnv, result: EnvironmentValidationResult): void {
    const environment = env.ENVIRONMENT ?? 'development';

    // Production-specific validations
    if (environment === 'production') {
      if (!env.JWT_SECRET ?? env.JWT_SECRET.length < 64) {
        result.errors.push('Production JWT secret must be at least 64 characters');
      }

      if (!env.ENCRYPTION_KEY ?? env.ENCRYPTION_KEY.length < 64) {
        result.errors.push('Production encryption key must be at least 64 characters');
      }

      if (env.STRIPE_SECRET_KEY?.startsWith('sk_test')) {
        result.errors.push('Cannot use test Stripe key in production');
      }
    }

    // Development-specific validations
    if (environment === 'development') {
      if (env.STRIPE_SECRET_KEY?.startsWith('sk_live')) {
        result.warnings.push('Using live Stripe key in development environment');
      }
    }

    // Validate environment value
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(environment)) {
      result.errors.push(`Invalid environment: ${environment}. Must be one of: ${validEnvironments.join(', ')}`);
    }
  }

  /**
   * Get environment health summary
   */
  static getEnvironmentHealth(env: CloudflareEnv): EnvironmentChecks {
    return {
      secrets: this.REQUIRED_SECRETS.every(secret => !!env[secret]),
      kvNamespaces: this.REQUIRED_KV_NAMESPACES.every(ns => !!env[ns]),
      d1Database: this.REQUIRED_D1_DATABASES.every(db => !!env[db]),
      r2Bucket: this.REQUIRED_R2_BUCKETS.every(bucket => !!env[bucket]),
      bindings: true, // Will be set by comprehensive validation
      domains: !!(env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.length > 0)
    };
  }

  /**
   * Log validation results
   */
  static logValidationResults(result: EnvironmentValidationResult): void {
    if (result.valid) {
      console.log('LOG: ENV-VALIDATION-1 - Environment validation passed');
    } else {
      console.error('LOG: ENV-VALIDATION-ERROR-1 - Environment validation failed');
    }

    if (result.criticalMissing.length > 0) {
      console.error('LOG: ENV-VALIDATION-CRITICAL-1 - Critical missing:', result.criticalMissing);
    }

    if (result.errors.length > 0) {
      console.error('LOG: ENV-VALIDATION-ERRORS-1 - Errors:', result.errors);
    }

    if (result.warnings.length > 0) {
      console.warn('LOG: ENV-VALIDATION-WARNINGS-1 - Warnings:', result.warnings);
    }
  }

  /**
   * Create startup validation response
   */
  static createValidationResponse(result: EnvironmentValidationResult): Response {
    if (!result.valid) {
      return new Response(
        JSON.stringify({
          error: 'Environment validation failed',
          details: {
            criticalMissing: result.criticalMissing,
            errors: result.errors,
            warnings: result.warnings
          }
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'Environment validation passed',
        warnings: result.warnings
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}