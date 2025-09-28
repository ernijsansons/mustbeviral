import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ViralMetricsCardProps {
  metric: {
    label: string;
    value: number;
    change: number;
    icon: string;
    color: string;
    suffix?: string;
    prefix?: string;
    trending?: 'up' | 'down' | 'stable';
    sparkline?: number[];
    milestone?: number;
  };
  animate?: boolean;
  className?: string;
}

export function ViralMetricsCard({ metric, animate = true, className }: ViralMetricsCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  // Animated counter
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30
  });

  const displayValue = useTransform(springValue, (latest) => {
    if (metric.suffix === '%') {
      return Math.round(latest);
    }
    if (latest >= 1000000) {
      return `${(latest / 1000000).toFixed(1)}M`;
    }
    if (latest >= 1000) {
      return `${(latest / 1000).toFixed(1)}K`;
    }
    return Math.round(latest).toLocaleString();
  });

  useEffect(() => {
    if (animate) {
      motionValue.set(metric.value);
    }
  }, [metric.value, animate, motionValue]);

  // Check for milestone celebration
  useEffect(() => {
    if (metric.milestone && metric.value >= metric.milestone && !celebrated) {
      setCelebrated(true);
      setTimeout(() => setCelebrated(false), 3000);
    }
  }, [metric.value, metric.milestone, celebrated]);

  const getTrendIcon = () => {
    switch (metric.trending) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = () => {
    switch (metric.trending) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const generateSparklinePath = (data: number[]) => {
    if (!data || data.length === 0) {
      return '';
    }

    const width = 100;
    const height = 30;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <motion.div
      className={cn(
        "relative bg-white dark:bg-slate-900 rounded-2xl p-6 overflow-hidden",
        "border border-slate-200 dark:border-slate-700",
        "hover:shadow-xl transition-shadow duration-300",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      role="article"
      aria-label={`${metric.label} metrics card`}
    >
      {/* Gradient Background */}
      <div
        className={cn(
          "absolute inset-0 opacity-5 bg-gradient-to-br",
          metric.color
        )}
      />

      {/* Celebration Animation */}
      {celebrated && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl"
              initial={{
                x: '50%',
                y: '50%',
                scale: 0
              }}
              animate={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                scale: [0, 1.5, 0],
                rotate: Math.random() * 360
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                ease: "easeOut"
              }}
            >
              🎉
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
              "bg-gradient-to-br shadow-lg",
              metric.color
            )}
            whileHover={{ scale: 1.1, rotate: 10 }}
            role="img"
            aria-label={`${metric.label} icon`}
          >
            {metric.icon}
          </motion.div>
          <div>
            <h3 className="text-sm text-slate-500 dark:text-slate-400">
              {metric.label}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={cn("text-xs font-medium", getTrendColor())}
                aria-label={`Change: ${metric.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(metric.change)} percent`}
              >
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </span>
              <span className="text-lg" role="img" aria-label={`Trend: ${metric.trending}`}>{getTrendIcon()}</span>
            </div>
          </div>
        </div>

        {/* Trend Badge */}
        {metric.trending === 'up' && metric.change > 20 && (
          <motion.div
            className="px-2 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.5 }}
            role="status"
            aria-label="Trending hot: significant increase"
          >
            <span role="img" aria-label="fire emoji">🔥</span> HOT
          </motion.div>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <motion.div
          className="text-4xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {metric.prefix}
          <motion.span
            key={metric.value}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {animate ? displayValue : metric.value.toLocaleString()}
          </motion.span>
          {metric.suffix}
        </motion.div>

        {/* Milestone Progress */}
        {metric.milestone && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Next milestone</span>
              <span className="font-medium">
                {metric.milestone.toLocaleString()}{metric.suffix}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r",
                  metric.color
                )}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min((metric.value / metric.milestone) * 100, 100)}%`
                }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sparkline Chart */}
      {metric.sparkline && metric.sparkline.length > 0 && (
        <div className="relative h-12 mb-3">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 30"
            preserveAspectRatio="none"
            className="absolute inset-0"
          >
            <defs>
              <linearGradient id={`gradient-${metric.label}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff0080" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00ffff" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <motion.path
              d={generateSparklinePath(metric.sparkline)}
              fill="none"
              stroke={`url(#gradient-${metric.label})`}
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            <motion.path
              d={`${generateSparklinePath(metric.sparkline)} L 100,30 L 0,30 Z`}
              fill={`url(#gradient-${metric.label})`}
              fillOpacity="0.1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            />
          </svg>

          {/* Hover Tooltip */}
          {isHovered && (
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Last 7 days
            </motion.div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <motion.button
          className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Details
        </motion.button>
        <motion.button
          className={cn(
            "flex-1 px-3 py-2 rounded-lg text-sm font-bold text-white",
            "bg-gradient-to-r shadow-lg",
            metric.color
          )}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(255, 0, 128, 0.3)' }}
          whileTap={{ scale: 0.98 }}
        >
          Boost 🚀
        </motion.button>
      </div>

      {/* Animated Background Elements */}
      <motion.div
        className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-10"
        style={{
          background: `radial-gradient(circle, ${metric.color === 'from-primary-500 to-viral-500' ? '#ff0080' : '#00ffff'} 0%, transparent 70%)`
        }}
        animate={{
          scale: isHovered ? [1, 1.2, 1] : 1,
          rotate: isHovered ? 360 : 0
        }}
        transition={{ duration: 2, repeat: isHovered ? Infinity : 0 }}
      />
    </motion.div>
  );
}