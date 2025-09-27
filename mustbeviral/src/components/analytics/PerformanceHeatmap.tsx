import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface PerformanceHeatmapProps {
  data?: HeatmapData;
  metric?: 'engagement' | 'views' | 'viral_score';
  onCellClick?: (hour: number, day: number, value: number) => void;
  className?: string;
}

interface HeatmapData {
  values: number[][];  // 7 days x 24 hours
  peaks: { day: number; hour: number; value: number }[];
  average: number;
}

interface TimeSlot {
  day: number;
  hour: number;
  value: number;
  isOptimal: boolean;
  isPeak: boolean;
}

export function PerformanceHeatmap({
  data = generateMockHeatmapData(),
  metric = 'engagement',
  onCellClick,
  className
}: PerformanceHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [showOptimalTimes, setShowOptimalTimes] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const metrics = [
    { id: 'engagement', label: 'Engagement', icon: '💬', color: 'from-purple-500 to-pink-500' },
    { id: 'views', label: 'Views', icon: '👁️', color: 'from-blue-500 to-cyan-500' },
    { id: 'viral_score', label: 'Viral Score', icon: '🔥', color: 'from-orange-500 to-red-500' }
  ];

  const getColorIntensity = (value: number): string => {
    const max = Math.max(...data.values.flat());
    const intensity = value / max;

    if (intensity === 0) {
      return 'bg-slate-100 dark:bg-slate-800';
    }
    if (intensity < 0.2) {
      return 'bg-blue-200 dark:bg-blue-900';
    }
    if (intensity < 0.4) {
      return 'bg-green-300 dark:bg-green-800';
    }
    if (intensity < 0.6) {
      return 'bg-yellow-400 dark:bg-yellow-700';
    }
    if (intensity < 0.8) {
      return 'bg-orange-500 dark:bg-orange-600';
    }
    return 'bg-red-600 dark:bg-red-500';
  };

  const getGlowEffect = (value: number): string => {
    const max = Math.max(...data.values.flat());
    const intensity = value / max;

    if (intensity < 0.6) {
      return '';
    }
    if (intensity < 0.8) {
      return 'shadow-lg shadow-yellow-500/30';
    }
    return 'shadow-xl shadow-red-500/50 animate-pulse';
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) {
      return '12 AM';
    }
    if (hour === 12) {
      return '12 PM';
    }
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  const isPeakTime = (day: number, hour: number): boolean => {
    return data.peaks.some(p => p.day === day && p.hour === hour);
  };

  const getOptimalSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    data.values.forEach((dayData, dayIndex) => {
      dayData.forEach((value, hourIndex) => {
        if (value > data.average * 1.5) {
          slots.push({
            day: dayIndex,
            hour: hourIndex,
            value,
            isOptimal: true,
            isPeak: isPeakTime(dayIndex, hourIndex)
          });
        }
      });
    });
    return slots.sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const optimalSlots = getOptimalSlots();

  return (
    <motion.div
      className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl overflow-hidden",
        "border border-slate-200 dark:border-slate-700",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">🔥</span>
              Performance Heatmap
            </h3>
            <p className="text-white/80 mt-1">Find your viral sweet spots</p>
          </div>

          {/* Metric Selector */}
          <div className="flex gap-2">
            {metrics.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id as typeof metric)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1",
                  selectedMetric === m.id
                    ? "bg-white text-red-500 shadow-lg"
                    : "bg-white/20 text-white/80 hover:bg-white/30"
                )}
              >
                <span>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Options */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowOptimalTimes(!showOptimalTimes)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              showOptimalTimes
                ? "bg-white/30 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            )}
          >
            {showOptimalTimes ? '✨ Showing' : '👁️ Show'} Optimal Times
          </button>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-300 rounded"></div>
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-400 rounded"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600 rounded animate-pulse"></div>
              <span>High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="p-6 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Hour Labels */}
          <div className="flex gap-1 mb-2 ml-20">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-xs text-slate-500 dark:text-slate-400"
              >
                {hour % 3 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>

          {/* Heatmap Rows */}
          {days.map((day, dayIndex) => (
            <div key={day} className="flex gap-1 mb-1">
              {/* Day Label */}
              <div className="w-20 flex items-center justify-end pr-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {day.slice(0, 3)}
              </div>

              {/* Hour Cells */}
              {hours.map((hour) => {
                const value = data.values[dayIndex][hour];
                const isPeak = isPeakTime(dayIndex, hour);
                const isHovered = hoveredCell?.day === dayIndex && hoveredCell?.hour === hour;
                const isOptimal = optimalSlots.some(s => s.day === dayIndex && s.hour === hour);

                return (
                  <motion.div
                    key={`${dayIndex}-${hour}`}
                    className={cn(
                      "relative flex-1 h-8 rounded cursor-pointer transition-all",
                      getColorIntensity(value),
                      getGlowEffect(value),
                      isHovered && "ring-2 ring-white z-10 scale-125"
                    )}
                    onMouseEnter={() => setHoveredCell({ day: dayIndex, hour })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => onCellClick?.(hour, dayIndex, value)}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: (dayIndex * 24 + hour) * 0.002,
                      type: "spring",
                      stiffness: 200
                    }}
                    whileHover={{ scale: 1.2, zIndex: 20 }}
                  >
                    {/* Peak Indicator */}
                    {isPeak && (
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 1 + dayIndex * 0.1 }}
                      >
                        <span className="text-xs">👑</span>
                      </motion.div>
                    )}

                    {/* Optimal Time Marker */}
                    {showOptimalTimes && isOptimal && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-lg z-10"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.5, 1] }}
                        transition={{ delay: 1.5 }}
                      >
                        <div className="w-full h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse" />
                      </motion.div>
                    )}

                    {/* Hover Tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-30"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                        >
                          <div className="bg-slate-900 text-white p-2 rounded-lg shadow-xl whitespace-nowrap">
                            <p className="text-xs font-bold">{day}</p>
                            <p className="text-xs">{formatHour(hour)}</p>
                            <p className="text-sm font-bold text-yellow-400">
                              {value.toLocaleString()} {selectedMetric === 'viral_score' ? '%' : ''}
                            </p>
                            {isPeak && <p className="text-xs text-green-400">Peak Time!</p>}
                          </div>
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Optimal Times Summary */}
      <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-t border-slate-200 dark:border-slate-700">
        <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Top 5 Optimal Posting Times
        </h4>

        <div className="grid grid-cols-5 gap-3">
          {optimalSlots.map((slot, index) => (
            <motion.div
              key={`${slot.day}-${slot.hour}`}
              className={cn(
                "p-3 rounded-lg text-center",
                "bg-gradient-to-br from-yellow-100 to-orange-100",
                "dark:from-yellow-900/20 dark:to-orange-900/20",
                "border-2 border-yellow-400 dark:border-yellow-600"
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(255, 200, 0, 0.3)' }}
            >
              <div className="text-2xl mb-1">
                {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'}
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {days[slot.day].slice(0, 3)}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {formatHour(slot.hour)}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                {slot.value}% {selectedMetric === 'engagement' ? 'eng' : selectedMetric === 'views' ? 'views' : 'viral'}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-gradient-to-r from-viral-500/10 to-primary-500/10 rounded-lg border border-viral-500/20">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-bold text-viral-500">Pro Tip:</span> Schedule your most important content during these peak times for maximum viral potential!
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function generateMockHeatmapData(): HeatmapData {
  const values: number[][] = [];
  const peaks: { day: number; hour: number; value: number }[] = [];
  let total = 0;

  // Generate heatmap data with realistic patterns
  for (let day = 0; day < 7; day++) {
    const dayData: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      // Create realistic engagement patterns
      let value = Math.random() * 30;

      // Peak times: morning (7-9), lunch (12-13), evening (18-21)
      if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 21)) {
        value += 40 + Math.random() * 30;
      }

      // Weekend boost
      if (day === 0 || day === 6) {
        value *= 1.2;
      }

      // Late night dip
      if (hour >= 0 && hour <= 5) {
        value *= 0.3;
      }

      value = Math.round(Math.min(value, 100));
      dayData.push(value);
      total += value;

      // Track peaks
      if (value > 80) {
        peaks.push({ day, hour, value });
      }
    }
    values.push(dayData);
  }

  return {
    values,
    peaks: peaks.sort((a, b) => b.value - a.value).slice(0, 10),
    average: Math.round(total / (7 * 24))
  };
}