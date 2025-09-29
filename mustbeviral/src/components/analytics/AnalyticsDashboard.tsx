import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalViews: number;
    totalEngagement: number;
    averageViralScore: number;
    revenue: number;
  };
  timeSeriesData: Array<{
    date: string;
    views: number;
    engagement: number;
    viralScore: number;
  }>;
  contentPerformance: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    viralScore: number;
  }>;
  platformDistribution: Array<{
    platform: string;
    value: number;
  }>;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? 'Week' : range === '30d' ? 'Month' : 'Quarter'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OverviewCard
          title="Total Views"
          value={data.overview.totalViews.toLocaleString()}
          change="+12%"
          icon={<Eye className="h-6 w-6" />}
          color="blue"
        />
        <OverviewCard
          title="Engagement Rate"
          value={`${data.overview.totalEngagement}%`}
          change="+8%"
          icon={<Activity className="h-6 w-6" />}
          color="green"
        />
        <OverviewCard
          title="Viral Score"
          value={data.overview.averageViralScore.toFixed(1)}
          change="+15%"
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
        />
        <OverviewCard
          title="Revenue"
          value={`$${data.overview.revenue.toLocaleString()}`}
          change="+20%"
          icon={<DollarSign className="h-6 w-6" />}
          color="yellow"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Performance Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="viralScore" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Platform Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.platformDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ platform, value }) => `${platform}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.platformDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content Performance Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Top Performing Content</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="pb-3">Content</th>
                <th className="pb-3">Views</th>
                <th className="pb-3">Likes</th>
                <th className="pb-3">Shares</th>
                <th className="pb-3">Comments</th>
                <th className="pb-3">Viral Score</th>
              </tr>
            </thead>
            <tbody>
              {data.contentPerformance.map((content) => (
                <tr key={content.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">
                    <div className="font-medium">{content.title}</div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span>{content.views.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4 text-red-400" />
                      <span>{content.likes.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-1">
                      <Share2 className="h-4 w-4 text-blue-400" />
                      <span>{content.shares.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4 text-green-400" />
                      <span>{content.comments.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        content.viralScore >= 80 ? 'bg-green-100 text-green-800' :
                        content.viralScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {content.viralScore}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-xl text-white">
        <h2 className="text-lg font-semibold mb-4">Real-time Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold">1,234</div>
            <div className="text-purple-100">Active Users</div>
          </div>
          <div>
            <div className="text-3xl font-bold">89</div>
            <div className="text-purple-100">Content Created/Hour</div>
          </div>
          <div>
            <div className="text-3xl font-bold">456K</div>
            <div className="text-purple-100">API Requests/Hour</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OverviewCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function OverviewCard({ title, value, change, icon, color }: OverviewCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className={`text-sm mt-2 ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change} from last period
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}