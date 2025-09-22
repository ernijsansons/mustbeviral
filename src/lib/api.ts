// Universe-Bending API Client
// Connects to your excellent Cloudflare Workers backend

import { _buildApiUrl, env } from './env';
import { _retryClient, type RetryConfig } from './api/retryClient';
import { logger } from './logging/productionLogger';

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

// Custom API Error class
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Enhanced API Client with universe-bending features and retry logic
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private defaultRetryConfig: Partial<RetryConfig>;

  constructor(baseUrl?: string, retryConfig?: Partial<RetryConfig>) {
    this.baseUrl = baseUrl || env.WORKERS_URL;

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
        metadata: { _endpoint, method: config.method || 'GET' }
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

      // Handle response
      if (!response.ok) {
        let errorData: unknown = {
          error: `HTTP ${response.status}: ${response.statusText}`
        };

        // Safely try to parse error response
        try {
          if (response.json && typeof response.json === 'function') {
            const contentType = response.headers?.get?.('content-type') || '';
            if (contentType.includes('application/json')) {
              errorData = await response.json();
            } else {
              errorData = { error: await response.text() || errorData.error };
            }
          }
        } catch (parseError: unknown) {
          // Use default error if parsing fails
          logger.warn('Failed to parse error response', parseError instanceof Error ? parseError : new Error(String(parseError)));
        }

        throw new ApiClientError(
          errorData.error || errorData.message || 'Request failed',
          response.status,
          errorData.code
        );
      }

      // Safely parse success response
      let data: unknown;
      try {
        if (response.json && typeof response.json === 'function') {
          const contentType = response.headers?.get?.('content-type') || '';
          if (contentType.includes('application/json')) {
            data = await response.json();
          } else {
            // Handle non-JSON responses
            data = {
              success: true,
              data: await response.text(),
              message: 'Request completed successfully'
            };
          }
        } else {
          // Fallback for responses without json method
          data = {
            success: true,
            message: 'Request completed successfully'
          };
        }
      } catch (parseError: unknown) {
        // Fallback if JSON parsing fails
        logger.warn('Failed to parse response as JSON', parseError instanceof Error ? parseError : new Error(String(parseError)));
        data = {
          success: true,
          message: 'Request completed successfully'
        };
      }

      logger.info('API request successful', {
        component: 'ApiClient',
        action: 'requestSuccess',
        metadata: { _endpoint, status: response.status }
      });

      return data;

    } catch (error: unknown) {
      logger.error('API request failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'ApiClient',
        action: 'requestFailed',
        metadata: { _endpoint, url }
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
        let errorData: unknown = {
          error: `HTTP ${response.status}: ${response.statusText}`
        };

        // Safely try to parse error response
        try {
          if (response.json && typeof response.json === 'function') {
            const contentType = response.headers?.get?.('content-type') || '';
            if (contentType.includes('application/json')) {
              errorData = await response.json();
            } else {
              errorData = { error: await response.text() || errorData.error };
            }
          }
        } catch (parseError: unknown) {
          // Use default error if parsing fails
          logger.warn('Failed to parse error response', parseError instanceof Error ? parseError : new Error(String(parseError)));
        }

        throw new ApiClientError(
          errorData.error || errorData.message || 'Request failed',
          response.status,
          errorData.code
        );
      }

      // Safely parse success response
      let data: unknown;
      try {
        if (response.json && typeof response.json === 'function') {
          const contentType = response.headers?.get?.('content-type') || '';
          if (contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = {
              success: true,
              data: await response.text(),
              message: 'Request completed successfully'
            };
          }
        } else {
          data = {
            success: true,
            message: 'Request completed successfully'
          };
        }
      } catch (parseError: unknown) {
        logger.warn('Failed to parse response as JSON', parseError instanceof Error ? parseError : new Error(String(parseError)));
        data = {
          success: true,
          message: 'Request completed successfully'
        };
      }

      return data;
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