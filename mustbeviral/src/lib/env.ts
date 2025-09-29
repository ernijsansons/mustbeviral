// Environment configuration and validation
// This module provides type-safe access to environment variables

export interface EnvironmentConfig {
  // App Configuration
  APP_NAME: string;
  APP_VERSION: string;
  APP_ENV: 'development' | 'staging' | 'production';
  BASE_URL: string;
  WORKERS_URL: string;

  // Feature Flags - Universe-Bending Features
  ENABLE_3D_EFFECTS: boolean;
  ENABLE_AI_PERSONALIZATION: boolean;
  ENABLE_VOICE_INTERFACE: boolean;
  ENABLE_ANALYTICS_DASHBOARD: boolean;
  ENABLE_REAL_TIME_FEATURES: boolean;

  // Monitoring & Performance
  ENABLE_PERFORMANCE_MONITORING: boolean;
  ANALYTICS_ID?: string;
  ERROR_TRACKING_DSN?: string;

  // Stripe (Client-side only)
  STRIPE_PUBLISHABLE_KEY?: string;
}

// Type-safe environment variable access
export function getEnvVar(key: string, defaultValue?: string): string {
  // Jest/Node environment compatibility
  const viteKey = `VITE_${key}`;
  let value: string | undefined;

  if (import.meta?.env) {
    // Vite environment (development/production)
    value = import.meta.env[viteKey];
  } else if (typeof process !== 'undefined' && process.env) {
    // Node.js/Jest environment
    value = process.env[viteKey];
  }

  value = value ?? defaultValue;
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${viteKey} is not set`);
    return '';
  }
  return value;
}

export function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true';
}

// Centralized environment configuration
export const env: EnvironmentConfig = {
  // App Configuration
  APP_NAME: getEnvVar('APP_NAME', 'Must Be Viral'),
  APP_VERSION: getEnvVar('APP_VERSION', '1.0.0'),
  APP_ENV: (getEnvVar('APP_ENV', 'development') as EnvironmentConfig['APP_ENV']),
  BASE_URL: getEnvVar('APP_BASE_URL', 'http://localhost:5173'),
  WORKERS_URL: getEnvVar('WORKERS_URL', 'http://localhost:8787'),

  // Feature Flags
  ENABLE_3D_EFFECTS: getEnvBoolean('ENABLE_3D_EFFECTS', true),
  ENABLE_AI_PERSONALIZATION: getEnvBoolean('ENABLE_AI_PERSONALIZATION', true),
  ENABLE_VOICE_INTERFACE: getEnvBoolean('ENABLE_VOICE_INTERFACE', false),
  ENABLE_ANALYTICS_DASHBOARD: getEnvBoolean('ENABLE_ANALYTICS_DASHBOARD', true),
  ENABLE_REAL_TIME_FEATURES: getEnvBoolean('ENABLE_REAL_TIME_FEATURES', true),

  // Monitoring
  ENABLE_PERFORMANCE_MONITORING: getEnvBoolean('ENABLE_PERFORMANCE_MONITORING', true),
  ANALYTICS_ID: getEnvVar('ANALYTICS_ID', ''),
  ERROR_TRACKING_DSN: getEnvVar('ERROR_TRACKING_DSN', ''),

  // Stripe
  STRIPE_PUBLISHABLE_KEY: getEnvVar('STRIPE_PUBLISHABLE_KEY', ''),
};

// Environment validation (non-blocking)
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Required environment variables for different environments
    if (env.APP_ENV === 'production') {
      if (!env.STRIPE_PUBLISHABLE_KEY) {
        errors.push('VITE_STRIPE_PUBLISHABLE_KEY is required in production');
      }

      if (!env.ANALYTICS_ID && env.ENABLE_PERFORMANCE_MONITORING) {
        errors.push('VITE_ANALYTICS_ID is recommended when performance monitoring is enabled');
      }
    }

    // Validate URLs (safely)
    try {
      new URL(env.BASE_URL);
    } catch (error: unknown) {
      errors.push(`Invalid BASE_URL format: ${env.BASE_URL}`);
    }

    try {
      new URL(env.WORKERS_URL);
    } catch (error: unknown) {
      errors.push(`Invalid WORKERS_URL format: ${env.WORKERS_URL}`);
    }

  } catch (error: unknown) {
    console.warn('Environment validation encountered an error:', error);
    errors.push('Environment validation partially failed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Feature flag checker utility
export function isFeatureEnabled(feature: keyof Pick<EnvironmentConfig, 'ENABLE_3D_EFFECTS' |
  'ENABLE_AI_PERSONALIZATION' |
  'ENABLE_VOICE_INTERFACE' |
  'ENABLE_ANALYTICS_DASHBOARD' |
  'ENABLE_REAL_TIME_FEATURES'
>): boolean {
  return env[feature];
}

// Development utilities
export const isDevelopment = env.APP_ENV === 'development';
export const isProduction = env.APP_ENV === 'production';
export const isStaging = env.APP_ENV === 'staging';

// API endpoint builders
export function buildApiUrl(endpoint: string): string {
  const baseUrl = env.WORKERS_URL.endsWith('/') ? env.WORKERS_URL.slice(0, -1) : env.WORKERS_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

// Log environment configuration (development only)
if (isDevelopment) {
  console.log('🌌 Universe-Bending Environment Configuration:', {
    environment: env.APP_ENV,
    features: {
      '3D Effects': env.ENABLE_3D_EFFECTS,
      'AI Personalization': env.ENABLE_AI_PERSONALIZATION,
      'Voice Interface': env.ENABLE_VOICE_INTERFACE,
      'Analytics Dashboard': env.ENABLE_ANALYTICS_DASHBOARD,
      'Real-time Features': env.ENABLE_REAL_TIME_FEATURES,
    },
    monitoring: env.ENABLE_PERFORMANCE_MONITORING,
  });
}