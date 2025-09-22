// Dashboard Overview Component with Real-time AI Agent Metrics
import React, { _useState, useEffect } from 'react';
import { _Bot, DollarSign, Zap, TrendingUp, CheckCircle, AlertTriangle, RefreshCw, FileText, Clock, Eye } from 'lucide-react';
import { GamificationWidget } from './GamificationWidget';
import { ContentPreview } from './ContentPreview';

interface AgentMetrics {
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageCost: number;
    successRate: number;
  };
  optimization: {
    totalOptimizations: number;
    averageReduction: number;
  };
  budget: {
    daily: { used: number; limit: number; percentage: number };
    weekly: { used: number; limit: number; percentage: number };
    monthly: { used: number; limit: number; percentage: number };
  };
}

export function DashboardOverview() {
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAgentMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/agents/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAgentMetrics(data.data);
        setLastUpdated(new Date());
      }
    } catch (err: unknown) {
      console.error('Failed to load agent metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // Load metrics on component mount and set up auto-refresh
  useEffect(() => {
    loadAgentMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAgentMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Main Overview Cards */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold">Content</h3>
            <p className="text-2xl font-bold">24</p>
            <p className="text-blue-100">Created this month</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold">Views</h3>
            <p className="text-2xl font-bold">12.5K</p>
            <p className="text-green-100">Total views</p>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold">Engagement</h3>
            <p className="text-2xl font-bold">8.2%</p>
            <p className="text-purple-100">Average rate</p>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold">Strategies</h3>
            <p className="text-2xl font-bold">15</p>
            <p className="text-orange-100">Active strategies</p>
          </div>
        </div>
      </div>

      {/* AI Agent Metrics Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Agent Performance
          </h3>
          <button
            onClick={loadAgentMetrics}
            disabled={isLoadingMetrics}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {!agentMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, _i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-8 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-6 border border-cyan-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-cyan-700">AI Requests</p>
                    <p className="text-2xl font-bold text-cyan-900">{agentMetrics.usage.totalRequests}</p>
                    <p className="text-xs text-cyan-600">Total processed</p>
                  </div>
                  <Bot className="h-8 w-8 text-cyan-600" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Success Rate</p>
                    <p className="text-2xl font-bold text-green-900">{Math.round(agentMetrics.usage.successRate)}%</p>
                    <p className="text-xs text-green-600">Quality assured</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Total Cost</p>
                    <p className="text-2xl font-bold text-orange-900">${agentMetrics.usage.totalCost.toFixed(4)}</p>
                    <p className="text-xs text-orange-600">Avg: ${agentMetrics.usage.averageCost.toFixed(4)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Optimizations</p>
                    <p className="text-2xl font-bold text-purple-900">{agentMetrics.optimization.totalOptimizations}</p>
                    <p className="text-xs text-purple-600">{agentMetrics.optimization.averageReduction.toFixed(1)}% avg reduction</p>
                  </div>
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Budget Usage */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Budget Usage</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Daily</span>
                    <span className="font-medium">{agentMetrics.budget.daily.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        agentMetrics.budget.daily.percentage > 80
                          ? 'bg-red-500'
                          : agentMetrics.budget.daily.percentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(agentMetrics.budget.daily.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Weekly</span>
                    <span className="font-medium">{agentMetrics.budget.weekly.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        agentMetrics.budget.weekly.percentage > 80
                          ? 'bg-red-500'
                          : agentMetrics.budget.weekly.percentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(agentMetrics.budget.weekly.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Monthly</span>
                    <span className="font-medium">{agentMetrics.budget.monthly.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        agentMetrics.budget.monthly.percentage > 80
                          ? 'bg-red-500'
                          : agentMetrics.budget.monthly.percentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(agentMetrics.budget.monthly.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Budget Alert */}
        {agentMetrics && agentMetrics.budget.daily.percentage > 80 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800">Budget Alert</h4>
              <p className="text-sm text-yellow-700">
                Daily budget usage is above 80%. Consider reviewing AI agent usage or increasing budget limits.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Content */}
      <RecentContent />

      {/* Gamification Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GamificationWidget compact={true} />
      </div>
    </div>
  );
}

// Recent Content Component
function RecentContent() {
  const [content, setContent] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewContent, setPreviewContent] = useState<unknown>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const loadRecentContent = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch('http://localhost:8787/api/content?limit=5&status=draft,published', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setContent(data.content || []);
        }
      } catch (err: unknown) {
        console.error('Failed to load recent content:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentContent();
  }, []);

  const handlePreview = (item: unknown) => {
    setPreviewContent({
      ...item,
      platform: 'general', // Default platform for overview content
      metadata: item.metadata ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) : {}
    });
    setShowPreview(true);
  };

  const handleStatusChange = async (contentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`http://localhost:8787/api/content/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setContent(prev =>
          prev.map(item =>
            item.id === contentId ? { ...item, status: newStatus } : item
          )
        );
        if (previewContent?.id === contentId) {
          setPreviewContent((prev: unknown) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to update content status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Content</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, _i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-300 rounded-full w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-600" />
          Recent Content
        </h3>
        <span className="text-sm text-gray-500">{content.length} items</span>
      </div>

      {content.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No content created yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first piece of content to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {content.map((item, _index) => (
            <div key={item.id || index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  {item.generated_by_ai && (
                    <Bot className="h-4 w-4 text-blue-600" title="AI Generated" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}
                  </span>
                  {item.type && (
                    <span className="capitalize">{item.type.replace('_', ' ')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePreview(item)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : item.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Preview Modal */}
      {previewContent && (
        <ContentPreview
          content={previewContent}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

export default DashboardOverview;