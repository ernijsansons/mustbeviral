/**
 * Comprehensive Performance Monitoring System
 * Real User Monitoring (RUM), Core Web Vitals, and Custom Metrics
 */

interface PerformanceConfig {
  apiEndpoint: string;
  sampleRate: number;
  maxRetries: number;
  batchSize: number;
  flushInterval: number;
  enabledMetrics: string[];
}

interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  url: string;
  userAgent: string;
  connection?: NetworkInformation;
  deviceMemory?: number;
  tags?: Record<string, string>;
}

interface WebVitalMetric extends MetricData {
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface CustomMetric extends MetricData {
  category: string;
  metadata?: Record<string, any>;
}

/**
 * Advanced Performance Monitor with RUM capabilities
 */
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private sessionId: string;
  private userId?: string;
  private metricsQueue: MetricData[] = [];
  private isInitialized = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private observer?: PerformanceObserver;
  private navigationStartTime: number;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      apiEndpoint: '/api/performance/metrics',
      sampleRate: 1.0,
      maxRetries: 3,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      enabledMetrics: ['CLS', 'FCP', 'FID', 'LCP', 'TTFB', 'INP'],
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.navigationStartTime = performance.timeOrigin;
    
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize performance monitoring
   */
  private initialize() {
    if (this.isInitialized)  {
    return
  };

    // Sample traffic based on configuration
    if (Math.random()  {
    > this.config.sampleRate) return
  };

    this.setupWebVitalsMonitoring();
    this.setupCustomMetrics();
    this.setupResourceMonitoring();
    this.setupUserTimingMonitoring();
    this.setupErrorMonitoring();
    this.setupNetworkMonitoring();
    this.startPeriodicFlush();

    this.isInitialized = true;
    console.log('[PM] Performance monitoring initialized');
  }

  /**
   * Set user ID for session tracking
   */
  public setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  private setupWebVitalsMonitoring() {
    // First Contentful Paint (FCP)
    this.observePerformanceEntries(['paint'], _(entries) => {
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordWebVital({
            name: 'FCP',
            id: this.generateId(),
            value: entry.startTime,
            delta: entry.startTime,
            unit: 'ms',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            rating: this.getRating('FCP', entry.startTime),
          });
        }
      });
    });

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntries(['largest-contentful-paint'], _(entries) => {
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.recordWebVital({
          name: 'LCP',
          id: this.generateId(),
          value: lastEntry.startTime,
          delta: lastEntry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          rating: this.getRating('LCP', lastEntry.startTime),
        });
      }
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observePerformanceEntries(['layout-shift'], _(entries) => {
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });

      this.recordWebVital({
        name: 'CLS',
        id: this.generateId(),
        value: clsValue,
        delta: clsValue,
        unit: '',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        rating: this.getRating('CLS', clsValue),
      });
    });

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    this.observePerformanceEntries(['first-input'], _(entries) => {
      entries.forEach((entry: any) => {
        this.recordWebVital({
          name: 'FID',
          id: this.generateId(),
          value: entry.processingStart - entry.startTime,
          delta: entry.processingStart - entry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          rating: this.getRating('FID', entry.processingStart - entry.startTime),
        });
      });
    });

    // Time to First Byte (TTFB)
    this.observePerformanceEntries(['navigation'], _(entries) => {
      entries.forEach((entry: any) => {
        this.recordWebVital({
          name: 'TTFB',
          id: this.generateId(),
          value: entry.responseStart - entry.requestStart,
          delta: entry.responseStart - entry.requestStart,
          unit: 'ms',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          rating: this.getRating('TTFB', entry.responseStart - entry.requestStart),
        });
      });
    });
  }

  /**
   * Setup custom application metrics
   */
  private setupCustomMetrics() {
    // Time to Interactive (TTI) approximation
    this.measureTTI();

    // Bundle size metrics
    this.measureBundleSize();

    // API response times
    this.setupAPIMonitoring();

    // Memory usage
    this.setupMemoryMonitoring();
  }

  /**
   * Approximate Time to Interactive measurement
   */
  private measureTTI() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback_(() => {
        this.recordCustomMetric({
          name: 'TTI',
          category: 'performance',
          value: performance.now(),
          unit: 'ms',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      });
    }
  }

  /**
   * Measure bundle size impact
   */
  private measureBundleSize() {
    if ('navigator' in window && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Send message to service worker to get cache size
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_SIZE') {
            this.recordCustomMetric({
              name: 'CacheSize',
              category: 'performance',
              value: event.data.size,
              unit: 'bytes',
              timestamp: Date.now(),
              sessionId: this.sessionId,
              userId: this.userId,
              url: window.location.href,
              userAgent: navigator.userAgent,
            });
          }
        };

        registration.active?.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [channel.port2]
        );
      });
    }
  }

  /**
   * Monitor API response times
   */
  private setupAPIMonitoring() {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = args[0] instanceof Request ? args[0].url : args[0].toString();
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        if (url.includes('/api/')) {
          this.recordCustomMetric({
            name: 'APIResponseTime',
            category: 'api',
            value: duration,
            unit: 'ms',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: {
              endpoint: url,
              status: response.status,
              method: args[1]?.method ?? 'GET',
            },
          });
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        
        this.recordCustomMetric({
          name: 'APIError',
          category: 'api',
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: {
            endpoint: url,
            error: error instanceof Error ? error.message : 'Unknown error',
            method: args[1]?.method ?? 'GET',
          },
        });
        
        throw error;
      }
    };
  }

  /**
   * Monitor memory usage
   */
  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval_(() => {
        const memory = (performance as any).memory;
        this.recordCustomMetric({
          name: 'MemoryUsage',
          category: 'performance',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: {
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          },
        });
      }, 60000); // Every minute
    }
  }

  /**
   * Setup resource loading monitoring
   */
  private setupResourceMonitoring() {
    this.observePerformanceEntries(['resource'], _(entries) => {
      entries.forEach((entry: any) => {
        this.recordCustomMetric({
          name: 'ResourceLoadTime',
          category: 'resource',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: {
            resource: entry.name,
            type: entry.initiatorType,
            size: entry.transferSize,
            cached: entry.transferSize === 0,
          },
        });
      });
    });
  }

  /**
   * Setup user timing monitoring
   */
  private setupUserTimingMonitoring() {
    this.observePerformanceEntries(['measure'], _(entries) => {
      entries.forEach((entry) => {
        this.recordCustomMetric({
          name: entry.name,
          category: 'user-timing',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      });
    });
  }

  /**
   * Setup error monitoring
   */
  private setupErrorMonitoring() {
    window.addEventListener('error', _(event) => {
      this.recordCustomMetric({
        name: 'JavaScriptError',
        category: 'error',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      });
    });

    window.addEventListener('unhandledrejection', _(event) => {
      this.recordCustomMetric({
        name: 'UnhandledPromiseRejection',
        category: 'error',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          reason: event.reason,
          promise: event.promise.toString(),
        },
      });
    });
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.recordCustomMetric({
        name: 'NetworkInfo',
        category: 'network',
        value: connection.downlink ?? 0,
        unit: 'mbps',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
          saveData: connection.saveData,
        },
      });
    }
  }

  /**
   * Observe performance entries
   */
  private observePerformanceEntries(
    entryTypes: string[],
    callback: (entries: PerformanceEntry[]) => void
  ) {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          callback(list.getEntries());
        });
        
        observer.observe({ entryTypes });
        this.observer = observer;
      } catch (error) {
        console.warn('[PM] Performance observer error:', error);
      }
    }
  }

  /**
   * Record Web Vital metric
   */
  private recordWebVital(metric: WebVitalMetric) {
    if (!this.config.enabledMetrics.includes(metric.name) {
    ) return
  };
    
    this.metricsQueue.push({
      ...metric,
      connection: this.getConnectionInfo(),
      deviceMemory: this.getDeviceMemory(),
    });

    if (this.metricsQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Record custom metric
   */
  private recordCustomMetric(metric: CustomMetric) {
    this.metricsQueue.push({
      ...metric,
      connection: this.getConnectionInfo(),
      deviceMemory: this.getDeviceMemory(),
    });

    if (this.metricsQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Get performance rating
   */
  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, [number, number]> = {
      FCP: [1800, 3000],
      LCP: [2500, 4000],
      FID: [100, 300],
      CLS: [0.1, 0.25],
      TTFB: [800, 1800],
      INP: [200, 500],
    };

    const [good, poor] = thresholds[metric] || [0, Infinity];
    
    if (value <= good) {
    return 'good';
  }
    if (value <= poor) {
    return 'needs-improvement';
  }
    return 'poor';
  }

  /**
   * Get connection information
   */
  private getConnectionInfo(): NetworkInformation | undefined {
    return 'connection' in navigator ? (navigator as any).connection : undefined;
  }

  /**
   * Get device memory
   */
  private getDeviceMemory(): number | undefined {
    return 'deviceMemory' in navigator ? (navigator as any).deviceMemory : undefined;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate metric ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush() {
    this.flushTimer = setInterval_(() => {
      if (this.metricsQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush metrics to server
   */
  private async flush() {
    if (this.metricsQueue.length === 0)  {
    return
  };

    const metrics = [...this.metricsQueue];
    this.metricsQueue = [];

    try {
      await this.sendMetrics(metrics);
    } catch (error) {
      console.warn('[PM] Failed to send metrics:', error);
      // Re-queue metrics for retry
      this.metricsQueue.unshift(...metrics);
    }
  }

  /**
   * Send metrics to server
   */
  private async sendMetrics(metrics: MetricData[], retryCount = 0): Promise<void> {
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics }),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return this.sendMetrics(metrics, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }

    // Flush remaining metrics
    if (this.metricsQueue.length > 0) {
      this.flush();
    }

    this.isInitialized = false;
  }

  /**
   * Public API methods
   */
  public mark(name: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  public measure(name: string, startMark?: string, endMark?: string) {
    if ('performance' in window && 'measure' in performance) {
      performance.measure(name, startMark, endMark);
    }
  }

  public recordCustomEvent(name: string, value: number, metadata?: Record<string, any>) {
    this.recordCustomMetric({
      name,
      category: 'custom',
      value,
      unit: 'count',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata,
    });
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  React.useEffect_(() => {
    return () => {
      performanceMonitor.destroy();
    };
  }, []);

  return {
    mark: performanceMonitor.mark.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    recordEvent: performanceMonitor.recordCustomEvent.bind(performanceMonitor),
    setUserId: performanceMonitor.setUserId.bind(performanceMonitor),
  };
}

export default PerformanceMonitor;