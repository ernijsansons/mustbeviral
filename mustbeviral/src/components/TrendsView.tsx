// Trends dashboard component for viewing and analyzing trends
// LOG: COMPONENT-TRENDS-1 - Initialize trends dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, BarChart3, Zap, Globe, Calendar, Target} from 'lucide-react';

interface TrendData {
  id: string;
  keyword: string;
  trend_score: number;
  search_volume: number;
  viral_potential: number;
  related_queries: string[];
  category: string;
  timestamp: string;
}

interface TrendPrediction {
  keyword: string;
  predicted_growth: number;
  confidence_level: number;
  time_horizon: string;
}

export function TrendsView() {
  const [trendingTopics, setTrendingTopics] = useState<TrendData[]>([]);
  const [predictions, setPredictions] = useState<TrendPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'keywords' | 'predictions'>('trending');

  console.log('LOG: COMPONENT-TRENDS-2 - TrendsView component rendered');

  useEffect_(() => {
    loadTrendingTopics();
  }, [selectedRegion]);

    console.log('LOG: COMPONENT-TRENDS-3 - Loading trending topics');
    setLoading(true);
    
    try {
      const response = await fetch(`/api/get-trends?type=trending&region=${selectedRegion}`);
      const data = await response.json();
      
      if (data.success) {
        setTrendingTopics(data.data);
        console.log('LOG: COMPONENT-TRENDS-4 - Loaded', data.data.length, 'trending topics');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-TRENDS-ERROR-1 - Failed to load trending topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchKeywords = async () => {
    if (!searchKeyword.trim()) {return;}
    
    console.log('LOG: COMPONENT-TRENDS-5 - Searching keywords:', searchKeyword);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/get-trends?type=keywords&keywords=${encodeURIComponent(searchKeyword)}`);
      const data = await response.json();
      
      if (data.success) {
        setTrendingTopics(data.data);
        
        // Also get predictions
        const predictionResponse = await fetch(`/api/get-trends?type=predict&keywords=${encodeURIComponent(searchKeyword)}`);
        const predictionData = await predictionResponse.json();
        
        if (predictionData.success) {
          setPredictions([predictionData.data]);
        }
      }
    } catch (error) {
      console.error('LOG: COMPONENT-TRENDS-ERROR-2 - Failed to search keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (score: number) => {
    if (score > 70) {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  }
    if (score > 40) {
    return <BarChart3 className="w-4 h-4 text-yellow-500" />;
  }
    return <BarChart3 className="w-4 h-4 text-gray-400" />;
  };

  const getViralPotentialColor = (potential: number) => {
    if (potential > 70) {
    return 'text-red-600 bg-red-100';
  }
    if (potential > 40) {
    return 'text-orange-600 bg-orange-100';
  }
    return 'text-gray-600 bg-gray-100';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
    if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
    return num.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
          Trend Dashboard
        </h2>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
          </select>
          
          <Globe className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchKeywords()}
              placeholder="Search for trending keywords..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={searchKeywords}
            disabled={loading ?? !searchKeyword.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'trending', label: 'Trending Now', icon: TrendingUp },
          { id: 'keywords', label: 'Keyword Analysis', icon: Search },
          { id: 'predictions', label: 'Predictions', icon: Zap }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading trends...</span>
        </div>
      )}

      {/* Trending Topics Tab */}
      {activeTab === 'trending' && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Trending Topics</h3>
            <span className="text-sm text-gray-500">
              {trendingTopics.length} topics found
            </span>
          </div>
          
          <div className="grid gap-4">
            {trendingTopics.map((trend) => (
              <div key={trend.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getTrendIcon(trend.trendscore)}
                      <h4 className="font-semibold text-gray-900">{trend.keyword}</h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {trend.category}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Trend Score:</span>
                        <div className="flex items-center mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full" 
                              style={{ width: `${trend.trendscore}%` }}
                            ></div>
                          </div>
                          <span>{trend.trendscore}</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium">Search Volume:</span>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatNumber(trend.searchvolume)}
                        </p>
                      </div>
                      
                      <div>
                        <span className="font-medium">Viral Potential:</span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getViralPotentialColor(trend.viralpotential)}`}>
                          {Math.round(trend.viralpotential)}%
                        </span>
                      </div>
                    </div>
                    
                    {trend.related_queries.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 mb-1 block">Related:</span>
                        <div className="flex flex-wrap gap-1">
                          {trend.related_queries.slice(0, 5).map((query, index) => (
                            <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {query}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right text-xs text-gray-500">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(trend.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {trendingTopics.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No trending topics found. Try a different region or search for specific keywords.</p>
            </div>
          )}
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && !loading && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Growth Predictions</h3>
          
          {predictions.length > 0 ? (
            <div className="space-y-4">
              {predictions.map((prediction, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{prediction.keyword}</h4>
                    <span className="text-sm text-gray-500">{prediction.timehorizon} forecast</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Predicted Growth:</span>
                      <p className={`text-lg font-bold ${
                        prediction.predicted_growth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {prediction.predicted_growth > 0 ? '+' : ''}{prediction.predicted_growth.toFixed(1)}%
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-600">Confidence:</span>
                      <div className="flex items-center mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${prediction.confidencelevel}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{Math.round(prediction.confidencelevel)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Search for keywords to see growth predictions.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hook for using trends data in other components
export function useTrends() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrends = async (type: string = 'trending', params: unknown = {}) => {
    console.log('LOG: COMPONENT-TRENDS-6 - Fetching trends via hook:', type);
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams({ type, ...params });
      const response = await fetch(`/api/get-trends?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setTrends(data.data);
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('LOG: COMPONENT-TRENDS-ERROR-3 - Hook fetch failed:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const analyzeTrends = async (content: string, keywords?: string[]) => {
    console.log('LOG: COMPONENT-TRENDS-7 - Analyzing trends via hook');
    
    try {
      const response = await fetch('/api/get-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, keywords, action: 'analyze' })
      });
      
      const data = await response.json();
      return data.success ? data.result : null;
    } catch (error) {
      console.error('LOG: COMPONENT-TRENDS-ERROR-4 - Analysis failed:', error);
      return null;
    }
  };

  return { trends, loading, fetchTrends, analyzeTrends };
}