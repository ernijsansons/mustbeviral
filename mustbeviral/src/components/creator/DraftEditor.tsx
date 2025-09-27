import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence} from 'framer-motion';
import { cn} from '../../lib/utils';

interface DraftEditorProps {
  initialContent?: string;
  onSave?: (content: string, metadata: ContentMetadata) => void;
  onPublish?: (content: string, metadata: ContentMetadata) => void;
  className?: string;
}

interface ContentMetadata {
  wordCount: number;
  readingTime: number;
  viralScore: number;
  hashtags: string[];
  mentions: string[];
}

interface ToolbarButton {
  icon: string;
  label: string;
  action: string;
  gradient?: string;
  pulse?: boolean;
}

export function DraftEditor(_{
  initialContent = '', onSave, onPublish, className
}: DraftEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set());
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [viralScore, setViralScore] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [metadata, setMetadata] = useState<ContentMetadata>({
    wordCount: 0,
    readingTime: 0,
    viralScore: 0,
    hashtags: [],
    mentions: []
  });

  const toolbarButtons: ToolbarButton[] = [
    { icon: '✨', label: 'AI Enhance', action: 'ai-enhance', gradient: 'from-purple-500 to-pink-500', pulse: true },
    { icon: '🎯', label: 'Viral Check', action: 'viral-check', gradient: 'from-green-500 to-emerald-500' },
    { icon: '#️⃣', label: 'Hashtags', action: 'hashtags', gradient: 'from-blue-500 to-cyan-500' },
    { icon: '🎨', label: 'Format', action: 'format' },
    { icon: '📸', label: 'Add Media', action: 'media' },
    { icon: '🔗', label: 'Add Link', action: 'link' },
    { icon: '😊', label: 'Emojis', action: 'emoji' },
    { icon: '📊', label: 'Analytics', action: 'analytics' },
    { icon: '⚡', label: 'Templates', action: 'templates', gradient: 'from-orange-500 to-red-500' },
    { icon: '🔄', label: 'Versions', action: 'versions' },
  ];

  const aiSuggestions = [
    { text: "Add a hook question to grab attention 🎣", score: '+15' },
    { text: "Include trending hashtags #viral #fyp 📈", score: '+20' },
    { text: "End with a call-to-action 💬", score: '+10' },
    { text: "Use power words like 'ultimate', 'secret' 🔥", score: '+12' },
    { text: "Add personal story for authenticity 💖", score: '+18' }
  ];

  useEffect_(() => {
    analyzeContent(content);
  }, [content]);

    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200);

    const hashtags = text.match(/#\w+/g)  ?? [];
    const mentions = text.match(/@\w+/g)  ?? [];

    // Calculate viral score based on various factors
    let score = 50; // Base score
    if (hashtags.length > 0) {score += Math.min(hashtags.length * 5, 20);}
    if (mentions.length > 0) {score += Math.min(mentions.length * 3, 15);}
    if (text.includes('?')) {score += 5;} // Questions engage
    if (text.includes('!')) {score += 3;} // Excitement
    if (wordCount > 50 && wordCount < 150) {score += 10;} // Optimal length

    // Check for emoji usage
    const emojiCount = (text.match(/[\u{1F600}-\u{1F6FF}]/gu)  ?? []).length;
    if (emojiCount > 0) {score += Math.min(emojiCount * 2, 10);}

    setViralScore(Math.min(score, 100));
    setMetadata({
      wordCount,
      readingTime,
      viralScore: Math.min(score, 100),
      hashtags,
      mentions
    });
  };

  const handleToolClick = (action: string) => {
    const newTools = new Set(activeTools);
    if (newTools.has(action)) {
      newTools.delete(action);
    } else {
      newTools.add(action);
    }
    setActiveTools(newTools);

    if (action === 'ai-enhance') {
      setShowAiSuggestions(!showAiSuggestions);
    }

    if (action === 'fullscreen') {
      setIsFullscreen(!isFullscreen);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setContent(prev => prev + '\n\n' + suggestion);
    editorRef.current?.focus();
  };

  const handleSave = () => {
    onSave?.(content, metadata);
  };

  const handlePublish = () => {
    onPublish?.(content, metadata);
  };

  return (
    <motion.div
      className={cn(
        "relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden",
        isFullscreen && "fixed inset-4 z-50",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Vibrant Toolbar */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 p-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {toolbarButtons.map((button) => (
            <motion.button
              key={button.action}
              onClick={() => handleToolClick(button.action)}
              className={cn(
                "relative px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-all",
                activeTools.has(button.action)
                  ? "bg-gradient-to-r text-white shadow-lg"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
                button.gradient && activeTools.has(button.action) && button.gradient
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-lg">{button.icon}</span>
              <span className="text-sm font-medium">{button.label}</span>
              {button.pulse && (
                <motion.span
                  className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </motion.button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isFullscreen ? '↙️' : '↗️'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[600px]">
        {/* Editor Area */}
        <div className="flex-1 relative">
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start crafting your viral content... ✨"
            className={cn(
              "w-full h-full p-6 resize-none",
              "text-slate-900 dark:text-white",
              "bg-transparent",
              "focus:outline-none",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "text-lg leading-relaxed"
            )}
          />

          {/* Character counter and metadata */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span>{metadata.wordCount} words</span>
              <span>•</span>
              <span>{metadata.readingTime} min read</span>
              <span>•</span>
              <span>{metadata.hashtags.length} hashtags</span>
            </div>

            {/* Viral Score Meter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Viral Score</span>
              <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    viralScore < 40 && "bg-gradient-to-r from-red-400 to-orange-400",
                    viralScore >= 40 && viralScore < 70 && "bg-gradient-to-r from-yellow-400 to-green-400",
                    viralScore >= 70 && "bg-gradient-to-r from-green-400 to-emerald-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${viralScore}%` }}
                  transition={{ type: "spring", stiffness: 100 }}
                />
              </div>
              <span className={cn(
                "text-sm font-bold",
                viralScore < 40 && "text-orange-500",
                viralScore >= 40 && viralScore < 70 && "text-yellow-500",
                viralScore >= 70 && "text-green-500"
              )}>
                {viralScore}%
              </span>
            </div>
          </div>
        </div>

        {/* AI Suggestions Panel */}
        <AnimatePresence>
          {showAiSuggestions && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-slate-200 dark:border-slate-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    AI Suggestions
                  </h3>
                  <button
                    onClick={() => setShowAiSuggestions(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 cursor-pointer group"
                      onClick={() => applySuggestion(suggestion.text)}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                          {suggestion.text}
                        </p>
                        <span className="text-xs font-bold text-green-500 bg-green-100 dark:bg-green-950 px-2 py-1 rounded">
                          {suggestion.score}
                        </span>
                      </div>
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                          Click to apply →
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💡</span>
                    <span className="font-bold">Pro Tip</span>
                  </div>
                  <p className="text-sm opacity-90">
                    Posts with 80+ viral scores get 3x more engagement!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Bar */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Save Draft
            </button>
            <button className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Preview
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              Save
            </button>
            <motion.button
              onClick={handlePublish}
              className="px-8 py-2 bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-lg font-bold shadow-lg shadow-viral-500/25"
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(255, 0, 128, 0.3)' }}
              whileTap={{ scale: 0.95 }}
            >
              Publish Now 🚀
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}