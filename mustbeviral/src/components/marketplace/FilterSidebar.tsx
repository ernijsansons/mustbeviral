import React, { useState } from 'react';
import { motion, AnimatePresence} from 'framer-motion';
import { cn} from '../../lib/utils';

interface FilterSidebarProps {
  onFilterChange?: (filters: FilterState) => void;
  className?: string;
}

interface FilterState {
  priceRange: [number, number];
  viralScore: number;
  platforms: string[];
  niches: string[];
  engagement: number;
  followers: [number, number];
  rating: number;
  verified: boolean;
  trending: boolean;
}

interface FilterSection {
  id: string;
  title: string;
  icon: string;
  expanded: boolean;
}

const platforms = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'from-pink-500 to-purple-500' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'from-purple-500 to-pink-500' },
  { id: 'youtube', label: 'YouTube', icon: '📺', color: 'from-red-500 to-orange-500' },
  { id: 'twitter', label: 'Twitter', icon: '🐦', color: 'from-blue-400 to-blue-600' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'from-blue-600 to-indigo-600' },
  { id: 'twitch', label: 'Twitch', icon: '🎮', color: 'from-purple-600 to-indigo-600' }
];

const niches = [
  { id: 'tech', label: 'Tech', icon: '💻', color: 'from-blue-500 to-cyan-500' },
  { id: 'fashion', label: 'Fashion', icon: '👗', color: 'from-pink-500 to-rose-500' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', color: 'from-purple-500 to-indigo-500' },
  { id: 'food', label: 'Food', icon: '🍔', color: 'from-orange-500 to-red-500' },
  { id: 'travel', label: 'Travel', icon: '✈️', color: 'from-green-500 to-emerald-500' },
  { id: 'fitness', label: 'Fitness', icon: '💪', color: 'from-yellow-500 to-orange-500' },
  { id: 'business', label: 'Business', icon: '💼', color: 'from-slate-500 to-zinc-500' },
  { id: 'art', label: 'Art', icon: '🎨', color: 'from-violet-500 to-purple-500' }
];

export function FilterSidebar(_{ onFilterChange, className }: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 10000],
    viralScore: 0,
    platforms: [],
    niches: [],
    engagement: 0,
    followers: [0, 10000000],
    rating: 0,
    verified: false,
    trending: false
  });

  const [sections, setSections] = useState<FilterSection[]>([
    { id: 'price', title: 'Price Range', icon: '💰', expanded: true },
    { id: 'viral', title: 'Viral Score', icon: '⚡', expanded: true },
    { id: 'platforms', title: 'Platforms', icon: '🌐', expanded: false },
    { id: 'niches', title: 'Niches', icon: '🎯', expanded: false },
    { id: 'metrics', title: 'Metrics', icon: '📊', expanded: false },
    { id: 'status', title: 'Status', icon: '✨', expanded: false }
  ]);

  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.map(section =>
        section.id === id ? { ...section, expanded: !section.expanded } : section
      )
    );
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const togglePlatform = (platformId: string) => {
    const newPlatforms = filters.platforms.includes(platformId)
      ? filters.platforms.filter(p => p !== platformId)
      : [...filters.platforms, platformId];
    updateFilter('platforms', newPlatforms);
  };

  const toggleNiche = (nicheId: string) => {
    const newNiches = filters.niches.includes(nicheId)
      ? filters.niches.filter(n => n !== nicheId)
      : [...filters.niches, nicheId];
    updateFilter('niches', newNiches);
  };

  const formatFollowers = (value: number) => {
    if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
    if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
    return value.toString();
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      priceRange: [0, 10000],
      viralScore: 0,
      platforms: [],
      niches: [],
      engagement: 0,
      followers: [0, 10000000],
      rating: 0,
      verified: false,
      trending: false
    };
    setFilters(defaultFilters);
    onFilterChange?.(defaultFilters);
  };

  return (
    <motion.div
      className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700",
        "overflow-hidden",
        className
      )}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">🎛️</span>
            Filters
          </h3>
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide">
        {/* Price Range */}
        <div>
          <button
            onClick={() => toggleSection('price')}
            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <span>{sections.find(s => s.id === 'price')?.icon}</span>
              Price Range
            </span>
            <motion.span
              animate={{ rotate: sections.find(s => s.id === 'price')?.expanded ? 180 : 0 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence>
            {sections.find(s => s.id === 'price')?.expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 px-2"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      ${filters.priceRange[0]}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      ${filters.priceRange[1]}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={filters.priceRange[1]}
                      onChange={(e) =>
                        updateFilter('priceRange', [filters.priceRange[0], parseInt(e.target.value)])
                      }
                      className="w-full h-2 bg-gradient-to-r from-primary-500 to-viral-500 rounded-lg appearance-none cursor-pointer slider-neon"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Viral Score */}
        <div>
          <button
            onClick={() => toggleSection('viral')}
            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <span>{sections.find(s => s.id === 'viral')?.icon}</span>
              Viral Score
            </span>
            <motion.span
              animate={{ rotate: sections.find(s => s.id === 'viral')?.expanded ? 180 : 0 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence>
            {sections.find(s => s.id === 'viral')?.expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 px-2"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Min: {filters.viralScore}%
                    </span>
                    <motion.span
                      className={cn(
                        "text-sm font-bold",
                        filters.viralScore < 40 && "text-orange-500",
                        filters.viralScore >= 40 && filters.viralScore < 70 && "text-yellow-500",
                        filters.viralScore >= 70 && "text-green-500"
                      )}
                      key={filters.viralScore}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                    >
                      {filters.viralScore >= 70 ? '🔥 Hot!' : filters.viralScore >= 40 ? '⚡ Good' : '💫 Any'}
                    </motion.span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 rounded-lg opacity-20" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={filters.viralScore}
                      onChange={(e) => updateFilter('viralScore', parseInt(e.target.value))}
                      className="relative w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer z-10 slider-viral"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Platforms */}
        <div>
          <button
            onClick={() => toggleSection('platforms')}
            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <span>{sections.find(s => s.id === 'platforms')?.icon}</span>
              Platforms
            </span>
            <motion.span
              animate={{ rotate: sections.find(s => s.id === 'platforms')?.expanded ? 180 : 0 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence>
            {sections.find(s => s.id === 'platforms')?.expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 px-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((platform) => (
                    <motion.button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={cn(
                        "p-2 rounded-lg text-sm font-medium transition-all",
                        filters.platforms.includes(platform.id)
                          ? "bg-gradient-to-r text-white shadow-lg"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                        filters.platforms.includes(platform.id) && platform.color
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="mr-1">{platform.icon}</span>
                      {platform.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Niches */}
        <div>
          <button
            onClick={() => toggleSection('niches')}
            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <span>{sections.find(s => s.id === 'niches')?.icon}</span>
              Niches
            </span>
            <motion.span
              animate={{ rotate: sections.find(s => s.id === 'niches')?.expanded ? 180 : 0 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence>
            {sections.find(s => s.id === 'niches')?.expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 px-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  {niches.map((niche) => (
                    <motion.button
                      key={niche.id}
                      onClick={() => toggleNiche(niche.id)}
                      className={cn(
                        "p-2 rounded-lg text-sm font-medium transition-all",
                        filters.niches.includes(niche.id)
                          ? "bg-gradient-to-r text-white shadow-lg"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                        filters.niches.includes(niche.id) && niche.color
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="mr-1">{niche.icon}</span>
                      {niche.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Metrics */}
        <div>
          <button
            onClick={() => toggleSection('metrics')}
            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <span>{sections.find(s => s.id === 'metrics')?.icon}</span>
              Metrics
            </span>
            <motion.span
              animate={{ rotate: sections.find(s => s.id === 'metrics')?.expanded ? 180 : 0 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence>
            {sections.find(s => s.id === 'metrics')?.expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 px-2 space-y-4"
              >
                {/* Engagement Rate */}
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    Min Engagement: {filters.engagement}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={filters.engagement}
                    onChange={(e) => updateFilter('engagement', parseInt(e.target.value))}
                    className="w-full h-2 bg-gradient-to-r from-slate-400 to-slate-600 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                </div>

                {/* Followers Range */}
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    Followers: {formatFollowers(filters.followers[0])} - {formatFollowers(filters.followers[1])}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10000000"
                    step="10000"
                    value={filters.followers[1]}
                    onChange={(e) =>
                      updateFilter('followers', [filters.followers[0], parseInt(e.target.value)])
                    }
                    className="w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    Min Rating: {filters.rating > 0 ? `⭐ ${filters.rating}+` : 'Any'}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={filters.rating}
                    onChange={(e) => updateFilter('rating', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status */}
        <div>
          <button
            onClick={() => toggleSection('status')}
            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <span>{sections.find(s => s.id === 'status')?.icon}</span>
              Status
            </span>
            <motion.span
              animate={{ rotate: sections.find(s => s.id === 'status')?.expanded ? 180 : 0 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence>
            {sections.find(s => s.id === 'status')?.expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 px-2 space-y-3"
              >
                <motion.button
                  onClick={() => updateFilter('verified', !filters.verified)}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center justify-between transition-all",
                    filters.verified
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center gap-2">
                    <span>✓</span>
                    Verified Only
                  </span>
                  <motion.div
                    className={cn(
                      "w-12 h-6 rounded-full p-1 transition-colors",
                      filters.verified ? "bg-white/30" : "bg-slate-300 dark:bg-slate-600"
                    )}
                  >
                    <motion.div
                      className={cn(
                        "w-4 h-4 rounded-full",
                        filters.verified ? "bg-white" : "bg-white dark:bg-slate-400"
                      )}
                      animate={{ x: filters.verified ? 20 : 0 }}
                    />
                  </motion.div>
                </motion.button>

                <motion.button
                  onClick={() => updateFilter('trending', !filters.trending)}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center justify-between transition-all",
                    filters.trending
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center gap-2">
                    <span>🔥</span>
                    Trending Now
                  </span>
                  <motion.div
                    className={cn(
                      "w-12 h-6 rounded-full p-1 transition-colors",
                      filters.trending ? "bg-white/30" : "bg-slate-300 dark:bg-slate-600"
                    )}
                  >
                    <motion.div
                      className={cn(
                        "w-4 h-4 rounded-full",
                        filters.trending ? "bg-white" : "bg-white dark:bg-slate-400"
                      )}
                      animate={{ x: filters.trending ? 20 : 0 }}
                    />
                  </motion.div>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Apply Button */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <motion.button
          className="w-full py-3 bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-lg font-bold shadow-lg shadow-viral-500/25"
          whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(255, 0, 128, 0.3)' }}
          whileTap={{ scale: 0.98 }}
        >
          Apply Filters 🚀
        </motion.button>
      </div>
    </motion.div>
  );
}

<style jsx>{`
  .slider-neon::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #ff0080, #00ffff);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(255, 0, 128, 0.5);
  }

  .slider-viral::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #ffdd00, #ff6b00);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(255, 200, 0, 0.5);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`}</style>