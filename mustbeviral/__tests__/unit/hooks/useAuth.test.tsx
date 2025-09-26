// Comprehensive unit tests for useAuth hook
// Tests authentication context, login/logout, error handling, and state management

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../../src/hooks/useAuth';
import { apiClient, ApiClientError } from '../../../src/lib/api';
import { logger } from '../../../src/lib/logging/productionLogger';

// Mock dependencies
jest.mock('../../../src/lib/api');
jest.mock('../../../src/lib/logging/productionLogger');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'creator' as const,
  onboarding_completed: true,
  ai_preference_level: 3,
};

const mockToken = 'mock-jwt-token';

describe('useAuth', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockLocalStorage.getItem.mockReturnValue(null);
    mockApiClient.getCurrentUser.mockResolvedValue({
      success: true,
      data: mockUser,
    });
    mockApiClient.login.mockResolvedValue({
      success: true,
      data: { user: mockUser, token: mockToken },
    });
    mockApiClient.register.mockResolvedValue({
      success: true,
      data: { user: mockUser, token: mockToken },
    });
    mockApiClient.logout.mockResolvedValue({
      success: true,
      data: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should initialize without token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
      
      expect(mockApiClient.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should initialize with valid token', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      expect(mockApiClient.getCurrentUser).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth initialized successfully',
        undefined,
        {
          component: 'useAuth',
          action: 'initializeAuth',
          metadata: { userId: mockUser.id },
        }
      );
    });

    it('should handle invalid token during initialization', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: false,
        error: 'Invalid token',
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockApiClient.clearToken).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid auth token during initialization',
        undefined,
        {
          component: 'useAuth',
          action: 'initializeAuth',
        }
      );
    });

    it('should handle initialization errors', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      const error = new ApiClientError('Network error', 500);
      mockApiClient.getCurrentUser.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error).toBe('Failed to initialize authentication');
      });
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockApiClient.clearToken).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth initialization failed',
        error,
        {
          component: 'useAuth',
          action: 'initializeAuth',
        }
      );
    });

    it('should not set error for 401 errors during initialization', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      const error = new ApiClientError('Unauthorized', 401);
      mockApiClient.getCurrentUser.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull(); // Should not set error for 401
      });
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      let loginResult: { success: boolean; error?: string };
      
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'password123');
      });
      
      expect(loginResult!.success).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      
      expect(mockApiClient.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle login failure', async () => {
      mockApiClient.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      let loginResult: { success: boolean; error?: string };
      
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'wrongpassword');
      });
      
      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBe('Invalid credentials');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should handle login network error', async () => {
      const error = new Error('Network failure');
      mockApiClient.login.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      let loginResult: { success: boolean; error?: string };
      
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'password123');
      });
      
      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBe('Login failed due to network error');
      expect(result.current.error).toBe('Login failed due to network error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Login failed',
        error,
        {
          component: 'useAuth',
          action: 'login',
        }
      );
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      
      mockApiClient.login.mockReturnValue(loginPromise);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      act(() => {
        result.current.login('test@example.com', 'password123');
      });
      
      expect(result.current.isLoading).toBe(true);
      
      await act(async () => {
        resolveLogin!({
          success: true,
          data: { user: mockUser, token: mockToken },
        });
      });
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      let registerResult: { success: boolean; error?: string };
      
      await act(async () => {
        registerResult = await result.current.register(
          'test@example.com',
          'testuser',
          'password123',
          'creator'
        );
      });
      
      expect(registerResult!.success).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      
      expect(mockApiClient.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        role: 'creator',
      });
    });

    it('should handle registration failure', async () => {
      mockApiClient.register.mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      let registerResult: { success: boolean; error?: string };
      
      await act(async () => {
        registerResult = await result.current.register(
          'test@example.com',
          'testuser',
          'password123',
          'creator'
        );
      });
      
      expect(registerResult!.success).toBe(false);
      expect(registerResult!.error).toBe('Email already exists');
      expect(result.current.error).toBe('Email already exists');
    });

    it('should handle registration network error', async () => {
      const error = new Error('Network error');
      mockApiClient.register.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      let registerResult: { success: boolean; error?: string };
      
      await act(async () => {
        registerResult = await result.current.register(
          'test@example.com',
          'testuser',
          'password123',
          'creator'
        );
      });
      
      expect(registerResult!.success).toBe(false);
      expect(registerResult!.error).toBe('Registration failed due to network error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Registration failed',
        error,
        {
          component: 'useAuth',
          action: 'register',
        }
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // First login
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      // Then logout
      await act(async () => {
        await result.current.logout();
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      
      expect(mockApiClient.logout).toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockApiClient.clearToken).toHaveBeenCalled();
    });

    it('should handle logout failure gracefully', async () => {
      mockApiClient.logout.mockRejectedValue(new Error('Logout failed'));
      
      // First login
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      // Logout should still clear local state even if API fails
      await act(async () => {
        await result.current.logout();
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Logout failed',
        expect.any(Error),
        {
          component: 'useAuth',
          action: 'logout',
        }
      );
    });

    it('should set loading state during logout', async () => {
      let resolveLogout: (value: any) => void;
      const logoutPromise = new Promise((resolve) => {
        resolveLogout = resolve;
      });
      
      mockApiClient.logout.mockReturnValue(logoutPromise);
      
      // First login
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isLoading).toBe(false);
      });
      
      act(() => {
        result.current.logout();
      });
      
      expect(result.current.isLoading).toBe(true);
      
      await act(async () => {
        resolveLogout!({ success: true, data: null });
      });
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refreshAuth', () => {
    it('should refresh authentication successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Mock updated user data
      const updatedUser = { ...mockUser, username: 'updateduser' };
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: true,
        data: updatedUser,
      });
      
      await act(async () => {
        await result.current.refreshAuth();
      });
      
      expect(result.current.user).toEqual(updatedUser);
      expect(mockApiClient.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle refresh failure', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      
      // Mock refresh failure
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: false,
        error: 'Token expired',
      });
      
      await act(async () => {
        await result.current.refreshAuth();
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('error handling', () => {
    it('should clear error when clearError is called', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Trigger an error
      mockApiClient.login.mockResolvedValue({
        success: false,
        error: 'Test error',
      });
      
      await act(async () => {
        await result.current.login('test@example.com', 'wrongpassword');
      });
      
      expect(result.current.error).toBe('Test error');
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });

    it('should clear error on successful operations', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Set an error first
      act(() => {
        (result.current as any).setError('Previous error');
      });
      
      // Successful login should clear error
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('context usage', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide all context values', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current).toMatchObject({
        user: expect.any(Object),
        isLoading: expect.any(Boolean),
        isAuthenticated: expect.any(Boolean),
        login: expect.any(Function),
        register: expect.any(Function),
        logout: expect.any(Function),
        refreshAuth: expect.any(Function),
        clearError: expect.any(Function),
        error: null,
      });
    });
  });

  describe('isAuthenticated computed property', () => {
    it('should be false when user is null', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should be true when user is present', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle non-Error objects thrown during initialization', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      mockApiClient.getCurrentUser.mockRejectedValue('String error');
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
      });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth initialization failed',
        new Error('String error'),
        {
          component: 'useAuth',
          action: 'initializeAuth',
        }
      );
    });

    it('should handle concurrent operations gracefully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Start multiple operations concurrently
      const loginPromise = act(async () => {
        return result.current.login('test1@example.com', 'password123');
      });
      
      const registerPromise = act(async () => {
        return result.current.register('test2@example.com', 'testuser2', 'password123', 'creator');
      });
      
      await Promise.all([loginPromise, registerPromise]);
      
      // Should not crash and state should be consistent
      expect(result.current.user).toBeTruthy();
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('localStorage interactions', () => {
    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error');
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Should not crash and should default to unauthenticated state
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle malformed tokens in localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token');
      mockApiClient.getCurrentUser.mockRejectedValue(new ApiClientError('Invalid token', 401));
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});