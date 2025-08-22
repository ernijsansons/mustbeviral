// Comprehensive Metrics Dashboard for conversions and matches
// LOG: METRICS-DASH-1 - Initialize metrics dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, FileText, Target, Clock, 
  DollarSign, CheckCircle, AlertCircle, Calendar, Filter 
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ConversionMetrics {
  overview: {
    total_signups: number;
    total_published: number;
    total_strategies: number;
    conversion_rate: number;
  };
  trends: Array<{
    date: string;
    signups: number;
    published_content: number;
    strategies_generated: number;
  }>;
  funnel: Array<{
    stage: string;
    count: number;
    conversion_rate: number;
  }>;
}

interface MatchMetrics {
  overview: {
    total_matches: number;
    avg_match_score: number;
    acceptance_rate: number;
    completion_rate: number;
  };
  status_breakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  top_content: Array<{
    content_id: string;
    title: string;
    matches: number;
    avg_score: number;
  }>;
  top_influencers: Array<{
    user_id: string;
    username: string;
    matches: number;
    avg_score: number;
  }>;
  trends: Array<{
    date: string;
    created: number;
    accepted: number;
    completed: number;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export function MetricsDash({ userId = 'demo-user' }: { userId?: string }) {
  const [activeTab, setActiveTab] = useState<'conversions' | 'matches' | 'overview'>('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [conversionData, setConversionData] = useState<ConversionMetrics | null>(null);
  const [matchData, setMatchData] = useState<MatchMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  console.log('LOG: METRICS-DASH-2 - MetricsDash rendered for user:', userId);

  useEffect(() => {
    loadMetricsData();
  }, [timeRange, userId]);

  const loadMetricsData = async () => {
    console.log('LOG: METRICS-DASH-3 - Loading metrics data for timeRange:', timeRange);
    setLoading(true);

    try {
      const [conversionsResponse, matchesResponse] = await Promise.all([
        fetch(`/api/get-metrics?type=conversions&timeRange=${timeRange}&userId=${userId}`),
        fetch(`/api/get-metrics?type=matches&timeRange=${timeRange}&userId=${userId}`)
      ]);

      const conversionsResult = await conversionsResponse.json();
      const matchesResult = await matchesResponse.json();

      if (conversionsResult.success) {
        setConversionData(conversionsResult.data);
      }

      if (matchesResult.success) {
        setMatchData(matchesResult.data);
      }

      setLastUpdated(new Date().toLocaleTimeString());
      console.log('LOG: METRICS-DASH-4 - Metrics data loaded successfully');
    } catch (error) {
      console.error('LOG: METRICS-DASH-ERROR-1 - Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      'pending': '#F59E0B',
      'accepted': '#10B981',
      'rejected': '#EF4444',
      'completed': '#3B82F6',
      'cancelled': '#6B7280'
    };
    return colorMap[status] || '#6B7280';
  };

  if (loading && !conversionData && !matchData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-indigo-600" />
              Metrics Dashboard
            </h2>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            
            <button
              onClick={loadMetricsData}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'conversions', label: 'Conversions', icon: TrendingUp },
            { id: 'matches', label: 'Matches', icon: Target }
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
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {conversionData && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Signups</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(conversionData.overview.total_signups)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Published Content</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(conversionData.overview.total_published)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {matchData && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Matches</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(matchData.overview.total_matches)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Acceptance Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPercentage(matchData.overview.acceptance_rate)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Conversions Tab */}
      {activeTab === 'conversions' && conversionData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">User Signups</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatNumber(conversionData.overview.total_signups)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published Content</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatNumber(conversionData.overview.total_published)}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatPercentage(conversionData.overview.conversion_rate)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Trends Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="signups" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="User Signups"
                />
                <Line 
                  type="monotone" 
                  dataKey="published_content" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Published Content"
                />
                <Line 
                  type="monotone" 
                  dataKey="strategies_generated" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  name="Strategies Generated"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={conversionData.funnel} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={120} />
                <Tooltip formatter={(value, name) => [formatNumber(value as number), name]} />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && matchData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Matches</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {formatNumber(matchData.overview.total_matches)}
                  </p>
                </div>
                <Target className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Match Score</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {(matchData.overview.avg_match_score * 100).toFixed(0)}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Acceptance Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatPercentage(matchData.overview.acceptance_rate)}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatPercentage(matchData.overview.completion_rate)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Match Status Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Status Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={matchData.status_breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {matchData.status_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatNumber(value as number), 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Match Trends */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Activity Trends</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={matchData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Created"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accepted" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Accepted"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    name="Completed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Content */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Content by Matches</h3>
              <div className="space-y-3">
                {matchData.top_content.slice(0, 5).map((content, index) => (
                  <div key={content.content_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 truncate max-w-48">
                          {content.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Score: {(content.avg_score * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{content.matches}</p>
                      <p className="text-xs text-gray-500">matches</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Influencers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Influencers by Matches</h3>
              <div className="space-y-3">
                {matchData.top_influencers.slice(0, 5).map((influencer, index) => (
                  <div key={influencer.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">@{influencer.username}</h4>
                        <p className="text-sm text-gray-500">
                          Score: {(influencer.avg_score * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{influencer.matches}</p>
                      <p className="text-xs text-gray-500">matches</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversions Tab */}
      {activeTab === 'conversions' && conversionData && (
        <div className="space-y-6">
          {/* Detailed Conversion Charts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Trends Over Time</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={conversionData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="signups" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="User Signups"
                />
                <Line 
                  type="monotone" 
                  dataKey="published_content" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Published Content"
                />
                <Line 
                  type="monotone" 
                  dataKey="strategies_generated" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  name="Strategies Generated"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Journey Funnel</h3>
            <div className="space-y-4">
              {conversionData.funnel.map((stage, index) => (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{stage.stage}</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{formatNumber(stage.count)}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({formatPercentage(stage.conversion_rate)})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${stage.conversion_rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && matchData && (
        <div className="space-y-6">
          {/* Match Performance Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Performance Over Time</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={matchData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" fill="#3B82F6" name="Created" />
                <Bar dataKey="accepted" fill="#10B981" name="Accepted" />
                <Bar dataKey="completed" fill="#8B5CF6" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution and Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
              <div className="space-y-3">
                {matchData.status_breakdown.map((status) => (
                  <div key={status.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getStatusColor(status.status) }}
                      />
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {status.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{status.count}</span>
                      <span className="text-xs text-gray-500 ml-1">
                        ({formatPercentage(status.percentage)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Content Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Content</h3>
              <div className="space-y-3">
                {matchData.top_content.slice(0, 3).map((content, index) => (
                  <div key={content.content_id} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-bold text-blue-600">#{index + 1}</span>
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {content.title}
                      </h4>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{content.matches} matches</span>
                      <span>{(content.avg_score * 100).toFixed(0)}% avg score</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Influencers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Influencers</h3>
              <div className="space-y-3">
                {matchData.top_influencers.slice(0, 3).map((influencer, index) => (
                  <div key={influencer.user_id} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-bold text-green-600">#{index + 1}</span>
                      <h4 className="font-medium text-gray-900 text-sm">
                        @{influencer.username}
                      </h4>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{influencer.matches} matches</span>
                      <span>{(influencer.avg_score * 100).toFixed(0)}% avg score</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="text-gray-700">Updating metrics...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using metrics data in other components
export function useMetrics() {
  const [data, setData] = useState<{ conversions?: ConversionMetrics; matches?: MatchMetrics } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async (type: 'conversions' | 'matches' | 'both' = 'both', timeRange: string = '30d') => {
    console.log('LOG: METRICS-DASH-5 - Fetching metrics via hook:', type);
    setLoading(true);
    
    try {
      const requests = [];
      
      if (type === 'conversions' || type === 'both') {
        requests.push(fetch(`/api/get-metrics?type=conversions&timeRange=${timeRange}`));
      }
      
      if (type === 'matches' || type === 'both') {
        requests.push(fetch(`/api/get-metrics?type=matches&timeRange=${timeRange}`));
      }

      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map(r => r.json()));
      
      const newData: any = {};
      
      if (type === 'conversions' || type === 'both') {
        if (results[0]?.success) newData.conversions = results[0].data;
      }
      
      if (type === 'matches' || type === 'both') {
        const matchIndex = type === 'both' ? 1 : 0;
        if (results[matchIndex]?.success) newData.matches = results[matchIndex].data;
      }
      
      setData(newData);
      return newData;
    } catch (error) {
      console.error('LOG: METRICS-DASH-ERROR-2 - Hook fetch failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, fetchMetrics };
}