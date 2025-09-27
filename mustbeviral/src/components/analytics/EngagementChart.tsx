import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface EngagementChartProps {
  data?: ChartData[];
  type?: 'line' | 'bar' | 'area' | 'bubble';
  timeframe?: '24h' | '7d' | '30d' | '90d';
  onTimeframeChange?: (timeframe: string) => void;
  className?: string;
}

interface ChartData {
  label: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  timestamp: Date;
  viral?: boolean;
}

interface Metric {
  key: keyof Omit<ChartData, 'label' | 'timestamp' | 'viral'>;
  label: string;
  color: string;
  icon: string;
  active: boolean;
}

export function EngagementChart({
  data = generateMockData(),
  type = 'area',
  timeframe = '7d',
  onTimeframeChange,
  className
}: EngagementChartProps) {
  const [chartType, setChartType] = useState(type);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  const metrics: Metric[] = [
    { key: 'views', label: 'Views', color: 'from-blue-400 to-cyan-500', icon: '👁️', active: true },
    { key: 'likes', label: 'Likes', color: 'from-pink-400 to-rose-500', icon: '❤️', active: true },
    { key: 'comments', label: 'Comments', color: 'from-purple-400 to-violet-500', icon: '💬', active: true },
    { key: 'shares', label: 'Shares', color: 'from-green-400 to-emerald-500', icon: '🔄', active: true },
    { key: 'saves', label: 'Saves', color: 'from-yellow-400 to-orange-500', icon: '🔖', active: false }
  ];

  const [activeMetrics, setActiveMetrics] = useState(metrics);

  useEffect(() => {
    setTimeout(() => setAnimationComplete(true), 1500);
  }, []);

  const toggleMetric = (key: string) => {
    setActiveMetrics(prev =>
      prev.map(m => m.key === key ? { ...m, active: !m.active } : m)
    );
  };

  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf as typeof timeframe);
    onTimeframeChange?.(tf);
  };

  const getMaxValue = () => {
    return Math.max(
      ...data.flatMap(d =>
        activeMetrics.filter(m => m.active).map(m => d[m.key] as number)
      )
    );
  };

  const maxValue = getMaxValue() ?? 1000;

  const chartTypes = [
    { id: 'line', icon: '📈', label: 'Line' },
    { id: 'bar', icon: '📊', label: 'Bar' },
    { id: 'area', icon: '📉', label: 'Area' },
    { id: 'bubble', icon: '⭕', label: 'Bubble' }
  ];

  const timeframes = [
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '3 Months' }
  ];

  return (
    <motion.div
      className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl overflow-hidden",
        "border border-slate-200 dark:border-slate-700",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-primary-500 via-viral-500 to-purple-500 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">📊</span>
              Engagement Analytics
            </h3>
            <p className="text-white/80 mt-1">Track your viral performance</p>
          </div>

          {/* Chart Type Selector */}
          <div className="flex gap-1 bg-white/20 backdrop-blur-sm rounded-lg p-1">
            {chartTypes.map((ct) => (
              <button
                key={ct.id}
                onClick={() => setChartType(ct.id as typeof type)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-all",
                  chartType === ct.id
                    ? "bg-white text-viral-500 shadow-lg"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
                title={ct.label}
              >
                <span className="text-lg">{ct.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf.id}
              onClick={() => handleTimeframeChange(tf.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedTimeframe === tf.id
                  ? "bg-white/30 text-white shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Toggle */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Metrics:
          </span>
          {activeMetrics.map((metric) => (
            <motion.button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1",
                metric.active
                  ? "bg-gradient-to-r text-white shadow-lg"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
                metric.active && metric.color
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{metric.icon}</span>
              {metric.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6">
        <div className="relative h-80">
          {/* Grid Lines */}
          <div className="absolute inset-0">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-full border-t border-slate-100 dark:border-slate-800"
                style={{ top: `${(i * 100) / 4}%` }}
              >
                <span className="absolute -left-12 -top-2 text-xs text-slate-400">
                  {Math.round((maxValue * (4 - i)) / 4).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Chart Content */}
          <div className="relative h-full flex items-end justify-between gap-2">
            {data.map((item, index) => {
              const isHovered = hoveredIndex === index;

              return (
                <motion.div
                  key={index}
                  className="relative flex-1 h-full flex flex-col justify-end"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Viral Badge */}
                  {item.viral && (
                    <motion.div
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: index * 0.1 + 0.5 }}
                    >
                      <span className="text-2xl">🔥</span>
                    </motion.div>
                  )}

                  {chartType === 'bar' && (
                    <div className="relative h-full flex items-end gap-1">
                      {activeMetrics.filter(m => m.active).map((metric, mIndex) => (
                        <motion.div
                          key={metric.key}
                          className={cn(
                            "flex-1 rounded-t-lg bg-gradient-to-t",
                            metric.color
                          )}
                          initial={{ height: 0 }}
                          animate={{
                            height: animationComplete
                              ? `${(item[metric.key] / maxValue) * 100}%`
                              : 0
                          }}
                          transition={{
                            duration: 0.8,
                            delay: index * 0.05 + mIndex * 0.1,
                            ease: "easeOut"
                          }}
                          style={{
                            boxShadow: isHovered
                              ? '0 0 20px rgba(255, 0, 128, 0.5)'
                              : 'none'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {chartType === 'area' && (
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {activeMetrics.filter(m => m.active).map((metric, mIndex) => {
                        const height = (item[metric.key] / maxValue) * 100;
                        const prevHeight = index > 0
                          ? (data[index - 1][metric.key] / maxValue) * 100
                          : height;

                        return (
                          <motion.path
                            key={metric.key}
                            d={`M 0,${100 - prevHeight} L 100,${100 - height} L 100,100 L 0,100 Z`}
                            fill={`url(#gradient-${metric.key})`}
                            fillOpacity={0.3 + mIndex * 0.1}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: animationComplete ? 1 : 0 }}
                            transition={{ delay: index * 0.05 + mIndex * 0.1 }}
                          />
                        );
                      })}
                      <defs>
                        {activeMetrics.map((metric) => (
                          <linearGradient
                            key={`gradient-${metric.key}`}
                            id={`gradient-${metric.key}`}
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#ff0080" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#00ffff" stopOpacity="0.2" />
                          </linearGradient>
                        ))}
                      </defs>
                    </svg>
                  )}

                  {chartType === 'bubble' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {activeMetrics.filter(m => m.active).slice(0, 1).map((metric) => (
                        <motion.div
                          key={metric.key}
                          className={cn(
                            "rounded-full bg-gradient-to-br opacity-80",
                            metric.color
                          )}
                          initial={{ scale: 0 }}
                          animate={{
                            scale: animationComplete
                              ? Math.sqrt(item[metric.key] / maxValue) * 3
                              : 0
                          }}
                          transition={{
                            duration: 0.8,
                            delay: index * 0.1,
                            type: "spring"
                          }}
                          style={{
                            boxShadow: isHovered
                              ? '0 0 30px rgba(255, 0, 128, 0.6)'
                              : '0 4px 20px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Hover Tooltip */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-20"
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      >
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl whitespace-nowrap">
                          <p className="font-bold text-sm mb-1">{item.label}</p>
                          <div className="space-y-1 text-xs">
                            {activeMetrics.filter(m => m.active).map(metric => (
                              <div key={metric.key} className="flex items-center gap-2">
                                <span>{metric.icon}</span>
                                <span>{item[metric.key].toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                          {item.viral && (
                            <div className="mt-2 pt-2 border-t border-white/20 text-center">
                              <span className="text-yellow-400 font-bold">🔥 VIRAL!</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* X-axis Label */}
                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-5 gap-4">
          {activeMetrics.filter(m => m.active).map((metric) => {
            const total = data.reduce((sum, item) => sum + item[metric.key], 0);
            return (
              <div key={metric.key} className="text-center">
                <div className="text-2xl mb-1">{metric.icon}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {total >= 1000000
                    ? `${(total / 1000000).toFixed(1)}M`
                    : total >= 1000
                    ? `${(total / 1000).toFixed(1)}K`
                    : total.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total {metric.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function generateMockData(): ChartData[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels.map((label, i) => ({
    label,
    views: Math.floor(Math.random() * 50000) + 10000,
    likes: Math.floor(Math.random() * 5000) + 1000,
    comments: Math.floor(Math.random() * 1000) + 100,
    shares: Math.floor(Math.random() * 500) + 50,
    saves: Math.floor(Math.random() * 300) + 30,
    timestamp: new Date(),
    viral: i === 3 || i === 5
  }));
}