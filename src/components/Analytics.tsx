// Analytics dashboard with real-time updates
// LOG: COMPONENT-ANALYTICS-1 - Initialize analytics dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Eye, Share2, MousePointer, Activity, Calendar } from 'lucide-react';

interface AnalyticsData {
  overview: {
    total_content: number;
    total_views: number;
    total_engagement: number;
    avg_engagement_rate: number;
  };
  top_content: Array<{
    content_id: string;
    title: string;
    views: number;
    engagement_rate: number;
  }>;
  engagement_trends: Array<{
    date: string;
    views: number;
    engagements: number;
  }>;
  real_time_metrics: {
    active_users: number;
    current_views: number;
    recent_events: Array<{
      id: string;
      content_id: string;
      event_type: string;
      timestamp: string;
    }>;
  };
}

export function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'content' | 'realtime'>('overview');

  console.log('LOG: COMPONENT-ANALYTICS-2 - Analytics component rendered');

  useEffect(() => {
    initializeAnalytics();
    return () => {
      // Cleanup on unmount
    };
  }, []);

  const initializeAnalytics = async () => {
    console.log('LOG: COMPONENT-ANALYTICS-3 - Initializing analytics');
    
    try {
      // First, load initial data
      await loadAnalyticsData();
      
      // Then establish SSE connection for real-time updates
      setupSSEConnection();
    } catch (error) {
      console.error('LOG: COMPONENT-ANALYTICS-ERROR-1 - Failed to initialize analytics:', error);
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    console.log('LOG: COMPONENT-ANALYTICS-4 - Loading analytics data');
    
    try {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      const result = await response.json();
      
      if (result.success) {
        setAnalyticsData(result.data);
        console.log('LOG: COMPONENT-ANALYTICS-5 - Analytics data loaded');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-ANALYTICS-ERROR-2 - Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSSEConnection = () => {
    console.log('LOG: COMPONENT-ANALYTICS-6 - Setting up SSE connection');
    
    const eventSource = new EventSource('/api/analytics-stream');
    
    eventSource.onopen = () => {
      console.log('LOG: COMPONENT-ANALYTICS-7 - SSE connection established');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleSSEMessage(message);
      } catch (error) {
        console.error('LOG: COMPONENT-ANALYTICS-ERROR-3 - Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('LOG: COMPONENT-ANALYTICS-ERROR-4 - SSE connection error:', error);
      setConnected(false);
    };

    return eventSource;
  };

  const handleSSEMessage = (message: { type: string; data: any }) => {
    console.log('LOG: COMPONENT-ANALYTICS-8 - Received SSE message:', message.type);
    
    switch (message.type) {
      case 'initial_data':
      case 'analytics_update':
        setAnalyticsData(message.data);
        break;
      case 'engagement_event':
        // Handle real-time event updates
        updateRealTimeMetrics(message.data);
        break;
      default:
        console.log('LOG: COMPONENT-ANALYTICS-9 - Unknown message type:', message.type);
    }
  };

  const updateRealTimeMetrics = (event: any) => {
    if (!analyticsData) return;
    
    setAnalyticsData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        real_time_metrics: {
          ...prev.real_time_metrics,
          recent_events: [event, ...prev.real_time_metrics.recent_events.slice(0, 9)]
        }
      };
    });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'view': return <Eye className="w-3 h-3" />;
      case 'share': return <Share2 className="w-3 h-3" />;
      case 'click': return <MousePointer className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No analytics data available</p>
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
            <BarChart3 className="w-6 h-6 mr-2 text-indigo-600" />
            Analytics Dashboard
          </h2>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {connected ? 'Live' : 'Disconnected'}
            </div>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'content', label: 'Content Performance', icon: TrendingUp },
            { id: 'realtime', label: 'Real-time', icon: Activity }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedTab(id as any)}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === id
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
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.overview.total_content}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analyticsData.overview.total_views)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Share2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Engagement</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analyticsData.overview.total_engagement)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Engagement Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.overview.avg_engagement_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Performance Tab */}
      {selectedTab === 'content' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Content</h3>
          <div className="space-y-4">
            {analyticsData.top_content.map((content, index) => (
              <div key={content.content_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{content.title}</h4>
                    <p className="text-sm text-gray-500">ID: {content.content_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNumber(content.views)} views
                  </p>
                  <p className="text-sm text-gray-500">
                    {content.engagement_rate.toFixed(1)}% engagement
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Tab */}
      {selectedTab === 'realtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Live Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Users</span>
                <span className="text-2xl font-bold text-green-600">
                  {analyticsData.real_time_metrics.active_users}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Current Views</span>
                <span className="text-2xl font-bold text-blue-600">
                  {analyticsData.real_time_metrics.current_views}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Activity
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {analyticsData.real_time_metrics.recent_events.map((event) => (
                <div key={event.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  {getEventIcon(event.event_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {event.event_type} on {event.content_id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using analytics data in other components
export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async (timeRange: string = '7d') => {
    console.log('LOG: COMPONENT-ANALYTICS-10 - Fetching analytics via hook');
    setLoading(true);
    
    try {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('LOG: COMPONENT-ANALYTICS-ERROR-5 - Hook fetch failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, fetchAnalytics };
}