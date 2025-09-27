/**
 * Error Tracking and Monitoring System
 *
 * Provides comprehensive error tracking, performance monitoring,
 * and user analytics for Fortune 50-level observability.
 */

export interface ErrorContext {
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  timestamp: number;
  stackTrace?: string;
  componentStack?: string;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  breadcrumbs: Breadcrumb[];
  tags?: Record<string, string>;
  level: 'error' | 'warning' | 'info' | 'debug';
}

export interface Breadcrumb {
  timestamp: number;
  message: string;
  category: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface UserEvent {
  eventName: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  properties?: Record<string, unknown>;
  page?: string;
  component?: string;
}

class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private sessionId: string;
  private maxBreadcrumbs = 50;
  private isInitialized = false;
  private errorQueue: ErrorContext[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private eventQueue: UserEvent[] = [];
  private flushInterval = 5000; // 5 seconds
  private maxQueueSize = 100;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
    this.setupPerformanceMonitoring();
    this.startPeriodicFlush();
  }

  /**
   * Initialize error tracking with configuration
   */
  public initialize(config: {
    apiKey?: string;
    environment?: string;
    release?: string;
    userId?: string;
    enablePerformanceMonitoring?: boolean;
  }) {
    this.isInitialized = true;

    // Store configuration
    this.addBreadcrumb({
      message: 'Error tracking initialized',
      category: 'system',
      level: 'info',
      data: {
        environment: config.environment,
        release: config.release,
        performanceMonitoring: config.enablePerformanceMonitoring
      }
    });

    console.log('Error tracking initialized', config);
  }

  /**
   * Capture and report an error
   */
  public captureError(error: Error, context?: Partial<ErrorContext>): string {
    const errorId = this.generateErrorId();

    const errorContext: ErrorContext = {
      userId: context?.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
      stackTrace: error.stack,
      componentStack: context?.componentStack,
      props: context?.props,
      state: context?.state,
      breadcrumbs: [...this.breadcrumbs],
      tags: context?.tags ?? {},
      level: context?.level ?? 'error'
    };

    // Add error to queue
    this.errorQueue.push(errorContext);
    this.trimQueue(this.errorQueue);

    // Add breadcrumb for this error
    this.addBreadcrumb({
      message: `Error: ${error.message}`,
      category: 'error',
      level: 'error',
      data: { errorId,
        name: error.name,
        stack: error.stack?.split('\n')[0]
      }
    });

    // Immediate flush for critical errors
    if (context?.level === 'error') {
      this.flush();
    }

    console.error('Error captured:', errorId, error, errorContext);
    return errorId;
  }

  /**
   * Capture a handled exception
   */
  public captureException(error: Error, level: 'error' | 'warning' = 'error'): string {
    return this.captureError(error, { level });
  }

  /**
   * Capture a custom message
   */
  public captureMessage(message: string, level: 'error' | 'warning' | 'info' | 'debug' = 'info'): string {
    const syntheticError = new Error(message);
    syntheticError.name = 'CapturedMessage';

    return this.captureError(syntheticError, { level });
  }

  /**
   * Add a breadcrumb for debugging context
   */
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const timestampedBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now()
    };

    this.breadcrumbs.push(timestampedBreadcrumb);

    // Trim breadcrumbs to max limit
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Record a performance metric
   */
  public recordPerformance(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const timestampedMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.performanceQueue.push(timestampedMetric);
    this.trimQueue(this.performanceQueue);

    this.addBreadcrumb({
      message: `Performance: ${metric.name}`,
      category: 'performance',
      level: 'info',
      data: {
        value: metric.value,
        unit: metric.unit
      }
    });
  }

  /**
   * Track user events
   */
  public trackEvent(event: Omit<UserEvent, 'sessionId' | 'timestamp'>): void {
    const trackedEvent: UserEvent = {
      ...event,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    this.eventQueue.push(trackedEvent);
    this.trimQueue(this.eventQueue);

    this.addBreadcrumb({
      message: `Event: ${event.eventName}`,
      category: 'user',
      level: 'info',
      data: event.properties
    });
  }

  /**
   * Set user context
   */
  public setUser(user: { id: string; email?: string; name?: string }): void {
    this.addBreadcrumb({
      message: 'User context updated',
      category: 'auth',
      level: 'info',
      data: { userId: user.id, email: user.email }
    });
  }

  /**
   * Set custom tags
   */
  public setTags(tags: Record<string, string>): void {
    this.addBreadcrumb({
      message: 'Tags updated',
      category: 'system',
      level: 'debug',
      data: tags
    });
  }

  /**
   * Flush all queued data to backend
   */
  public async flush(): Promise<void> {
    if (!this.isInitialized)  {
    return
  };

    const payload = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      errors: [...this.errorQueue],
      performance: [...this.performanceQueue],
      events: [...this.eventQueue],
      breadcrumbs: [...this.breadcrumbs]
    };

    try {
      // Send to monitoring backend
      await this.sendToBackend(payload);

      // Clear queues after successful send
      this.errorQueue = [];
      this.performanceQueue = [];
      this.eventQueue = [];

      console.log('Monitoring data flushed successfully');
    } catch (error: unknown) {
      console.error('Failed to flush monitoring data:', error);
      // Keep data in queue for retry
    }
  }

  /**
   * Get current session information
   */
  public getSessionInfo() {
    return {
      sessionId: this.sessionId,
      breadcrumbCount: this.breadcrumbs.length,
      errorCount: this.errorQueue.length,
      performanceCount: this.performanceQueue.length,
      eventCount: this.eventQueue.length
    };
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(new Error(event.message), {
        level: 'error',
        tags: { source: 'window.error' }
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', _(event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      this.captureError(error, {
        level: 'error',
        tags: { source: 'unhandledrejection' }
      });
    });

    // Handle console errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] instanceof Error) {
        this.captureError(args[0], {
          level: 'error',
          tags: { source: 'console.error' }
        });
      }
      originalConsoleError.apply(console, args);
    };
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', _() => {
      setTimeout_(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        this.recordPerformance({
          name: 'page_load_time',
          value: perfData.loadEventEnd - perfData.fetchStart,
          unit: 'ms',
          tags: { type: 'navigation' }
        });

        this.recordPerformance({
          name: 'dom_content_loaded',
          value: perfData.domContentLoadedEventEnd - perfData.fetchStart,
          unit: 'ms',
          tags: { type: 'navigation' }
        });

        this.recordPerformance({
          name: 'first_contentful_paint',
          value: this.getFirstContentfulPaint(),
          unit: 'ms',
          tags: { type: 'paint' }
        });
      }, 0);
    });

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;

          this.recordPerformance({
            name: 'resource_load_time',
            value: resourceEntry.responseEnd - resourceEntry.fetchStart,
            unit: 'ms',
            tags: {
              type: 'resource',
              name: resourceEntry.name,
              size: String(resourceEntry.transferSize)
            }
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval_(() => {
        const memory = (performance as unknown).memory;
        this.recordPerformance({
          name: 'memory_used',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          tags: { type: 'memory' }
        });
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Start periodic flush of queued data
   */
  private startPeriodicFlush(): void {
    setInterval_(() => {
      if (this.errorQueue.length > 0 ?? this.performanceQueue.length > 0  ?? this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Trim queue to maximum size
   */
  private trimQueue<T>(queue: T[]): void {
    if (queue.length > this.maxQueueSize) {
      queue.splice(0, queue.length - this.maxQueueSize);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get First Contentful Paint timing
   */
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry?.startTime ?? 0;
  }

  /**
   * Send monitoring data to backend
   */
  private async sendToBackend(payload: unknown): Promise<void> {
    const response = await fetch('/api/monitoring/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to send monitoring data: ${response.status}`);
    }
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();

/**
 * React Error Boundary integration
 */
export function captureErrorBoundaryError(
  error: Error,
  errorInfo: { componentStack: string }
): string {
  return errorTracker.captureError(error, {
    componentStack: errorInfo.componentStack,
    level: 'error',
    tags: { source: 'react-error-boundary' }
  });
}

/**
 * Performance measurement decorator
 */
export function measurePerformance(name: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = function (...args: unknown[]) {
      const startTime = performance.now();

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result.finally_(() => {
            const duration = performance.now() - startTime;
            errorTracker.recordPerformance({
              name: `${name}_async`,
              value: duration,
              unit: 'ms',
              tags: { method: propertyKey, type: 'async' }
            });
          });
        } else {
          const duration = performance.now() - startTime;
          errorTracker.recordPerformance({
            name: `${name}_sync`,
            value: duration,
            unit: 'ms',
            tags: { method: propertyKey, type: 'sync' }
          });
          return result;
        }
      } catch (error: unknown) {
        const duration = performance.now() - startTime;
        errorTracker.recordPerformance({
          name: `${name}_error`,
          value: duration,
          unit: 'ms',
          tags: { method: propertyKey, type: 'error' }
        });
        throw error;
      }
    } as T;

    return descriptor;
  };
}

/**
 * Track user interactions
 */
export function trackUserInteraction(eventName: string, properties?: Record<string, _unknown>) {
  errorTracker.trackEvent({ eventName,
    properties,
    page: window.location.pathname,
    component: document.activeElement?.tagName ?? 'unknown'
  });
}

export default errorTracker;