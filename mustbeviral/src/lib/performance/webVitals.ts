/**
 * Web Vitals Performance Monitoring
 * Tracks Core Web Vitals and custom performance metrics
 */

import type { Metric } from 'web-vitals';

// Core Web Vitals thresholds
const VITALS_THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }    // Interaction to Next Paint
};

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
  navigationType?: string;
}

interface PerformanceReport {
  metrics: VitalMetric[];
  url: string;
  userAgent: string;
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  screenResolution: string;
  viewport: string;
}

class WebVitalsMonitor {
  private metrics: Map<string, VitalMetric> = new Map();
  private reportEndpoint: string;
  private reportBuffer: VitalMetric[] = [];
  private reportTimer: NodeJS.Timeout | null = null;
  private enableLogging: boolean;

  constructor(endpoint: string = '/api/analytics/vitals', enableLogging = false) {
    this.reportEndpoint = endpoint;
    this.enableLogging = enableLogging;
    this.initializeMonitoring();
  }

  private async initializeMonitoring() {
    if (typeof window === 'undefined') return;

    try {
      // Dynamically import web-vitals to reduce bundle size
      const { onFCP, onLCP, onFID, onCLS, onTTFB, onINP } = await import('web-vitals');

      // Monitor Core Web Vitals
      onFCP(this.handleMetric.bind(this));
      onLCP(this.handleMetric.bind(this));
      onFID(this.handleMetric.bind(this));
      onCLS(this.handleMetric.bind(this));
      onTTFB(this.handleMetric.bind(this));
      onINP(this.handleMetric.bind(this));

      // Monitor custom metrics
      this.monitorCustomMetrics();

      // Report on page visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushMetrics();
        }
      });

      // Report before page unload
      window.addEventListener('beforeunload', () => {
        this.flushMetrics();
      });

    } catch (error) {
      console.error('Failed to initialize web vitals monitoring:', error);
    }
  }

  private handleMetric(metric: Metric) {
    const rating = this.getRating(metric.name, metric.value);
    
    const vitalMetric: VitalMetric = {
      name: metric.name,
      value: Math.round(metric.value),
      rating,
      timestamp: Date.now(),
      id: metric.id,
      navigationType: metric.navigationType
    };

    this.metrics.set(metric.name, vitalMetric);
    this.reportBuffer.push(vitalMetric);

    if (this.enableLogging) {
      console.log(`[WebVitals] ${metric.name}: ${Math.round(metric.value)}ms (${rating})`);
    }

    // Alert if metric is poor
    if (rating === 'poor') {
      this.handlePoorMetric(vitalMetric);
    }

    // Batch report metrics
    this.scheduleReport();
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private monitorCustomMetrics() {
    // Monitor Time to Interactive
    if ('PerformanceObserver' in window) {
      try {
        // Monitor long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.reportBuffer.push({
                name: 'LongTask',
                value: entry.duration,
                rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
                timestamp: Date.now(),
                id: `lt-${Date.now()}`
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });

        // Monitor resource timing
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              if (resourceEntry.duration > 1000) {
                this.reportBuffer.push({
                  name: 'SlowResource',
                  value: resourceEntry.duration,
                  rating: 'poor',
                  timestamp: Date.now(),
                  id: `sr-${Date.now()}`,
                  navigationType: resourceEntry.name
                });
              }
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });

      } catch (error) {
        console.error('Failed to setup performance observers:', error);
      }
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemoryMB = memory.usedJSHeapSize / 1048576;
        const limitMemoryMB = memory.jsHeapSizeLimit / 1048576;
        const usage = (usedMemoryMB / limitMemoryMB) * 100;

        if (usage > 80) {
          this.reportBuffer.push({
            name: 'HighMemoryUsage',
            value: usage,
            rating: 'poor',
            timestamp: Date.now(),
            id: `mem-${Date.now()}`
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private handlePoorMetric(metric: VitalMetric) {
    // Log to error tracking service
    if (window.console && window.console.warn) {
      console.warn(`Poor performance metric detected: ${metric.name} = ${metric.value}ms`);
    }

    // Send immediate alert for critical metrics
    if (['LCP', 'FID', 'CLS'].includes(metric.name)) {
      this.sendImmediateReport([metric]);
    }
  }

  private scheduleReport() {
    if (this.reportTimer) return;

    this.reportTimer = setTimeout(() => {
      this.flushMetrics();
      this.reportTimer = null;
    }, 5000); // Send batch every 5 seconds
  }

  private flushMetrics() {
    if (this.reportBuffer.length === 0) return;

    const report = this.createReport();
    this.sendReport(report);
    this.reportBuffer = [];
  }

  private createReport(): PerformanceReport {
    const nav = navigator as any;
    
    return {
      metrics: [...this.reportBuffer],
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: nav.connection?.effectiveType,
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: nav.hardwareConcurrency,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  private async sendReport(report: PerformanceReport) {
    try {
      // Use sendBeacon for reliability
      if ('sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(report)], { type: 'application/json' });
        navigator.sendBeacon(this.reportEndpoint, blob);
      } else {
        // Fallback to fetch
        await fetch(this.reportEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
          keepalive: true
        });
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('Failed to send performance report:', error);
      }
    }
  }

  private async sendImmediateReport(metrics: VitalMetric[]) {
    const report = {
      ...this.createReport(),
      metrics,
      priority: 'high'
    };
    await this.sendReport(report);
  }

  // Public methods
  public getMetrics(): Map<string, VitalMetric> {
    return new Map(this.metrics);
  }

  public getMetricByName(name: string): VitalMetric | undefined {
    return this.metrics.get(name);
  }

  public clearMetrics(): void {
    this.metrics.clear();
    this.reportBuffer = [];
  }

  public forceReport(): void {
    this.flushMetrics();
  }
}

// Singleton instance
let monitor: WebVitalsMonitor | null = null;

export function initWebVitals(endpoint?: string, enableLogging?: boolean): WebVitalsMonitor {
  if (!monitor) {
    monitor = new WebVitalsMonitor(endpoint, enableLogging);
  }
  return monitor;
}

export function getWebVitalsMonitor(): WebVitalsMonitor | null {
  return monitor;
}

// Helper function to format metrics for display
export function formatMetric(name: string, value: number): string {
  switch (name) {
    case 'CLS':
      return value.toFixed(3);
    case 'FCP':
    case 'LCP':
    case 'FID':
    case 'TTFB':
    case 'INP':
      return `${Math.round(value)}ms`;
    default:
      return value.toString();
  }
}

// Export types
export type { VitalMetric, PerformanceReport };