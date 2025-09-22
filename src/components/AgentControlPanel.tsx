// AI Agent Control Panel Component
import React, { _useState, useEffect } from 'react';
import { _Bot, Sparkles, Target, TrendingUp, Zap, Settings, BarChart3, Globe, Users, DollarSign, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { _Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ContextualLoading } from './ui/LoadingStates';

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
    platformBreakdown: Record<string, unknown>;
  };
  budget: {
    daily: { used: number; limit: number; percentage: number };
    weekly: { used: number; limit: number; percentage: number };
    monthly: { used: number; limit: number; percentage: number };
  };
  recommendations: string[];
}

interface ContentRequest {
  topic: string;
  tone: string;
  targetAudience: string;
  platform: string;
  contentType: string;
  goals: string[];
  enableOptimization: boolean;
}

interface CampaignRequest {
  topic: string;
  tone: string;
  targetAudience: string;
  platforms: string[];
  goals: string[];
  campaignType: string;
}

export function AgentControlPanel() {
  const [activeTab, setActiveTab] = useState<'generate' | 'campaign' | 'metrics' | 'optimize'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [lastGeneration, setLastGeneration] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  // Content Generation Form State
  const [contentForm, setContentForm] = useState<ContentRequest>({
    topic: '',
    tone: 'professional',
    targetAudience: 'general audience',
    platform: 'twitter',
    contentType: 'post',
    goals: ['engagement'],
    enableOptimization: true
  });

  // Campaign Generation Form State
  const [campaignForm, setCampaignForm] = useState<CampaignRequest>({
    topic: '',
    tone: 'professional',
    targetAudience: 'general audience',
    platforms: ['twitter', 'instagram'],
    goals: ['engagement', 'awareness'],
    campaignType: 'coordinated_launch'
  });

  // Load metrics on component mount
  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
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
        setMetrics(data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load metrics:', err);
    }
  };

  const handleContentGeneration = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/agents/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contentForm)
      });

      const data = await response.json();

      if (response.ok) {
        setLastGeneration(data.data);
        await loadMetrics(); // Refresh metrics
      } else {
        setError(data.error || 'Content generation failed');
      }
    } catch (err: unknown) {
      setError('Network error occurred');
      console.error('Content generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignGeneration = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/agents/campaign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignForm)
      });

      const data = await response.json();

      if (response.ok) {
        setLastGeneration(data.data);
        await loadMetrics(); // Refresh metrics
      } else {
        setError(data.error || 'Campaign generation failed');
      }
    } catch (err: unknown) {
      setError('Network error occurred');
      console.error('Campaign generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'generate', name: 'Generate Content', icon: Sparkles },
    { id: 'campaign', name: 'Multi-Platform Campaign', icon: Globe },
    { id: 'metrics', name: 'Performance Metrics', icon: BarChart3 },
    { id: 'optimize', name: 'Content Optimizer', icon: Zap },
  ];

  const platformOptions = [
    { value: 'twitter', label: 'Twitter' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' }
  ];

  const contentTypeOptions = [
    { value: 'post', label: 'Social Post' },
    { value: 'story', label: 'Story' },
    { value: 'thread', label: 'Thread' },
    { value: 'video_script', label: 'Video Script' },
    { value: 'caption', label: 'Caption' }
  ];

  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'humorous', label: 'Humorous' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'educational', label: 'Educational' }
  ];

  const renderGenerateTab = () => (
    <div className="space-y-6">
      <Card variant="cosmic" animation="float">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Content Generator
          </CardTitle>
          <CardDescription>
            Generate optimized content for unknown platform using advanced AI agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Topic"
              placeholder="Enter your content topic..."
              value={contentForm.topic}
              onChange={(_e) => setContentForm({ ...contentForm, topic: e.target.value })}
              variant="cosmic"
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Platform</label>
              <select
                value={contentForm.platform}
                onChange={(_e) => setContentForm({ ...contentForm, platform: e.target.value })}
                className="w-full h-10 px-3 border border-purple-300 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 focus:ring-2 focus:ring-purple-500"
              >
                {platformOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Content Type</label>
              <select
                value={contentForm.contentType}
                onChange={(_e) => setContentForm({ ...contentForm, contentType: e.target.value })}
                className="w-full h-10 px-3 border border-purple-300 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 focus:ring-2 focus:ring-purple-500"
              >
                {contentTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Tone</label>
              <select
                value={contentForm.tone}
                onChange={(_e) => setContentForm({ ...contentForm, tone: e.target.value })}
                className="w-full h-10 px-3 border border-purple-300 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 focus:ring-2 focus:ring-purple-500"
              >
                {toneOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <Input
              label="Target Audience"
              placeholder="Describe your target audience..."
              value={contentForm.targetAudience}
              onChange={(_e) => setContentForm({ ...contentForm, targetAudience: e.target.value })}
              variant="cosmic"
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="optimization"
                checked={contentForm.enableOptimization}
                onChange={(_e) => setContentForm({ ...contentForm, enableOptimization: e.target.checked })}
                className="w-4 h-4 text-purple-600 bg-white border-purple-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="optimization" className="text-sm font-medium text-neutral-700">
                Enable AI Optimization
              </label>
            </div>
          </div>

          <Button
            onClick={handleContentGeneration}
            disabled={!contentForm.topic || isLoading}
            loading={isLoading}
            variant="cosmic"
            size="lg"
            className="w-full"
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Generate Content
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {lastGeneration && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{lastGeneration.content}</pre>
              </div>

              {lastGeneration.quality && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Quality Score: {Math.round(lastGeneration.quality.score)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span>Cost: ${lastGeneration.performance?.costEstimate?.toFixed(4) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span>Processing: {lastGeneration.performance?.processingTime}ms</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCampaignTab = () => (
    <div className="space-y-6">
      <Card variant="plasma" animation="float">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Multi-Platform Campaign Generator
          </CardTitle>
          <CardDescription>
            Create coordinated campaigns across multiple social media platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Campaign Topic"
              placeholder="Enter your campaign topic..."
              value={campaignForm.topic}
              onChange={(_e) => setCampaignForm({ ...campaignForm, topic: e.target.value })}
              variant="plasma"
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Tone</label>
              <select
                value={campaignForm.tone}
                onChange={(_e) => setCampaignForm({ ...campaignForm, tone: e.target.value })}
                className="w-full h-10 px-3 border border-pink-300 rounded-lg bg-gradient-to-r from-pink-50 to-violet-50 focus:ring-2 focus:ring-pink-500"
              >
                {toneOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <Input
              label="Target Audience"
              placeholder="Describe your target audience..."
              value={campaignForm.targetAudience}
              onChange={(_e) => setCampaignForm({ ...campaignForm, targetAudience: e.target.value })}
              variant="plasma"
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Campaign Type</label>
              <select
                value={campaignForm.campaignType}
                onChange={(_e) => setCampaignForm({ ...campaignForm, campaignType: e.target.value })}
                className="w-full h-10 px-3 border border-pink-300 rounded-lg bg-gradient-to-r from-pink-50 to-violet-50 focus:ring-2 focus:ring-pink-500"
              >
                <option value="coordinated_launch">Coordinated Launch</option>
                <option value="viral_push">Viral Push</option>
                <option value="awareness_campaign">Awareness Campaign</option>
                <option value="engagement_drive">Engagement Drive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Platforms</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {platformOptions.map(platform => (
                <label key={platform.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={campaignForm.platforms.includes(platform.value)}
                    onChange={(_e) => {
                      if (e.target.checked) {
                        setCampaignForm({
                          ...campaignForm,
                          platforms: [...campaignForm.platforms, platform.value]
                        });
                      } else {
                        setCampaignForm({
                          ...campaignForm,
                          platforms: campaignForm.platforms.filter(p => p !== platform.value)
                        });
                      }
                    }}
                    className="w-4 h-4 text-pink-600 bg-white border-pink-300 rounded focus:ring-pink-500"
                  />
                  <span className="text-sm">{platform.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCampaignGeneration}
            disabled={!campaignForm.topic || campaignForm.platforms.length === 0 || isLoading}
            loading={isLoading}
            variant="plasma"
            size="lg"
            className="w-full"
            leftIcon={<Globe className="h-4 w-4" />}
          >
            Generate Campaign
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderMetricsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Agent Performance</h2>
        <Button onClick={loadMetrics} variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      {!metrics ? (
        <ContextualLoading context="analytics" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="quantum">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Requests</p>
                  <p className="text-2xl font-bold">{metrics.usage.totalRequests}</p>
                </div>
                <Bot className="h-8 w-8 text-cyan-600" />
              </div>
            </CardContent>
          </Card>

          <Card variant="energy">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Success Rate</p>
                  <p className="text-2xl font-bold">{Math.round(metrics.usage.successRate)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card variant="aurora">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Cost</p>
                  <p className="text-2xl font-bold">${metrics.usage.totalCost.toFixed(4)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card variant="cosmic">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Optimizations</p>
                  <p className="text-2xl font-bold">{metrics.optimization.totalOptimizations}</p>
                </div>
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Daily</span>
                    <span>{metrics.budget.daily.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(metrics.budget.daily.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Weekly</span>
                    <span>{metrics.budget.weekly.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${Math.min(metrics.budget.weekly.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Monthly</span>
                    <span>{metrics.budget.monthly.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(metrics.budget.monthly.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.recommendations.map((rec, _index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((_tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as unknown)}
                    className={`${
                      isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'generate' && renderGenerateTab()}
          {activeTab === 'campaign' && renderCampaignTab()}
          {activeTab === 'metrics' && renderMetricsTab()}
          {activeTab === 'optimize' && (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Content Optimizer</h3>
              <p className="text-gray-500">Coming soon - Advanced content optimization tools</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AgentControlPanel;