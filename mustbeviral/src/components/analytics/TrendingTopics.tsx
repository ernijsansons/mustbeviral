import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TrendingTopicsProps {
  onTopicClick?: (topic: Topic) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

interface Topic {
  id: string;
  name: string;
  hashtag: string;
  volume: number;
  change: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
  isViral: boolean;
  relatedHashtags: string[];
  peakTime?: string;
  platform: string[];
}

interface TopicCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export function TrendingTopics({
  onTopicClick, autoRefresh = true, refreshInterval = 30000, className
}: TrendingTopicsProps) {
  const [topics, setTopics] = useState<Topic[]>(generateMockTopics());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLive, setIsLive] = useState(autoRefresh);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const categories: TopicCategory[] = [
    { id: 'all', label: 'All Topics', icon: '🌐', color: 'from-slate-500 to-slate-600' },
    { id: 'tech', label: 'Tech', icon: '💻', color: 'from-blue-500 to-cyan-500' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: 'from-purple-500 to-pink-500' },
    { id: 'sports', label: 'Sports', icon: '⚽', color: 'from-green-500 to-emerald-500' },
    { id: 'business', label: 'Business', icon: '📈', color: 'from-orange-500 to-red-500' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '✨', color: 'from-pink-500 to-rose-500' }
  ];

  // Simulate live updates
  useEffect(() => {
    if (!isLive) {return;}

    const interval = setInterval(() => {
      setTopics(generateMockTopics());
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isLive, refreshInterval]);

  // Animate new entries
  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate a new viral topic appearing
      if (Math.random() > 0.7) {
        const newViralTopic = generateViralTopic();
        setTopics(prev => [newViralTopic, ...prev.slice(0, -1)]);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [topics]);

  const filteredTopics = selectedCategory === 'all'
    ? topics
    : topics.filter(t => t.category === selectedCategory);

  const getSentimentColor = (sentiment: Topic['sentiment']) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getSentimentIcon = (sentiment: Topic['sentiment']) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      default: return '😐';
    }
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const getChangeIcon = (change: number) => {
    if (change > 50) {
      return '🚀';
    }
    if (change > 20) {
      return '📈';
    }
    if (change > 0) {
      return '↗️';
    }
    if (change < -20) {
      return '📉';
    }
    if (change < 0) {
      return '↘️';
    }
    return '→';
  };

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
      <div className="p-6 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">🔥</span>
              Trending Topics
              {isLive && (
                <motion.span
                  className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  LIVE
                </motion.span>
              )}
            </h3>
            <p className="text-white/80 mt-1">
              Real-time viral trends across platforms
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Toggle */}
            <button
              onClick={() => setIsLive(!isLive)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                isLive
                  ? "bg-white/30 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              )}
            >
              {isLive ? '⏸️ Pause' : '▶️ Resume'} Updates
            </button>

            {/* Last Update */}
            <div className="text-xs text-white/70">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                selectedCategory === category.id
                  ? "bg-white text-blue-500 shadow-lg"
                  : "bg-white/20 text-white/80 hover:bg-white/30"
              )}
            >
              <span className="mr-1">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topics List */}
      <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {filteredTopics.map((topic, index) => (
            <motion.div
              key={topic.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative p-4 rounded-lg border transition-all cursor-pointer",
                topic.isViral
                  ? "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-300 dark:border-orange-700"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                "hover:shadow-lg hover:scale-[1.02]"
              )}
              onClick={() => {
                setExpandedTopic(expandedTopic === topic.id ? null : topic.id);
                onTopicClick?.(topic);
              }}
            >
              {/* Viral Badge */}
              {topic.isViral && (
                <motion.div
                  className="absolute -top-2 -right-2"
                  initial={{ rotate: -15, scale: 0 }}
                  animate={{ rotate: 15, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                    🔥 VIRAL
                  </div>
                </motion.div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Topic Name and Hashtag */}
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {topic.name}
                    </h4>
                    <span className="text-sm text-blue-500 font-medium">
                      {topic.hashtag}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">Volume:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatVolume(topic.volume)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={cn("font-bold", topic.change > 0 ? "text-green-500" : "text-red-500")}>
                        {topic.change > 0 ? '+' : ''}{topic.change}%
                      </span>
                      <span className="text-lg">{getChangeIcon(topic.change)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={cn("text-lg", getSentimentColor(topic.sentiment))}>
                        {getSentimentIcon(topic.sentiment)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {topic.sentiment}
                      </span>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="flex gap-2 mt-2">
                    {topic.platform.map((platform) => (
                      <span
                        key={platform}
                        className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-xs rounded-full"
                      >
                        {platform === 'tiktok' && '🎵'}
                        {platform === 'instagram' && '📸'}
                        {platform === 'twitter' && '🐦'}
                        {platform === 'youtube' && '📺'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Live Indicator */}
                {topic.isViral && (
                  <motion.div
                    className="w-3 h-3 bg-red-500 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                  />
                )}
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedTopic === topic.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"
                  >
                    <div className="space-y-2">
                      {/* Related Hashtags */}
                      <div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Related Hashtags:
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {topic.relatedHashtags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Peak Time */}
                      {topic.peakTime && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Peak Time:</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {topic.peakTime}
                          </span>
                        </div>
                      )}

                      {/* Action Button */}
                      <motion.button
                        className="w-full mt-3 py-2 bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-lg font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Create Content for This Trend 🚀
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-viral-500">
                {topics.filter(t => t.isViral).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Viral Now</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {topics.filter(t => t.change > 20).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Rising Fast</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {filteredTopics.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Topics</div>
            </div>
          </div>

          <motion.button
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Export Trends 📊
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function generateMockTopics(): Topic[] {
  const topics: Topic[] = [
    {
      id: '1',
      name: 'AI Revolution',
      hashtag: '#AIRevolution',
      volume: 2500000,
      change: 125,
      sentiment: 'positive',
      category: 'tech',
      isViral: true,
      relatedHashtags: ['#ChatGPT', '#MachineLearning', '#FutureOfWork'],
      peakTime: '2:00 PM - 4:00 PM',
      platform: ['twitter', 'linkedin']
    },
    {
      id: '2',
      name: 'Summer Vibes',
      hashtag: '#SummerVibes2024',
      volume: 1800000,
      change: 45,
      sentiment: 'positive',
      category: 'lifestyle',
      isViral: false,
      relatedHashtags: ['#BeachLife', '#Vacation', '#SummerFun'],
      peakTime: '6:00 PM - 8:00 PM',
      platform: ['instagram', 'tiktok']
    },
    {
      id: '3',
      name: 'World Cup Highlights',
      hashtag: '#WorldCup',
      volume: 5000000,
      change: 200,
      sentiment: 'positive',
      category: 'sports',
      isViral: true,
      relatedHashtags: ['#Football', '#Soccer', '#Champions'],
      peakTime: '8:00 PM - 10:00 PM',
      platform: ['twitter', 'youtube']
    },
    {
      id: '4',
      name: 'New Movie Release',
      hashtag: '#BlockbusterMovie',
      volume: 900000,
      change: -10,
      sentiment: 'neutral',
      category: 'entertainment',
      isViral: false,
      relatedHashtags: ['#Movies', '#Cinema', '#FilmTwitter'],
      platform: ['twitter', 'instagram']
    },
    {
      id: '5',
      name: 'Crypto Rally',
      hashtag: '#CryptoRally',
      volume: 1200000,
      change: 80,
      sentiment: 'positive',
      category: 'business',
      isViral: false,
      relatedHashtags: ['#Bitcoin', '#Ethereum', '#DeFi'],
      peakTime: '9:00 AM - 11:00 AM',
      platform: ['twitter', 'youtube']
    }
  ];

  // Randomize some values to simulate live updates
  return topics.map(topic => ({
    ...topic,
    volume: topic.volume + Math.floor((Math.random() - 0.5) * topic.volume * 0.1),
    change: topic.change + Math.floor((Math.random() - 0.5) * 20)
  }));
}

function generateViralTopic(): Topic {
  const viralTopics = [
    { name: 'Dance Challenge', hashtag: '#DanceChallenge', category: 'entertainment' },
    { name: 'Tech Breakthrough', hashtag: '#TechNews', category: 'tech' },
    { name: 'Celebrity News', hashtag: '#CelebNews', category: 'entertainment' }
  ];

  const selected = viralTopics[Math.floor(Math.random() * viralTopics.length)];

  return {
    id: Date.now().toString(),
    ...selected,
    volume: Math.floor(Math.random() * 5000000) + 2000000,
    change: Math.floor(Math.random() * 200) + 100,
    sentiment: 'positive',
    isViral: true,
    relatedHashtags: ['#Viral', '#Trending', '#MustSee'],
    peakTime: 'NOW',
    platform: ['tiktok', 'instagram', 'twitter']
  };
}