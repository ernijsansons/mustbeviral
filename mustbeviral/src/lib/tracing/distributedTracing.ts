import { v4 as uuidv4 } from 'uuid';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
  flags: number;
  sampled: boolean;
}

export interface SpanEvent {
  timestamp: number;
  name: string;
  attributes: Record<string, unknown>;
}

export interface SpanLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, unknown>;
  logs: SpanLog[];
  events: SpanEvent[];
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  service: string;
  resource: string;
  error?: Error;
  baggage: Record<string, string>;
}

export interface TracingConfig {
  serviceName: string;
  environment: string;
  samplingRate: number;
  enableMetrics: boolean;
  enableLogs: boolean;
  maxSpansPerTrace: number;
  maxSpanAge: number;
  exportInterval: number;
  exportTimeout: number;
  exportEndpoint?: string;
}

export class DistributedTracer {
  private config: TracingConfig;
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];
  private contextStack: TraceContext[] = [];

  constructor(config: TracingConfig) {
    this.config = config;
    this.startExportTimer();
  }

  startTrace(operationName: string, parentContext?: TraceContext): TraceContext {
    const traceId = parentContext?.traceId || uuidv4();
    const spanId = uuidv4();
    const sampled = this.shouldSample();

    const context: TraceContext = { _traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      baggage: { ...parentContext?.baggage },
      flags: sampled ? 1 : 0,
      sampled
    };

    if (sampled) {
      const span: Span = { _traceId,
        spanId,
        parentSpanId: parentContext?.spanId,
        operationName,
        startTime: Date.now(),
        tags: {},
        logs: [],
        events: [],
        status: 'success',
        service: this.config.serviceName,
        resource: operationName,
        baggage: context.baggage || {}
      };

      this.activeSpans.set(spanId, span);
    }

    this.contextStack.push(context);
    return context;
  }

  finishSpan(spanId: string, status: Span['status'] = 'success', error?: Error): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    if (error) span.error = error;

    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    this.contextStack = this.contextStack.filter(ctx => ctx.spanId !== spanId);

    if (this.completedSpans.length >= this.config.maxSpansPerTrace) {
      this.exportSpans();
    }
  }

  addTag(spanId: string, key: string, value: unknown): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  addLog(spanId: string, level: SpanLog['level'], message: string, fields?: Record<string, unknown>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        fields
      });
    }
  }

  addEvent(spanId: string, name: string, attributes: Record<string, unknown> = {}): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.events.push({
        timestamp: Date.now(),
        name,
        attributes
      });
    }
  }

  setBaggage(key: string, value: string): void {
    const currentContext = this.getCurrentContext();
    if (currentContext) {
      currentContext.baggage = currentContext.baggage || {};
      currentContext.baggage[key] = value;
    }
  }

  getBaggage(key: string): string | undefined {
    const currentContext = this.getCurrentContext();
    return currentContext?.baggage?.[key];
  }

  getCurrentContext(): TraceContext | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }

  extractContext(headers: Record<string, string>): TraceContext | undefined {
    const traceId = headers['x-trace-id'];
    const spanId = headers['x-span-id'];
    const parentSpanId = headers['x-parent-span-id'];
    const baggage = headers['x-baggage'] ? JSON.parse(headers['x-baggage']) : {};
    const sampled = headers['x-sampled'] === '1';

    if (traceId && spanId) {
      return { _traceId,
        spanId,
        parentSpanId,
        baggage,
        flags: sampled ? 1 : 0,
        sampled
      };
    }

    return undefined;
  }

  injectContext(context: TraceContext): Record<string, string> {
    return {
      'x-trace-id': context.traceId,
      'x-span-id': context.spanId,
      ...(context.parentSpanId && { 'x-parent-span-id': context.parentSpanId }),
      ...(context.baggage && { 'x-baggage': JSON.stringify(context.baggage) }),
      'x-sampled': context.sampled ? '1' : '0'
    };
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private startExportTimer(): void {
    setInterval(() => {
      this.exportSpans();
      this.cleanupOldSpans();
    }, this.config.exportInterval);
  }

  private async exportSpans(): Promise<void> {
    if (this.completedSpans.length === 0) return;

    const spans = [...this.completedSpans];
    this.completedSpans = [];

    try {
      if (this.config.exportEndpoint) {
        await this.sendToJaeger(spans);
      }

      if (this.config.enableLogs) {
        this.logSpans(spans);
      }

      if (this.config.enableMetrics) {
        this.recordMetrics(spans);
      }
    } catch (error: unknown) {
      console.error('Failed to export spans:', error);
      this.completedSpans.unshift(...spans);
    }
  }

  private async sendToJaeger(spans: Span[]): Promise<void> {
    const jaegerFormat = {
      data: [{
        traceID: spans[0]?.traceId,
        spans: spans.map(span => ({
          traceID: span.traceId,
          spanID: span.spanId,
          parentSpanID: span.parentSpanId,
          operationName: span.operationName,
          startTime: span.startTime * 1000,
          duration: (span.duration || 0) * 1000,
          tags: Object.entries(span.tags).map(([key, value]) => ({ _key,
            type: typeof value === 'string' ? 'string' : 'number',
            value: value.toString()
          })),
          logs: span.logs.map(log => ({
            timestamp: log.timestamp * 1000,
            fields: [
              { key: 'level', value: log.level },
              { key: 'message', value: log.message },
              ...Object.entries(log.fields || {}).map(([key, value]) => ({ _key,
                value: value.toString()
              }))
            ]
          })),
          process: {
            serviceName: span.service,
            tags: [
              { key: 'environment', value: this.config.environment }
            ]
          }
        }))
      }]
    };

    const response = await fetch(this.config.exportEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jaegerFormat)
    });

    if (!response.ok) {
      throw new Error(`Failed to export to Jaeger: ${response.statusText}`);
    }
  }

  private logSpans(spans: Span[]): void {
    spans.forEach(span => {
      console.log(`Trace: ${span.traceId} | Span: ${span.spanId} | Operation: ${span.operationName} | Duration: ${span.duration}ms | Status: ${span.status}`);
    });
  }

  private recordMetrics(spans: Span[]): void {
    const metrics = spans.reduce((acc, _span) => {
      const operation = span.operationName;
      if (!acc[operation]) {
        acc[operation] = {
          count: 0,
          totalDuration: 0,
          errors: 0
        };
      }

      acc[operation].count++;
      acc[operation].totalDuration += span.duration || 0;
      if (span.status === 'error') acc[operation].errors++;

      return acc;
    }, {} as Record<string, unknown>);

    Object.entries(metrics).forEach(([operation, stats]) => {
      const avgDuration = stats.totalDuration / stats.count;
      const errorRate = stats.errors / stats.count;

      console.log(`Metrics - Operation: ${operation}, Count: ${stats.count}, Avg Duration: ${avgDuration}ms, Error Rate: ${errorRate * 100}%`);
    });
  }

  private cleanupOldSpans(): void {
    const cutoffTime = Date.now() - this.config.maxSpanAge;
    this.activeSpans.forEach((span, _spanId) => {
      if (span.startTime < cutoffTime) {
        this.finishSpan(spanId, 'timeout');
      }
    });
  }

  getTraceMetrics(): {
    activeSpans: number;
    completedSpans: number;
    totalTraces: number;
    averageSpanDuration: number;
  } {
    const avgDuration = this.completedSpans.length > 0
      ? this.completedSpans.reduce((sum, _span) => sum + (span.duration || 0), 0) / this.completedSpans.length
      : 0;

    return {
      activeSpans: this.activeSpans.size,
      completedSpans: this.completedSpans.length,
      totalTraces: new Set([...this.activeSpans.values(), ...this.completedSpans].map(s => s.traceId)).size,
      averageSpanDuration: avgDuration
    };
  }
}

export function withTracing<T extends unknown[], R>(
  tracer: DistributedTracer,
  operationName: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const context = tracer.startTrace(operationName);

    try {
      const result = await fn(...args);
      tracer.finishSpan(context.spanId, 'success');
      return result;
    } catch (error: unknown) {
      tracer.finishSpan(context.spanId, 'error', error as Error);
      throw error;
    }
  };
}

export const defaultTracingConfig: TracingConfig = {
  serviceName: 'mustbeviral-api',
  environment: 'production',
  samplingRate: 0.1,
  enableMetrics: true,
  enableLogs: true,
  maxSpansPerTrace: 100,
  maxSpanAge: 300000, // 5 minutes
  exportInterval: 10000, // 10 seconds
  exportTimeout: 5000
};