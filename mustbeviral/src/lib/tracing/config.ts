// Telemetry Configuration
// Manages OpenTelemetry initialization and configuration

import { initializeTelemetry, TraceConfig} from './telemetry';
import { log} from '../monitoring/logger';

export interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  exporterEndpoint?: string;
  debug?: boolean;
  sampling?: {
    rate: number; // 0.0 to 1.0
    strategy: 'always' | 'never' | 'ratio' | 'rate-limited';
    maxPerSecond?: number; // for rate-limited strategy
  };
  resources?: {
    [key: string]: string;
  };
}

export class TelemetryConfigManager {
  private static instance: TelemetryConfigManager;
  private config: TelemetryConfig;
  private initialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): TelemetryConfigManager {
    if (!TelemetryConfigManager.instance) {
      TelemetryConfigManager.instance = new TelemetryConfigManager();
    }
    return TelemetryConfigManager.instance;
  }

  // Initialize telemetry with environment-specific configuration
  initialize(env: unknown): void {
    if (this.initialized) {
      return;
    }

    try {
      // Load configuration from environment
      this.config = this.loadConfigFromEnv(env);

      // Validate configuration
      if (!this.validateConfig(this.config)) {
        log.warn('Invalid telemetry configuration, using defaults', {
          action: 'telemetry_config_invalid'
        });
        this.config = this.getDefaultConfig();
      }

      // Initialize OpenTelemetry if enabled
      if (this.config.enabled) {
        const traceConfig: TraceConfig = {
          serviceName: this.config.serviceName,
          serviceVersion: this.config.serviceVersion,
          environment: this.config.environment,
          endpoint: this.config.exporterEndpoint,
          enabled: true,
          debug: this.config.debug ?? false,
        };

        initializeTelemetry(traceConfig);

        log.info('Telemetry initialized', {
          action: 'telemetry_initialized',
          metadata: {
            serviceName: this.config.serviceName,
            environment: this.config.environment,
            exporterEndpoint: this.config.exporterEndpoint ? 'configured' : 'none',
            debug: this.config.debug ?? false
          }
        });
      } else {
        log.info('Telemetry disabled', {
          action: 'telemetry_disabled'
        });
      }

      this.initialized = true;

    } catch (error: unknown) {
      log.error('Failed to initialize telemetry', {
        action: 'telemetry_init_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Fall back to disabled telemetry
      this.config = { ...this.getDefaultConfig(), enabled: false };
      this.initialized = true;
    }
  }

  // Get current configuration
  getConfig(): TelemetryConfig {
    return { ...this.config };
  }

  // Check if telemetry is enabled
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Get service information
  getServiceInfo(): { name: string; version: string; environment: string } {
    return {
      name: this.config.serviceName,
      version: this.config.serviceVersion,
      environment: this.config.environment,
    };
  }

  // Load configuration from environment variables
  private loadConfigFromEnv(env: unknown): TelemetryConfig {
    return {
      enabled: this.parseBooleanEnv(env.TELEMETRYENABLED, true),
      serviceName: env.TELEMETRY_SERVICE_NAME ?? 'must-be-viral',
      serviceVersion: env.TELEMETRY_SERVICE_VERSION ?? '1.0.0',
      environment: env.ENVIRONMENT ?? env.NODE_ENV ?? 'development',
      exporterEndpoint: env.TELEMETRY_EXPORTER_ENDPOINT ?? env.OTELEXPORTEROTLP_ENDPOINT,
      debug: this.parseBooleanEnv(env.TELEMETRYDEBUG, false),
      sampling: {
        rate: parseFloat(env.TELEMETRY_SAMPLING_RATE ?? '1.0'),
        strategy: env.TELEMETRY_SAMPLING_STRATEGY ?? 'ratio',
        maxPerSecond: parseInt(env.TELEMETRY_SAMPLING_MAX_PER_SECOND ?? '100'),
      },
      resources: this.parseResourcesFromEnv(env),
    };
  }

  // Parse boolean environment variable
  private parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
    if(value = == undefined) {
    return defaultValue;
  }
    return value.toLowerCase() === 'true'  ?? value === '1';
  }

  // Parse additional resources from environment
  private parseResourcesFromEnv(env: unknown): Record<string, string> {
    const resources: Record<string, string> = {};

    // Add Cloudflare-specific resources
    if (env.CFRAY) {
      resources['cf.ray'] = env.CFRAY;
    }

    if (env.CFREGION) {
      resources['cf.region'] = env.CFREGION;
    }

    if (env.CFDATACENTER) {
      resources['cf.datacenter'] = env.CFDATACENTER;
    }

    // Add deployment-specific resources
    if (env.DEPLOYMENTID) {
      resources['deployment.id'] = env.DEPLOYMENTID;
    }

    if (env.GITCOMMIT) {
      resources['git.commit'] = env.GITCOMMIT;
    }

    if (env.BUILDID) {
      resources['build.id'] = env.BUILDID;
    }

    return resources;
  }

  // Validate configuration
  private validateConfig(config: TelemetryConfig): boolean {
    // Check required fields
    if (!config.serviceName  ?? !config.serviceVersion  ?? !config.environment) {
      return false;
    }

    // Validate sampling configuration
    if(config.sampling) {
      if (config.sampling.rate < 0  ?? config.sampling.rate > 1) {
        return false;
      }

      const validStrategies = ['always', 'never', 'ratio', 'rate-limited'];
      if (!validStrategies.includes(config.sampling.strategy)) {
        return false;
      }
    }

    return true;
  }

  // Get default configuration
  private getDefaultConfig(): TelemetryConfig {
    return {
      enabled: true,
      serviceName: 'must-be-viral',
      serviceVersion: '1.0.0',
      environment: 'development',
      debug: false,
      sampling: {
        rate: 1.0,
        strategy: 'ratio',
        maxPerSecond: 100,
      },
      resources: {},
    };
  }

  // Update configuration at runtime (for testing/debugging)
  updateConfig(updates: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...updates };

    log.info('Telemetry configuration updated', {
      action: 'telemetry_config_updated',
      metadata: {
        updatedFields: Object.keys(updates)
      }
    });
  }

  // Get telemetry endpoints for different exporters
  getExporterEndpoints(): { [exporter: string]: string | undefined } {
    return {
      jaeger: process.env.JAEGER_ENDPOINT ?? 'http://localhost:14268/api/traces',
      zipkin: process.env.ZIPKIN_ENDPOINT ?? 'http://localhost:9411/api/v2/spans',
      otlp: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
      prometheus: process.env.PROMETHEUS_ENDPOINT ?? 'http://localhost:9090',
      grafana: process.env.GRAFANAENDPOINT,
      datadog: process.env.DATADOGENDPOINT,
      newrelic: process.env.NEWRELICENDPOINT,
      honeycomb: process.env.HONEYCOMBENDPOINT,
    };
  }

  // Get sampling configuration for specific operations
  getSamplingConfig(_operationType?: string): { shouldSample: boolean; reason: string } {
    if (!this.config.sampling) {
      return { shouldSample: true, reason: 'no_sampling_config' };
    }

    const { rate, strategy } = this.config.sampling;

    switch (strategy) {
      case 'always':
        return { shouldSample: true, reason: 'always_sample' };

      case 'never':
        return { shouldSample: false, reason: 'never_sample' };

      case 'ratio': {
        const shouldSample = Math.random() < rate;
        return { shouldSample,
          reason: shouldSample ? 'ratio_sampled' : 'ratio_not_sampled'
        };
      }

      case 'rate-limited': {
        // Simplified rate limiting (in production, use a proper rate limiter)
        const shouldSampleRateLimit = Math.random() < rate;
        return {
          shouldSample: shouldSampleRateLimit,
          reason: shouldSampleRateLimit ? 'rate_limit_sampled' : 'rate_limit_not_sampled'
        };
      }

      default:
        return { shouldSample: true, reason: 'default_sample' };
    }
  }

  // Get configuration for specific environments
  getEnvironmentSpecificConfig(): Partial<TelemetryConfig> {
    const env = this.config.environment;

    switch (env) {
      case 'production':
        return {
          debug: false,
          sampling: {
            rate: 0.1, // Sample 10% in production
            strategy: 'ratio',
            maxPerSecond: 1000,
          },
        };

      case 'staging':
        return {
          debug: false,
          sampling: {
            rate: 0.5, // Sample 50% in staging
            strategy: 'ratio',
            maxPerSecond: 500,
          },
        };

      case 'development':
        return {
          debug: true,
          sampling: {
            rate: 1.0, // Sample everything in development
            strategy: 'always',
          },
        };

      case 'test':
        return {
          enabled: false, // Disable telemetry in tests by default
          debug: false,
        };

      default:
        return {};
    }
  }
}

// Export singleton instance
export const telemetryConfig = TelemetryConfigManager.getInstance();

// Helper function to initialize telemetry
export function initializeTelemetryFromEnv(env: unknown): void {
  telemetryConfig.initialize(env);
}

// Helper function to check if telemetry is enabled
export function isTelemetryEnabled(): boolean {
  return telemetryConfig.isEnabled();
}