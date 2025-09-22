/**
 * Web Vitals Performance Monitoring
 * Tracks Core Web Vitals and custom performance metrics
 * Fortune 50-grade performance monitoring
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
}

interface PerformanceData {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  inp?: number; // Interaction to Next Paint
}

class WebVitalsTracker {
  private metrics: PerformanceData = {};
  private customMetrics: CustomMetric[] = [];
  private endpoint: string;
  private isEnabled: boolean;

  constructor(endpoint = '/api/analytics/vitals', isEnabled = true) {
    this.endpoint = endpoint;
    this.isEnabled = isEnabled && typeof window !== 'undefined';

    if (this.isEnabled) {
      this.initializeTracking();
    }
  }

  private initializeTracking() {
    // Track Core Web Vitals using the web-vitals library pattern
    this.trackLCP();
    this.trackFID();
    this.trackCLS();
    this.trackFCP();
    this.trackTTFB();
    this.trackINP();

    // Track custom metrics
    this.trackCustomMetrics();

    // Track page visibility changes
    this.trackVisibilityChanges();

    // Track navigation timing
    this.trackNavigationTiming();
  }

  private trackLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        if (lastEntry) {
          this.recordMetric('LCP', lastEntry.startTime);
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    }
  }

  private trackFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric('FID', entry.processingStart - entry.startTime);
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
    }
  }

  private trackCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;

      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric('CLS', clsValue);
          }
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    }
  }

  private trackFCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime);
          }
        });
      });

      observer.observe({ type: 'paint', buffered: true });
    }
  }

  private trackTTFB() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const entry = navigationEntries[0];
        this.recordMetric('TTFB', entry.responseStart - entry.requestStart);
      }
    }
  }

  private trackINP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (entry.interactionId) {
            this.recordMetric('INP', entry.processingEnd - entry.startTime);
          }
        });
      });

      observer.observe({ type: 'event', buffered: true });
    }
  }

  private trackCustomMetrics() {
    // Track React hydration time
    this.trackHydrationTime();

    // Track route change performance
    this.trackRouteChanges();

    // Track component render times
    this.trackComponentRenders();
  }

  private trackHydrationTime() {
    const startTime = performance.now();

    // Use React's built-in performance hooks if available
    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        this.recordCustomMetric('hydration-time', performance.now() - startTime);
      });
    }
  }

  private trackRouteChanges() {
    let routeChangeStart = performance.now();

    // Listen for route changes (works with most SPA routers)
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      routeChangeStart = performance.now();
      return originalPushState.apply(this, args);
    };

    // Track when route change completes
    window.addEventListener('popstate', () => {
      routeChangeStart = performance.now();
    });

    // Use MutationObserver to detect when new content is loaded
    const observer = new MutationObserver(() => {
      this.recordCustomMetric('route-change-duration', performance.now() - routeChangeStart);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  private trackComponentRenders() {
    // Track long tasks that might affect component rendering
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.recordCustomMetric('long-task-duration', entry.duration);
          }
        });
      });

      observer.observe({ type: 'longtask', buffered: true });
    }
  }

  private trackVisibilityChanges() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendMetrics();
      }
    });
  }

  private trackNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navTiming) {
          this.recordCustomMetric('dns-lookup', navTiming.domainLookupEnd - navTiming.domainLookupStart);
          this.recordCustomMetric('tcp-handshake', navTiming.connectEnd - navTiming.connectStart);
          this.recordCustomMetric('request-response', navTiming.responseEnd - navTiming.requestStart);
          this.recordCustomMetric('dom-processing', navTiming.domComplete - navTiming.domLoading);
        }
      }, 0);
    });
  }

  private recordMetric(name: string, value: number) {
    if (!this.isEnabled) return;

    this.metrics[name.toLowerCase() as keyof PerformanceData] = value;

    // Send critical metrics immediately
    if (['LCP', 'FID', 'CLS'].includes(name)) {
      this.sendMetric({ name, value, timestamp: Date.now() });
    }
  }

  private recordCustomMetric(name: string, value: number) {
    if (!this.isEnabled) return;

    const metric: CustomMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.customMetrics.push(metric);

    // Send if buffer is full
    if (this.customMetrics.length >= 10) {
      this.sendMetrics();
    }
  }

  private sendMetric(metric: Partial<CustomMetric>) {
    if (!this.isEnabled) return;

    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        this.endpoint,
        JSON.stringify({
          type: 'single-metric',
          metric,
          timestamp: Date.now(),
          page: window.location.pathname,
        })
      );
    } else {
      // Fallback to fetch
      fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify({
          type: 'single-metric',
          metric,
          timestamp: Date.now(),
          page: window.location.pathname,
        }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(console.error);
    }
  }

  private sendMetrics() {
    if (!this.isEnabled || this.customMetrics.length === 0) return;

    const data = {
      type: 'web-vitals-batch',
      coreMetrics: this.metrics,
      customMetrics: this.customMetrics,
      timestamp: Date.now(),
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, JSON.stringify(data));
    } else {
      fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }).catch(console.error);
    }

    // Clear buffer
    this.customMetrics = [];
  }

  public getMetrics(): PerformanceData {
    return { ...this.metrics };
  }

  public trackEvent(name: string, data: Record<string, any> = {}) {
    this.recordCustomMetric(`event-${name}`, performance.now());

    // Send event data
    this.sendMetric({
      name: `event-${name}`,
      value: performance.now(),
      timestamp: Date.now(),
      ...data,
    });
  }

  public startTiming(label: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordCustomMetric(`timing-${label}`, duration);
    };
  }
}

// Global instance
let webVitalsTracker: WebVitalsTracker | null = null;

export const initWebVitals = (endpoint?: string, isEnabled?: boolean) => {
  if (typeof window !== 'undefined' && !webVitalsTracker) {
    webVitalsTracker = new WebVitalsTracker(endpoint, isEnabled);
  }
  return webVitalsTracker;
};

export const trackEvent = (name: string, data?: Record<string, any>) => {
  webVitalsTracker?.trackEvent(name, data);
};

export const startTiming = (label: string) => {
  return webVitalsTracker?.startTiming(label) || (() => {});
};

export const getWebVitals = () => {
  return webVitalsTracker?.getMetrics() || {};
};

// React hook for component-level performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const trackRender = () => {
    trackEvent(`component-render-${componentName}`);
  };

  const trackInteraction = (action: string) => {
    trackEvent(`component-interaction-${componentName}-${action}`);
  };

  return { trackRender, trackInteraction };
};