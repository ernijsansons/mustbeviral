// Tracing Middleware
// Adds distributed tracing to all API requests and operations

import { _context, trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { _getTelemetry, SpanAttributes } from '../lib/tracing/telemetry';
import { IsolatedRequest } from './dataIsolation';
import { log } from '../lib/monitoring/logger';

export interface TracedRequest extends IsolatedRequest {
  traceId?: string;
  spanId?: string;
  span?: unknown;
}

export interface RequestTraceInfo {
  traceId: string;
  spanId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  organizationId?: string;
  userId?: string;
}

export class TracingMiddleware {
  private telemetry = getTelemetry();

  // Main middleware function that adds tracing to requests
  async traceRequest(request: IsolatedRequest): Promise<TracedRequest> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Create span for the HTTP request
    const span = this.telemetry.createSpan({
      name: `${method} ${path}`,
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.url': request.url,
        'http.scheme': url.protocol.slice(0, -1),
        'http.host': url.host,
        'http.target': url.pathname + url.search,
        'http.route': this.extractRoute(path),
        'http.user_agent': request.headers.get('user-agent') || '',
      },
    });

    // Add tenant context if available
    if (request.tenantContext) {
      span.setAttributes({
        'user.id': request.tenantContext.userId,
        'organization.id': request.tenantContext.organizationId,
        'user.role': request.tenantContext.userRole,
      });
    }

    // Add request headers as attributes (filtered for security)
    this.addSafeHeaders(span, request);

    // Create traced request
    const tracedRequest: TracedRequest = request as TracedRequest;
    tracedRequest.traceId = this.telemetry.getCurrentTraceId();
    tracedRequest.spanId = this.telemetry.getCurrentSpanId();
    tracedRequest.span = span;

    log.debug('Request traced', {
      action: 'request_traced',
      metadata: {
        traceId: tracedRequest.traceId,
        spanId: tracedRequest.spanId,
        method,
        path,
        organizationId: request.tenantContext?.organizationId,
        userId: request.tenantContext?.userId,
      }
    });

    return tracedRequest;
  }

  // Finish the request span with response information
  finishRequestSpan(
    request: TracedRequest,
    response: Response,
    error?: Error
  ): void {
    if (!request.span) return;

    try {
      // Add response attributes
      request.span.setAttributes({
        'http.status_code': response.status,
        'http.response.size': response.headers.get('content-length') || 0,
      });

      // Set span status based on response
      if (error) {
        request.span.recordException(error);
        request.span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
      } else if (response.status >= 400) {
        request.span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${response.status}`,
        });
      } else {
        request.span.setStatus({ code: SpanStatusCode.OK });
      }

      // Add timing information
      request.span.addEvent('request.completed', {
        'http.status_code': response.status,
      });

      // End the span
      request.span.end();

      log.debug('Request span finished', {
        action: 'request_span_finished',
        metadata: {
          traceId: request.traceId,
          spanId: request.spanId,
          statusCode: response.status,
          hasError: !!error,
        }
      });

    } catch (spanError: unknown) {
      log.error('Failed to finish request span', {
        action: 'finish_span_error',
        metadata: {
          error: spanError instanceof Error ? spanError.message : 'Unknown error',
          traceId: request.traceId,
        }
      });
    }
  }

  // Create a child span for operations within a request
  createChildSpan(
    request: TracedRequest,
    name: string,
    kind: SpanKind = SpanKind.INTERNAL,
    attributes: SpanAttributes = {}
  ): unknown {
    if (!request.span) {
      return this.telemetry.createSpan({ _name, kind, attributes });
    }

    return this.telemetry.createSpan({ _name,
      kind,
      attributes,
      parentSpan: request.span,
    });
  }

  // Trace database operations within a request
  async traceDatabaseOperation<T>(
    request: TracedRequest,
    operation: string,
    table: string,
    fn: () => Promise<T>,
    attributes: SpanAttributes = {}
  ): Promise<T> {
    const span = this.createChildSpan(
      request,
      `db.${operation} ${table}`,
      SpanKind.CLIENT,
      {
        'db.system': 'sqlite',
        'db.operation': operation,
        'db.sql.table': table,
        ...attributes,
      }
    );

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

  // Trace AI operations within a request
  async traceAIOperation<T>(
    request: TracedRequest,
    operation: string,
    model: string,
    fn: () => Promise<T>,
    attributes: SpanAttributes = {}
  ): Promise<T> {
    const span = this.createChildSpan(
      request,
      `ai.${operation}`,
      SpanKind.CLIENT,
      {
        'ai.operation': operation,
        'ai.model.name': model,
        'ai.system': 'openai',
        ...attributes,
      }
    );

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

  // Trace cache operations within a request
  async traceCacheOperation<T>(
    request: TracedRequest,
    operation: string,
    key: string,
    fn: () => Promise<T>,
    attributes: SpanAttributes = {}
  ): Promise<T> {
    const span = this.createChildSpan(
      request,
      `cache.${operation}`,
      SpanKind.CLIENT,
      {
        'cache.operation': operation,
        'cache.key': key,
        'cache.system': 'cloudflare-kv',
        ...attributes,
      }
    );

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn();

        // Add cache hit/miss information if available
        if (operation === 'get') {
          span.setAttribute('cache.hit', result !== null && result !== undefined);
        }

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

  // Trace RBAC operations within a request
  async traceRBACOperation<T>(
    request: TracedRequest,
    operation: string,
    resource: string,
    fn: () => Promise<T>,
    attributes: SpanAttributes = {}
  ): Promise<T> {
    const span = this.createChildSpan(
      request,
      `rbac.${operation}`,
      SpanKind.INTERNAL,
      {
        'rbac.operation': operation,
        'rbac.resource': resource,
        'rbac.user.id': request.tenantContext?.userId,
        'rbac.organization.id': request.tenantContext?.organizationId,
        ...attributes,
      }
    );

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn();

        // Add permission check result if applicable
        if (typeof result === 'boolean') {
          span.setAttribute('rbac.permission.granted', result);
        }

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

  // Trace organization operations within a request
  async traceOrganizationOperation<T>(
    request: TracedRequest,
    operation: string,
    fn: () => Promise<T>,
    attributes: SpanAttributes = {}
  ): Promise<T> {
    const span = this.createChildSpan(
      request,
      `organization.${operation}`,
      SpanKind.INTERNAL,
      {
        'organization.operation': operation,
        'organization.id': request.tenantContext?.organizationId,
        ...attributes,
      }
    );

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

  // Add event to current request span
  addRequestEvent(request: TracedRequest, name: string, attributes: SpanAttributes = {}): void {
    if (request.span) {
      request.span.addEvent(name, {
        timestamp: Date.now(),
        ...attributes,
      });
    }
  }

  // Add attributes to current request span
  addRequestAttributes(request: TracedRequest, attributes: SpanAttributes): void {
    if (request.span) {
      request.span.setAttributes(attributes);
    }
  }

  // Get trace information for logging correlation
  getTraceInfo(request: TracedRequest): RequestTraceInfo | null {
    if (!request.traceId || !request.spanId) {
      return null;
    }

    const url = new URL(request.url);
    return {
      traceId: request.traceId,
      spanId: request.spanId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('cf-connecting-ip') ||
          request.headers.get('x-forwarded-for') ||
          undefined,
      organizationId: request.tenantContext?.organizationId,
      userId: request.tenantContext?.userId,
    };
  }

  // Extract route pattern from path (for better span naming)
  private extractRoute(path: string): string {
    // Simple route pattern extraction
    // In production, you'd want more sophisticated routing pattern detection
    return path
      .replace(/\/[0-9a-f-]{8,}/g, '/:id') // Replace UUIDs/IDs with :id
      .replace(/\/\d+/g, '/:number') // Replace numbers with :number
      .replace(/\/[^/]+@[^/]+/g, '/:email') // Replace emails with :email
      || '/';
  }

  // Add safe headers as span attributes (filtering sensitive ones)
  private addSafeHeaders(span: unknown, request: Request): void {
    const safeHeaders = [
      'accept',
      'accept-encoding',
      'accept-language',
      'cache-control',
      'content-type',
      'content-length',
      'user-agent',
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
      'cf-ray',
      'cf-visitor',
    ];

    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-session-id',
    ];

    for (const [name, value] of request.headers.entries()) {
      const lowerName = name.toLowerCase();

      if (safeHeaders.includes(lowerName)) {
        span.setAttribute(`http.request.header.${lowerName}`, value);
      } else if (sensitiveHeaders.includes(lowerName)) {
        span.setAttribute(`http.request.header.${lowerName}`, '[REDACTED]');
      }
    }
  }
}

// Global tracing middleware instance
const tracingMiddleware = new TracingMiddleware();

// Helper function to apply tracing to requests
export async function withTracing(request: IsolatedRequest): Promise<TracedRequest> {
  return tracingMiddleware.traceRequest(request);
}

// Helper function to finish request tracing
export function finishTracing(
  request: TracedRequest,
  response: Response,
  error?: Error
): void {
  tracingMiddleware.finishRequestSpan(request, response, error);
}

// Export the middleware instance for direct use
export { tracingMiddleware };