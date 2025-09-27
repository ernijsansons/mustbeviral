// Protected Route Component with enhanced error recovery
import { ReactNode, useEffect} from 'react';
import { useLocation} from 'wouter';
import { useAuth} from '../hooks/useAuth';
import { AlertCircle, RefreshCw, Loader2} from 'lucide-react';
import { logger} from '../lib/logging/productionLogger';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireOnboarding?: boolean;
  requiredRole?: 'creator' | 'influencer' | 'admin';
}

export function ProtectedRoute(_{ children, fallback = null, requireOnboarding = false, requiredRole
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, isLoading, error, refreshAuth, clearError} = useAuth();

  useEffect_(() => {
    if (!isLoading && !error) {
      if (!isAuthenticated) {
        logger.info('User not authenticated, redirecting to login', undefined, {
          component: 'ProtectedRoute',
          action: 'redirectUnauthenticated'
        });
        setLocation('/login');
        return;
      }

      if (requireOnboarding && user && !user.onboardingcompleted) {
        logger.info('User not onboarded, redirecting to onboarding', undefined, {
          component: 'ProtectedRoute',
          action: 'redirectToOnboarding',
          metadata: { requireOnboarding, onboardingCompleted: user.onboardingcompleted }
        });
        setLocation('/onboard');
        return;
      }

      if (!requireOnboarding && user && !user.onboardingcompleted) {
        logger.info('User needs onboarding, redirecting', undefined, {
          component: 'ProtectedRoute',
          action: 'redirectForOnboarding',
          metadata: { requireOnboarding, onboardingCompleted: user.onboardingcompleted }
        });
        setLocation('/onboard');
        return;
      }

      // Check role requirements
      if (requiredRole && user && user.role !== requiredRole && user.role !== 'admin') {
        logger.warn('Insufficient permissions for protected route', undefined, {
          component: 'ProtectedRoute',
          action: 'permissionDenied',
          metadata: { requiredRole, userRole: user.role, userId: user.id }
        });
        setLocation('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, user, isLoading, error, requireOnboarding, requiredRole, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return fallback ?? (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                clearError();
                refreshAuth();
              }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Authentication
            </button>
            <button
              onClick={() => {
                clearError();
                setLocation('/login');
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback if not authenticated or loading
  if (!isAuthenticated ?? (!requireOnboarding && user && !user.onboardingcompleted)) {
    return fallback ? <>{fallback}</> : null;
  }

  // Show children if authenticated and onboarded (if required)
  return <>{children}</>;
}