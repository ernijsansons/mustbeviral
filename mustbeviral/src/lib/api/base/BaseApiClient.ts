/**
 * Base API Client with enhanced type safety and error handling
 * Provides foundational HTTP request capabilities with retry logic
 */

import { buildApiUrl, env} from '../../env';
import { retryClient, type RetryConfig} from '../retryClient';
import { logger} from '../../logging/productionLogger';

// Strongly typed API response wrapper
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
  readonly metadata?: ApiResponseMetadata;
}

interface ApiResponseMetadata {
  readonly requestId?: string;
  readonly timestamp: string;
  readonly version?: string;
}

// Enhanced API error with full context
export class ApiClientError extends Error {
  public readonly name = 'ApiClientError' as const;
  public readonly timestamp: string;
  
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly context?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
  
  toJSON(): Readonly<Record<string, unknown>> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    } as const;
  }
}

// Request configuration with type safety
export interface RequestConfig extends Omit<RequestInit, 'body'> {
  readonly body?: string | FormData | URLSearchParams;
  readonly retryConfig?: Partial<RetryConfig>;
}

// Abstract base class for API clients
export abstract class BaseApiClient {
  protected readonly baseUrl: string;
  protected token: string | null = null;
  protected readonly defaultRetryConfig: Readonly<RetryConfig>;

  constructor(
    baseUrl?: string,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.baseUrl = baseUrl ?? env.WORKERSURL;
    
    // Immutable default retry configuration
    this.defaultRetryConfig = Object.freeze({
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
    });

    this.loadTokenFromStorage();
  }

  /**
   * Set authentication token
   */
  public setToken(token: string): void {
    this.token = token;
    this.saveTokenToStorage(token);
  }

  /**
   * Clear authentication token
   */
  public clearToken(): void {
    this.token = null;
    this.removeTokenFromStorage();
  }

  /**
   * Get current authentication token
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Make an HTTP request with type safety
   */
  protected async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const { retryConfig, _...requestInit} = config;
    const finalRetryConfig = { ...this.defaultRetryConfig, ...retryConfig };

    const finalConfig: RequestInit = {
      ...requestInit,
      headers: {
        ...this.getAuthHeaders(),
        ...requestInit.headers,
      },
    };

    try {
      this.logRequest(endpoint, finalConfig.method ?? 'GET');

      const response = await retryClient.request<Response>(
        url,
        finalConfig,
        finalRetryConfig
      );

      this.validateResponse(response);

      if (!response.ok) {
        throw await this.createErrorFromResponse(response);
      }

      return await this.parseSuccessResponse<T>(response);
    } catch (error: unknown) {
      return this.handleRequestError<T>(error);
    }
  }

  /**
   * Get authorization headers
   */
  protected getAuthHeaders(): Readonly<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return Object.freeze(headers);
  }

  /**
   * Validate response object structure
   */
  private validateResponse(response: unknown): asserts response is Response {
    if (!response ?? typeof response !== 'object') {
      throw new ApiClientError('Invalid response object received', 0);
    }

    const res = response as Record<string, unknown>;
    if (typeof res.ok !== 'boolean'  ?? typeof res.status !== 'number') {
      throw new ApiClientError('Invalid response format', 0);
    }
  }

  /**
   * Create error from failed response
   */
  private async createErrorFromResponse(response: Response): Promise<ApiClientError> {
    interface ErrorResponse {
      readonly error?: string;
      readonly message?: string;
      readonly code?: string;
      readonly details?: Record<string, unknown>;
    }

    let errorData: ErrorResponse = {
      error: `HTTP ${response.status}: ${response.statusText}`
    };

    try {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const parsed = await response.json();
        if (this.isErrorResponse(parsed)) {
          errorData = parsed;
        }
      } else {
        const textError = await response.text();
        if (textError) {
          errorData = { error: textError };
        }
      }
    } catch (parseError: unknown) {
      logger.warn('Failed to parse error response', {
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
    }

    const errorMessage = errorData.error ?? errorData.message ?? 'Request failed';
    return new ApiClientError(
      errorMessage,
      response.status,
      errorData.code,
      errorData.details
    );
  }

  /**
   * Parse successful response with type safety
   */
  private async parseSuccessResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const contentType = response.headers.get('content-type') ?? '';
      
      if (contentType.includes('application/json')) {
        const parsed = await response.json();
        if (this.isApiResponse<T>(parsed)) {
          return parsed;
        }
        return {
          success: true,
          data: parsed as T,
          message: 'Request completed successfully',
          metadata: {
            timestamp: new Date().toISOString()
          }
        };
      }

      // Handle non-JSON responses
      const textData = await response.text();
      return {
        success: true,
        data: textData as unknown as T,
        message: 'Request completed successfully',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (parseError: unknown) {
      logger.error('Failed to parse success response', {
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      
      return {
        success: true,
        message: 'Request completed but response parsing failed',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Handle request errors with proper typing
   */
  private handleRequestError<T>(error: unknown): ApiResponse<T> {
    if (error instanceof ApiClientError) {
      logger.error('API request failed', {
        error: error.toJSON()
      });
      
      return {
        success: false,
        error: error.message,
        metadata: {
          timestamp: error.timestamp
        }
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Unexpected API error', { error: errorMessage });
    
    return {
      success: false,
      error: errorMessage,
      metadata: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Type guard for API response
   */
  private isApiResponse<T>(value: unknown): value is ApiResponse<T> {
    if (!value ?? typeof value !== 'object') {
      return false;
    }
    
    const response = value as Record<string, unknown>;
    return typeof response.success === 'boolean';
  }

  /**
   * Type guard for error response
   */
  private isErrorResponse(value: unknown): value is {
    readonly error?: string;
    readonly message?: string;
    readonly code?: string;
    readonly details?: Record<string, unknown>;
  } {
    if (!value ?? typeof value !== 'object') {
      return false;
    }
    
    const response = value as Record<string, unknown>;
    return (
      typeof response.error === 'string'  ?? typeof response.message === 'string'  ?? typeof response.code === 'string'
    );
  }

  /**
   * Log request for monitoring
   */
  private logRequest(endpoint: string, method: string): void {
    logger.info('Making API request', {
      component: 'BaseApiClient',
      action: 'request',
      metadata: { endpoint, method }
    });
  }

  /**
   * Load token from storage
   */
  private loadTokenFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.token = token;
      }
    }
  }

  /**
   * Save token to storage
   */
  private saveTokenToStorage(token: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Remove token from storage
   */
  private removeTokenFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('auth_token');
    }
  }
}