// Home Page Component
import { Link } from 'wouter';

export function HomePage() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Must Be Viral</h2>
      <p className="text-gray-600 mb-6">
        AI-powered content creation and influencer matching platform. Get started by creating your account.
      </p>
      <div className="space-y-4">
        <Link 
          href="/onboard"
          data-testid="button-get-started"
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 text-center block"
        >
          Get Started
        </Link>
        <button 
          data-testid="button-learn-more"
          className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50"
        >
          Learn More
        </button>
      </div>
    </div>
  );
}