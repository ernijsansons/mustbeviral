import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * Advanced lazy loading utility with preloading and error boundaries
 * Optimizes component loading with intelligent preloading strategies
 */

interface LazyLoadOptions {
  preload?: boolean;
  retries?: number;
  delay?: number;
  chunkName?: string;
}

interface LazyComponentFactory<T = any> {
  (): Promise<{ default: ComponentType<T> }>;
}

/**
 * Enhanced lazy loading with retry mechanism and preloading
 */
export function createLazyComponent<T = any>(
  factory: LazyComponentFactory<T>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<ComponentType<T>> & { preload: () => Promise<void> } {
  const { retries = 3, delay = 1000, chunkName } = options;
  
  let componentPromise: Promise<{ default: ComponentType<T> }> | null = null;
  
  const loadComponent = async (): Promise<{ default: ComponentType<T> }> => {
    if (componentPromise) {
      return componentPromise;
    }
    
    componentPromise = retryWithBackoff(factory, retries, delay);
    return componentPromise;
  };
  
  const LazyComponent = lazy(loadComponent);
  
  // Add preload method
  (LazyComponent as any).preload = () => {
    return loadComponent().then(() => {});
  };
  
  // Add chunk name for debugging
  if (chunkName) {
    (LazyComponent as any).chunkName = chunkName;
  }
  
  return LazyComponent as LazyExoticComponent<ComponentType<T>> & { preload: () => Promise<void> };
}

/**
 * Retry failed imports with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number,
  delay: number
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

/**
 * Intersection Observer based lazy loader for components
 */
export class IntersectionLazyLoader {
  private static observer: IntersectionObserver | null = null;
  private static components = new Map<Element, () => void>();
  
  static init() {
    if (typeof window === 'undefined' || this.observer) return;
    
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const loader = this.components.get(entry.target);
            if (loader) {
              loader();
              this.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );
  }
  
  static observe(element: Element, loader: () => void) {
    this.init();
    if (this.observer) {
      this.components.set(element, loader);
      this.observer.observe(element);
    }
  }
  
  static unobserve(element: Element) {
    if (this.observer) {
      this.observer.unobserve(element);
      this.components.delete(element);
    }
  }
}

/**
 * Route-based preloading strategies
 */
export class RoutePreloader {
  private static preloadedRoutes = new Set<string>();
  
  /**
   * Preload components for likely next routes
   */
  static preloadRoute(routePath: string, component: any) {
    if (this.preloadedRoutes.has(routePath)) return;
    
    this.preloadedRoutes.add(routePath);
    
    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        component.preload?.();
      });
    } else {
      setTimeout(() => {
        component.preload?.();
      }, 100);
    }
  }
  
  /**
   * Preload components on hover (for navigation links)
   */
  static preloadOnHover(element: Element, component: any) {
    const preload = () => {
      component.preload?.();
      element.removeEventListener('mouseenter', preload);
    };
    
    element.addEventListener('mouseenter', preload, { once: true });
  }
  
  /**
   * Preload based on user behavior patterns
   */
  static preloadByPattern(patterns: { route: string; component: any; priority: number }[]) {
    const sortedPatterns = patterns.sort((a, b) => b.priority - a.priority);
    
    sortedPatterns.forEach((pattern, index) => {
      setTimeout(() => {
        this.preloadRoute(pattern.route, pattern.component);
      }, index * 500);
    });
  }
}

/**
 * Performance-aware component loading
 */
export class PerformanceAwareLoader {
  private static isSlowNetwork(): boolean {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
    }
    return false;
  }
  
  private static isLowMemory(): boolean {
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory < 4;
    }
    return false;
  }
  
  /**
   * Conditionally load components based on device capabilities
   */
  static conditionalLoad<T>(
    highPerformanceComponent: LazyComponentFactory<T>,
    lowPerformanceComponent: LazyComponentFactory<T>,
    options: LazyLoadOptions = {}
  ) {
    const shouldUseLowPerf = this.isSlowNetwork() || this.isLowMemory();
    const factory = shouldUseLowPerf ? lowPerformanceComponent : highPerformanceComponent;
    
    return createLazyComponent(factory, {
      ...options,
      chunkName: shouldUseLowPerf ? 'low-perf' : 'high-perf',
    });
  }
}

/**
 * Bundle splitting utilities
 */
export const bundleSplitter = {
  /**
   * Create vendor chunks for common libraries
   */
  vendor: {
    react: () => import('react'),
    recharts: () => import('recharts'),
    lucideReact: () => import('lucide-react'),
  },
  
  /**
   * Feature-based splitting
   */
  features: {
    analytics: () => import('@/pages/Analytics'),
    dashboard: () => import('@/pages/Dashboard'),
    content: () => import('@/pages/Content'),
    collaboration: () => import('@/pages/Collaboration'),
    boost: () => import('@/pages/Boost'),
  },
  
  /**
   * Utility chunks
   */
  utils: {
    ai: () => import('@/lib/ai'),
    database: () => import('@/lib/database'),
    auth: () => import('@/lib/auth'),
  },
};

/**
 * Progressive enhancement loader
 */
export class ProgressiveLoader {
  /**
   * Load core features first, then enhance
   */
  static async loadProgressive() {
    // Load critical path components first
    const coreComponents = await Promise.all([
      bundleSplitter.vendor.react(),
      bundleSplitter.features.dashboard(),
    ]);
    
    // Then load enhancement features
    setTimeout(() => {
      bundleSplitter.features.analytics();
      bundleSplitter.utils.ai();
    }, 1000);
    
    return coreComponents;
  }
  
  /**
   * Load components based on user interaction
   */
  static loadOnInteraction(selector: string, loader: () => Promise<any>) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    const loadOnce = () => {
      loader();
      element.removeEventListener('click', loadOnce);
      element.removeEventListener('focus', loadOnce);
    };
    
    element.addEventListener('click', loadOnce, { once: true });
    element.addEventListener('focus', loadOnce, { once: true });
  }
}