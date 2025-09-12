import { Router, Route, Switch, Link, useLocation } from 'wouter';
import { HomePage } from './pages/HomePage';
import { OnboardPage } from './pages/OnboardPage';
import { Dashboard } from './components/Dashboard';
import { ContentPage } from './pages/ContentPage';
import { MatchesPage } from './pages/MatchesPage';

function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-xl font-bold text-indigo-600 cursor-pointer">Must Be Viral</h1>
              </Link>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link 
                href="/dashboard"
                data-testid="link-dashboard"
                className={`${
                  location === '/dashboard' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-900 hover:text-indigo-600'
                } px-3 py-2 text-sm font-medium`}
              >
                Dashboard
              </Link>
              <Link 
                href="/content"
                data-testid="link-content"
                className={`${
                  location === '/content' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-500 hover:text-indigo-600'
                } px-3 py-2 text-sm font-medium`}
              >
                Content
              </Link>
              <Link 
                href="/matches"
                data-testid="link-matches"
                className={`${
                  location === '/matches' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-500 hover:text-indigo-600'
                } px-3 py-2 text-sm font-medium`}
              >
                Matches
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/onboard"
              data-testid="button-sign-up"
              className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-50"
            >
              Sign Up
            </Link>
            <button 
              data-testid="button-sign-in"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/content" component={ContentPage} />
              <Route path="/matches" component={MatchesPage} />
              <Route path="/onboard" component={OnboardPage} />
              
              {/* Catch-all route for 404 */}
              <Route path="/:rest*">
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                  <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                  <Link 
                    href="/"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700"
                  >
                    Go Home
                  </Link>
                </div>
              </Route>
            </Switch>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;