// Smart Content Creation Panel - AI-guided content generation with viral prediction
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mic, MicOff, Eye, BarChart3, Target, Zap,
  Twitter, Instagram, Linkedin, Facebook, Plus, X,
  TrendingUp, Users, Clock, Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

// TypeScript interfaces following existing patterns
export interface ContentFormData {
  topic: string;
  platforms: Platform[];
  tone: ContentTone;
  targetAudience: TargetAudience;
  contentType: ContentType;
  keywords?: string[];
  customPrompt?: string;
}

export interface Platform {
  id: 'twitter' | 'instagram' | 'linkedin' | 'facebook';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  characterLimit: number;
}

export interface ViralPrediction {
  score: number;
  factors: PredictionFactor[];
  suggestions: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface PredictionFactor {
  name: string;
  impact: number;
  description: string;
}

type ContentTone = 'professional' | 'casual' | 'humorous' | 'inspiring' | 'urgent';
type TargetAudience = 'general' | 'professionals' | 'entrepreneurs' | 'students' | 'millennials' | 'gen-z';
type ContentType = 'social_post' | 'blog_post' | 'video_script' | 'email_campaign';

export interface SmartContentCreationPanelProps {
  onGenerate?: (data: ContentFormData) => Promise<void>;
  onPredict?: (content: string) => Promise<ViralPrediction>;
  className?: string;
  isLoading?: boolean;
  enableVoiceInput?: boolean;
}

const platforms: Platform[] = [
  { id: 'twitter', name: 'Twitter', icon: Twitter, selected: false, characterLimit: 280 },
  { id: 'instagram', name: 'Instagram', icon: Instagram, selected: false, characterLimit: 2200 },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, selected: false, characterLimit: 3000 },
  { id: 'facebook', name: 'Facebook', icon: Facebook, selected: false, characterLimit: 63206 }
];

const tones: { value: ContentTone; label: string; emoji: string; description: string }[] = [
  { value: 'professional', label: 'Professional', emoji: '👔', description: 'Formal, expert-level content' },
  { value: 'casual', label: 'Casual', emoji: '😊', description: 'Friendly, approachable tone' },
  { value: 'humorous', label: 'Humorous', emoji: '😄', description: 'Funny, entertaining content' },
  { value: 'inspiring', label: 'Inspiring', emoji: '✨', description: 'Motivational and uplifting' },
  { value: 'urgent', label: 'Urgent', emoji: '⚡', description: 'Time-sensitive, action-oriented' }
];

const audiences: { value: TargetAudience; label: string; emoji: string }[] = [
  { value: 'general', label: 'General Audience', emoji: '🌍' },
  { value: 'professionals', label: 'Professionals', emoji: '💼' },
  { value: 'entrepreneurs', label: 'Entrepreneurs', emoji: '🚀' },
  { value: 'students', label: 'Students', emoji: '🎓' },
  { value: 'millennials', label: 'Millennials', emoji: '🏠' },
  { value: 'gen-z', label: 'Gen Z', emoji: '📱' }
];

export const SmartContentCreationPanel: React.FC<SmartContentCreationPanelProps> = ({
  onGenerate,
  onPredict,
  className,
  isLoading = false,
  enableVoiceInput = true
}) => {
  const [formData, setFormData] = useState<ContentFormData>({
    topic: '',
    platforms: platforms.map(p => ({ ...p })),
    tone: 'professional',
    targetAudience: 'general',
    contentType: 'social_post',
    keywords: [],
    customPrompt: ''
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [viralPrediction, setViralPrediction] = useState<ViralPrediction | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const topicInputRef = useRef<HTMLInputElement>(null);

  // Voice input setup
  useEffect(() => {
    if (!enableVoiceInput || !window.SpeechRecognition && !window.webkitSpeechRecognition) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({ ...prev, topic: transcript }));
      setIsListening(false);
    };

    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);

    return () => {
      recognitionRef.current?.stop();
    };
  }, [enableVoiceInput]);

  // Handle voice input toggle
  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Handle platform selection
  const togglePlatform = useCallback((platformId: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.map(p =>
        p.id === platformId ? { ...p, selected: !p.selected } : p
      )
    }));
  }, []);

  // Handle keyword addition
  const addKeyword = useCallback(() => {
    if (!keywordInput.trim() || formData.keywords?.includes(keywordInput.trim())) return;

    setFormData(prev => ({
      ...prev,
      keywords: [...(prev.keywords || []), keywordInput.trim()]
    }));
    setKeywordInput('');
  }, [keywordInput, formData.keywords]);

  // Remove keyword
  const removeKeyword = useCallback((keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keyword) || []
    }));
  }, []);

  // Handle viral prediction
  const handlePredict = useCallback(async () => {
    if (!onPredict || !formData.topic) return;

    try {
      const prediction = await onPredict(formData.topic);
      setViralPrediction(prediction);
    } catch (error) {
      console.error('Viral prediction failed:', error);
    }
  }, [onPredict, formData.topic]);

  // Handle form submission
  const handleGenerate = useCallback(async () => {
    if (!onGenerate) return;

    const selectedPlatforms = formData.platforms.filter(p => p.selected);
    if (!formData.topic || selectedPlatforms.length === 0) return;

    try {
      await onGenerate({
        ...formData,
        platforms: selectedPlatforms
      });
    } catch (error) {
      console.error('Content generation failed:', error);
    }
  }, [onGenerate, formData]);

  const selectedPlatformsCount = formData.platforms.filter(p => p.selected).length;
  const canProceed = formData.topic.trim() && selectedPlatformsCount > 0;

  return (
    <Card className={cn('h-full flex flex-col', className)} variant="elevated" animation="lift">
      <CardHeader className="pb-4">
        <CardTitle level={3} className="flex items-center gap-2" gradient>
          <Sparkles className="w-5 h-5 text-primary-500" />
          Smart Content Creator
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          AI-powered content generation with viral prediction
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        {/* Step 1: Topic Input with Voice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Content Topic <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <Input
              ref={topicInputRef}
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="What would you like to create content about?"
              className="pr-12"
              aria-label="Content topic"
            />

            {enableVoiceInput && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8"
                onClick={toggleVoiceInput}
                title={isListening ? 'Stop voice input' : 'Start voice input'}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-red-500 animate-pulse" />
                ) : (
                  <Mic className="w-4 h-4 text-gray-500" />
                )}
              </Button>
            )}
          </div>

          {formData.topic && (
            <Button
              onClick={handlePredict}
              variant="outline"
              size="sm"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              className="w-full"
            >
              Predict Viral Potential
            </Button>
          )}
        </motion.div>

        {/* Viral Prediction Display */}
        <AnimatePresence>
          {viralPrediction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-gradient-to-r from-primary-50 to-viral-50 border border-primary-200 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">Viral Prediction</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn(
                    'w-4 h-4',
                    viralPrediction.confidence === 'high' ? 'text-green-500' :
                    viralPrediction.confidence === 'medium' ? 'text-yellow-500' :
                    'text-gray-500'
                  )} />
                  <span className="text-2xl font-bold text-viral-600">
                    {viralPrediction.score}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-600">
                  <strong>Key Factors:</strong> {viralPrediction.factors.slice(0, 3).map(f => f.name).join(', ')}
                </div>
                {viralPrediction.suggestions.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <strong>Suggestion:</strong> {viralPrediction.suggestions[0]}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: Platform Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Target Platforms <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {formData.platforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <Button
                  key={platform.id}
                  type="button"
                  variant={platform.selected ? 'viral' : 'outline'}
                  className="h-auto p-3 flex flex-col items-center gap-2"
                  onClick={() => togglePlatform(platform.id)}
                  aria-pressed={platform.selected}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-center">
                    <div className="text-sm font-medium">{platform.name}</div>
                    <div className="text-xs opacity-70">
                      {platform.characterLimit} chars
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </motion.div>

        {/* Step 3: Content Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Tone Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tone
            </label>
            <select
              value={formData.tone}
              onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value as ContentTone }))}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Content tone"
            >
              {tones.map(tone => (
                <option key={tone.value} value={tone.value}>
                  {tone.emoji} {tone.label}
                </option>
              ))}
            </select>
          </div>

          {/* Audience Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Audience
            </label>
            <select
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value as TargetAudience }))}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Target audience"
            >
              {audiences.map(audience => (
                <option key={audience.value} value={audience.value}>
                  {audience.emoji} {audience.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Advanced Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            leftIcon={<Target className="w-4 h-4" />}
            className="mb-3"
          >
            Advanced Options
          </Button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-3 border-t border-gray-200"
              >
                {/* Keywords */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Keywords & Hashtags
                  </label>

                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      placeholder="Add keyword or hashtag"
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    />
                    <Button
                      type="button"
                      onClick={addKeyword}
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Add
                    </Button>
                  </div>

                  {formData.keywords && formData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-sm"
                        >
                          #{keyword}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 text-primary-500 hover:text-primary-700"
                            onClick={() => removeKeyword(keyword)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Prompt */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custom Instructions
                  </label>
                  <textarea
                    value={formData.customPrompt || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customPrompt: e.target.value }))}
                    placeholder="Additional instructions for the AI..."
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows={3}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4 border-t border-gray-200"
        >
          <Button
            onClick={handleGenerate}
            disabled={!canProceed || isLoading}
            loading={isLoading}
            variant="viral"
            size="lg"
            className="w-full"
            leftIcon={<Zap className="w-5 h-5" />}
          >
            {isLoading ? 'Generating...' : `Generate Content for ${selectedPlatformsCount} Platform${selectedPlatformsCount !== 1 ? 's' : ''}`}
          </Button>

          {!canProceed && (
            <p className="text-xs text-red-500 mt-2 text-center">
              Please enter a topic and select at least one platform
            </p>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default SmartContentCreationPanel;