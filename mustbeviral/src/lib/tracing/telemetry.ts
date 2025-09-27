// OpenTelemetry Tracing Configuration
// Provides distributed tracing across microservices and API calls

import { trace, context, SpanStatusCode, SpanKind} from '@opentelemetry/api';
import { NodeTracerProvider} from '@opentelemetry/sdk-node';
import { Resource} from '@opentelemetry/resources';
import { SemanticResourceAttributes} from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter} from '@opentelemetry/exporter-otlp-http';
import { getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node';
import { registerInstrumentations} from '@opentelemetry/instrumentation';

export interface TraceConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  endpoint?: string;
  enabled: boolean;
  debug?: boolean;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface CustomSpan {
  name: string;
  kind?: SpanKind;
  attributes?: SpanAttributes;
  parentSpan?: unknown;
}

class TelemetryService {
  private tracer: unknown;
  private provider: NodeTracerProvider | null = null;
  private config: TraceConfig;
  private initialized = false;

  constructor(config: TraceConfig) {
    this.config = config;
    if (config.enabled) {
      this.initialize();
    }
  }

  private initialize(): void {
    try {
      // Create resource with service information
      const resource = Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICENAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICEVERSION]: this.config.serviceVersion,
          [SemanticResourceAttributes.DEPLOYMENTENVIRONMENT]: this.config.environment,
        })
      );

      // Create tracer provider
      this.provider = new NodeTracerProvider({ resource,
      });

      // Configure exporter
      if (this.config.endpoint) {
        const exporter = new OTLPTraceExporter({
          url: this.config.endpoint,
        });

        this.provider.addSpanProcessor(
          new BatchSpanProcessor(exporter, {
            maxQueueSize: 100,
            scheduledDelayMillis: 500,
            exportTimeoutMillis: 30000,
            maxExportBatchSize: 10,
          })
        );
      }

      // Register the provider
      this.provider.register();

      // Auto-instrument common libraries
      registerInstrumentations({
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {
              enabled: true, requestHook: (span, request) => {
                span.setAttribute('http.request.size', request.headers['content-length']  ?? 0);
              },
            },
            '@opentelemetry/instrumentation-fetch': {
              enabled: true,
            },
            '@opentelemetry/instrumentation-express': {
              enabled: true,
            },
          }),
        ],
      });

      // Get tracer instance
      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
      this.initialized = true;

      if (this.config.debug) {
        console.log('OpenTelemetry initialized for service:', this.config.serviceName);
      }

    } catch (error: unknown) {
      console.error('Failed to initialize OpenTelemetry:', error);
    }
  }

  // Create a new span
  createSpan(spanConfig: CustomSpan): unknown {
    if (!this.initialized || !this.tracer) {
      return this.createNoOpSpan();
    }

    try {
      const span = this.tracer.startSpan(spanConfig.name, {
        kind: spanConfig.kind ?? SpanKind.INTERNAL,
        attributes: spanConfig.attributes ?? {},
      }, spanConfig.parentSpan ? trace.setSpan(context.active(), spanConfig.parentSpan) : undefined);

      return span;
    } catch (error: unknown) {
      console.error('Failed to create span:', error);
      return this.createNoOpSpan();
    }
  }

  // Create a span for HTTP requests
  createHttpSpan(method: string, url: string, attributes: SpanAttributes = {}): unknown {
    return this.createSpan({
      name: `HTTP ${method.toUpperCase()} ${url}`,
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.scheme': new URL(url).protocol.slice(0, -1),
        'http.host': new URL(url).host,
        'http.target': new URL(url).pathname + new URL(url).search,
        ...attributes,
      },
    });
  }

  // Create a span for database operations
  createDatabaseSpan(operation: string, table: string, attributes: SpanAttributes = {}): unknown {
    return this.createSpan({
      name: `db.${operation} ${table}`,
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'sqlite',
        'db.operation': operation,
        'db.sql.table': table,
        ...attributes,
      },
    });
  }

  // Create a span for AI/ML operations
  createAISpan(operation: string, model: string, attributes: SpanAttributes = {}): unknown {
    return this.createSpan({
      name: `ai.${operation}`,
      kind: SpanKind.CLIENT,
      attributes: {
        'ai.operation': operation,
        'ai.model.name': model,
        'ai.system': 'openai',
        ...attributes,
      },
    });
  }

  // Create a span for cache operations
  createCacheSpan(operation: string, key: string, attributes: SpanAttributes = {}): unknown {
    return this.createSpan({
      name: `cache.${operation}`,
      kind: SpanKind.CLIENT,
      attributes: {
        'cache.operation': operation,
        'cache.key': key,
        'cache.system': 'cloudflare-kv',
        ...attributes,
      },
    });
  }

  // Create a span for authentication operations
  createAuthSpan(operation: string, attributes: SpanAttributes = {}): unknown {
    return this.createSpan({
      name: `auth.${operation}`,
      kind: SpanKind.INTERNAL,
      attributes: {
        'auth.operation': operation,
        ...attributes,
      },
    });
  }

  // Create a span for RBAC operations
  createRBACSpan(operation: string, resource: string, attributes: SpanAttributes = {}): unknown {
    return this.createSpan({
      name: `rbac.${operation}`,
      kind: SpanKind.INTERNAL,
      attributes: {
        'rbac.operation': operation,
        'rbac.resource': resource,
        ...attributes,
      },
    });
  }

  // Create a span for organization operations
  createOrganizationSpan(operation: string, organizationId: string, attributes: SpanAttributes = {}): unknown {
    return this.createSpan({
      name: `organization.${operation}`,
      kind: SpanKind.INTERNAL,
      attributes: {
        'organization.operation': operation,
        'organization.id': organizationId,
        ...attributes,
      },
    });
  }

  // Wrap a function with tracing
  traceFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    spanName: string,
    attributes: SpanAttributes = {}
  ): T {
    return ((...args: unknown[]) => {
      if (!this.initialized || !this.tracer) {
        return fn(...args);
      }

      const span = this.createSpan({
        name: spanName,
        attributes,
      });

      try {
        const result = fn(...args);

        // Handle promises
        if (result && typeof result.then === 'function') {
          return result
            .then((value: unknown) => {
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return value;
            })
            .catch((error: unknown) => {
              span.recordException(error);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });
              span.end();
              throw error;
            });
        }

        // Handle synchronous functions
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;

      } catch (error: unknown) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.end();
        throw error;
      }
    }) as T;
  }

  // Wrap an async function with tracing
  traceAsyncFunction<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    spanName: string,
    attributes: SpanAttributes = {}
  ): T {
    return (async (...args: unknown[]) => {
      if (!this.initialized || !this.tracer) {
        return fn(...args);
      }

      const span = this.createSpan({
        name: spanName,
        attributes,
      });

      try {
        const result = await fn(...args);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error: unknown) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.end();
        throw error;
      }
    }) as T;
  }

  // Add attributes to the current span
  addSpanAttributes(attributes: SpanAttributes): void {
    if (!this.initialized) {return;}

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined) {
          currentSpan.setAttribute(key, value);
        }
      });
    }
  }

  // Add an event to the current span
  addSpanEvent(name: string, attributes: SpanAttributes = {}): void {
    if (!this.initialized) {return;}

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  // Record an exception in the current span
  recordException(error: Error): void {
    if (!this.initialized) {return;}

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.recordException(error);
      currentSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  // Get current trace ID
  getCurrentTraceId(): string | undefined {
    if (!this.initialized) {
    return undefined;
  }

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      return currentSpan.spanContext().traceId;
    }
    return undefined;
  }

  // Get current span ID
  getCurrentSpanId(): string | undefined {
    if (!this.initialized) {
    return undefined;
  }

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      return currentSpan.spanContext().spanId;
    }
    return undefined;
  }

  // Create a no-op span for when tracing is disabled
  private createNoOpSpan(): unknown {
    return {
      setAttribute: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      recordException: () => {},
      setStatus: () => {},
      end: () => {},
      spanContext: () => ({ traceId: '', spanId: '' }),
    };
  }

  // Shutdown tracing
  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      this.initialized = false;
    }
  }
}

// Global telemetry instance
let globalTelemetry: TelemetryService | null = null;

// Initialize telemetry
export function initializeTelemetry(config: TraceConfig): TelemetryService {
  globalTelemetry = new TelemetryService(config);
  return globalTelemetry;
}

// Get global telemetry instance
export function getTelemetry(): TelemetryService {
  if (!globalTelemetry) {
    // Create a disabled instance if not initialized
    globalTelemetry = new TelemetryService({
      serviceName: 'unknown',
      serviceVersion: '1.0.0',
      environment: 'development',
      enabled: false,
    });
  }
  return globalTelemetry;
}

// Decorator for tracing class methods
export function Trace(spanName?: string, attributes: SpanAttributes = {}) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = spanName ?? `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: unknown[]) {
      const telemetry = getTelemetry();
      return telemetry.traceFunction(originalMethod.bind(this), name, attributes)(...args);
    };

    return descriptor;
  };
}

// Decorator for tracing async class methods
export function TraceAsync(spanName?: string, attributes: SpanAttributes = {}) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = spanName ?? `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: unknown[]) {
      const telemetry = getTelemetry();
      return telemetry.traceAsyncFunction(originalMethod.bind(this), name, attributes)(...args);
    };

    return descriptor;
  };
}

// Utility functions for common tracing patterns

// Trace HTTP requests
export function traceHttpRequest(
  method: string,
  url: string,
  fn: () => Promise<Response>
): Promise<Response> {
  const telemetry = getTelemetry();
  const span = telemetry.createHttpSpan(method, url);

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const response = await fn();

      span.setAttributes({
        'http.status_code': response.status,
        'http.response.size': response.headers.get('content-length')  ?? 0,
      });

      if (response.status >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${response.status}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
      return response;
    } catch (error: unknown) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.end();
      throw error;
    }
  });
}

// Trace database operations
export async function traceDatabase<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
  attributes: SpanAttributes = {}
): Promise<T> {
  const telemetry = getTelemetry();
  const span = telemetry.createDatabaseSpan(operation, table, attributes);

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (error: unknown) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.end();
      throw error;
    }
  });
}

// Trace AI operations
export async function traceAI<T>(
  operation: string,
  model: string,
  fn: () => Promise<T>,
  attributes: SpanAttributes = {}
): Promise<T> {
  const telemetry = getTelemetry();
  const span = telemetry.createAISpan(operation, model, attributes);

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (error: unknown) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.end();
      throw error;
    }
  });
}