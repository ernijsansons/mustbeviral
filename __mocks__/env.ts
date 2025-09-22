// Mock for environment variables
export const env = {
  APP_NAME: 'Must Be Viral Test',
  APP_VERSION: '1.0.0',
  APP_ENV: 'test' as 'development' | 'staging' | 'production',
  BASE_URL: 'http://localhost:5173',
  WORKERS_URL: 'http://localhost:8787',

  // Feature flags
  ENABLE_3D_EFFECTS: false,
  ENABLE_AI_PERSONALIZATION: true,
  ENABLE_VOICE_INTERFACE: false,
  ENABLE_ANALYTICS_DASHBOARD: true,
  ENABLE_REAL_TIME_FEATURES: true,
  ENABLE_PERFORMANCE_MONITORING: false,

  // API Keys (test values)
  STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
  ANALYTICS_ID: 'test-analytics-id',
  ERROR_TRACKING_DSN: ''
};

// Mock process.env for Jest compatibility
if (typeof process !== 'undefined' && process.env) {
  process.env.VITE_APP_NAME = env.APP_NAME;
  process.env.VITE_APP_VERSION = env.APP_VERSION;
  process.env.VITE_APP_ENV = env.APP_ENV;
  process.env.VITE_APP_BASE_URL = env.BASE_URL;
  process.env.VITE_WORKERS_URL = env.WORKERS_URL;
  process.env.VITE_ENABLE_3D_EFFECTS = env.ENABLE_3D_EFFECTS.toString();
  process.env.VITE_ENABLE_AI_PERSONALIZATION = env.ENABLE_AI_PERSONALIZATION.toString();
  process.env.VITE_ENABLE_VOICE_INTERFACE = env.ENABLE_VOICE_INTERFACE.toString();
  process.env.VITE_ENABLE_ANALYTICS_DASHBOARD = env.ENABLE_ANALYTICS_DASHBOARD.toString();
  process.env.VITE_ENABLE_REAL_TIME_FEATURES = env.ENABLE_REAL_TIME_FEATURES.toString();
  process.env.VITE_ENABLE_PERFORMANCE_MONITORING = env.ENABLE_PERFORMANCE_MONITORING.toString();
  process.env.VITE_STRIPE_PUBLISHABLE_KEY = env.STRIPE_PUBLISHABLE_KEY;
  process.env.VITE_ANALYTICS_ID = env.ANALYTICS_ID;
  process.env.VITE_ERROR_TRACKING_DSN = env.ERROR_TRACKING_DSN;
}

export function getEnvVar(key: string, defaultValue = ''): string {
  return (env as unknown)[key] || defaultValue;
}

export function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true';
}

export function isProduction(): boolean {
  return false;
}

export function isDevelopment(): boolean {
  return false;
}

export function isStaging(): boolean {
  return false;
}

export function isFeatureEnabled(feature: string): boolean {
  return (env as unknown)[feature] === true;
}

export function buildApiUrl(path: string): string {
  const baseUrl = env.WORKERS_URL.endsWith('/') ? env.WORKERS_URL.slice(0, -1) : env.WORKERS_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export function validateEnvironment() {
  return {
    isValid: true,
    errors: []
  };
}