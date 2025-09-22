/// <reference types="vite/client" />

// Universe-Bending Environment Variables
interface ImportMetaEnv {
  // App Configuration
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  readonly VITE_APP_BASE_URL: string;
  readonly VITE_WORKERS_URL: string;

  // Feature Flags
  readonly VITE_ENABLE_3D_EFFECTS: string;
  readonly VITE_ENABLE_AI_PERSONALIZATION: string;
  readonly VITE_ENABLE_VOICE_INTERFACE: string;
  readonly VITE_ENABLE_ANALYTICS_DASHBOARD: string;
  readonly VITE_ENABLE_REAL_TIME_FEATURES: string;

  // Monitoring & Performance
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string;
  readonly VITE_ANALYTICS_ID: string;
  readonly VITE_ERROR_TRACKING_DSN: string;

  // Client-side API Keys
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global compile-time feature flags
declare const __DEV__: boolean;
declare const __PROD__: boolean;