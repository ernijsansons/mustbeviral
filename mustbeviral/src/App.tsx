import { Router, Route, Switch } from 'wouter';
import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RootLayout, MarketingLayout, AppLayout, AuthLayout } from './components/layouts';
import { LoadingSpinner } from './components/ui/LoadingStates';
import { initWebVitals } from './lib/analytics/webVitals';
import { env } from './lib/env';
import { logger } from './lib/monitoring/logger';

// Enhanced lazy loading with error handling and preloading
const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ [K: string]: T }>,
  componentName: string,
  preload = false
) => {
  const LazyComponent = lazy(async () => {
    try {
      const module = await importFn();
      const Component = module[componentName] || module.default;
      if (!Component) {
        throw new Error(`Component ${componentName} not found in module`);
      }
      return { default: Component };
    } catch (error) {
      logger.error('Failed to load component', error instanceof Error ? error : new Error(String(error)), {
        component: 'App',
        action: 'createLazyComponent',
        metadata: { componentName }
      });
      // Return a fallback error component
      return {
        default: () => (
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-red-600">Component Load Error</h2>
              <p className="text-gray-600 mb-4">Failed to load {componentName}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        )
      };
    }
  });

  // Preload component for critical routes
  if (preload) {
    const preloadTimer = setTimeout(() => {
      importFn().catch(() => {/* Ignore preload errors */});
    }, 100);
    
    // Cleanup timer to prevent memory leaks
    return Object.assign(LazyComponent, {
      preload: () => importFn(),
      cleanup: () => clearTimeout(preloadTimer)
    });
  }

  return Object.assign(LazyComponent, {
    preload: () => importFn(),
    cleanup: () => {}
  });
};

// Optimized lazy-loaded components with preloading for critical routes
const HomePage = createLazyComponent(
  () => import('./pages/HomePage'),
  'HomePage',
  true // Preload homepage for faster initial render
);

const LoginPage = createLazyComponent(
  () => import('./pages/LoginPage'),
  'LoginPage',
  true // Preload login for quick access
);

const OnboardPage = createLazyComponent(
  () => import('./pages/OnboardPage'),
  'OnboardPage'
);

const Dashboard = createLazyComponent(
  () => import('./components/Dashboard'),
  'Dashboard',
  true // Preload dashboard for authenticated users
);

const ContentPage = createLazyComponent(
  () => import('./pages/ContentPage'),
  'ContentPage'
);

const MatchesPage = createLazyComponent(
  () => import('./pages/MatchesPage'),
  'MatchesPage'
);

const BuilderTest = createLazyComponent(
  () => import('./components/builder/BuilderTest'),
  'BuilderTest'
);

// Enhanced App component with error boundary and performance monitoring
function App() {
  // Initialize performance monitoring with environment-aware configuration
  useEffect(() => {
    if (env.ENABLE_PERFORMANCE_MONITORING) {
      initWebVitals('/api/analytics/vitals', env.APP_ENV === 'production')
        .catch((error: unknown) => {
          logger.warn('Failed to initialize web vitals', {
            component: 'App',
            action: 'initWebVitals'
          }, error instanceof Error ? error : new Error(String(error)));
        });
    }
  }, []);

  // Cleanup preload timers on unmount
  useEffect(() => {
    return () => {
      [HomePage, LoginPage, Dashboard].forEach(component => {
        if ('cleanup' in component && typeof component.cleanup === 'function') {
          component.cleanup();
        }
      });
    };
  }, []);

  return (
    <RootLayout>
      <ErrorBoundary
        fallback={({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <div className="text-6xl mb-4">🔥</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Oops! Something went viral... in a bad way
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Don't worry, our cosmic engineers are on it!
              </p>
              <div className="space-y-3">
                <button
                  onClick={resetErrorBoundary}
                  className="w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-viral-500 text-white font-semibold rounded-lg hover:shadow-glow-viral hover:scale-105 transition-all duration-200"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  🏠 Refresh Page
                </button>
              </div>
              {env.APP_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
                    Error Details (Dev Mode)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                    {error?.stack || error?.message || 'Unknown error'}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}
      >
        <Router>
          <Suspense 
            fallback={
              <LoadingSpinner 
                size="large" 
                text="Loading viral experience..." 
                className="min-h-screen"
              />
            }
          >
          <Switch>
            {/* Marketing Routes - Public landing pages */}
            <Route path="/">
              <MarketingLayout>
                <HomePage />
              </MarketingLayout>
            </Route>

            {/* Auth Routes - Viral authentication experience */}
            <Route path="/login">
              <AuthLayout
                title="Welcome Back"
                subtitle="Sign in to continue creating viral content"
                backgroundVariant="cosmic"
                showBackButton
              >
                <LoginPage />
              </AuthLayout>
            </Route>

            <Route path="/register">
              <AuthLayout
                title="Join the Viral Revolution"
                subtitle="Create your account and start making content that matters"
                backgroundVariant="neon"
                showBackButton
              >
                <div className="text-center p-8">
                  <p>Register form coming soon...</p>
                </div>
              </AuthLayout>
            </Route>

            {/* App Routes - Main application with sidebar */}
            <Route path="/dashboard">
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </Route>

            <Route path="/studio">
              <AppLayout>
                <div className="text-center p-8">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    🎨 Creator Studio
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Your viral content creation hub is coming soon...
                  </p>
                </div>
              </AppLayout>
            </Route>

            <Route path="/marketplace">
              <AppLayout>
                <MatchesPage />
              </AppLayout>
            </Route>

            <Route path="/calendar">
              <AppLayout>
                <div className="text-center p-8">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    📅 Content Calendar
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Schedule your viral content with drag-drop magic...
                  </p>
                </div>
              </AppLayout>
            </Route>

            <Route path="/content">
              <AppLayout>
                <ContentPage />
              </AppLayout>
            </Route>

            <Route path="/analytics">
              <AppLayout>
                <div className="text-center p-8">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    📊 Analytics Dashboard
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Track your viral performance with kinetic charts...
                  </p>
                </div>
              </AppLayout>
            </Route>

            <Route path="/settings">
              <AppLayout>
                <div className="text-center p-8">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    ⚙️ Settings
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Customize your viral experience...
                  </p>
                </div>
              </AppLayout>
            </Route>

            {/* Builder.io Test Route */}
            <Route path="/builder-test">
              <AppLayout>
                <BuilderTest />
              </AppLayout>
            </Route>

            {/* Legacy routes for compatibility */}
            <Route path="/matches">
              <AppLayout>
                <MatchesPage />
              </AppLayout>
            </Route>

            <Route path="/onboard">
              <AuthLayout
                title="Let's Get Started"
                subtitle="Set up your profile and unlock viral potential"
                backgroundVariant="gradient"
                showBackButton
              >
                <OnboardPage />
              </AuthLayout>
            </Route>

            {/* Viral 404 Page */}
            <Route path="/:rest*">
              <MarketingLayout backgroundVariant="cosmic">
                <div className="min-h-screen flex items-center justify-center p-6">
                  <div className="max-w-md text-center">
                    <div className="mb-8">
                      <div className="text-8xl mb-4 animate-bounce">🫥</div>
                      <h1 className="text-4xl font-bold text-white mb-2">
                        Oops! Content Not Found
                      </h1>
                      <p className="text-white/80 mb-6">
                        This page didn't go viral... it doesn't exist!
                      </p>
                    </div>
                    <div className="space-y-4">
                      <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-viral-500 text-white font-semibold rounded-lg hover:shadow-glow-viral hover:scale-105 transition-all duration-200"
                      >
                        🏠 Back to Homepage
                      </a>
                      <p className="text-white/60 text-sm">
                        Let's get you back to creating viral content
                      </p>
                    </div>
                  </div>
                </div>
              </MarketingLayout>
            </Route>
          </Switch>
        </Suspense>
      </Router>
    </ErrorBoundary>
    </RootLayout>
  );
}

export default App;