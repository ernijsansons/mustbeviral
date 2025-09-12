// Content Page Component
import { StrategyPlanner } from '../components/StrategyPlanner';
import { ToolSelector } from '../components/ToolSelector';
import { TrendsView } from '../components/TrendsView';

export function ContentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Content Creation</h2>
            <p className="text-gray-600 mb-6">
              Create viral content using AI-powered tools and strategies.
            </p>
          </div>
          
          <div className="space-y-6">
            <StrategyPlanner />
            <ToolSelector />
            <TrendsView />
          </div>
        </div>
      </div>
    </div>
  );
}