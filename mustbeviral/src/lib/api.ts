// Universe-Bending API Client
// Connects to your excellent Cloudflare Workers backend

import { buildApiUrl, env} from './env';
import { retryClient, type RetryConfig} from './api/retryClient';
import { logger} from './logging/productionLogger';

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  role: 'creator' | 'influencer';
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'creator' | 'influencer' | 'admin';
  onboarding_completed: boolean;
  ai_preference_level: number;
  profile_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Content Types
export interface Content {
  id: string;
  user_id: string;
  title: string;
  body: string;
  image_url?: string;
  status: 'draft' | 'published' | 'pending_review' | 'archived';
  type: 'news_article' | 'social_post' | 'blog_post';
  generated_by_ai: boolean;
  ai_model_used?: string;
  ethics_check_status: 'passed' | 'failed' | 'pending';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

// Analytics Types
export interface AnalyticsData {
  overview: {
    total_content: number;
    total_views: number;
    total_engagement: number;
    avg_engagement_rate: number;
  };
  top_content: Array<{
    content_id: string;
    title: string;
    views: number;
    engagement_rate: number;
  }>;
  engagement_trends: Array<{
    date: string;
    views: number;
    engagements: number;
  }>;
  real_time_metrics: {
    active_users: number;
    current_views: number;
    recent_events: Array<{
      id: string;
      content_id: string;
      event_type: string;
      timestamp: string;
    }>;
  };
}

// Custom API Error class with enhanced type safety
export class ApiClientError extends Error {
  public readonly name = 'ApiClientError' as const;
  public readonly timestamp: string;
  
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
  
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// Enhanced API Client with universe-bending features and retry logic
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private defaultRetryConfig: Partial<RetryConfig>;

  constructor(baseUrl?: string, retryConfig?: Partial<RetryConfig>) {
    this.baseUrl = baseUrl ?? env.WORKERSURL;

    // Default retry configuration for API requests
    this.defaultRetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryableStatus: [408, 429, 500, 502, 503, 504],
      timeout: 15000,
      circuitBreakerConfig: {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 60000,
        halfOpenMaxCalls: 3
      },
      ...retryConfig
    };

    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // Set authentication token
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Clear authentication token
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Get authentication headers
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method with error handling and retry logic
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryConfig?: Partial<RetryConfig>
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const finalConfig = { ...this.defaultRetryConfig, ...retryConfig };

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      logger.info('Making API request', {
        component: 'ApiClient',
        action: 'request',
        metadata: { endpoint, method: config.method || 'GET' }
      });

      // Use retry client for resilient requests
      const response = await retryClient.request<Response>(url, config, finalConfig);

      // Validate response object
        if (!response || typeof response !== 'object') {
        throw new ApiClientError('Invalid response object received', 0);
      }

      // Check if response has the methods we need
      if (typeof response.ok !== 'boolean' || typeof response.status !== 'number') {
        throw new ApiClientError('Invalid response format', 0);
      }

      // Handle error responses with proper type safety
      if (!response.ok) {
        interface ErrorResponse {
          error?: string;
          message?: string;
          code?: string;
          details?: Record<string, unknown>;
        }
        
        let errorData: ErrorResponse = {
          error: `HTTP ${response.status}: ${response.statusText}`
        };

        // Safely parse error response with proper typing
        try {
          if (response.json && typeof response.json === 'function') {
            const contentType = response.headers?.get?.('content-type') || '';
            if (contentType.includes('application/json')) {
              const parsedError = await response.json() as unknown;
              if (parsedError && typeof parsedError === 'object') {
                errorData = parsedError as ErrorResponse;
              }
            } else {
              const textError = await response.text();
              if (textError) {
                errorData.error = textError;
              }
            }
          }
        } catch (parseError: unknown) {
          logger.warn('Failed to parse error response', parseError instanceof Error ? parseError : new Error(String(parseError)));
        }

        const errorMessage = errorData.error || errorData.message || 'Request failed';
        throw new ApiClientError(
          errorMessage,
          response.status,
          errorData.code,
          errorData.details
        );
      }

      // Safely parse success response with strict typing
      let apiResponse: ApiResponse<T>;
      try {
        if (response.json && typeof response.json === 'function') {
          const contentType = response.headers?.get?.('content-type') || '';
          if (contentType.includes('application/json')) {
            const parsedData = await response.json() as unknown;
            // Validate that the response matches ApiResponse structure
            if (parsedData && typeof parsedData === 'object') {
              apiResponse = parsedData as ApiResponse<T>;
            } else {
              apiResponse = {
                success: true,
                data: parsedData as T,
                message: 'Request completed successfully'
              };
            }
          } else {
            // Handle non-JSON responses
            const textData = await response.text();
            apiResponse = {
              success: true,
              data: textData as T,
              message: 'Request completed successfully'
            };
          }
        } else {
          // Fallback for responses without json method
          apiResponse = {
            success: true,
            message: 'Request completed successfully'
          };
        }
      } catch (parseError: unknown) {
        // Fallback if JSON parsing fails
        logger.warn('Failed to parse response as JSON', parseError instanceof Error ? parseError : new Error(String(parseError)));
        apiResponse = {
          success: true,
          message: 'Request completed successfully'
        };
      }

      logger.info('API request successful', {
        component: 'ApiClient',
        action: 'requestSuccess',
        metadata: { endpoint, status: response.status }
      });

      return apiResponse;

    } catch (error: unknown) {
      logger.error('API request failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'ApiClient',
        action: 'requestFailed',
        metadata: { endpoint, url }
      });

      if (error instanceof ApiClientError) {
        throw error;
      }

      // Network or parsing error
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Network error occurred',
        0
      );
    }
  }

  // Helper method to parse error responses consistently
  private async parseErrorResponse(response: Response): Promise<{
    error?: string;
    message?: string;
    code?: string;
    details?: Record<string, unknown>;
  }> {
    let errorData = {
      error: `HTTP ${response.status}: ${response.statusText}`
    };

    try {
      if (response.json && typeof response.json === 'function') {
        const contentType = response.headers?.get?.('content-type') || '';
        if (contentType.includes('application/json')) {
          const parsedError = await response.json() as unknown;
          if (parsedError && typeof parsedError === 'object') {
            errorData = { ...errorData, ...parsedError } as typeof errorData;
          }
        } else {
          const textError = await response.text();
          if (textError) {
            errorData.error = textError;
          }
        }
      }
    } catch (parseError: unknown) {
      logger.warn('Failed to parse error response', parseError instanceof Error ? parseError : new Error(String(parseError)));
    }

    return errorData;
  }

  // Helper method to parse success responses consistently
  private async parseSuccessResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      if (response.json && typeof response.json === 'function') {
        const contentType = response.headers?.get?.('content-type') || '';
        if (contentType.includes('application/json')) {
          const parsedData = await response.json() as unknown;
          if (parsedData && typeof parsedData === 'object') {
            return parsedData as ApiResponse<T>;
          } else {
            return {
              success: true,
              data: parsedData as T,
              message: 'Request completed successfully'
            };
          }
        } else {
          const textData = await response.text();
          return {
            success: true,
            data: textData as T,
            message: 'Request completed successfully'
          };
        }
      } else {
        return {
          success: true,
          message: 'Request completed successfully'
        };
      }
    } catch (parseError: unknown) {
      logger.warn('Failed to parse response as JSON', parseError instanceof Error ? parseError : new Error(String(parseError)));
      return {
        success: true,
        message: 'Request completed successfully'
      };
    }
  }

  // Request method with no retry (for specific cases)
  private async requestWithoutRetry<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Validate response object
        if (!response || typeof response !== 'object') {
        throw new ApiClientError('Invalid response object received', 0);
      }

      if (!response.ok) {
        const errorResponse = await this.parseErrorResponse(response);
        throw new ApiClientError(
          errorResponse.error || errorResponse.message || 'Request failed',
          response.status,
          errorResponse.code,
          errorResponse.details
        );
      }

      const data = await this.parseSuccessResponse<T>(response);

      return apiResponse;
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      // Network or parsing error
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Network error occurred',
        0
      );
    }
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await this.request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      // Handle different response formats
      if (response.success) {
        const token = response.data?.token || response.data?.accessToken;
        if (token) {
          this.setToken(token);
        } else {
          logger.warn('Login successful but no token found in response', undefined, {
            component: 'ApiClient',
            action: 'login'
          });
        }
      }

      return response;
    } catch (error: unknown) {
      logger.error('Login failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'ApiClient',
        action: 'login'
      });
      throw error;
    }
  }

  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await this.request<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Handle different response formats
      if (response.success) {
        const token = response.data?.token || response.data?.accessToken;
        if (token) {
          this.setToken(token);
        } else {
          logger.warn('Registration successful but no token found in response', undefined, {
            component: 'ApiClient',
            action: 'register'
          });
        }
      }

      return response;
    } catch (error: unknown) {
      logger.error('Registration failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'ApiClient',
        action: 'register'
      });
      throw error;
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'No authentication token available'
        };
      }

      return this.request<User>('/api/auth/me');
    } catch (error: unknown) {
      // Clear token if authentication fails
      if (error instanceof ApiClientError && error.status === 401) {
        logger.info('Auth token invalid, clearing token', undefined, {
          component: 'ApiClient',
          action: 'getCurrentUser'
        });
        this.clearToken();
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.clearToken();
    // Call logout endpoint if your backend supports it
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors - token is already cleared
    }
  }

  // Onboarding
  async completeOnboarding(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/api/onboard', {
      method: 'POST',
    });
  }

  // Content operations
  async getContent(): Promise<ApiResponse<Content[]>> {
    return this.request<Content[]>('/api/content');
  }

  async createContent(content: Partial<Content>): Promise<ApiResponse<Content>> {
    return this.request<Content>('/api/content', {
      method: 'POST',
      body: JSON.stringify(content),
    });
  }

  async updateContent(id: string, content: Partial<Content>): Promise<ApiResponse<Content>> {
    return this.request<Content>(`/api/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(content),
    });
  }

  async deleteContent(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/content/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalytics(timeRange = '7d'): Promise<ApiResponse<AnalyticsData>> {
    return this.request<AnalyticsData>(`/api/analytics?timeRange=${timeRange}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; services: Record<string, string> }>> {
    return this.request('/api/health');
  }

  // Real-time features
  createEventSource(endpoint: string): EventSource | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const url = buildApiUrl(endpoint);
    return new EventSource(url);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Helper functions for common operations
export const auth = {
  login: (credentials: LoginCredentials) => apiClient.login(credentials),
  register: (data: RegisterData) => apiClient.register(data),
  logout: () => apiClient.logout(),
  getCurrentUser: () => apiClient.getCurrentUser(),
  completeOnboarding: () => apiClient.completeOnboarding(),
};

export const content = {
  getAll: () => apiClient.getContent(),
  create: (data: Partial<Content>) => apiClient.createContent(data),
  update: (id: string, data: Partial<Content>) => apiClient.updateContent(id, data),
  delete: (id: string) => apiClient.deleteContent(id),
};

export const analytics = {
  getData: (timeRange?: string) => apiClient.getAnalytics(timeRange),
};

// Universe-bending API hooks will be built on top of this client