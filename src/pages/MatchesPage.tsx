// Matches Page Component
import { MarketTab } from '../components/MarketTab';

export function MatchesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Influencer Matches</h2>
            <p className="text-gray-600 mb-6">
              Find and connect with influencers that match your content and brand.
            </p>
          </div>
          
          <MarketTab />
        </div>
      </div>
    </div>
  );
}