// Enhanced Authentication Hook with error recovery
import { createContext, useContext, useEffect, useState, ReactNode} from 'react';
import { apiClient, type User, type ApiResponse, ApiClientError} from '../lib/api';
import { logger} from '../lib/logging/productionLogger';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, password: string, role: 'creator' | 'influencer') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Initialize auth on mount
  useEffect_(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have a token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify token and get current user
      const response = await apiClient.getCurrentUser();

      if (response.success && response.data) {
        setUser(response.data);
        logger.info('Auth initialized successfully', undefined, {
          component: 'useAuth',
          action: 'initializeAuth',
          metadata: { userId: response.data.id }
        });
      } else {
        // Token invalid, clear it
        localStorage.removeItem('auth_token');
        apiClient.clearToken();
        setUser(null);
        logger.warn('Invalid auth token during initialization', undefined, {
          component: 'useAuth',
          action: 'initializeAuth'
        });
      }
    } catch (err: unknown) {
      logger.error('Auth initialization failed', err instanceof Error ? err : new Error(String(err)), {
        component: 'useAuth',
        action: 'initializeAuth'
      });

      // Clear potentially invalid token
      localStorage.removeItem('auth_token');
      apiClient.clearToken();
      setUser(null);

      // Only set error if it's not a network/auth issue
      if (err instanceof ApiClientError && err.status !== 401) {
        setError('Failed to initialize authentication');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.login({ email, password });

      if (response.success && response.data) {
        setUser(response.data.user);
        logger.info('Login successful', undefined, {
          component: 'useAuth',
          action: 'login',
          metadata: { userId: response.data.user.id }
        });
        return { success: true };
      } else {
        const errorMsg = response.error ?? 'Login failed';
        setError(errorMsg);
        logger.warn('Login failed', undefined, {
          component: 'useAuth',
          action: 'login',
          metadata: { error: errorMsg }
        });
        return { success: false, error: errorMsg };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof ApiClientError
        ? err.message
        : 'Network error occurred during login';

      logger.error('Login error', err instanceof Error ? err : new Error(String(err)), {
        component: 'useAuth',
        action: 'login'
      });

      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string, role: 'creator' | 'influencer') => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.register({ email, username, password, role });

      if (response.success && response.data) {
        setUser(response.data.user);
        logger.info('Registration successful', undefined, {
          component: 'useAuth',
          action: 'register',
          metadata: { userId: response.data.user.id }
        });
        return { success: true };
      } else {
        const errorMsg = response.error ?? 'Registration failed';
        setError(errorMsg);
        logger.warn('Registration failed', undefined, {
          component: 'useAuth',
          action: 'register',
          metadata: { error: errorMsg }
        });
        return { success: false, error: errorMsg };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof ApiClientError
        ? err.message
        : 'Network error occurred during registration';

      logger.error('Registration error', err instanceof Error ? err : new Error(String(err)), {
        component: 'useAuth',
        action: 'register'
      });

      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
      setUser(null);
      setError(null);
      logger.info('Logout successful', undefined, {
        component: 'useAuth',
        action: 'logout'
      });
    } catch (err: unknown) {
      logger.error('Logout error', err instanceof Error ? err : new Error(String(err)), {
        component: 'useAuth',
        action: 'logout'
      });
      // Still clear user state even if logout fails
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    try {
      setError(null);
      const response = await apiClient.getCurrentUser();

      if (response.success && response.data) {
        setUser(response.data);
        logger.info('Auth refresh successful', undefined, {
          component: 'useAuth',
          action: 'refreshAuth',
          metadata: { userId: response.data.id }
        });
      } else {
        // Token invalid, clear auth
        setUser(null);
        apiClient.clearToken();
        logger.warn('Auth refresh failed - invalid token', undefined, {
          component: 'useAuth',
          action: 'refreshAuth'
        });
      }
    } catch (err: unknown) {
      logger.error('Auth refresh error', err instanceof Error ? err : new Error(String(err)), {
        component: 'useAuth',
        action: 'refreshAuth'
      });

      if (err instanceof ApiClientError && err.status === 401) {
        // Token expired/invalid, clear auth
        setUser(null);
        apiClient.clearToken();
      } else {
        setError('Failed to refresh authentication');
      }
    }
  };

  const value: AuthContextType = { user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshAuth,
    clearError,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;