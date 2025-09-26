/**
 * Authentication Service
 * Handles all authentication-related API operations
 */

import { BaseApiClient, type ApiResponse } from '../base/BaseApiClient';
import type { RetryConfig } from '../../retryClient';

// Strongly typed authentication interfaces
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface RegisterData {
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly role: 'creator' | 'influencer';
}

export interface User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly role: 'creator' | 'influencer' | 'admin';
  readonly onboarding_completed: boolean;
  readonly ai_preference_level: number;
  readonly profile_data: Readonly<Record<string, unknown>>;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresIn: number;
  readonly tokenType: string;
}

export interface AuthResponse {
  readonly user: User;
  readonly tokens: AuthTokens;
}

export interface PasswordResetRequest {
  readonly email: string;
}

export interface PasswordResetConfirmation {
  readonly token: string;
  readonly newPassword: string;
}

export interface EmailVerification {
  readonly token: string;
}

/**
 * Authentication service for managing user authentication
 */
export class AuthService extends BaseApiClient {
  private currentUser: User | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(baseUrl?: string, retryConfig?: Partial<RetryConfig>) {
    super(baseUrl, retryConfig);
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      this.handleAuthSuccess(response.data);
    }

    return response;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      this.handleAuthSuccess(response.data);
    }

    return response;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });

    this.handleLogout();
    return response;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(forceRefresh = false): Promise<ApiResponse<User>> {
    if (!forceRefresh && this.currentUser) {
      return {
        success: true,
        data: this.currentUser,
        message: 'User retrieved from cache',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }

    const response = await this.request<User>('/api/auth/me');
    
    if (response.success && response.data) {
      this.currentUser = response.data;
    }

    return response;
  }

  /**
   * Complete user onboarding
   */
  async completeOnboarding(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.request<{ user: User }>('/api/onboard', {
      method: 'POST',
    });

    if (response.success && response.data) {
      this.currentUser = response.data.user;
    }

    return response;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken?: string): Promise<ApiResponse<AuthTokens>> {
    const token = refreshToken ?? this.getStoredRefreshToken();
    
    if (!token) {
      return {
        success: false,
        error: 'No refresh token available',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }

    const response = await this.request<AuthTokens>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    });

    if (response.success && response.data) {
      this.handleTokenRefresh(response.data);
    }

    return response;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(confirmation: PasswordResetConfirmation): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify(confirmation),
    });
  }

  /**
   * Verify email address
   */
  async verifyEmail(verification: EmailVerification): Promise<ApiResponse<{ user: User }>> {
    const response = await this.request<{ user: User }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(verification),
    });

    if (response.success && response.data) {
      this.currentUser = response.data.user;
    }

    return response;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Get cached current user
   */
  getCachedUser(): User | null {
    return this.currentUser;
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(authData: AuthResponse): void {
    this.setToken(authData.tokens.accessToken);
    this.currentUser = authData.user;
    
    if (authData.tokens.refreshToken) {
      this.storeRefreshToken(authData.tokens.refreshToken);
    }

    this.setupTokenRefresh(authData.tokens.expiresIn);
  }

  /**
   * Handle token refresh
   */
  private handleTokenRefresh(tokens: AuthTokens): void {
    this.setToken(tokens.accessToken);
    
    if (tokens.refreshToken) {
      this.storeRefreshToken(tokens.refreshToken);
    }

    this.setupTokenRefresh(tokens.expiresIn);
  }

  /**
   * Handle logout
   */
  private handleLogout(): void {
    this.clearToken();
    this.currentUser = null;
    this.clearRefreshToken();
    this.clearTokenRefreshTimer();
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(expiresIn: number): void {
    this.clearTokenRefreshTimer();

    // Refresh token 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().catch(error => {
          console.error('Token refresh failed:', error);
          this.handleLogout();
        });
      }, refreshTime);
    }
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Store refresh token
   */
  private storeRefreshToken(token: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('refresh_token', token);
    }
  }

  /**
   * Get stored refresh token
   */
  private getStoredRefreshToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  /**
   * Clear refresh token
   */
  private clearRefreshToken(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('refresh_token');
    }
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    this.clearTokenRefreshTimer();
    this.currentUser = null;
  }
}