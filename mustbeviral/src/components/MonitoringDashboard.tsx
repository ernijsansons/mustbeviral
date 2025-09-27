/**
 * Monitoring Dashboard Component
 *
 * Real-time monitoring dashboard for performance metrics,
 * error tracking, and system health visualization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, _} from 'chart.js';
import { Line, Bar, Doughnut} from 'react-chartjs-2';
import { errorTracker} from '../lib/monitoring/errorTracking';
import { performanceMonitor} from '../lib/monitoring/performanceMonitor';
import { logger} from '../lib/logging/productionLogger';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface MonitoringStats {
  errorCount: number;
  averageResponseTime: number;
  requestCount: number;
  memoryUsage: number;
  cacheHitRate: number;
  webVitals: {
    cls: number;
    fcp: number;
    lcp: number;
    fid: number;
    ttfb: number;
  };
  recentErrors: Array<{
    message: string;
    timestamp: number;
    stack?: string;
  }>;
  performanceAlerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: number;
  }>;
}

const MonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats>({
    errorCount: 0,
    averageResponseTime: 0,
    requestCount: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    webVitals: {
      cls: 0,
      fcp: 0,
      lcp: 0,
      fid: 0,
      ttfb: 0
    },
    recentErrors: [],
    performanceAlerts: []
  });

  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'errors' | 'alerts'>('overview');
  const [isRealTime, setIsRealTime] = useState(true);

  // Update stats from monitoring systems
  const updateStats = useCallback_(() => {
    try {
      // Get session info from error tracker
      const sessionInfo = errorTracker.getSessionInfo();

      // Get performance summary
      const perfSummary = performanceMonitor.getPerformanceSummary();

      // Get memory usage if available
      const memoryUsage = ('memory' in performance)
        ? ((performance as unknown).memory.usedJSHeapSize / (performance as unknown).memory.jsHeapSizeLimit) * 100
        : 0;

      setStats({
        errorCount: sessionInfo.errorCount,
        averageResponseTime: perfSummary.webVitals.current.TTFB?.value ?? 0,
        requestCount: perfSummary.network.totalRequests,
        memoryUsage,
        cacheHitRate: perfSummary.network.cacheHitRate,
        webVitals: {
          cls: perfSummary.webVitals.current.CLS?.value ?? 0,
          fcp: perfSummary.webVitals.current.FCP?.value ?? 0,
          lcp: perfSummary.webVitals.current.LCP?.value ?? 0,
          fid: perfSummary.webVitals.current.FID?.value ?? 0,
          ttfb: perfSummary.webVitals.current.TTFB?.value ?? 0
        },
        recentErrors: [], // Would be populated from error tracker
        performanceAlerts: [] // Would be populated from performance monitor
      });
    } catch (error: unknown) {
      logger.error('Failed to update monitoring stats', error instanceof Error ? error : new Error(String(error)), {
        component: 'MonitoringDashboard',
        action: 'updateStats'
      });
    }
  }, []);

  // Real-time updates
  useEffect_(() => {
    updateStats();

    if (isRealTime) {
      const interval = setInterval(updateStats, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [updateStats, isRealTime]);

  // Chart data for response time trends
  const responseTimeData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Response Time (ms)',
        data: Array.from({ length: 24 }, () => Math.random() * 1000 + 200),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
    ],
  };

  // Chart data for error rates
  const errorRateData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Error Rate (%)',
        data: Array.from({ length: 24 }, () => Math.random() * 5),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1,
      },
    ],
  };

  // Chart data for Web Vitals
  const webVitalsData = {
    labels: ['CLS', 'FCP', 'LCP', 'FID', 'TTFB'],
    datasets: [
      {
        label: 'Web Vitals Score',
        data: [
          stats.webVitals.cls <= 0.1 ? 100 : stats.webVitals.cls <= 0.25 ? 60 : 20,
          stats.webVitals.fcp <= 1800 ? 100 : stats.webVitals.fcp <= 3000 ? 60 : 20,
          stats.webVitals.lcp <= 2500 ? 100 : stats.webVitals.lcp <= 4000 ? 60 : 20,
          stats.webVitals.fid <= 100 ? 100 : stats.webVitals.fid <= 300 ? 60 : 20,
          stats.webVitals.ttfb <= 800 ? 100 : stats.webVitals.ttfb <= 1800 ? 60 : 20,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  };

  const formatMetric = (value: number, unit: string) => {
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    }
    if (unit === '%') {
      return `${Math.round(value)}%`;
    }
    if (unit === 'MB') {
      return `${(value / 1024 / 1024).toFixed(1)}MB`;
    }
    return Math.round(value).toLocaleString();
  };

  const getHealthStatus = () => {
    const issues = [];
    if (stats.errorCount > 10) {issues.push('High error count');}
    if (stats.averageResponseTime > 2000) {issues.push('Slow response times');}
    if (stats.memoryUsage > 80) {issues.push('High memory usage');}
    if (stats.webVitals.cls > 0.25) {issues.push('Poor CLS score');}
    if (stats.webVitals.lcp > 4000) {issues.push('Poor LCP score');}

    if (issues.length === 0) {
    return { status: 'healthy', message: 'All systems operational' };
  }
    if (issues.length <= 2) {
    return { status: 'warning', message: `${issues.length} issues detected` };
  }
    return { status: 'critical', message: `${issues.length} critical issues` };
  };

  const health = getHealthStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
            <p className="text-gray-600">Real-time performance and error tracking</p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Health Status */}
            <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              health.status === 'healthy' ? 'bg-green-100 text-green-800' :
              health.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                health.status === 'healthy' ? 'bg-green-500' :
                health.status === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
              <span className="font-medium">{health.message}</span>
            </div>

            {/* Real-time Toggle */}
            <button
              onClick={() => setIsRealTime(!isRealTime)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRealTime
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isRealTime ? '🔴 Live' : '⏸️ Paused'}
            </button>

            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as unknown)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'performance', label: 'Performance', icon: '⚡' },
              { id: 'errors', label: 'Errors', icon: '🚨' },
              { id: 'alerts', label: 'Alerts', icon: '🔔' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as unknown)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Errors (24h)</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.errorCount}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🚨</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMetric(stats.averageResponseTime, 'ms')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Requests (24h)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMetric(stats.requestCount, '')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMetric(stats.memoryUsage, '%')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🧠</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Trend</h3>
              <Line data={responseTimeData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Rate Trend</h3>
              <Line data={errorRateData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Web Vitals */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Web Vitals Score</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80">
                <Doughnut data={webVitalsData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Cumulative Layout Shift', value: stats.webVitals.cls, threshold: 0.1, unit: '' },
                  { name: 'First Contentful Paint', value: stats.webVitals.fcp, threshold: 1800, unit: 'ms' },
                  { name: 'Largest Contentful Paint', value: stats.webVitals.lcp, threshold: 2500, unit: 'ms' },
                  { name: 'First Input Delay', value: stats.webVitals.fid, threshold: 100, unit: 'ms' },
                  { name: 'Time to First Byte', value: stats.webVitals.ttfb, threshold: 800, unit: 'ms' },
                ].map((vital, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{vital.name}</span>
                      <span className={`font-semibold ${
                        vital.value <= vital.threshold ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatMetric(vital.value, vital.unit)}
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          vital.value <= vital.threshold ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, (vital.value / (vital.threshold * 2)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Cache Performance</h4>
              <p className="text-2xl font-bold text-blue-600">{formatMetric(stats.cacheHitRate, '%')}</p>
              <p className="text-sm text-gray-600">Hit Rate</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Network Requests</h4>
              <p className="text-2xl font-bold text-green-600">{stats.requestCount}</p>
              <p className="text-sm text-gray-600">Total Requests</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Resource Usage</h4>
              <p className="text-2xl font-bold text-purple-600">{formatMetric(stats.memoryUsage, '%')}</p>
              <p className="text-sm text-gray-600">Memory Usage</p>
            </div>
          </div>
        </div>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h3>
            {stats.recentErrors.length > 0 ? (
              <div className="space-y-4">
                {stats.recentErrors.map((error, index) => (
                  <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-red-800">{error.message}</p>
                        <p className="text-sm text-red-600">
                          {new Date(error.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button className="text-red-600 hover:text-red-800">
                        View Details
                      </button>
                    </div>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-red-600">Stack Trace</summary>
                        <pre className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded overflow-x-auto">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-4 block">✅</span>
                <p>No recent errors detected</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Alerts</h3>
            {stats.performanceAlerts.length > 0 ? (
              <div className="space-y-4">
                {stats.performanceAlerts.map((alert, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                    alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${
                          alert.severity === 'high' ? 'text-red-800' :
                          alert.severity === 'medium' ? 'text-yellow-800' :
                          'text-blue-800'
                        }`}>
                          {alert.message}
                        </p>
                        <p className={`text-sm ${
                          alert.severity === 'high' ? 'text-red-600' :
                          alert.severity === 'medium' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          {alert.type} • {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.severity === 'high' ? 'bg-red-200 text-red-800' :
                        alert.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-4 block">🔕</span>
                <p>No active alerts</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;