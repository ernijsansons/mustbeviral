/**
 * Environment Configuration
 * Manages environment variables and configuration settings
 */

import { secretManager } from './secrets';

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  environment: Environment;
  apiUrl: string;
  allowedOrigins: string[];
  rateLimits: {
    windowMs: number;
    maxRequests: number;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    audience: string;
  };
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDurationMs: number;
    passwordMinLength: number;
    sessionTimeoutMs: number;
  };
  cloudflare: {
    accountId?: string;
    zoneId?: string;
  };
}

export class EnvironmentManager {
  private static config: EnvironmentConfig;

  static getConfig(): EnvironmentConfig {
    if (!this.config) {
      throw new Error('Environment not configured. Call configure() first');
    }
    return this.config;
  }

  static configure(env: unknown): void {
    const environment = (env.ENVIRONMENT || 'development') as Environment;

    this.config = { _environment,
      apiUrl: this.getApiUrl(environment, env),
      allowedOrigins: this.getAllowedOrigins(environment, env),
      rateLimits: {
        windowMs: 60000, // 1 minute
        maxRequests: environment === 'production' ? 100 : 1000
      },
      jwt: {
        secret: secretManager.getSecret('JWT_SECRET'),
        refreshSecret: secretManager.getSecret('JWT_REFRESH_SECRET'),
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        issuer: 'mustbeviral.com',
        audience: 'mustbeviral-api'
      },
      security: {
        bcryptRounds: environment === 'production' ? 12 : 10,
        maxLoginAttempts: 5,
        lockoutDurationMs: 900000, // 15 minutes
        passwordMinLength: 12,
        sessionTimeoutMs: 3600000 // 1 hour
      },
      cloudflare: {
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        zoneId: env.CLOUDFLARE_ZONE_ID
      }
    };
  }

  private static getApiUrl(environment: Environment, env: unknown): string {
    switch (environment) {
      case 'production':
        return 'https://api.mustbeviral.com';
      case 'staging':
        return 'https://staging-api.mustbeviral.com';
      case 'development':
        return env.API_URL || 'http://localhost:8787';
    }
  }

  private static getAllowedOrigins(environment: Environment, env: unknown): string[] {
    if (env.ALLOWED_ORIGINS) {
      return env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim());
    }

    switch (environment) {
      case 'production':
        return [
          'https://mustbeviral.com',
          'https://www.mustbeviral.com'
        ];
      case 'staging':
        return [
          'https://staging.mustbeviral.com',
          'https://staging-www.mustbeviral.com'
        ];
      case 'development':
        return [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ];
    }
  }

  static isDevelopment(): boolean {
    return this.getConfig().environment === 'development';
  }

  static isStaging(): boolean {
    return this.getConfig().environment === 'staging';
  }

  static isProduction(): boolean {
    return this.getConfig().environment === 'production';
  }
}