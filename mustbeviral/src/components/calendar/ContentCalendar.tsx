import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useDragControls} from 'framer-motion';
import { cn} from '../../lib/utils';

interface ContentCalendarProps {
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  className?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  platform: string;
  status: 'draft' | 'scheduled' | 'published' | 'viral';
  color: string;
  emoji: string;
  metrics?: {
    views?: number;
    engagement?: number;
    shares?: number;
  };
}

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  rotation: number;
}

const platformColors: Record<string, string> = {
  tiktok: 'from-pink-400 to-purple-500',
  instagram: 'from-purple-400 to-pink-500',
  youtube: 'from-red-400 to-orange-500',
  twitter: 'from-blue-400 to-cyan-500',
  linkedin: 'from-blue-600 to-indigo-600'
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-200 dark:bg-slate-700',
  scheduled: 'bg-yellow-200 dark:bg-yellow-900',
  published: 'bg-green-200 dark:bg-green-900',
  viral: 'bg-gradient-to-r from-red-400 to-orange-500'
};

const stickyColors = [
  'bg-yellow-200',
  'bg-pink-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-purple-200',
  'bg-orange-200'
];

export function ContentCalendar({ onEventClick, onDateClick, className }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Mock events data
  const [events] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'TikTok Dance Challenge',
      date: new Date(2024, currentDate.getMonth(), 15),
      time: '14:00',
      platform: 'tiktok',
      status: 'scheduled',
      color: 'from-pink-400 to-purple-500',
      emoji: '🕺',
      metrics: { views: 25000, engagement: 12, shares: 500 }
    },
    {
      id: '2',
      title: 'Instagram Reel - Behind the Scenes',
      date: new Date(2024, currentDate.getMonth(), 18),
      time: '18:00',
      platform: 'instagram',
      status: 'draft',
      color: 'from-purple-400 to-pink-500',
      emoji: '🎬'
    },
    {
      id: '3',
      title: 'YouTube Tutorial Launch',
      date: new Date(2024, currentDate.getMonth(), 20),
      time: '12:00',
      platform: 'youtube',
      status: 'viral',
      color: 'from-red-400 to-orange-500',
      emoji: '🚀',
      metrics: { views: 150000, engagement: 8.5, shares: 2000 }
    }
  ]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event =>
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const addStickyNote = () => {
    const newNote: StickyNote = {
      id: Date.now().toString(),
      content: '',
      color: stickyColors[Math.floor(Math.random() * stickyColors.length)],
      position: { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 },
      rotation: Math.random() * 20 - 10
    };
    setStickyNotes([...stickyNotes, newNote]);
  };

  const updateStickyNote = (id: string, content: string) => {
    setStickyNotes(prev =>
      prev.map(note => note.id === id ? { ...note, content } : note)
    );
  };

  const deleteStickyNote = (id: string) => {
    setStickyNotes(prev => prev.filter(note => note.id !== id));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">📅</span>
              Content Calendar
            </h2>
            <p className="text-white/80 mt-1">Plan your viral content strategy</p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-lg p-1">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium capitalize transition-all",
                  viewMode === mode
                    ? "bg-white text-viral-500 shadow-lg"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ←
            </button>
            <h3 className="text-xl font-bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              →
            </button>
          </div>

          <div className="flex gap-2">
            <motion.button
              onClick={() => setShowAddEvent(!showAddEvent)}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg font-medium hover:bg-white/30 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              + Add Event
            </motion.button>
            <motion.button
              onClick={addStickyNote}
              className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg font-medium hover:bg-yellow-300 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              + Sticky Note
            </motion.button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="relative p-6">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {getDaysInMonth(currentDate).map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-24" />;
            }

            const dayEvents = getEventsForDate(date);
            const isToday =
              date.getDate() === new Date().getDate() &&
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();
            const isSelected =
              selectedDate &&
              date.getDate() === selectedDate.getDate() &&
              date.getMonth() === selectedDate.getMonth();

            return (
              <motion.div
                key={date.getTime()}
                onClick={() => {
                  setSelectedDate(date);
                  onDateClick?.(date);
                }}
                className={cn(
                  "relative h-24 p-2 rounded-lg border cursor-pointer transition-all",
                  isToday && "ring-2 ring-viral-500 ring-offset-2 dark:ring-offset-slate-900",
                  isSelected && "bg-viral-50 dark:bg-viral-950/20 border-viral-500",
                  !isSelected && "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                  "hover:shadow-lg hover:z-10"
                )}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    isToday ? "text-viral-500" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs bg-viral-500 text-white px-1.5 py-0.5 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Pills */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (<motion.div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium truncate cursor-pointer",
                        "bg-gradient-to-r text-white",
                        platformColors[event.platform]
                      )}
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="mr-1">{event.emoji}</span>
                      {event.title}
                    </motion.div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Floating Sticky Notes */}
        <AnimatePresence>
          {stickyNotes.map((note) => (
            <motion.div
              key={note.id}
              drag
              dragMomentum={false}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              className={cn(
                "absolute w-48 h-48 p-3 rounded-lg shadow-lg cursor-move z-20",
                note.color,
                isDragging && "z-50"
              )}
              initial={{
                x: note.position.x,
                y: note.position.y,
                rotate: note.rotation,
                scale: 0,
                opacity: 0
              }}
              animate={{
                x: note.position.x,
                y: note.position.y,
                rotate: note.rotation,
                scale: 1,
                opacity: 1
              }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05, rotate: 0 }}
              style={{
                boxShadow: '5px 5px 15px rgba(0,0,0,0.2)',
                background: `linear-gradient(135deg, ${note.color} 0%, ${note.color}dd 100%)`
              }}
            >
              <button
                onClick={() => deleteStickyNote(note.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
              >
                ✕
              </button>
              <textarea
                value={note.content}
                onChange={(e) => updateStickyNote(note.id, e.target.value)}
                placeholder="Type your note..."
                className="w-full h-full bg-transparent resize-none outline-none text-slate-800 placeholder:text-slate-600"
                style={{ fontFamily: 'Comic Sans MS, cursive' }}
              />
              <div className="absolute bottom-2 right-2">
                <span className="text-2xl opacity-50">📌</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Stats Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Draft</span>
              <span className="font-bold text-slate-900 dark:text-white">5</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Scheduled</span>
              <span className="font-bold text-slate-900 dark:text-white">12</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Published</span>
              <span className="font-bold text-slate-900 dark:text-white">48</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-orange-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Viral</span>
              <span className="font-bold text-viral-500">3 🔥</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Next post in</span>
            <span className="px-3 py-1 bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-full text-sm font-bold">
              2h 15m
            </span>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddEvent(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Schedule New Content
              </h3>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Content title..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="time"
                    className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="flex gap-2">
                  {Object.keys(platformColors).map((platform) => (
                    <button
                      key={platform}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors capitalize"
                    >
                      {platform}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddEvent(false)}
                    className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowAddEvent(false)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-lg font-bold"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}