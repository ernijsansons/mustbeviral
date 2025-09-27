import React, { useState } from 'react';
import { motion, AnimatePresence} from 'framer-motion';
import { cn} from '../../lib/utils';

interface BriefBuilderProps {
  onComplete?: (brief: ContentBrief) => void;
  className?: string;
}

interface ContentBrief {
  title: string;
  objective: string;
  targetAudience: string[];
  platforms: string[];
  deliverables: Deliverable[];
  timeline: Timeline;
  budget: number;
  tone: string[];
  references: string[];
  requirements: string[];
  viralGoals: ViralGoals;
}

interface Deliverable {
  id: string;
  type: string;
  quantity: number;
  description: string;
}

interface Timeline {
  startDate: string;
  endDate: string;
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

interface ViralGoals {
  targetReach: number;
  targetEngagement: number;
  targetShares: number;
  hashtags: string[];
}

interface Step {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
}

const steps: Step[] = [
  { id: 'basics', title: 'Basics', icon: '📝', color: 'from-blue-500 to-cyan-500', description: 'Project title and objectives' },
  { id: 'audience', title: 'Audience', icon: '🎯', color: 'from-purple-500 to-pink-500', description: 'Target demographics and platforms' },
  { id: 'content', title: 'Content', icon: '🎨', color: 'from-orange-500 to-red-500', description: 'Deliverables and requirements' },
  { id: 'timeline', title: 'Timeline', icon: '📅', color: 'from-green-500 to-emerald-500', description: 'Schedule and milestones' },
  { id: 'goals', title: 'Goals', icon: '🚀', color: 'from-yellow-500 to-orange-500', description: 'Viral metrics and KPIs' },
  { id: 'review', title: 'Review', icon: '✅', color: 'from-indigo-500 to-purple-500', description: 'Final review and submit' }
];

const platforms = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'youtube', label: 'YouTube', icon: '📺' },
  { id: 'twitter', label: 'Twitter', icon: '🐦' }
];

const deliverableTypes = [
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'photo', label: 'Photo', icon: '📸' },
  { id: 'story', label: 'Story', icon: '📖' },
  { id: 'reel', label: 'Reel', icon: '🎞️' },
  { id: 'post', label: 'Post', icon: '📝' },
  { id: 'live', label: 'Live Stream', icon: '🔴' }
];

const toneOptions = [
  { id: 'funny', label: 'Funny', emoji: '😂' },
  { id: 'inspirational', label: 'Inspirational', emoji: '✨' },
  { id: 'educational', label: 'Educational', emoji: '📚' },
  { id: 'authentic', label: 'Authentic', emoji: '💖' },
  { id: 'trendy', label: 'Trendy', emoji: '🔥' },
  { id: 'professional', label: 'Professional', emoji: '💼' }
];

export function BriefBuilder({ onComplete, className }: BriefBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [brief, setBrief] = useState<ContentBrief>({
    title: '',
    objective: '',
    targetAudience: [],
    platforms: [],
    deliverables: [],
    timeline: {
      startDate: '',
      endDate: '',
      milestones: []
    },
    budget: 1000,
    tone: [],
    references: [],
    requirements: [],
    viralGoals: {
      targetReach: 100000,
      targetEngagement: 10,
      targetShares: 1000,
      hashtags: []
    }
  });

  const [newDeliverable, setNewDeliverable] = useState<Partial<Deliverable>>({
    type: 'video',
    quantity: 1,
    description: ''
  });

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateBrief = <K extends keyof ContentBrief>(key: K, value: ContentBrief[K]) => {
    setBrief(prev => ({ ...prev, [key]: value }));
  };

  const togglePlatform = (platformId: string) => {
    const newPlatforms = brief.platforms.includes(platformId)
      ? brief.platforms.filter(p => p !== platformId)
      : [...brief.platforms, platformId];
    updateBrief('platforms', newPlatforms);
  };

  const toggleTone = (toneId: string) => {
    const newTones = brief.tone.includes(toneId)
      ? brief.tone.filter(t => t !== toneId)
      : [...brief.tone, toneId];
    updateBrief('tone', newTones);
  };

  const addDeliverable = () => {
    if (newDeliverable.type && newDeliverable.description) {
      const deliverable: Deliverable = {
        id: Date.now().toString(),
        type: newDeliverable.type,
        quantity: newDeliverable.quantity ?? 1,
        description: newDeliverable.description
      };
      updateBrief('deliverables', [...brief.deliverables, deliverable]);
      setNewDeliverable({ type: 'video', quantity: 1, description: '' });
    }
  };

  const removeDeliverable = (id: string) => {
    updateBrief('deliverables', brief.deliverables.filter(d => d.id !== id));
  };

  const calculateProgress = () => {
    return ((currentStep + 1) / steps.length) * 100;
  };

  const handleSubmit = () => {
    onComplete?.(brief);
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
      {/* Header with Progress */}
      <div className="relative bg-gradient-to-r from-primary-500 via-viral-500 to-purple-500 p-6 text-white">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Brief Builder</h2>
          <p className="text-white/80">Create viral content briefs in minutes</p>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${calculateProgress()}%` }}
            transition={{ type: "spring", stiffness: 100 }}
          />
        </div>

        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-64 h-64 bg-white/10 rounded-full"
              initial={{
                x: Math.random() * 400 - 200,
                y: Math.random() * 100 - 50
              }}
              animate={{
                x: Math.random() * 400 - 200,
                y: Math.random() * 100 - 50
              }}
              transition={{
                duration: 20 + i * 5,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          ))}
        </div>
      </div>

      {/* Stepper */}
      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center"
              onClick={() => index <= currentStep && setCurrentStep(index)}
            >
              <motion.div
                className={cn(
                  "relative w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all",
                  index <= currentStep
                    ? `bg-gradient-to-r ${step.color} text-white shadow-lg`
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                )}
                whileHover={index <= currentStep ? { scale: 1.1 } : {}}
                whileTap={index <= currentStep ? { scale: 0.95 } : {}}
              >
                <span className="text-xl">{step.icon}</span>
                {index === currentStep && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 lg:w-16 h-0.5 transition-colors",
                    index < currentStep
                      ? "bg-gradient-to-r from-primary-500 to-viral-500"
                      : "bg-slate-300 dark:bg-slate-600"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {steps[currentStep].title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {steps[currentStep].description}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          {/* Step 1: Basics */}
          {currentStep === 0 && (
            <motion.div
              key="basics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={brief.title}
                  onChange={(e) => updateBrief('title', e.target.value)}
                  placeholder="Enter your viral campaign title..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-viral-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Objective
                </label>
                <textarea
                  value={brief.objective}
                  onChange={(e) => updateBrief('objective', e.target.value)}
                  placeholder="What's the main goal of this campaign?"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-viral-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Budget Range
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-viral-500">
                    ${brief.budget}
                  </span>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={brief.budget}
                    onChange={(e) => updateBrief('budget', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gradient-to-r from-primary-500 to-viral-500 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    $10,000
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Audience */}
          {currentStep === 1 && (
            <motion.div
              key="audience"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Target Platforms
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map((platform) => (
                    <motion.button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all",
                        brief.platforms.includes(platform.id)
                          ? "border-viral-500 bg-gradient-to-r from-primary-500/10 to-viral-500/10"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-3xl mb-2">{platform.icon}</div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {platform.label}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Content Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {toneOptions.map((tone) => (
                    <motion.button
                      key={tone.id}
                      onClick={() => toggleTone(tone.id)}
                      className={cn(
                        "px-4 py-2 rounded-full font-medium transition-all",
                        brief.tone.includes(tone.id)
                          ? "bg-gradient-to-r from-primary-500 to-viral-500 text-white shadow-lg"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="mr-1">{tone.emoji}</span>
                      {tone.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Content */}
          {currentStep === 2 && (
            <motion.div
              key="content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Deliverables
                </label>

                <div className="space-y-3 mb-4">
                  {brief.deliverables.map((deliverable) => (
                    <motion.div
                      key={deliverable.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {deliverableTypes.find(d => d.id === deliverable.type)?.icon}
                        </span>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {deliverable.quantity}x {deliverableTypes.find(d => d.id === deliverable.type)?.label}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {deliverable.description}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDeliverable(deliverable.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
                  <div className="flex gap-3">
                    <select
                      value={newDeliverable.type}
                      onChange={(e) => setNewDeliverable({ ...newDeliverable, type: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {deliverableTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={newDeliverable.quantity}
                      onChange={(e) => setNewDeliverable({ ...newDeliverable, quantity: parseInt(e.target.value) })}
                      min="1"
                      className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <input
                    type="text"
                    value={newDeliverable.description}
                    onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <button
                    onClick={addDeliverable}
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    Add Deliverable +
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Timeline */}
          {currentStep === 3 && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={brief.timeline.startDate}
                    onChange={(e) => updateBrief('timeline', { ...brief.timeline, startDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={brief.timeline.endDate}
                    onChange={(e) => updateBrief('timeline', { ...brief.timeline, endDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg">
                <h4 className="font-bold text-slate-900 dark:text-white mb-3">
                  Quick Timeline Preview
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Campaign Kickoff</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Content Creation Phase</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Review & Feedback</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">Final Delivery</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Goals */}
          {currentStep === 4 && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg">
                  <div className="text-3xl mb-2">👁️</div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Target Reach
                  </label>
                  <input
                    type="number"
                    value={brief.viralGoals.targetReach}
                    onChange={(e) => updateBrief('viralGoals', { ...brief.viralGoals, targetReach: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold"
                  />
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-lg">
                  <div className="text-3xl mb-2">💬</div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Engagement %
                  </label>
                  <input
                    type="number"
                    value={brief.viralGoals.targetEngagement}
                    onChange={(e) => updateBrief('viralGoals', { ...brief.viralGoals, targetEngagement: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold"
                  />
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg">
                  <div className="text-3xl mb-2">🔄</div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Target Shares
                  </label>
                  <input
                    type="number"
                    value={brief.viralGoals.targetShares}
                    onChange={(e) => updateBrief('viralGoals', { ...brief.viralGoals, targetShares: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold"
                  />
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-viral-500/10 to-primary-500/10 rounded-lg border-2 border-viral-500/20">
                <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Viral Success Metrics
                </h4>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <div>✓ Content should achieve 3x average engagement rate</div>
                  <div>✓ Aim for 70% completion rate on videos</div>
                  <div>✓ Generate at least 50 user-generated responses</div>
                  <div>✓ Trend in top 10 hashtags within niche</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 6: Review */}
          {currentStep === 5 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Brief Ready!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Your viral content brief is complete and ready to share
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-6 space-y-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Title</span>
                  <p className="font-bold text-slate-900 dark:text-white">{brief.title ?? 'Untitled Campaign'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Budget</span>
                  <p className="font-bold text-viral-500">${brief.budget}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Platforms</span>
                  <div className="flex gap-2 mt-1">
                    {brief.platforms.map(p => (
                      <span key={p} className="text-xl">
                        {platforms.find(plat => plat.id === p)?.icon}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Deliverables</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {brief.deliverables.length} items
                  </p>
                </div>
              </div>

              <motion.button
                onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold text-lg shadow-lg"
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)' }}
                whileTap={{ scale: 0.98 }}
              >
                Submit Brief 🚀
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between">
        <motion.button
          onClick={prevStep}
          disabled={currentStep === 0}
          className={cn(
            "px-6 py-2 rounded-lg font-medium transition-all",
            currentStep === 0
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
          )}
          whileHover={currentStep > 0 ? { scale: 1.05 } : {}}
          whileTap={currentStep > 0 ? { scale: 0.95 } : {}}
        >
          ← Previous
        </motion.button>

        <motion.button
          onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
          className="px-8 py-2 bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-lg font-bold shadow-lg shadow-viral-500/25"
          whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(255, 0, 128, 0.3)' }}
          whileTap={{ scale: 0.95 }}
        >
          {currentStep === steps.length - 1 ? 'Submit' : 'Next →'}
        </motion.button>
      </div>
    </motion.div>
  );
}