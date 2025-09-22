import { Router, Route, Switch } from 'wouter';
import { Suspense, lazy, useEffect } from 'react';
import { NavBar } from './components/NavBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkipNavigation, MainContent } from './components/SkipNavigation';
import { LoadingSpinner } from './components/ui/LoadingStates';
import { initWebVitals } from './lib/analytics/webVitals';

// Lazy load page components for better performance
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const OnboardPage = lazy(() => import('./pages/OnboardPage').then(module => ({ default: module.OnboardPage })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const ContentPage = lazy(() => import('./pages/ContentPage').then(module => ({ default: module.ContentPage })));
const MatchesPage = lazy(() => import('./pages/MatchesPage').then(module => ({ default: module.MatchesPage })));

function App() {
  // Initialize performance monitoring
  useEffect(() => {
    initWebVitals('/api/analytics/vitals', process.env.NODE_ENV === 'production');
  }, []);

  return (
    <ErrorBoundary level="critical" context="App">
      <SkipNavigation />
      <Router>
        <div className="min-h-screen">
          <NavBar />

          <MainContent className="min-h-screen">
            <Suspense fallback={<LoadingSpinner size="large" text="Loading page..." />}>
              <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/content" component={ContentPage} />
            <Route path="/matches" component={MatchesPage} />
            <Route path="/onboard" component={OnboardPage} />
            
            {/* Catch-all route for 404 */}
            <Route path="/:rest*">
              <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                  <div className="bg-white rounded-lg shadow p-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                    <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                    <a 
                      href="/"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Go Home
                    </a>
                  </div>
                </div>
              </div>
            </Route>
              </Switch>
            </Suspense>
          </MainContent>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;