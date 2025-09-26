// Matches Page Component with Marketplace
import { useState, useEffect } from 'react';
import { Search, Filter, Star, Users, TrendingUp, MessageCircle } from 'lucide-react';

interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  followers: number;
  engagement: number;
  category: string;
  price: number;
  rating: number;
  verified: boolean;
  avatar: string;
}

// Mock data - in real app this would come from D1 database
const mockInfluencers: Influencer[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    handle: '@sarahtech',
    platform: 'Twitter',
    followers: 125000,
    engagement: 4.2,
    category: 'Technology',
    price: 500,
    rating: 4.8,
    verified: true,
    avatar: '/api/placeholder/64/64'
  },
  {
    id: '2',
    name: 'Mike Rodriguez',
    handle: '@mikemarketing',
    platform: 'LinkedIn',
    followers: 89000,
    engagement: 5.1,
    category: 'Marketing',
    price: 350,
    rating: 4.6,
    verified: true,
    avatar: '/api/placeholder/64/64'
  },
  {
    id: '3',
    name: 'Emma Wilson',
    handle: '@emmacreates',
    platform: 'Instagram',
    followers: 234000,
    engagement: 3.8,
    category: 'Creative',
    price: 750,
    rating: 4.9,
    verified: false,
    avatar: '/api/placeholder/64/64'
  },
];

export function MatchesPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setInfluencers(mockInfluencers);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredInfluencers = influencers.filter(influencer => {
    const matchesSearch = influencer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         influencer.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         influencer.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           influencer.category.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-16 bg-gray-300 rounded-full w-16 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Influencer Marketplace</h1>
            <p className="mt-2 text-gray-600">
              Find and connect with influencers that match your content and brand
            </p>
          </div>

          {/* Search and Filters */}
          <div className="pb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search influencers by name, handle, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-influencers"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Search influencers"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  data-testid="select-category-filter"
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  aria-label="Filter by category"
                >
                  <option value="all">All Categories</option>
                  <option value="technology">Technology</option>
                  <option value="marketing">Marketing</option>
                  <option value="creative">Creative</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Results count */}
          <div className="mb-6">
            <p className="text-gray-600">
              {filteredInfluencers.length} influencer{filteredInfluencers.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Influencer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInfluencers.map((influencer) => (
              <div
                key={influencer.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                data-testid={`influencer-card-${influencer.id}`}
              >
                {/* Profile Header */}
                <div className="text-center mb-4">
                  <div className="relative inline-block">
                    <div className="w-16 h-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                      {influencer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {influencer.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{influencer.name}</h3>
                  <p className="text-sm text-gray-500">{influencer.handle}</p>
                  <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {influencer.category}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                  <div>
                    <div className="flex items-center justify-center text-gray-400 mb-1">
                      <Users className="w-4 h-4 mr-1" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{formatFollowers(influencer.followers)}</p>
                    <p className="text-xs text-gray-500">Followers</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-gray-400 mb-1">
                      <TrendingUp className="w-4 h-4 mr-1" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{influencer.engagement}%</p>
                    <p className="text-xs text-gray-500">Engagement</p>
                  </div>
                </div>

                {/* Rating and Price */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium text-gray-900">{influencer.rating}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${influencer.price}</p>
                    <p className="text-xs text-gray-500">per post</p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
                  data-testid={`button-contact-${influencer.id}`}
                  aria-label={`Contact ${influencer.name}`}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact
                </button>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredInfluencers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No influencers found</h3>
              <p className="text-gray-500">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}