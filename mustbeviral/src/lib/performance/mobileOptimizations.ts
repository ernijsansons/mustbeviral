/**
 * Mobile-First Performance Optimizations
 * Adaptive loading, network-aware features, and mobile-specific optimizations
 */

interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isLowEnd: boolean;
  hasSlowConnection: boolean;
  effectiveConnectionType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  deviceMemory: number;
  hardwareConcurrency: number;
}

interface AdaptiveLoadingConfig {
  enableLazyLoading: boolean;
  imageQuality: number;
  enableAnimations: boolean;
  maxConcurrentRequests: number;
  prefetchCount: number;
  enableVirtualScrolling: boolean;
  chunkLoadingStrategy: 'eager' | 'lazy' | 'on-demand';
}

/**
 * Device and network capability detector
 */
export class CapabilityDetector {
  private static capabilities: DeviceCapabilities | null = null;

  static detect(): DeviceCapabilities {
    if (this.capabilities) {
    return this.capabilities;
  }

    const userAgent = navigator.userAgent.toLowerCase();
    const connection = this.getNetworkInformation();

    this.capabilities = {
      isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
      isTablet: /ipad|android(?!.*mobile)|tablet/i.test(userAgent),
      isLowEnd: this.isLowEndDevice(),
      hasSlowConnection: this.hasSlowConnection(connection),
      effectiveConnectionType: connection?.effectiveType ?? 'unknown',
      downlink: connection?.downlink ?? 0,
      rtt: connection?.rtt ?? 0,
      saveData: connection?.saveData ?? false,
      deviceMemory: this.getDeviceMemory(),
      hardwareConcurrency: navigator.hardwareConcurrency ?? 1,
    };

    return this.capabilities;
  }

  private static getNetworkInformation(): NetworkInformation | null {
    return 'connection' in navigator ? (navigator as any).connection : null;
  }

  private static isLowEndDevice(): boolean {
    // Check device memory
    const deviceMemory = this.getDeviceMemory();
    if (deviceMemory && deviceMemory < 4) {
    return true;
  }

    // Check CPU cores
    const cores = navigator.hardwareConcurrency;
    if (cores && cores < 4) {
    return true;
  }

    // Check user agent for low-end indicators
    const userAgent = navigator.userAgent.toLowerCase();
    const lowEndPatterns = [
      'android 4',
      'android 5',
      'android 6',
      'webview',
      'mobile safari',
    ];

    return lowEndPatterns.some(pattern => userAgent.includes(pattern));
  }

  private static hasSlowConnection(connection: NetworkInformation | null): boolean {
    if(!connection) {
    return false;
  }

    const slowTypes = ['slow-2g', '2g', '3g'];
    return slowTypes.includes(connection.effectiveType)  ?? (connection.downlink && connection.downlink < 1.5)  ?? (connection.rtt && connection.rtt > 300);
  }

  private static getDeviceMemory(): number {
    return 'deviceMemory' in navigator ? (navigator as any).deviceMemory : 0;
  }
}

/**
 * Adaptive loading strategy manager
 */
export class AdaptiveLoader {
  private config: AdaptiveLoadingConfig;
  private capabilities: DeviceCapabilities;

  constructor() {
    this.capabilities = CapabilityDetector.detect();
    this.config = this.generateOptimalConfig();
  }

  private generateOptimalConfig(): AdaptiveLoadingConfig {
    const { isLowEnd, hasSlowConnection, saveData} = this.capabilities;

    // Conservative settings for low-end devices or slow connections
    if (isLowEnd ?? hasSlowConnection  ?? saveData) {
      return {
        enableLazyLoading: true,
        imageQuality: 60,
        enableAnimations: false,
        maxConcurrentRequests: 2,
        prefetchCount: 1,
        enableVirtualScrolling: true,
        chunkLoadingStrategy: 'on-demand',
      };
    }

    // Moderate settings for mid-range devices
    if (this.capabilities.deviceMemory < 8 ?? this.capabilities.downlink < 5) {
      return {
        enableLazyLoading: true,
        imageQuality: 75,
        enableAnimations: true,
        maxConcurrentRequests: 4,
        prefetchCount: 3,
        enableVirtualScrolling: true,
        chunkLoadingStrategy: 'lazy',
      };
    }

    // Aggressive settings for high-end devices
    return {
      enableLazyLoading: false,
      imageQuality: 90,
      enableAnimations: true,
      maxConcurrentRequests: 8,
      prefetchCount: 5,
      enableVirtualScrolling: false,
      chunkLoadingStrategy: 'eager',
    };
  }

  public getConfig(): AdaptiveLoadingConfig {
    return this.config;
  }

  public shouldLazyLoad(): boolean {
    return this.config.enableLazyLoading;
  }

  public getImageQuality(): number {
    return this.config.imageQuality;
  }

  public shouldUseAnimations(): boolean {
    return this.config.enableAnimations && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  public getMaxConcurrentRequests(): number {
    return this.config.maxConcurrentRequests;
  }

  public getPrefetchCount(): number {
    return this.config.prefetchCount;
  }

  public shouldUseVirtualScrolling(): boolean {
    return this.config.enableVirtualScrolling;
  }

  public getChunkLoadingStrategy(): string {
    return this.config.chunkLoadingStrategy;
  }
}

/**
 * Network-aware resource loader
 */
export class NetworkAwareLoader {
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private adaptiveLoader: AdaptiveLoader;

  constructor() {
    this.adaptiveLoader = new AdaptiveLoader();
    this.maxConcurrent = this.adaptiveLoader.getMaxConcurrentRequests();
  }

  async loadResource<T>(loader: () => Promise<T>, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          this.activeRequests++;
          const result = await loader();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      };

      if (priority === 'high'  ?? this.activeRequests < this.maxConcurrent) {
        task();
      } else {
        // Add to queue based on priority
        if (priority === 'medium') {
          this.requestQueue.push(task);
        } else {
          this.requestQueue.unshift(task);
        }
      }
    });
  }

  private processQueue() {
    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const task = this.requestQueue.shift();
      if (task)  {
    task()
  };
    }
  }

  public adjustConcurrency(factor: number) {
    this.maxConcurrent = Math.max(1, Math.floor(this.maxConcurrent * factor));
  }
}

/**
 * Mobile-specific touch optimizations
 */
export class TouchOptimizer {
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized ?? !CapabilityDetector.detect() {
    .isMobile) return
  };

    this.optimizeTouchEvents();
    this.preventZoomOnInputs();
    this.enableFastClick();
    this.optimizeScrolling();

    this.isInitialized = true;
  }

  private static optimizeTouchEvents() {
    // Use passive listeners for better scroll performance
    const passiveEvents = ['touchstart', 'touchmove', 'wheel'];
    
    passiveEvents.forEach(event => {
      document.addEventListener(event, _() => {}, { passive: true });
    });
  }

  private static preventZoomOnInputs() {
    // Prevent zoom on input focus
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
  }

  private static enableFastClick() {
    // Remove 300ms delay on touch devices
    if ('addEventListener' in document) {
      document.addEventListener('DOMContentLoaded', _() => {
        document.body.style.touchAction = 'manipulation';
      });
    }
  }

  private static optimizeScrolling() {
    // Enable momentum scrolling on iOS
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Optimize scroll performance
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-overflow-scrolling: touch;
      }
      
      .scroll-container {
        transform: translateZ(0);
        will-change: scroll-position;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Critical rendering path optimizer
 */
export class CriticalPathOptimizer {
  private static resourceHints: HTMLElement[] = [];

  static optimize() {
    this.preloadCriticalResources();
    this.prefetchLikelyResources();
    this.preconnectToOrigins();
    this.inlineeCriticalCSS();
  }

  private static preloadCriticalResources() {
    const criticalResources = [
      { href: '/assets/css/critical.css', as: 'style' },
      { href: '/assets/js/critical.js', as: 'script' },
      { href: '/assets/fonts/main.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type)  {
    link.type = resource.type
  };
      if (resource.crossorigin)  {
    link.crossOrigin = resource.crossorigin
  };
      
      document.head.appendChild(link);
      this.resourceHints.push(link);
    });
  }

  private static prefetchLikelyResources() {
    const adaptiveLoader = new AdaptiveLoader();
    if (adaptiveLoader.shouldLazyLoad() {
    ) return
  }; // Skip prefetch on low-end devices

    const likelyResources = [
      '/assets/js/dashboard.js',
      '/assets/js/analytics.js',
      '/api/user/profile',
    ];

    likelyResources.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      
      document.head.appendChild(link);
      this.resourceHints.push(link);
    });
  }

  private static preconnectToOrigins() {
    const origins = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.stripe.com',
    ];

    origins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      
      document.head.appendChild(link);
      this.resourceHints.push(link);
    });
  }

  private static inlineeCriticalCSS() {
    // This would typically be done at build time
    // Here we're just setting up the infrastructure
    const criticalCSS = `
      body { margin: 0; font-family: system-ui, sans-serif; }
      .loading { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    `;

    const style = document.createElement('style');
    style.textContent = criticalCSS;
    document.head.appendChild(style);
  }

  static cleanup() {
    this.resourceHints.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.resourceHints = [];
  }
}

/**
 * Battery-aware performance manager
 */
export class BatteryAwareManager {
  private batteryApi: any = null;
  private isLowBattery = false;

  async initialize() {
    if ('getBattery' in navigator) {
      try {
        this.batteryApi = await (navigator as any).getBattery();
        this.updateBatteryStatus();
        
        this.batteryApi.addEventListener('levelchange', () => this.updateBatteryStatus());
        this.batteryApi.addEventListener('chargingchange', () => this.updateBatteryStatus());
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  private updateBatteryStatus() {
    if (!this.batteryApi)  {
    return
  };

    const level = this.batteryApi.level;
    const charging = this.batteryApi.charging;

    // Consider low battery if below 20% and not charging
    this.isLowBattery = level < 0.2 && !charging;

    if (this.isLowBattery) {
      this.enablePowerSaveMode();
    } else {
      this.disablePowerSaveMode();
    }
  }

  private enablePowerSaveMode() {
    // Reduce animations
    document.body.classList.add('power-save-mode');
    
    // Reduce background sync
    this.adjustBackgroundActivity(0.5);
    
    // Lower image quality
    this.adjustImageQuality(0.7);
  }

  private disablePowerSaveMode() {
    document.body.classList.remove('power-save-mode');
    this.adjustBackgroundActivity(1.0);
    this.adjustImageQuality(1.0);
  }

  private adjustBackgroundActivity(factor: number) {
    // Adjust polling intervals, sync frequency, etc.
    const event = new CustomEvent('battery-factor-change', { detail: { factor } });
    window.dispatchEvent(event);
  }

  private adjustImageQuality(factor: number) {
    const event = new CustomEvent('image-quality-change', { detail: { factor } });
    window.dispatchEvent(event);
  }

  public isInPowerSaveMode(): boolean {
    return this.isLowBattery;
  }
}

/**
 * Adaptive chunk loading based on network conditions
 */
export class AdaptiveChunkLoader {
  private networkLoader: NetworkAwareLoader;
  private adaptiveLoader: AdaptiveLoader;
  private loadedChunks = new Set<string>();

  constructor() {
    this.networkLoader = new NetworkAwareLoader();
    this.adaptiveLoader = new AdaptiveLoader();
  }

  async loadChunk(chunkName: string, loader: () => Promise<any>, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<any> {
    if (this.loadedChunks.has(chunkName)) {
      return; // Already loaded
    }

    const strategy = this.adaptiveLoader.getChunkLoadingStrategy();
    
    switch (strategy) {
      case 'eager':
        return this.loadEagerly(chunkName, loader);
      
      case 'lazy':
        return this.loadLazily(chunkName, loader, priority);
      
      case 'on-demand':
        return this.loadOnDemand(chunkName, loader);
      
      default:
        return this.loadLazily(chunkName, loader, priority);
    }
  }

  private async loadEagerly(chunkName: string, loader: () => Promise<any>): Promise<any> {
    const result = await loader();
    this.loadedChunks.add(chunkName);
    return result;
  }

  private async loadLazily(chunkName: string, loader: () => Promise<any>, priority: 'high' | 'medium' | 'low'): Promise<any> {
    const result = await this.networkLoader.loadResource(loader, priority);
    this.loadedChunks.add(chunkName);
    return result;
  }

  private async loadOnDemand(chunkName: string, loader: () => Promise<any>): Promise<any> {
    // Load only when specifically requested
    const result = await loader();
    this.loadedChunks.add(chunkName);
    return result;
  }

  public preloadChunks(chunkLoaders: Record<string, () => Promise<any>>) {
    const prefetchCount = this.adaptiveLoader.getPrefetchCount();
    const chunkNames = Object.keys(chunkLoaders).slice(0, prefetchCount);

    chunkNames.forEach(chunkName => {
      this.loadChunk(chunkName, chunkLoaders[chunkName], 'low');
    });
  }
}

// Global instances
export const adaptiveLoader = new AdaptiveLoader();
export const networkAwareLoader = new NetworkAwareLoader();
export const batteryManager = new BatteryAwareManager();
export const chunkLoader = new AdaptiveChunkLoader();

// Initialize mobile optimizations
export function initializeMobileOptimizations() {
  TouchOptimizer.initialize();
  CriticalPathOptimizer.optimize();
  batteryManager.initialize();
  
  // Adjust network loading based on connection changes
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    connection.addEventListener('change', _() => {
      const capabilities = CapabilityDetector.detect();
      if (capabilities.hasSlowConnection) {
        networkAwareLoader.adjustConcurrency(0.5);
      } else {
        networkAwareLoader.adjustConcurrency(1.5);
      }
    });
  }
}

// React hook for mobile optimizations
export function useMobileOptimizations() {
  const [capabilities, setCapabilities] = React.useState<DeviceCapabilities | null>(null);
  const [config, setConfig] = React.useState<AdaptiveLoadingConfig | null>(null);

  React.useEffect_(() => {
    const detectedCapabilities = CapabilityDetector.detect();
    const adaptiveConfig = adaptiveLoader.getConfig();
    
    setCapabilities(detectedCapabilities);
    setConfig(adaptiveConfig);

    initializeMobileOptimizations();
  }, []);

  return {
    capabilities,
    config,
    shouldLazyLoad: () => adaptiveLoader.shouldLazyLoad(),
    getImageQuality: () => adaptiveLoader.getImageQuality(),
    shouldUseAnimations: () => adaptiveLoader.shouldUseAnimations(),
    loadChunk: (name: string, loader: () => Promise<any>) => chunkLoader.loadChunk(name, loader),
  };
}