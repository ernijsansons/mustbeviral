// Market Tab Component for Influencer Matching
import { useState } from 'react';
import { Users, Star, TrendingUp, MessageCircle } from 'lucide-react';

interface InfluencerProfile {
  id: string;
  name: string;
  username: string;
  followers: number;
  engagement_rate: number;
  category: string;
  match_score: number;
  status: 'available' | 'busy' | 'booked';
}

export function MarketTab() {
  const [activeTab, setActiveTab] = useState<'discover' | 'campaigns' | 'bookings'>('discover');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock influencer data
  const mockInfluencers: InfluencerProfile[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      username: '@sarahjohnson',
      followers: 125000,
      engagement_rate: 4.2,
      category: 'lifestyle',
      match_score: 95,
      status: 'available'
    },
    {
      id: '2',
      name: 'Mike Chen',
      username: '@mikechentech',
      followers: 89000,
      engagement_rate: 3.8,
      category: 'tech',
      match_score: 87,
      status: 'available'
    },
    {
      id: '3',
      name: 'Emma Davis',
      username: '@emmafitness',
      followers: 210000,
      engagement_rate: 5.1,
      category: 'fitness',
      match_score: 92,
      status: 'busy'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'lifestyle', name: 'Lifestyle' },
    { id: 'tech', name: 'Technology' },
    { id: 'fitness', name: 'Fitness & Health' },
    { id: 'fashion', name: 'Fashion' }
  ];

  const formatFollowers = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'booked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInfluencers = selectedCategory === 'all' 
    ? mockInfluencers 
    : mockInfluencers.filter(inf => inf.category === selectedCategory);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'campaigns':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Campaigns</h3>
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No active campaigns yet</p>
              <p className="text-sm text-gray-500">Start by discovering influencers and creating campaigns</p>
            </div>
          </div>
        );
      
      case 'bookings':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Bookings</h3>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No bookings yet</p>
              <p className="text-sm text-gray-500">Book influencers to start collaborating</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Influencer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInfluencers.map((influencer) => (
                <div key={influencer.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {influencer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{influencer.name}</h4>
                        <p className="text-sm text-gray-500">{influencer.username}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(influencer.status)}`}>
                      {influencer.status}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Followers</span>
                      <span className="font-medium">{formatFollowers(influencer.followers)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Engagement</span>
                      <span className="font-medium">{influencer.engagement_rate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Match Score</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-medium">{influencer.match_score}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button 
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      disabled={influencer.status !== 'available'}
                    >
                      {influencer.status === 'available' ? 'Contact' : 'Unavailable'}
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'discover', name: 'Discover', icon: TrendingUp },
              { id: 'campaigns', name: 'Campaigns', icon: MessageCircle },
              { id: 'bookings', name: 'Bookings', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}

export default MarketTab;