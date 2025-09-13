"use client";

import { Router, Route, Switch } from 'wouter';
import { HomePage } from './pages/HomePage';
import { OnboardPage } from './pages/OnboardPage';
import { Dashboard } from './components/Dashboard';
import { ContentPage } from './pages/ContentPage';
import { MatchesPage } from './pages/MatchesPage';
import { NavBar } from './components/NavBar';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavBar />
        
        <main className="min-h-screen">
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
        </main>
      </div>
    </Router>
  );
}

export default App;