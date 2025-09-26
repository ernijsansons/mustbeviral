import React, { useState, useEffect } from 'react';
import { Activity, Zap, Database, Gauge, TrendingUp, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  bundleSize: {
    total: number;
    js: number;
    css: number;
    compressed: number;
  };
  webVitals: {
    fcp: number;
    lcp: number;
    cls: number;
    tbt: number;
    fid: number;
  };
  database: {
    activeConnections: number;
    queryCount: number;
    averageResponseTime: number;
    cacheHitRate: number;
  };
  aiCosts: {
    totalCost: number;
    requestCount: number;
    averageCost: number;
    efficiency: number;
  };
  alerts: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // In a real app, this would fetch from your monitoring API
        const mockMetrics: PerformanceMetrics = {
          bundleSize: {
            total: 1.2 * 1024 * 1024, // 1.2MB
            js: 450 * 1024, // 450KB
            css: 80 * 1024, // 80KB
            compressed: 0.6 * 1024 * 1024, // 600KB
          },
          webVitals: {
            fcp: 1200, // ms
            lcp: 2100, // ms
            cls: 0.05,
            tbt: 150, // ms
            fid: 80, // ms
          },
          database: {
            activeConnections: 5,
            queryCount: 1247,
            averageResponseTime: 45, // ms
            cacheHitRate: 0.78, // 78%
          },
          aiCosts: {
            totalCost: 23.45, // $
            requestCount: 1890,
            averageCost: 0.0124, // $ per request
            efficiency: 0.85, // Quality per dollar
          },
          alerts: [
            {
              type: 'warning',
              message: 'Bundle size approaching limit (400KB remaining)',
              timestamp: new Date(Date.now() - 300000).toISOString(),
            },
            {
              type: 'info',
              message: 'Cache hit rate improved by 12% this hour',
              timestamp: new Date(Date.now() - 600000).toISOString(),
            },
          ],
        };

        setMetrics(mockMetrics);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getVitalStatus = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds = {
      fcp: [1500, 2500],
      lcp: [2500, 4000],
      cls: [0.1, 0.25],
      tbt: [200, 600],
      fid: [100, 300],
    };

    const [good, poor] = thresholds[metric as keyof typeof thresholds] || [0, 0];
    
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
          <p>Failed to load performance metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Gauge className="w-6 h-6 mr-2" />
          Performance Dashboard
        </h2>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Alerts */}
      {metrics.alerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Recent Alerts
          </h3>
          <div className="space-y-2">
            {metrics.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.type === 'error'
                    ? 'border-red-500 bg-red-50'
                    : alert.type === 'warning'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Bundle Size Metrics */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bundle Size</h3>
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.bundleSize.total)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-600">JS</p>
                <p className="font-semibold">{formatBytes(metrics.bundleSize.js)}</p>
              </div>
              <div>
                <p className="text-gray-600">CSS</p>
                <p className="font-semibold">{formatBytes(metrics.bundleSize.css)}</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-500">
                Compressed: {formatBytes(metrics.bundleSize.compressed)}
              </p>
            </div>
          </div>
        </div>

        {/* Core Web Vitals */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Web Vitals</h3>
            <Zap className="w-6 h-6 text-green-600" />
          </div>
          <div className="space-y-3">
            {Object.entries(metrics.webVitals).map(([key, value]) => {
              const status = getVitalStatus(key, value);
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 uppercase">{key}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold">
                      {key === 'cls' ? value.toFixed(3) : `${value}ms`}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status)}`}
                    >
                      {status === 'good' ? '✓' : status === 'needs-improvement' ? '⚠' : '✗'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Database Performance */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Database</h3>
            <Database className="w-6 h-6 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.database.activeConnections}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <p className="text-gray-600">Queries</p>
                <p className="font-semibold">{metrics.database.queryCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Avg Response</p>
                <p className="font-semibold">{metrics.database.averageResponseTime}ms</p>
              </div>
              <div>
                <p className="text-gray-600">Cache Hit Rate</p>
                <p className="font-semibold">
                  {(metrics.database.cacheHitRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Cost Metrics */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">AI Costs</h3>
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.aiCosts.totalCost)}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <p className="text-gray-600">Requests</p>
                <p className="font-semibold">{metrics.aiCosts.requestCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Avg Cost</p>
                <p className="font-semibold">{formatCurrency(metrics.aiCosts.averageCost)}</p>
              </div>
              <div>
                <p className="text-gray-600">Efficiency</p>
                <p className="font-semibold">
                  {(metrics.aiCosts.efficiency * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trends Chart Placeholder */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-2" />
            <p>Performance charts would be rendered here</p>
            <p className="text-sm">Integration with Recharts or similar charting library</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;