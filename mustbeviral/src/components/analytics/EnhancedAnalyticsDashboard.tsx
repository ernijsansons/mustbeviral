// Enhanced Analytics Dashboard - Mobile-optimized with accessibility-compliant visualizations
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Eye, Heart, Share2,
  Users, Clock, Target, Filter, Download, RefreshCcw,
  ChevronUp, ChevronDown, Info, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

// TypeScript interfaces for analytics data
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: number[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

export interface PerformanceInsight {
  id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FilterOptions {
  timeRange: '7d' | '30d' | '90d' | '1y';
  platform: 'all' | 'twitter' | 'instagram' | 'linkedin' | 'facebook';
  contentType: 'all' | 'post' | 'video' | 'image' | 'story';
}

export interface EnhancedAnalyticsDashboardProps {
  metrics?: AnalyticsMetric[];
  insights?: PerformanceInsight[];
  onFilterChange?: (filters: FilterOptions) => void;
  onExport?: (format: 'pdf' | 'csv' | 'xlsx') => Promise<void>;
  onRefresh?: () => Promise<void>;
  className?: string;
  isLoading?: boolean;
  compact?: boolean;
}

const defaultMetrics: AnalyticsMetric[] = [
  {
    id: 'engagement',
    name: 'Engagement Rate',
    value: 4.8,
    change: 12.5,
    changeType: 'increase',
    trend: [3.2, 3.8, 4.1, 4.3, 4.8],
    icon: Heart,
    color: 'text-pink-500',
    description: 'Average engagement rate across all platforms'
  },
  {
    id: 'reach',
    name: 'Total Reach',
    value: 125000,
    change: -3.2,
    changeType: 'decrease',
    trend: [130000, 128000, 125000, 127000, 125000],
    icon: Eye,
    color: 'text-blue-500',
    description: 'Total number of unique users reached'
  },
  {
    id: 'shares',
    name: 'Shares',
    value: 2840,
    change: 28.3,
    changeType: 'increase',
    trend: [2200, 2400, 2600, 2700, 2840],
    icon: Share2,
    color: 'text-green-500',
    description: 'Content shares and reposts'
  },
  {
    id: 'followers',
    name: 'Followers',
    value: 18500,
    change: 5.7,
    changeType: 'increase',
    trend: [17500, 17800, 18000, 18200, 18500],
    icon: Users,
    color: 'text-purple-500',
    description: 'Total follower count across platforms'
  }
];

const defaultInsights: PerformanceInsight[] = [
  {
    id: '1',
    type: 'success',
    title: 'Peak Performance Time Identified',
    description: 'Your content performs 40% better when posted between 2-4 PM',
    action: 'Schedule more content during this window',
    priority: 'high'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Engagement Drop on Weekends',
    description: 'Weekend engagement is 25% lower than weekdays',
    action: 'Adjust weekend content strategy',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'info',
    title: 'Video Content Trending',
    description: 'Video posts are generating 60% more engagement',
    action: 'Consider increasing video content',
    priority: 'medium'
  }
];

export const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({
  metrics = defaultMetrics,
  insights = defaultInsights,
  onFilterChange,
  onExport,
  onRefresh,
  className,
  isLoading = false,
  compact = false
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: '30d',
    platform: 'all',
    contentType: 'all'
  });

  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  }, [filters, onFilterChange]);

  // Handle metric expansion
  const toggleMetricExpansion = useCallback((metricId: string) => {
    setExpandedMetric(prev => prev === metricId ? null : metricId);
  }, []);

  // Get insight icon
  const getInsightIcon = useCallback((type: PerformanceInsight['type']) => {
    switch (type) {
      case 'success': return TrendingUp;
      case 'warning': return AlertCircle;
      case 'info': return Info;
      default: return Info;
    }
  }, []);

  // Get insight colors
  const getInsightColors = useCallback((type: PerformanceInsight['type']) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  // Generate mini sparkline
  const generateSparkline = useCallback((trend: number[]) => {
    const max = Math.max(...trend);
    const min = Math.min(...trend);
    const range = max - min;

    return trend.map((value, index) => {
      const normalizedValue = range === 0 ? 0.5 : (value - min) / range;
      const x = (index / (trend.length - 1)) * 100;
      const y = (1 - normalizedValue) * 100;
      return `${x},${y}`;
    }).join(' ');
  }, []);

  // Sorted insights by priority
  const sortedInsights = useMemo(() => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return [...insights].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }, [insights]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-500" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time performance insights and metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Filter */}
          <select
            value={filters.timeRange}
            onChange={(e) => handleFilterChange({ timeRange: e.target.value as FilterOptions['timeRange'] })}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label="Time range filter"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          {/* Platform Filter */}
          <select
            value={filters.platform}
            onChange={(e) => handleFilterChange({ platform: e.target.value as FilterOptions['platform'] })}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label="Platform filter"
          >
            <option value="all">All Platforms</option>
            <option value="twitter">Twitter</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="facebook">Facebook</option>
          </select>

          {/* Action Buttons */}
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            leftIcon={<RefreshCcw className="w-4 h-4" />}
            loading={isLoading}
            title="Refresh data"
          >
            Refresh
          </Button>

          {onExport && (
            <Button
              onClick={() => onExport('pdf')}
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              title="Export report"
            >
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isExpanded = expandedMetric === metric.id;

          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="h-full cursor-pointer"
                variant="outline"
                animation="lift"
                onClick={() => toggleMetricExpansion(metric.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`${metric.name}: ${metric.value}${metric.name.includes('Rate') ? '%' : ''}, ${metric.changeType} by ${Math.abs(metric.change)}%`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('w-5 h-5', metric.color)} aria-hidden="true" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {metric.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      aria-label={isExpanded ? 'Collapse metric details' : 'Expand metric details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="mb-3">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metric.name.includes('Rate')
                        ? `${metric.value}%`
                        : metric.value.toLocaleString()
                      }
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {metric.changeType === 'increase' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" aria-hidden="true" />
                      ) : metric.changeType === 'decrease' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" aria-hidden="true" />
                      ) : null}
                      <span className={cn(
                        'font-medium',
                        metric.changeType === 'increase' ? 'text-green-600' :
                        metric.changeType === 'decrease' ? 'text-red-600' :
                        'text-gray-600'
                      )}>
                        {metric.changeType === 'increase' ? '+' : metric.changeType === 'decrease' ? '-' : ''}
                        {Math.abs(metric.change)}%
                      </span>
                      <span className="text-gray-500">vs previous period</span>
                    </div>
                  </div>

                  {/* Mini Sparkline */}
                  <div className="h-8 mb-2">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <polyline
                        points={generateSparkline(metric.trend)}
                        fill="none"
                        stroke={metric.color.replace('text-', '').replace('-500', '')}
                        strokeWidth="2"
                        className="opacity-60"
                      />
                    </svg>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-3 border-t border-gray-200 dark:border-gray-700"
                      >
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {metric.description}
                        </p>
                        <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <span>Trend (5 periods)</span>
                          <span>{filters.timeRange}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Performance Insights */}
      <Card variant="outline">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle level={4} className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-500" />
              Performance Insights
            </CardTitle>
            <Button
              onClick={() => setShowInsights(!showInsights)}
              variant="ghost"
              size="sm"
              leftIcon={showInsights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            >
              {showInsights ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>

        <AnimatePresence>
          {showInsights && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <CardContent className="space-y-3">
                {sortedInsights.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No insights available at the moment</p>
                  </div>
                ) : (
                  sortedInsights.map((insight) => {
                    const Icon = getInsightIcon(insight.type);
                    return (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'p-4 rounded-lg border',
                          getInsightColors(insight.type)
                        )}
                        role="article"
                        aria-labelledby={`insight-title-${insight.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <h4
                              id={`insight-title-${insight.id}`}
                              className="text-sm font-semibold mb-1"
                            >
                              {insight.title}
                            </h4>
                            <p className="text-sm opacity-90 mb-2">
                              {insight.description}
                            </p>
                            {insight.action && (
                              <div className="text-xs font-medium opacity-75">
                                <strong>Recommended action:</strong> {insight.action}
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                            insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {insight.priority}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Updating analytics...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedAnalyticsDashboard;