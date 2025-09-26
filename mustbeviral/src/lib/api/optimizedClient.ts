/**
 * Optimized API Client with Advanced Features
 * - Request deduplication
 * - Smart caching with TTL
 * - Automatic retries with exponential backoff
 * - Request/response interceptors
 * - Network state monitoring
 * - Request cancellation
 * - Progress tracking for uploads
 */

interface RequestConfig extends RequestInit {
  url: string;
  params?: Record<string, string | number>;
  data?: any;
  timeout?: number;
  retries?: number;
  cache?: CacheConfig;
  onProgress?: (progress: number) => void;
  cancelToken?: AbortController;
}

interface CacheConfig {
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
  key?: string;
  strategy?: 'memory' | 'localStorage' | 'sessionStorage';
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  cached?: boolean;
  latency?: number;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
  timestamp: number;
}

class OptimizedApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>> = [];
  private responseInterceptors: Array<(response: ApiResponse) => ApiResponse | Promise<ApiResponse>> = [];
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private pendingRequests: Map<string, Promise<ApiResponse>> = new Map();
  private isOnline: boolean = navigator.onLine;
  private offlineQueue: RequestConfig[] = [];

  constructor(baseURL: string = '', defaultHeaders: HeadersInit = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };

    this.setupNetworkMonitoring();
    this.setupPeriodicCacheCleanup();
  }

  // Network monitoring
  private setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Cache cleanup
  private setupPeriodicCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (value.expires < now) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  // Process offline queue when back online
  private async processOfflineQueue() {
    while (this.offlineQueue.length > 0) {
      const request = this.offlineQueue.shift();
      if (request) {
        try {
          await this.request(request);
        } catch (error) {
          console.error('Failed to process offline request:', error);
        }
      }
    }
  }

  // Generate cache key
  private getCacheKey(config: RequestConfig): string {
    if (config.cache?.key) return config.cache.key;
    
    const params = config.params ? JSON.stringify(config.params) : '';
    const body = config.data ? JSON.stringify(config.data) : '';
    return `${config.method || 'GET'}:${config.url}:${params}:${body}`;
  }

  // Check cache
  private checkCache(key: string): ApiResponse | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return {
        data: cached.data,
        status: 200,
        headers: new Headers(),
        cached: true
      };
    }
    return null;
  }

  // Store in cache
  private storeInCache(key: string, data: any, ttl: number = 300000) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });

    // Also store in localStorage for persistence if configured
    if (typeof localStorage !== 'undefined') {
      try {
        const cacheData = {
          data,
          expires: Date.now() + ttl
        };
        localStorage.setItem(`api_cache_${key}`, JSON.stringify(cacheData));
      } catch (e) {
        // Ignore localStorage errors (quota exceeded, etc.)
      }
    }
  }

  // Build URL with params
  private buildURL(url: string, params?: Record<string, string | number>): string {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    if (!params) return fullURL;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });

    return `${fullURL}?${searchParams.toString()}`;
  }

  // Retry with exponential backoff
  private async retryRequest(
    fn: () => Promise<Response>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<Response> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(fn, retries - 1, delay * 2);
    }
  }

  // Main request method
  public async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    const cacheKey = this.getCacheKey(config);

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<ApiResponse<T>>;
    }

    // Check cache
    if (config.cache?.enabled !== false && config.method === 'GET') {
      const cached = this.checkCache(cacheKey);
      if (cached) return cached as ApiResponse<T>;
    }

    // Check network status
    if (!this.isOnline && config.method !== 'GET') {
      this.offlineQueue.push(config);
      throw new Error('Request queued for offline processing');
    }

    // Build request
    const url = this.buildURL(config.url, config.params);
    const controller = config.cancelToken || new AbortController();
    const timeoutId = config.timeout
      ? setTimeout(() => controller.abort(), config.timeout)
      : null;

    const requestOptions: RequestInit = {
      ...config,
      headers: {
        ...this.defaultHeaders,
        ...config.headers
      },
      signal: controller.signal,
      body: config.data ? JSON.stringify(config.data) : undefined
    };

    // Track request latency
    const startTime = performance.now();

    // Create request promise
    const requestPromise = this.retryRequest(
      () => fetch(url, requestOptions),
      config.retries || 3
    )
      .then(async (response) => {
        if (timeoutId) clearTimeout(timeoutId);

        const latency = performance.now() - startTime;

        // Parse response
        let data: T;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else if (contentType?.includes('text/')) {
          data = await response.text() as any;
        } else {
          data = await response.blob() as any;
        }

        if (!response.ok) {
          throw {
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            details: data,
            timestamp: Date.now()
          } as ApiError;
        }

        const apiResponse: ApiResponse<T> = {
          data,
          status: response.status,
          headers: response.headers,
          cached: false,
          latency
        };

        // Cache successful GET requests
        if (config.method === 'GET' && config.cache?.enabled !== false) {
          this.storeInCache(cacheKey, data, config.cache?.ttl);
        }

        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          await interceptor(apiResponse);
        }

        return apiResponse;
      })
      .catch((error) => {
        if (timeoutId) clearTimeout(timeoutId);
        
        // Transform error
        const apiError: ApiError = {
          message: error.message || 'Network request failed',
          code: error.code,
          status: error.status,
          details: error.details,
          timestamp: Date.now()
        };

        throw apiError;
      })
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    // Store pending request for deduplication
    this.pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  // Convenience methods
  public async get<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  public async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, data, method: 'POST' });
  }

  public async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, data, method: 'PUT' });
  }

  public async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, data, method: 'PATCH' });
  }

  public async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  // Upload with progress
  public async upload<T = any>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve({
            data,
            status: xhr.status,
            headers: new Headers(),
            cached: false
          });
        } else {
          reject({
            message: `Upload failed: ${xhr.statusText}`,
            status: xhr.status,
            timestamp: Date.now()
          } as ApiError);
        }
      });

      xhr.addEventListener('error', () => {
        reject({
          message: 'Upload failed',
          timestamp: Date.now()
        } as ApiError);
      });

      xhr.open('POST', this.buildURL(url));
      
      // Add auth headers if needed
      const authHeader = this.defaultHeaders['Authorization'];
      if (authHeader) {
        xhr.setRequestHeader('Authorization', authHeader as string);
      }

      xhr.send(formData);
    });
  }

  // Interceptors
  public addRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ) {
    this.requestInterceptors.push(interceptor);
  }

  public addResponseInterceptor(
    interceptor: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>
  ) {
    this.responseInterceptors.push(interceptor);
  }

  // Cache management
  public clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }

    // Clear localStorage cache
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('api_cache_')) {
          if (!pattern || key.includes(pattern)) {
            localStorage.removeItem(key);
          }
        }
      });
    }
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  // Set auth token
  public setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  public removeAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }
}

// Create singleton instance
const apiClient = new OptimizedApiClient(
  import.meta.env.VITE_API_BASE_URL || '/api'
);

// Add default interceptors
apiClient.addRequestInterceptor((config) => {
  // Add timestamp to prevent caching issues
  if (config.method === 'GET' && !config.cache?.enabled) {
    config.params = {
      ...config.params,
      _t: Date.now()
    };
  }
  return config;
});

apiClient.addResponseInterceptor((response) => {
  // Log slow requests
  if (response.latency && response.latency > 1000) {
    console.warn(`Slow API request detected: ${response.latency}ms`);
  }
  return response;
});

export { apiClient, OptimizedApiClient };
export type { ApiResponse, ApiError, RequestConfig, CacheConfig };