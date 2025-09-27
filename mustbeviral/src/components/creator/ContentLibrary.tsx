/**
 * 📚 ContentLibrary - Your Viral Content Vault
 *
 * A beautiful grid of all your content with hover previews that make
 * browsing through your creations feel like scrolling through a gallery
 * of viral moments. Each card glows, scales, and reveals insights on hover.
 */

import { useState, useEffect} from 'react';
import {
  Image, Video, FileText, Heart, Eye, Share2, TrendingUp, Calendar, MoreVertical, Plus, Filter, Search, Grid, List, Sparkles, Zap, Star} from 'lucide-react';
import { cn} from '../../lib/utils';
import { Button} from '../ui/Button';
import { GradientText} from '../ui/GradientText';

interface ContentItem {
  id: string;
  title: string;
  type: 'image' | 'video' | 'text' | 'carousel';
  thumbnail: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'linkedin';
  status: 'draft' | 'scheduled' | 'published' | 'viral';
  metrics: {
    views: number;
    likes: number;
    shares: number;
    engagement: number;
  };
  viralScore: number;
  createdAt: Date;
  scheduledFor?: Date;
  tags: string[];
}

/**
 * Platform badge with gradient background
 */
function PlatformBadge({ platform }: { platform: string }) {
  const platformConfig = {
    tiktok: { icon: '🎵', color: 'from-pink-500 to-purple-500' },
    instagram: { icon: '📸', color: 'from-purple-500 to-pink-500' },
    youtube: { icon: '▶️', color: 'from-red-500 to-pink-500' },
    twitter: { icon: '🐦', color: 'from-blue-400 to-cyan-400' },
    linkedin: { icon: '💼', color: 'from-blue-600 to-cyan-600' }
  };

  const config = platformConfig[platform as keyof typeof platformConfig];

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white',
      'bg-gradient-to-r shadow-sm',
      config.color
    )}>
      <span>{config.icon}</span>
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </span>
  );
}

/**
 * Status indicator with animation
 */
function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-slate-500', icon: FileText },
    scheduled: { label: 'Scheduled', color: 'bg-blue-500', icon: Calendar },
    published: { label: 'Published', color: 'bg-green-500', icon: Eye },
    viral: { label: 'VIRAL! 🔥', color: 'bg-gradient-to-r from-pink-500 to-purple-500', icon: TrendingUp }
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white',
      config.color,
      status === 'viral' && 'animate-pulse shadow-glow-pink'
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

/**
 * Content card with hover preview
 */
function ContentCard(_{ content, viewMode }: { content: ContentItem; viewMode: 'grid' | 'list' }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
    if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
    return num.toString();
  };

  if (viewMode === 'list') {
    return (
      <div className={cn(
        'flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl',
        'border border-slate-200 dark:border-slate-700',
        'hover:border-primary-300 dark:hover:border-primary-600',
        'hover:shadow-lg hover:shadow-primary-500/10',
        'transition-all duration-300 cursor-pointer group'
      )}>
        {/* Thumbnail */}
        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-viral-400 opacity-90" />
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {content.type === 'image' && <Image className="w-8 h-8" />}
            {content.type === 'video' && <Video className="w-8 h-8" />}
            {content.type === 'text' && <FileText className="w-8 h-8" />}
          </div>
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {content.title}
            </h3>
            <PlatformBadge platform={content.platform} />
            <StatusBadge status={content.status} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Created {new Date(content.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {formatNumber(content.metrics.views)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Views</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {formatNumber(content.metrics.likes)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Likes</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {content.metrics.engagement.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Engagement</div>
          </div>
        </div>

        {/* Viral Score */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1 px-3 py-2 rounded-lg',
            content.viralScore >= 80
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : content.viralScore >= 60
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          )}>
            <Zap className="w-4 h-4" />
            <span className="text-sm font-semibold">{content.viralScore}</span>
          </div>
        </div>

        {/* Actions */}
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden',
        'border border-slate-200 dark:border-slate-700',
        'hover:border-primary-300 dark:hover:border-primary-600',
        'hover:shadow-2xl hover:shadow-primary-500/20',
        'transition-all duration-300 cursor-pointer group',
        'hover:scale-105 hover:-translate-y-2'
      )}
      onMouseEnter={() => {
        setIsHovered(true);
        setTimeout(() => setShowPreview(true), 200);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPreview(false);
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-viral-400 opacity-90" />

        {/* Content Type Icon */}
        <div className="absolute inset-0 flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110">
          {content.type === 'image' && <Image className="w-12 h-12" />}
          {content.type === 'video' && <Video className="w-12 h-12" />}
          {content.type === 'text' && <FileText className="w-12 h-12" />}
        </div>

        {/* Platform & Status Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          <PlatformBadge platform={content.platform} />
          <StatusBadge status={content.status} />
        </div>

        {/* Viral Score Badge */}
        {content.viralScore >= 80 && (
          <div className="absolute top-2 right-2">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse shadow-glow-pink">
              <Sparkles className="w-3 h-3" />
              HOT
            </div>
          </div>
        )}

        {/* Hover Preview Overlay */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent',
          'flex flex-col justify-end p-4 transition-opacity duration-300',
          showPreview ? 'opacity-100' : 'opacity-0'
        )}>
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="flex items-center gap-1 text-white">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">{formatNumber(content.metrics.views)}</span>
            </div>
            <div className="flex items-center gap-1 text-white">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-medium">{formatNumber(content.metrics.likes)}</span>
            </div>
            <div className="flex items-center gap-1 text-white">
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-medium">{formatNumber(content.metrics.shares)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="glass"
              size="sm"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Edit
            </Button>
            <Button
              variant="glass"
              size="sm"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Analyze
            </Button>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-1">
          {content.title}
        </h3>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
              content.viralScore >= 80
                ? 'bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 text-pink-600 dark:text-pink-400'
                : content.viralScore >= 60
                ? 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-600 dark:text-blue-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            )}>
              <Zap className="w-3 h-3" />
              Viral Score: {content.viralScore}
            </div>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(content.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {content.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              #{tag}
            </span>
          ))}
          {content.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
              +{content.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main ContentLibrary Component
 */
export function ContentLibrary() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [contents, setContents] = useState<ContentItem[]>([]);

  // Generate mock data
  useEffect_(() => {
    const mockContents: ContentItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `content-${i}`,
      title: `Viral Content Piece #${i + 1}`,
      type: ['image', 'video', 'text', 'carousel'][Math.floor(Math.random() * 4)] as any,
      thumbnail: `/api/placeholder/400/400`,
      platform: ['tiktok', 'instagram', 'youtube', 'twitter', 'linkedin'][Math.floor(Math.random() * 5)] as any,
      status: ['draft', 'scheduled', 'published', 'viral'][Math.floor(Math.random() * 4)] as any,
      metrics: {
        views: Math.floor(Math.random() * 1000000),
        likes: Math.floor(Math.random() * 100000),
        shares: Math.floor(Math.random() * 10000),
        engagement: Math.random() * 20
      },
      viralScore: Math.floor(Math.random() * 100),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      tags: ['viral', 'trending', 'creative', 'engagement', 'content'].sort(() => 0.5 - Math.random()).slice(0, 3)
    }));

    setContents(mockContents);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Content Library
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your viral content vault - {contents.length} masterpieces and counting
          </p>
        </div>

        <Button
          variant="viral"
          leftIcon={<Plus className="w-4 h-4" />}
          className="hover:scale-105 transition-transform duration-200"
        >
          Create New Content
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search your viral content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'placeholder:text-slate-400 transition-all duration-200'
            )}
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={selectedFilter === 'all' ? 'viral' : 'ghost'}
            size="sm"
            onClick={() => setSelectedFilter('all')}
          >
            All Content
          </Button>
          <Button
            variant={selectedFilter === 'viral' ? 'viral' : 'ghost'}
            size="sm"
            onClick={() => setSelectedFilter('viral')}
            leftIcon={<Sparkles className="w-3 h-3" />}
          >
            Viral Only
          </Button>
          <Button
            variant={selectedFilter === 'drafts' ? 'viral' : 'ghost'}
            size="sm"
            onClick={() => setSelectedFilter('drafts')}
          >
            Drafts
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'viral' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'viral' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Grid/List */}
      <div className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      )}>
        {contents.map((content) => (
          <ContentCard key={content.id} content={content} viewMode={viewMode} />
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <Button variant="outline" size="lg">
          Load More Content
        </Button>
      </div>
    </div>
  );
}