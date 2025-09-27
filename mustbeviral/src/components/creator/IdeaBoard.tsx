/**
 * 💡 IdeaBoard - Where Viral Ideas Come to Life
 *
 * A beautiful draggable board where creators can organize their content ideas
 * with colorful cards that feel satisfying to move around. Each card glows
 * when dragged and snaps into place with delightful physics.
 */

import { useState, useRef, useEffect} from 'react';
import {
  Lightbulb, Plus, Sparkles, Hash, Calendar, TrendingUp, Star, Trash2, Edit3, Move, MoreVertical, Zap, Palette, Clock, Target} from 'lucide-react';
import { cn} from '../../lib/utils';
import { Button} from '../ui/Button';
import { GradientText} from '../ui/GradientText';

interface IdeaCard {
  id: string;
  title: string;
  description: string;
  category: 'content' | 'campaign' | 'collab' | 'trend' | 'experiment';
  color: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  viralPotential: number;
  createdAt: Date;
  position: { x: number; y: number };
  isDragging?: boolean;
}

interface IdeaColumn {
  id: string;
  title: string;
  color: string;
  ideas: IdeaCard[];
}

/**
 * Priority indicator with glow effect
 */
function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    low: { label: 'Low', color: 'bg-slate-500' },
    medium: { label: 'Medium', color: 'bg-blue-500' },
    high: { label: 'High', color: 'bg-orange-500' },
    urgent: { label: 'URGENT', color: 'bg-red-500 animate-pulse' }
  };

  const { label, color} = config[priority as keyof typeof config];

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white',
      color
    )}>
      {label}
    </span>
  );
}

/**
 * Viral potential meter
 */
function ViralMeter({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) {
    return 'from-pink-500 to-purple-500';
  }
    if (score >= 60) {
    return 'from-blue-500 to-cyan-500';
  }
    if (score >= 40) {
    return 'from-green-500 to-emerald-500';
  }
    return 'from-slate-400 to-slate-500';
  };

  return (
    <div className="flex items-center gap-2">
      <Zap className="w-3 h-3 text-slate-400" />
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full bg-gradient-to-r transition-all duration-500', getColor())}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {score}%
      </span>
    </div>
  );
}

/**
 * Draggable idea card with physics
 */
function DraggableIdeaCard({
  idea, onDragStart, onDragEnd, onDelete, onEdit
}: {
  idea: IdeaCard;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, position: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(idea.position);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const categoryColors = {
    content: 'from-blue-500 to-cyan-500',
    campaign: 'from-purple-500 to-pink-500',
    collab: 'from-green-500 to-emerald-500',
    trend: 'from-orange-500 to-red-500',
    experiment: 'from-indigo-500 to-purple-500'
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) {return;}

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    onDragStart(idea.id);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) {return;}

    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };

    setPosition(newPosition);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd(idea.id, position);
    }
  };

  useEffect_(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'auto';
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'absolute w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg',
        'border-2 transition-all duration-200',
        isDragging
          ? 'scale-105 shadow-2xl shadow-primary-500/30 border-primary-400 rotate-1 cursor-grabbing z-50'
          : 'hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-600 cursor-grab border-slate-200 dark:border-slate-700',
        'hover:scale-102'
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Card Header with Gradient */}
      <div className={cn(
        'h-2 rounded-t-xl bg-gradient-to-r',
        categoryColors[idea.category as keyof typeof categoryColors]
      )} />

      {/* Card Content */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1">
              {idea.title}
            </h3>
            <PriorityBadge priority={idea.priority} />
          </div>
          <div className="flex items-center gap-1 no-drag">
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => onEdit(idea.id)}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => onDelete(idea.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
          {idea.description}
        </p>

        {/* Viral Potential */}
        <div className="mb-3">
          <ViralMeter score={idea.viralPotential} />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(idea.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Move className="w-3 h-3" />
            Drag to move
          </div>
        </div>
      </div>

      {/* Drag Handle Indicator */}
      {isDragging && (
        <div className="absolute inset-0 border-2 border-primary-400 rounded-xl animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

/**
 * Column-based idea organizer
 */
function IdeaColumns({ ideas }: { ideas: IdeaCard[] }) {
  const columns: IdeaColumn[] = [
    { id: 'backlog', title: 'Backlog', color: 'from-slate-500 to-slate-600', ideas: [] },
    { id: 'planning', title: 'Planning', color: 'from-blue-500 to-cyan-500', ideas: [] },
    { id: 'creating', title: 'Creating', color: 'from-purple-500 to-pink-500', ideas: [] },
    { id: 'ready', title: 'Ready to Post', color: 'from-green-500 to-emerald-500', ideas: [] }
  ];

  // Distribute ideas into columns (mock distribution)
  ideas.forEach((idea, index) => {
    columns[index % columns.length].ideas.push(idea);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((column) => (
        <div key={column.id} className="space-y-4">
          {/* Column Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className={cn('w-1 h-6 bg-gradient-to-b rounded-full', column.color)} />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {column.title}
            </h3>
            <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
              {column.ideas.length}
            </span>
          </div>

          {/* Column Cards */}
          <div className="space-y-3">
            {column.ideas.map((idea) => (
              <div
                key={idea.id}
                className={cn(
                  'p-4 bg-white dark:bg-slate-800 rounded-xl',
                  'border border-slate-200 dark:border-slate-700',
                  'hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600',
                  'transition-all duration-200 cursor-pointer'
                )}
              >
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                  {idea.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                  {idea.description}
                </p>
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={idea.priority} />
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Zap className="w-3 h-3" />
                    {idea.viralPotential}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Card Button */}
          <Button
            variant="outline"
            className="w-full border-dashed"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Idea
          </Button>
        </div>
      ))}
    </div>
  );
}

/**
 * Main IdeaBoard Component
 */
export function IdeaBoard() {
  const [viewMode, setViewMode] = useState<'board' | 'columns'>('board');
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  // Generate mock ideas
  useEffect_(() => {
    const mockIdeas: IdeaCard[] = [
      {
        id: '1',
        title: 'TikTok Dance Challenge',
        description: 'Create a viral dance challenge with our brand song remix',
        category: 'content',
        color: 'blue',
        tags: ['dance', 'tiktok', 'viral'],
        priority: 'high',
        viralPotential: 85,
        createdAt: new Date(),
        position: { x: 50, y: 50 }
      },
      {
        id: '2',
        title: 'Influencer Collab Series',
        description: 'Partner with top creators for authentic product reviews',
        category: 'collab',
        color: 'green',
        tags: ['influencer', 'partnership'],
        priority: 'urgent',
        viralPotential: 92,
        createdAt: new Date(),
        position: { x: 400, y: 100 }
      },
      {
        id: '3',
        title: 'Behind the Scenes Content',
        description: 'Show the creative process of making viral content',
        category: 'content',
        color: 'purple',
        tags: ['bts', 'authentic', 'process'],
        priority: 'medium',
        viralPotential: 68,
        createdAt: new Date(),
        position: { x: 750, y: 50 }
      },
      {
        id: '4',
        title: 'Trend Jacking Strategy',
        description: 'Quick response templates for trending topics',
        category: 'trend',
        color: 'orange',
        tags: ['trends', 'reactive', 'timely'],
        priority: 'high',
        viralPotential: 78,
        createdAt: new Date(),
        position: { x: 200, y: 250 }
      },
      {
        id: '5',
        title: 'AI Content Experiment',
        description: 'Test AI-generated hooks vs human-written ones',
        category: 'experiment',
        color: 'indigo',
        tags: ['ai', 'testing', 'optimization'],
        priority: 'low',
        viralPotential: 45,
        createdAt: new Date(),
        position: { x: 550, y: 300 }
      }
    ];

    setIdeas(mockIdeas);
  }, []);

  const handleDragStart = (id: string) => {
    setIsDraggingAny(true);
  };

  const handleDragEnd = (id: string, position: { x: number; y: number }) => {
    setIsDraggingAny(false);
    setIdeas(prev => prev.map(idea =>
      idea.id === id ? { ...idea, position } : idea
    ));
  };

  const handleDelete = (id: string) => {
    setIdeas(prev => prev.filter(idea => idea.id !== id));
  };

  const handleEdit = (id: string) => {
    console.log('Edit idea:', id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Idea Board
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Organize your viral content ideas with drag & drop magic
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <Button
              variant={viewMode === 'board' ? 'viral' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              leftIcon={<Move className="w-3 h-3" />}
            >
              Board
            </Button>
            <Button
              variant={viewMode === 'columns' ? 'viral' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('columns')}
              leftIcon={<Target className="w-3 h-3" />}
            >
              Columns
            </Button>
          </div>

          <Button
            variant="viral"
            leftIcon={<Plus className="w-4 h-4" />}
            className="hover:scale-105 transition-transform duration-200"
          >
            New Idea
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Ideas</span>
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{ideas.length}</div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">High Potential</span>
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {ideas.filter(i => i.viralPotential >= 80).length}
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Urgent</span>
          </div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {ideas.filter(i => i.priority === 'urgent').length}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Ready</span>
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {Math.floor(ideas.length * 0.3)}
          </div>
        </div>
      </div>

      {/* Board Content */}
      {viewMode === 'board' ? (
        <div
          className={cn(
            'relative h-[600px] bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden',
            isDraggingAny && 'border-primary-400 bg-primary-50/5'
          )}
        >
          {/* Grid Pattern Background */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          {/* Ideas */}
          {ideas.map((idea) => (
            <DraggableIdeaCard
              key={idea.id}
              idea={idea}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}

          {/* Empty State */}
          {ideas.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Lightbulb className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                  No ideas yet
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                  Start adding ideas and organize them with drag & drop
                </p>
                <Button variant="viral" leftIcon={<Plus className="w-4 h-4" />}>
                  Add Your First Idea
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <IdeaColumns ideas={ideas} />
      )}
    </div>
  );
}