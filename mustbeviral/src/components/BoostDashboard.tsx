// Visibility & Reputation Boost Dashboard
// LOG: COMPONENT-BOOST-1 - Initialize boost dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, Zap, Shield, Target, AlertTriangle, CheckCircle, Clock, ExternalLink} from 'lucide-react';
import { logger} from '../lib/monitoring/logger';

interface BrandMention {
  id: string;
  query: string;
  snippet: string;
  url: string;
  source: string;
  sentiment_score: number;
  timestamp: string;
}

interface ReputationMetrics {
  overall_sentiment: number;
  mention_count: number;
  positive_mentions: number;
  negative_mentions: number;
  neutral_mentions: number;
  visibility_score: number;
  trending_keywords: string[];
}

interface SeedingPlan {
  id: string;
  content_id: string;
  target_platforms: string[];
  seeding_strategy: string;
  priority: string;
  estimated_reach: number;
  status: string;
}

export function BoostDashboard() {
  const [metrics, setMetrics] = useState<ReputationMetrics | null>(null);
  const [mentions, setMentions] = useState<BrandMention[]>([]);
  const [seedingPlans, setSeedingPlans] = useState<SeedingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'mentions' | 'seeding'>('overview');
  const [searchKeywords, setSearchKeywords] = useState('Must Be Viral');

  logger.info('BoostDashboard rendered', {
    component: 'BoostDashboard',
    action: 'render'
  });

  useEffect_(() => {
    loadReputationData();
  }, []);

  const loadReputationData = async () => {
    logger.info('Loading reputation data', {
      component: 'BoostDashboard',
      action: 'loadReputationData'
    });
    setLoading(true);
    
    try {
      const response = await fetch('/api/seed-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_reputation_metrics',
          keywords: searchKeywords.split(',').map(k => k.trim())
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data.currentmetrics);
        setMentions(result.data.recentmentions);
        logger.info('Reputation data loaded successfully', {
          component: 'BoostDashboard',
          action: 'loadReputationData',
          metadata: { mentionsCount: result.data.recent_mentions?.length ?? 0 }
        });
      }
    } catch (error) {
      logger.error('Failed to load reputation data', error instanceof Error ? error : new Error(String(error)), {
        component: 'BoostDashboard',
        action: 'loadReputationData'
      });
    } finally {
      setLoading(false);
    }
  };

  const searchMentions = async () => {
    logger.info('Searching for mentions', {
      component: 'BoostDashboard',
      action: 'searchMentions',
      metadata: { keywords: searchKeywords }
    });
    setLoading(true);
    
    try {
      const response = await fetch('/api/seed-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search_mentions',
          keywords: searchKeywords.split(',').map(k => k.trim())
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data.metrics);
        setMentions(result.data.mentions);
        logger.info('Mentions search completed successfully', {
          component: 'BoostDashboard',
          action: 'searchMentions',
          metadata: { mentionsFound: result.data.mentions?.length ?? 0 }
        });
      }
    } catch (error) {
      logger.error('Mentions search failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'BoostDashboard',
        action: 'searchMentions'
      });
    } finally {
      setLoading(false);
    }
  };

  const createSeedingPlan = async (strategy: string) => {
    logger.info('Creating seeding plan', {
      component: 'BoostDashboard',
      action: 'createSeedingPlan',
      metadata: { strategy, keywords: searchKeywords }
    });
    
    try {
      const response = await fetch('/api/seed-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_seeding_plan',
          content_id: 'demo-content-1',
          strategy,
          keywords: searchKeywords.split(',').map(k => k.trim())
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSeedingPlans(prev => [...prev, result.data.seedingplan]);
        logger.info('Seeding plan created successfully', {
          component: 'BoostDashboard',
          action: 'createSeedingPlan',
          metadata: { planId: result.data.seeding_plan?.id }
        });
      }
    } catch (error) {
      logger.error('Failed to create seeding plan', error instanceof Error ? error : new Error(String(error)), {
        component: 'BoostDashboard',
        action: 'createSeedingPlan'
      });
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) {
    return 'text-green-600 bg-green-100';
  }
    if (score < -0.3) {
    return 'text-red-600 bg-red-100';
  }
    return 'text-yellow-600 bg-yellow-100';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) {
    return <CheckCircle className="w-4 h-4" />;
  }
    if (score < -0.3) {
    return <AlertTriangle className="w-4 h-4" />;
  }
    return <Clock className="w-4 h-4" />;
  };

  const formatSentimentScore = (score: number) => {
    return `${score > 0 ? '+' : ''}${(score * 100).toFixed(1)}%`;
  };

  if (loading && !metrics) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" aria-hidden="true"></div>
          <span className="ml-2 text-gray-600">Loading reputation data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="w-6 h-6 mr-2 text-indigo-600" />
            Visibility & Reputation Boost
          </h2>
          
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                placeholder="Brand keywords..."
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={searchMentions}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                aria-label="Search mentions"
                type="button"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Search</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'mentions', label: 'Brand Mentions', icon: Search },
            { id: 'seeding', label: 'Content Seeding', icon: Target }
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
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Sentiment</p>
                <p className={`text-2xl font-bold ${getSentimentColor(metrics.overallsentiment).split(' ')[0]}`}>
                  {formatSentimentScore(metrics.overallsentiment)}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getSentimentColor(metrics.overallsentiment)}`}>
                {getSentimentIcon(metrics.overallsentiment)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Mentions</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.mentioncount}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Visibility Score</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.visibilityscore}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Positive Ratio</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.mention_count > 0 ? Math.round((metrics.positive_mentions / metrics.mentioncount) * 100) : 0}%
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mentions Tab */}
      {activeTab === 'mentions' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Brand Mentions</h3>
            <span className="text-sm text-gray-500">{mentions.length} mentions found</span>
          </div>
          
          <div className="space-y-4">
            {mentions.map((mention) => (
              <div key={mention.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">{mention.source}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(mention.sentimentscore)}`}>
                        {getSentimentIcon(mention.sentimentscore)}
                        <span className="ml-1">{formatSentimentScore(mention.sentimentscore)}</span>
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{mention.snippet}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Query: {mention.query}</span>
                      <span>{new Date(mention.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <a
                    href={mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 p-2 text-gray-400 hover:text-indigo-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
            
            {mentions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No mentions found. Try searching with different keywords.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seeding Tab */}
      {activeTab === 'seeding' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Seeding Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => createSeedingPlan('viral')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <Zap className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                <h4 className="font-medium text-gray-900">Viral Boost</h4>
                <p className="text-sm text-gray-600">Maximize reach and engagement</p>
              </button>
              
              <button
                onClick={() => createSeedingPlan('reputation_repair')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <h4 className="font-medium text-gray-900">Reputation Repair</h4>
                <p className="text-sm text-gray-600">Address negative sentiment</p>
              </button>
              
              <button
                onClick={() => createSeedingPlan('visibility_boost')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <h4 className="font-medium text-gray-900">Visibility Boost</h4>
                <p className="text-sm text-gray-600">Increase brand awareness</p>
              </button>
            </div>
          </div>

          {seedingPlans.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Seeding Plans</h3>
              <div className="space-y-4">
                {seedingPlans.map((plan) => (
                  <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {plan.seeding_strategy.replace('', ' ')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          plan.priority === 'high' ? 'bg-red-100 text-red-700' :
                          plan.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {plan.priority} priority
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.status === 'active' ? 'bg-green-100 text-green-700' :
                        plan.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Platforms:</strong> {plan.target_platforms.join(', ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Estimated Reach:</strong> {plan.estimated_reach.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trending Keywords */}
      {metrics && metrics.trending_keywords.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trending Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {metrics.trending_keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using boost data in other components
export function useBoostData() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const fetchBoostData = async (action: string, params: unknown = {}) => {
    logger.info('Fetching boost data via hook', {
      component: 'useBoostData',
      action: 'fetchBoostData',
      metadata: { requestedAction: action }
    });
    setLoading(true);
    
    try {
      const response = await fetch('/api/seed-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...params })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      logger.error('Hook fetch failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBoostData',
        action: 'fetchBoostData'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, fetchBoostData };
}