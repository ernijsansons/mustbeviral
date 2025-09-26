// Progressive Onboarding Component with Adaptive Learning
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Check, Sparkles, Target, Users, TrendingUp, Lightbulb, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';

export interface UserProfile {
  experienceLevel: 'novice' | 'intermediate' | 'expert';
  goals: Array<'personal-brand' | 'business-marketing' | 'team-collaboration' | 'content-creation'>;
  industry?: string;
  teamSize?: number;
  previousPlatforms?: string[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  optional?: boolean;
  estimatedTime?: string;
  completionCriteria?: () => boolean;
  skipCondition?: (profile: UserProfile) => boolean;
}

export interface ProgressiveOnboardingProps {
  onComplete: (profile: UserProfile) => Promise<void>;
  onSkip?: () => void;
  initialProfile?: Partial<UserProfile>;
  customSteps?: OnboardingStep[];
  showProgress?: boolean;
  allowSkipping?: boolean;
  autoSave?: boolean;
  className?: string;
}

export const ProgressiveOnboarding: React.FC<ProgressiveOnboardingProps> = ({
  onComplete,
  onSkip,
  initialProfile = {},
  customSteps = [],
  showProgress = true,
  allowSkipping = true,
  autoSave = true,
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({
    experienceLevel: 'intermediate',
    goals: [],
    ...initialProfile
  });
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Define default onboarding steps
  const defaultSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Must Be Viral',
      description: 'Let\'s personalize your experience to help you create viral content',
      estimatedTime: '1 min',
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-primary-500 to-viral-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to go viral?
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              We'll guide you through a quick setup to personalize your experience and help you create content that resonates with your audience.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'experience',
      title: 'Your Experience Level',
      description: 'Help us tailor the interface and guidance to your needs',
      estimatedTime: '30 sec',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              How would you describe your content creation experience?
            </h3>
            <div className="space-y-3">
              {[
                {
                  level: 'novice' as const,
                  title: 'New to Content Creation',
                  description: 'I\'m just getting started with creating viral content',
                  icon: Lightbulb
                },
                {
                  level: 'intermediate' as const,
                  title: 'Some Experience',
                  description: 'I\'ve created content before but want to improve my viral success',
                  icon: Target
                },
                {
                  level: 'expert' as const,
                  title: 'Experienced Creator',
                  description: 'I have significant experience and want advanced tools',
                  icon: TrendingUp
                }
              ].map(({ level, title, description, icon: Icon }) => (
                <button
                  key={level}
                  onClick={() => setProfile(prev => ({ ...prev, experienceLevel: level }))}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 transition-all text-left',
                    profile.experienceLevel === level
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      profile.experienceLevel === level
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{title}</div>
                      <div className="text-sm text-gray-600 mt-1">{description}</div>
                    </div>
                    {profile.experienceLevel === level && (
                      <Check className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'goals',
      title: 'Your Goals',
      description: 'What do you want to achieve with viral content?',
      estimatedTime: '1 min',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What are your primary goals? (Select all that apply)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  goal: 'personal-brand' as const,
                  title: 'Build Personal Brand',
                  description: 'Grow my personal influence and following',
                  icon: Users
                },
                {
                  goal: 'business-marketing' as const,
                  title: 'Business Marketing',
                  description: 'Promote my business and drive sales',
                  icon: TrendingUp
                },
                {
                  goal: 'team-collaboration' as const,
                  title: 'Team Collaboration',
                  description: 'Work with my team to create content',
                  icon: Users
                },
                {
                  goal: 'content-creation' as const,
                  title: 'Content Creation',
                  description: 'Create engaging content for my audience',
                  icon: Sparkles
                }
              ].map(({ goal, title, description, icon: Icon }) => {
                const isSelected = profile.goals.includes(goal);
                return (
                  <button
                    key={goal}
                    onClick={() => {
                      setProfile(prev => ({
                        ...prev,
                        goals: isSelected
                          ? prev.goals.filter(g => g !== goal)
                          : [...prev.goals, goal]
                      }));
                    }}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all text-left',
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{title}</div>
                        <div className="text-sm text-gray-600 mt-1">{description}</div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'preferences',
      title: 'Additional Preferences',
      description: 'A few more details to enhance your experience',
      estimatedTime: '1 min',
      optional: true,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry (Optional)
              </label>
              <Input
                placeholder="e.g., Technology, Fashion, Health"
                value={profile.industry || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, industry: e.target.value }))}
              />
            </div>
            
            {profile.goals.includes('team-collaboration') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Size
                </label>
                <select
                  value={profile.teamSize || ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    teamSize: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select team size</option>
                  <option value="2">2-5 people</option>
                  <option value="6">6-10 people</option>
                  <option value="11">11-25 people</option>
                  <option value="26">25+ people</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'ai-autonomy',
      title: 'AI Assistant Level',
      description: 'Choose how much AI assistance you want while creating content',
      estimatedTime: '30 sec',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              How would you like our AI to assist you?
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    value={profile.experienceLevel === 'novice' ? 3 : profile.experienceLevel === 'expert' ? 1 : 2}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setProfile(prev => ({
                        ...prev,
                        experienceLevel: value === 3 ? 'novice' : value === 1 ? 'expert' : 'intermediate'
                      }));
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>Manual Control</span>
                    <span>Guided Creation</span>
                    <span>Automated Generation</span>
                  </div>
                </label>
              </div>

              {/* AI Level Examples */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className={cn(
                  'p-4 rounded-lg border',
                  profile.experienceLevel === 'expert'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200'
                )}>
                  <div className="font-medium text-gray-900">Manual Control</div>
                  <div className="text-sm text-gray-600 mt-1">
                    You create, AI provides suggestions when asked
                  </div>
                </div>
                
                <div className={cn(
                  'p-4 rounded-lg border',
                  profile.experienceLevel === 'intermediate'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200'
                )}>
                  <div className="font-medium text-gray-900">Guided Creation</div>
                  <div className="text-sm text-gray-600 mt-1">
                    AI offers real-time suggestions and improvements
                  </div>
                </div>
                
                <div className={cn(
                  'p-4 rounded-lg border',
                  profile.experienceLevel === 'novice'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200'
                )}>
                  <div className="font-medium text-gray-900">Automated Generation</div>
                  <div className="text-sm text-gray-600 mt-1">
                    AI creates first drafts, you review and refine
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const allSteps = [...defaultSteps, ...customSteps];
  
  // Filter steps based on skip conditions
  const activeSteps = allSteps.filter(step => 
    !step.skipCondition || !step.skipCondition(profile)
  );

  // Auto-save profile changes
  useEffect(() => {
    if (autoSave && typeof localStorage !== 'undefined') {
      localStorage.setItem('onboarding_profile', JSON.stringify(profile));
    }
  }, [profile, autoSave]);

  // Handle step completion
  const handleNext = useCallback(async () => {
    const step = activeSteps[currentStep];
    
    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, step.id]));
    
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      setIsCompleting(true);
      try {
        await onComplete(profile);
        // Clear auto-saved data
        if (autoSave && typeof localStorage !== 'undefined') {
          localStorage.removeItem('onboarding_profile');
        }
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
      } finally {
        setIsCompleting(false);
      }
    }
  }, [currentStep, activeSteps, profile, onComplete, autoSave]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  const currentStepData = activeSteps[currentStep];
  const progress = ((currentStep + 1) / activeSteps.length) * 100;
  const isLastStep = currentStep === activeSteps.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className={cn('w-full max-w-2xl', className)}>
        <Card className="shadow-xl border-0">
          {/* Progress Header */}
          {showProgress && (
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentStepData.title}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentStepData.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {currentStepData.estimatedTime && (
                    <span className="text-xs text-gray-500">
                      ~{currentStepData.estimatedTime}
                    </span>
                  )}
                  {currentStepData.optional && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Optional
                    </span>
                  )}
                  {allowSkipping && (
                    <Button
                      onClick={handleSkip}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      Skip Setup
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary-500 to-viral-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Step {currentStep + 1} of {activeSteps.length}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
            </div>
          )}

          {/* Step Content */}
          <CardContent className="p-8">
            {currentStepData.content}
          </CardContent>

          {/* Navigation Footer */}
          <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={currentStep === 0}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {currentStepData.optional && (
                <Button
                  onClick={handleNext}
                  variant="ghost"
                >
                  Skip
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                loading={isCompleting}
                rightIcon={isLastStep ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              >
                {isCompleting ? 'Setting up...' : isLastStep ? 'Complete Setup' : 'Continue'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};