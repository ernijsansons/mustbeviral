// Login Page Component
import { useState, useEffect} from 'react';
import { Link, useLocation} from 'wouter';
import { Eye, EyeOff, Mail, Lock, AlertCircle} from 'lucide-react';
import { useAuth} from '../hooks/useAuth';
import { LoginCredentials} from '../lib/api';
import { logger} from '../lib/logging/productionLogger';

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const { login, isLoading, error, isAuthenticated, user} = useAuth();

  // Redirect if already authenticated
  useEffect_(() => {
    if (isAuthenticated && user) {
      logger.info('User already authenticated, redirecting to dashboard', {
        component: 'LoginPage',
        action: 'redirectAuthenticated'
      });
      setLocation('/dashboard');
    }
  }, [isAuthenticated, user, setLocation]);

  // Check for OAuth success/error in URL params
  useEffect_(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const success = urlParams.get('success');

    if (error) {
      logger.error('OAuth error', new Error(error), {
        component: 'LoginPage',
        action: 'oauthError'
      });
      setFormErrors({ oauth: decodeURIComponent(error) });
    }

    if (success) {
      logger.info('OAuth success, redirecting', {
        component: 'LoginPage',
        action: 'oauthSuccess'
      });
      setLocation('/dashboard');
    }
  }, [setLocation]);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    logger.info('Attempting login', {
      component: 'LoginPage',
      action: 'loginAttempt',
      metadata: { email: formData.email }
    });

    const result = await login(formData.email, formData.password);

    if (result.success) {
      logger.info('Login successful, redirecting to dashboard', undefined, {
        component: 'LoginPage',
        action: 'loginSuccess'
      });
      setLocation('/dashboard');
    } else {
       logger.error('Login failed', new Error(result.error ?? 'Login failed'), {
        component: 'LoginPage',
        action: 'loginFailed'
      });
       setFormErrors({ submit: result.error ?? 'Login failed' });
    }
  };

  const updateField = (field: keyof LoginCredentials, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              Must Be Viral
            </h1>
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-gray-600">
            Sign in to your account to continue creating viral content
          </p>
        </div>

        {/* OAuth Success/Error Messages */}
        {formErrors.oauth && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800 text-sm">{formErrors.oauth}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            {/* Social Login Buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 text-center">
                Sign in with
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Google Sign-In */}
                <button
                  type="button"
                  onClick={() => {
                    logger.info('Google OAuth initiated', {
                      component: 'LoginPage',
                      action: 'googleOAuthInitiated'
                    });
                    window.location.href = '/api/oauth/google';
                  }}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  data-testid="button-google-signin"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>

                {/* Twitter Sign-In */}
                <button
                  type="button"
                  onClick={() => {
                    logger.info('Twitter OAuth initiated', {
                      component: 'LoginPage',
                      action: 'twitterOAuthInitiated'
                    });
                    window.location.href = '/api/oauth/twitter';
                  }}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  data-testid="button-twitter-signin"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or sign in with email</span>
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                   onChange={(e) => updateField('email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 border rounded-md text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                  aria-describedby={formErrors.email ? 'email-error' : undefined}
                  autoComplete="email"
                  data-testid="input-email"
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {formErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                   onChange={(e) => updateField('password', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 border rounded-md text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  aria-describedby={formErrors.password ? 'password-error' : undefined}
                  autoComplete="current-password"
                  data-testid="input-password"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {formErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Error */}
            {(formErrors.submit ?? error) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-800 text-sm">
                    {formErrors.submit ?? error}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="button-sign-in"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/onboard"
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                data-testid="link-sign-up"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}