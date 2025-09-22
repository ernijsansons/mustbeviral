/**
 * Authentication System Tests
 */

import { AuthService } from '../../../src/lib/auth';
import { _useAuth, AuthProvider } from '../../../src/hooks/useAuth';
import { _render, renderHook, act, waitFor } from '@testing-library/react';
import { expectRenderToThrow } from '../../utils/testUtils';
import React from 'react';

// Mock API client
jest.mock('../../../src/lib/api', () => ({
  apiClient: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    clearToken: jest.fn()
  },
  ApiClientError: class ApiClientError extends Error {
    constructor(message: string, public mockStatus: number) {
      super(message);
      this.name = 'ApiClientError';
      (this as unknown).status = mockStatus;
    }
  }
}));

// Get the mocked apiClient for use in tests
const { apiClient: mockApiClient } = jest.requireMock('../../../src/lib/api');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock JWT decode
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn()
}));

import jwt from 'jsonwebtoken';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Login', () => {
    it('should login with email and password', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'jwt-token',
        refreshToken: 'refresh-token'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockResponse.user);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password'
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'jwt-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
    });

    it('should handle login failure', async () => {
      const mockError = new Error('Invalid credentials');
      mockApiClient.post.mockRejectedValue(mockError);

      const result = await authService.login('test@example.com', 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const result = await authService.login('invalid-email', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should validate password strength', async () => {
      const result = await authService.login('test@example.com', '123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 6 characters');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('Registration', () => {
    it('should register new user with valid data', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        company: 'Test Corp'
      };

      const mockResponse = {
        user: { id: '2', ...userData },
        token: 'jwt-token',
        refreshToken: 'refresh-token'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockResponse.user);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', userData);
    });

    it('should handle registration with existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const mockError = new Error('Email already exists');
      (mockError as unknown).status = 409;

      mockApiClient.post.mockRejectedValue(mockError);

      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'test@example.com'
      };

      const result = await authService.register(incompleteData as unknown);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name and password are required');
    });
  });

  describe('Token Management', () => {
    it('should get token from localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('stored-token');

      const token = await authService.getToken();

      expect(token).toBe('stored-token');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const token = await authService.getToken();

      expect(token).toBeNull();
    });

    it('should validate token expiration', async () => {
      const expiredToken = 'expired-jwt-token';
      mockLocalStorage.getItem.mockReturnValue(expiredToken);

      (jwt.decode as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const token = await authService.getToken();

      expect(token).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should refresh token when near expiration', async () => {
      const nearExpiryToken = 'near-expiry-token';
      const newToken = 'refreshed-token';

      mockLocalStorage.getItem
        .mockReturnValueOnce(nearExpiryToken)
        .mockReturnValueOnce('refresh-token');

      (jwt.decode as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 300 // Expires in 5 minutes
      });

      mockApiClient.post.mockResolvedValue({
        token: newToken,
        refreshToken: 'new-refresh-token'
      });

      const token = await authService.getToken();

      expect(token).toBe(newToken);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'refresh-token'
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', newToken);
    });
  });

  describe('User Profile', () => {
    it('should get current user profile', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Corp'
      };

      mockApiClient.get.mockResolvedValue(mockUser);
      mockLocalStorage.getItem.mockReturnValue('valid-token');

      const user = await authService.getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should return null when not authenticated', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        company: 'New Company'
      };

      const mockUpdatedUser = {
        id: '1',
        email: 'test@example.com',
        ...updateData
      };

      mockApiClient.put.mockResolvedValue(mockUpdatedUser);

      const result = await authService.updateProfile(updateData);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockApiClient.put).toHaveBeenCalledWith('/auth/profile', updateData);
    });
  });

  describe('Password Management', () => {
    it('should change password with current password', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      mockApiClient.put.mockResolvedValue({ success: true });

      const result = await authService.changePassword(passwordData);

      expect(result.success).toBe(true);
      expect(mockApiClient.put).toHaveBeenCalledWith('/auth/password', passwordData);
    });

    it('should handle incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      const mockError = new Error('Current password is incorrect');
      (mockError as unknown).status = 400;

      mockApiClient.put.mockRejectedValue(mockError);

      const result = await authService.changePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should request password reset', async () => {
      mockApiClient.post.mockResolvedValue({ success: true });

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/password-reset', {
        email: 'test@example.com'
      });
    });

    it('should reset password with token', async () => {
      const resetData = {
        token: 'reset-token',
        newPassword: 'newpassword123'
      };

      mockApiClient.post.mockResolvedValue({ success: true });

      const result = await authService.resetPassword(resetData);

      expect(result.success).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/password-reset/confirm', resetData);
    });
  });

  describe('Logout', () => {
    it('should logout and clear stored tokens', async () => {
      mockApiClient.post.mockResolvedValue({ success: true });

      await authService.logout();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('should clear tokens even if logout request fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('Session Management', () => {
    it('should check if user is authenticated', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      (jwt.decode as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
      });

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false for expired tokens', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token');
      (jwt.decode as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    it('should extend session on activity', async () => {
      const mockResponse = {
        token: 'extended-token',
        expiresAt: Date.now() + 3600000
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      await authService.extendSession();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/extend-session');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'extended-token');
    });
  });
});

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthProvider>
      {children}
    </AuthProvider>
  );

  it('should provide authentication state', async () => {
    mockLocalStorage.getItem.mockReturnValue('valid-token');
    mockApiClient.getCurrentUser.mockResolvedValue({
      success: true,
      data: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'creator'
      }
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'creator'
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle login through hook', async () => {
    mockApiClient.login.mockResolvedValue({
      success: true,
      data: {
        user: { id: '1', email: 'test@example.com', username: 'testuser', role: 'creator' },
        token: 'jwt-token'
      }
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const loginResult = await result.current.login('test@example.com', 'password');
      expect(loginResult.success).toBe(true);
    });

    expect(mockApiClient.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
  });

  it('should handle logout through hook', async () => {
    mockApiClient.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockApiClient.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should show loading state during authentication check', () => {
    mockApiClient.getCurrentUser.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: null }), 100))
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle authentication errors', async () => {
    const { ApiClientError } = jest.requireMock('../../../src/lib/api');
    mockLocalStorage.getItem.mockReturnValue('invalid-token');
    mockApiClient.getCurrentUser.mockRejectedValue(new ApiClientError('Unauthorized', 401));

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('AuthProvider', () => {
  it('should provide auth context to children', () => {
    const TestChild: React.FC = () => {
      const { isAuthenticated } = useAuth();
      return <div>{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
    };

    mockApiClient.getCurrentUser.mockResolvedValue({ success: false });

    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    expect(mockApiClient.getCurrentUser).toHaveBeenCalled();
  });

  it('should throw error when useAuth is used outside provider', () => {
    const TestComponent: React.FC = () => {
      useAuth();
      return <div>Test</div>;
    };

    expectRenderToThrow(
      <TestComponent />,
      'useAuth must be used within an AuthProvider'
    );
  });
});