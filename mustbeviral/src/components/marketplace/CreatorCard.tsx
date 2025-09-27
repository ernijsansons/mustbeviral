import React, { useState } from 'react';
import { motion} from 'framer-motion';
import { cn} from '../../lib/utils';

interface CreatorCardProps {
  creator: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    coverImage?: string;
    bio: string;
    followers: number;
    engagement: number;
    niches: string[];
    platforms: string[];
    pricing: {
      min: number;
      max: number;
    };
    rating: number;
    reviews: number;
    verified: boolean;
    trending?: boolean;
    viralScore: number;
  };
  onConnect?: () => void;
  onView?: () => void;
  className?: string;
}

const platformIcons: Record<string, string> = {
  tiktok: '🎵',
  instagram: '📸',
  youtube: '📺',
  twitter: '🐦',
  linkedin: '💼',
  facebook: '👤',
  twitch: '🎮'
};

const nicheColors: Record<string, string> = {
  tech: 'from-blue-500 to-cyan-500',
  fashion: 'from-pink-500 to-rose-500',
  gaming: 'from-purple-500 to-indigo-500',
  food: 'from-orange-500 to-red-500',
  travel: 'from-green-500 to-emerald-500',
  fitness: 'from-yellow-500 to-orange-500',
  business: 'from-slate-500 to-zinc-500',
  art: 'from-violet-500 to-purple-500'
};

export function CreatorCard({
  creator, onConnect, onView, className
}: CreatorCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
    if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
    return num.toString();
  };

  const getViralScoreColor = (score: number) => {
    if (score >= 90) {
    return 'from-green-400 to-emerald-500';
  }
    if (score >= 70) {
    return 'from-yellow-400 to-orange-500';
  }
    if (score >= 50) {
    return 'from-orange-400 to-red-500';
  }
    return 'from-red-400 to-rose-500';
  };

  return (
    <motion.div
      className={cn(
        "relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden",
        "border border-slate-200 dark:border-slate-700",
        "hover:shadow-xl hover:shadow-viral-500/10 transition-shadow duration-300",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Trending Badge */}
      {creator.trending && (
        <motion.div
          className="absolute top-4 left-4 z-20"
          initial={{ rotate: -10 }}
          animate={{ rotate: [- 10, 10, -10] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
            🔥 TRENDING
          </div>
        </motion.div>
      )}

      {/* Cover Image */}
      <div className="relative h-32 bg-gradient-to-br from-primary-500 via-viral-500 to-purple-500 overflow-hidden">
        {creator.coverImage && (
          <img
            src={creator.coverImage}
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
        )}

        {/* Viral Score Badge */}
        <motion.div
          className="absolute top-4 right-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <div className={cn(
            "px-3 py-1 rounded-full text-white font-bold text-sm",
            "bg-gradient-to-r shadow-lg",
            getViralScoreColor(creator.viralScore)
          )}>
            ⚡ {creator.viralScore}% Viral
          </div>
        </motion.div>

        {/* Floating Stats Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <div className="text-center text-white">
            <div className="text-3xl font-bold">{formatNumber(creator.followers)}</div>
            <div className="text-sm opacity-80">Followers</div>
            <div className="mt-2 text-xl font-semibold">{creator.engagement}%</div>
            <div className="text-xs opacity-80">Engagement</div>
          </div>
        </motion.div>
      </div>

      {/* Avatar */}
      <div className="relative -mt-12 px-6">
        <motion.div
          className="relative w-24 h-24 mx-auto"
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-viral-500 rounded-full blur-lg opacity-50" />
          <img
            src={creator.avatar}
            alt={creator.name}
            className="relative w-full h-full rounded-full border-4 border-white dark:border-slate-900 object-cover"
          />
          {creator.verified && (
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-slate-900">
              ✓
            </div>
          )}
        </motion.div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 mt-4">
        {/* Name and Username */}
        <div className="text-center mb-3">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {creator.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            @{creator.username}
          </p>
        </div>

        {/* Bio */}
        <p className="text-sm text-slate-600 dark:text-slate-300 text-center mb-4 line-clamp-2">
          {creator.bio}
        </p>

        {/* Platforms */}
        <div className="flex justify-center gap-2 mb-4">
          {creator.platforms.map((platform) => (
            <motion.div
              key={platform}
              className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              whileHover={{ scale: 1.2, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              title={platform}
            >
              {platformIcons[platform]  ?? '🌐'}
            </motion.div>
          ))}
        </div>

        {/* Niches */}
        <div className = "flex flex-wrap gap-2 justify-center mb-4">
          {creator.niches.slice(0, 3).map((niche) => (
            <span
              key={niche}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full",
                "bg-gradient-to-r text-white",
                nicheColors[niche.toLowerCase()]  ?? 'from-slate-500 to-slate-600'
              )}
            >
              {niche}
            </span>
          ))}
          {creator.niches.length > 3 && (
            <span className="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
              +{creator.niches.length - 3}
            </span>
          )}
        </div>

        {/* Pricing and Rating */}
        <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Starting at</div>
            <div className="font-bold text-slate-900 dark:text-white">
              ${creator.pricing.min}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">⭐</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {creator.rating.toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {creator.reviews} reviews
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <motion.button
            onClick={onView}
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View Profile
          </motion.button>
          <motion.button
            onClick={onConnect}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-lg font-bold shadow-lg shadow-viral-500/25"
            whileHover={{
              scale: 1.05,
              boxShadow: '0 20px 40px rgba(255, 0, 128, 0.3)'
            }}
            whileTap={{ scale: 0.95 }}
          >
            Connect
          </motion.button>
        </div>

        {/* Quick Stats Button */}
        <motion.button
          onClick={() => setShowStats(!showStats)}
          className="w-full mt-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          {showStats ? 'Hide' : 'Show'} Quick Stats {showStats ? '↑' : '↓'}
        </motion.button>

        {/* Expandable Stats */}
        <motion.div
          initial={false}
          animate={{ height: showStats ? 'auto' : 0 }}
          className="overflow-hidden"
        >
          <div className="pt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-lg font-bold text-primary-500">98%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">On-time</div>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-lg font-bold text-viral-500">24h</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Response</div>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-lg font-bold text-green-500">50+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Collabs</div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}