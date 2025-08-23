import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-indigo-600">Must Be Viral</h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <a href="/dashboard" className="text-gray-900 hover:text-indigo-600 px-3 py-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/content" className="text-gray-500 hover:text-indigo-600 px-3 py-2 text-sm font-medium">
                  Content
                </a>
                <a href="/matches" className="text-gray-500 hover:text-indigo-600 px-3 py-2 text-sm font-medium">
                  Matches
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Must Be Viral</h2>
            <p className="text-gray-600 mb-6">
              AI-powered content creation and influencer matching platform. Get started by creating your account.
            </p>
            <div className="space-y-4">
              <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700">
                Get Started
              </button>
              <button className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
