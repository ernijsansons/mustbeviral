// Onboarding Flow - Role-based welcome screens with interactive feature tours
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Check, Sparkles, Target, Users,
  BarChart3, Zap, Crown, Briefcase, GraduationCap, Rocket,
  Heart, Share2, TrendingUp, Settings, Play, Skip
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

// TypeScript interfaces for onboarding
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  experience: ExperienceLevel;
  goals: string[];
  platforms: string[];
  teamSize?: number;
  industry?: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  optional?: boolean;
  estimatedTime?: number;
  roleSpecific?: UserRole[];
}

export interface FeatureTour {
  id: string;
  title: string;
  description: string;
  selector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  highlight?: boolean;
}

type UserRole = 'creator' | 'brand' | 'agency' | 'enterprise';
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface OnboardingFlowProps {
  user?: Partial<UserProfile>;
  onComplete?: (profile: UserProfile) => Promise<void>;
  onSkip?: () => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
  className?: string;
  enableTour?: boolean;
  customSteps?: OnboardingStep[];
}

// Role-specific configurations
const roleConfigs = {
  creator: {
    title: 'Content Creator',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    description: 'Create viral content and grow your audience',
    features: ['AI Content Generation', 'Viral Prediction', 'Analytics Dashboard', 'Social Scheduling'],
    goals: [
      'Increase engagement rates',
      'Grow follower count',
      'Create viral content',
      'Monetize content',
      'Build personal brand'
    ]
  },
  brand: {
    title: 'Brand Marketer',
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
    description: 'Connect with influencers and amplify your brand',
    features: ['Influencer Discovery', 'Campaign Management', 'ROI Tracking', 'Brand Safety'],
    goals: [
      'Find relevant influencers',
      'Increase brand awareness',
      'Drive conversions',
      'Improve ROI',
      'Build brand community'
    ]
  },
  agency: {
    title: 'Marketing Agency',
    icon: Users,
    color: 'from-green-500 to-emerald-500',
    description: 'Manage multiple clients and campaigns at scale',
    features: ['Multi-Client Dashboard', 'Team Collaboration', 'White-label Reports', 'Bulk Operations'],
    goals: [
      'Scale client campaigns',
      'Improve team efficiency',
      'Deliver better results',
      'Automate workflows',
      'Increase client retention'
    ]
  },
  enterprise: {
    title: 'Enterprise',
    icon: Crown,
    color: 'from-orange-500 to-red-500',
    description: 'Enterprise-grade marketing automation and insights',
    features: ['Custom Integrations', 'Advanced Analytics', 'Dedicated Support', 'SLA Guarantees'],
    goals: [
      'Integrate with existing tools',
      'Scale marketing operations',
      'Ensure compliance',
      'Get dedicated support',
      'Achieve enterprise ROI'
    ]
  }
};

const experienceLevels = [
  {
    id: 'beginner',
    title: 'Just Getting Started',
    icon: GraduationCap,
    description: 'New to influencer marketing or content creation'
  },
  {
    id: 'intermediate',
    title: 'Some Experience',
    icon: Briefcase,
    description: 'Have some experience but want to improve results'
  },
  {
    id: 'advanced',
    title: 'Expert Level',
    icon: Rocket,
    description: 'Experienced and looking for advanced tools'
  }
];

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: '📸', popular: true },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', popular: true },
  { id: 'youtube', name: 'YouTube', icon: '📺', popular: true },
  { id: 'twitter', name: 'Twitter', icon: '🐦', popular: false },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', popular: false },
  { id: 'facebook', name: 'Facebook', icon: '👥', popular: false },
  { id: 'twitch', name: 'Twitch', icon: '🎮', popular: false },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', popular: false }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  user = {},
  onComplete,
  onSkip,
  onUpdateProfile,
  className,
  enableTour = true,
  customSteps = []
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    role: 'creator',
    experience: 'beginner',
    goals: [],
    platforms: [],
    ...user
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Default onboarding steps
  const defaultSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Must Be Viral',
      description: 'Let\'s get you set up for success',
      content: <WelcomeStep />
    },
    {
      id: 'role',
      title: 'Choose Your Role',
      description: 'Help us personalize your experience',
      content: <RoleSelectionStep profile={profile} onUpdate={updateProfile} />
    },
    {
      id: 'experience',
      title: 'Experience Level',
      description: 'Tell us about your background',
      content: <ExperienceStep profile={profile} onUpdate={updateProfile} />
    },
    {
      id: 'platforms',
      title: 'Select Platforms',
      description: 'Which platforms do you use?',
      content: <PlatformSelectionStep profile={profile} onUpdate={updateProfile} />
    },
    {
      id: 'goals',
      title: 'Set Your Goals',
      description: 'What do you want to achieve?',
      content: <GoalsStep profile={profile} onUpdate={updateProfile} />
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Ready to start creating viral content',
      content: <CompletionStep profile={profile} onStartTour={() => setShowTour(true)} />
    }
  ];

  const steps = customSteps.length > 0 ? customSteps : defaultSteps;

  // Update profile
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
    onUpdateProfile?.(updates);
  }, [onUpdateProfile]);

  // Navigate steps
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Complete onboarding
  const handleComplete = useCallback(async () => {
    if (!onComplete) return;

    setIsLoading(true);
    try {
      await onComplete(profile as UserProfile);
    } catch (error) {
      console.error('Onboarding completion failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onComplete, profile]);

  // Check if current step is valid
  const isStepValid = useCallback(() => {
    const step = steps[currentStep];
    switch (step.id) {
      case 'role':
        return profile.role;
      case 'experience':
        return profile.experience;
      case 'platforms':
        return profile.platforms && profile.platforms.length > 0;
      case 'goals':
        return profile.goals && profile.goals.length > 0;
      default:
        return true;
    }
  }, [currentStep, steps, profile]);

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4', className)}>
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-primary-500 to-viral-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0" variant="elevated">
          <CardHeader className="text-center pb-6">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <CardTitle level={2} className="mb-2">
                {steps[currentStep].title}
              </CardTitle>
              <p className="text-gray-600 text-lg">
                {steps[currentStep].description}
              </p>
              {steps[currentStep].estimatedTime && (
                <p className="text-sm text-gray-500 mt-2">
                  Estimated time: {steps[currentStep].estimatedTime} minutes
                </p>
              )}
            </motion.div>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {steps[currentStep].content}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          {/* Navigation */}
          <div className="flex items-center justify-between p-8 pt-0">
            <Button
              onClick={currentStep === 0 ? onSkip : prevStep}
              variant="ghost"
              leftIcon={currentStep === 0 ? <Skip className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            >
              {currentStep === 0 ? 'Skip Onboarding' : 'Previous'}
            </Button>

            <div className="flex gap-2">
              {steps[currentStep].optional && (
                <Button
                  onClick={nextStep}
                  variant="outline"
                >
                  Skip This Step
                </Button>
              )}

              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleComplete}
                  loading={isLoading}
                  variant="viral"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Get Started
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!isStepValid()}
                  variant="viral"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Continue
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Skip Option */}
        {currentStep > 0 && (
          <div className="text-center mt-6">
            <Button
              onClick={onSkip}
              variant="ghost"
              size="sm"
              className="text-gray-500"
            >
              Skip remaining steps and explore on my own
            </Button>
          </div>
        )}
      </div>

      {/* Feature Tour Modal */}
      <AnimatePresence>
        {showTour && enableTour && (
          <FeatureTourModal
            onClose={() => setShowTour(false)}
            role={profile.role || 'creator'}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Individual step components
const WelcomeStep: React.FC = () => (
  <div className="text-center space-y-6">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: 'spring' }}
    >
      <div className="w-24 h-24 mx-auto bg-gradient-to-r from-primary-500 to-viral-500 rounded-full flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
    </motion.div>

    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-gray-900">
        Ready to go viral?
      </h3>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        We'll help you create content that resonates, find the right audience,
        and track your success with AI-powered insights.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {[
        { icon: Zap, title: 'AI-Powered', description: 'Generate viral content with advanced AI' },
        { icon: BarChart3, title: 'Data-Driven', description: 'Make decisions based on real insights' },
        { icon: TrendingUp, title: 'Proven Results', description: 'Join thousands of successful creators' }
      ].map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1 }}
          className="text-center"
        >
          <feature.icon className="w-8 h-8 mx-auto mb-3 text-primary-500" />
          <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
          <p className="text-sm text-gray-600">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  </div>
);

interface StepProps {
  profile: Partial<UserProfile>;
  onUpdate: (updates: Partial<UserProfile>) => void;
}

const RoleSelectionStep: React.FC<StepProps> = ({ profile, onUpdate }) => (
  <div className="space-y-6">
    <p className="text-center text-gray-600 mb-8">
      Choose the option that best describes you to get personalized features and recommendations.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(roleConfigs).map(([role, config]) => {
        const Icon = config.icon;
        const isSelected = profile.role === role;

        return (
          <motion.div
            key={role}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                'cursor-pointer transition-all duration-200',
                isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-lg'
              )}
              onClick={() => onUpdate({ role: role as UserRole })}
              role="button"
              tabIndex={0}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r',
                    config.color
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {config.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {config.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Key Features:</h4>
                  <ul className="space-y-1">
                    {config.features.slice(0, 3).map((feature) => (
                      <li key={feature} className="text-sm text-gray-600 flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  </div>
);

const ExperienceStep: React.FC<StepProps> = ({ profile, onUpdate }) => (
  <div className="space-y-6">
    <p className="text-center text-gray-600 mb-8">
      This helps us recommend the right tools and provide appropriate guidance.
    </p>

    <div className="space-y-4">
      {experienceLevels.map((level) => {
        const Icon = level.icon;
        const isSelected = profile.experience === level.id;

        return (
          <motion.div
            key={level.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Card
              className={cn(
                'cursor-pointer transition-all duration-200',
                isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-md'
              )}
              onClick={() => onUpdate({ experience: level.id as ExperienceLevel })}
              role="button"
              tabIndex={0}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Icon className={cn(
                    'w-8 h-8',
                    isSelected ? 'text-primary-600' : 'text-gray-500'
                  )} />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {level.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {level.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary-600 ml-auto" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  </div>
);

const PlatformSelectionStep: React.FC<StepProps> = ({ profile, onUpdate }) => {
  const togglePlatform = useCallback((platformId: string) => {
    const current = profile.platforms || [];
    const updated = current.includes(platformId)
      ? current.filter(p => p !== platformId)
      : [...current, platformId];
    onUpdate({ platforms: updated });
  }, [profile.platforms, onUpdate]);

  return (
    <div className="space-y-6">
      <p className="text-center text-gray-600 mb-8">
        Select the platforms where you create or want to create content. You can change this later.
      </p>

      <div className="space-y-6">
        {/* Popular Platforms */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Most Popular
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {platforms.filter(p => p.popular).map((platform) => {
              const isSelected = profile.platforms?.includes(platform.id);
              return (
                <Button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  variant={isSelected ? 'viral' : 'outline'}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <span className="font-medium">{platform.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Other Platforms */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Other Platforms
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {platforms.filter(p => !p.popular).map((platform) => {
              const isSelected = profile.platforms?.includes(platform.id);
              return (
                <Button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  variant={isSelected ? 'viral' : 'outline'}
                  size="sm"
                  className="h-auto p-3 flex flex-col items-center gap-1"
                >
                  <span className="text-lg">{platform.icon}</span>
                  <span className="text-xs font-medium">{platform.name}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {profile.platforms && profile.platforms.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Selected {profile.platforms.length} platform{profile.platforms.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

const GoalsStep: React.FC<StepProps> = ({ profile, onUpdate }) => {
  const roleConfig = roleConfigs[profile.role || 'creator'];

  const toggleGoal = useCallback((goal: string) => {
    const current = profile.goals || [];
    const updated = current.includes(goal)
      ? current.filter(g => g !== goal)
      : [...current, goal];
    onUpdate({ goals: updated });
  }, [profile.goals, onUpdate]);

  return (
    <div className="space-y-6">
      <p className="text-center text-gray-600 mb-8">
        Select your primary goals. We'll help you track progress and suggest strategies.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roleConfig.goals.map((goal) => {
          const isSelected = profile.goals?.includes(goal);
          return (
            <motion.div
              key={goal}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-200',
                  isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-md'
                )}
                onClick={() => toggleGoal(goal)}
                role="button"
                tabIndex={0}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {goal}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {profile.goals && profile.goals.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Selected {profile.goals.length} goal{profile.goals.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

interface CompletionStepProps {
  profile: Partial<UserProfile>;
  onStartTour: () => void;
}

const CompletionStep: React.FC<CompletionStepProps> = ({ profile, onStartTour }) => {
  const roleConfig = roleConfigs[profile.role || 'creator'];

  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <div className={cn(
          'w-24 h-24 mx-auto rounded-full flex items-center justify-center bg-gradient-to-r',
          roleConfig.color
        )}>
          <Check className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900">
          Welcome aboard, {profile.name || 'Creator'}!
        </h3>
        <p className="text-lg text-gray-600">
          Your account is set up and ready. Here's what you can do next:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Card variant="outline" className="p-4">
          <CardContent className="text-center space-y-3">
            <Play className="w-8 h-8 mx-auto text-primary-500" />
            <h4 className="font-semibold">Take a Quick Tour</h4>
            <p className="text-sm text-gray-600">
              Learn about the key features in 2 minutes
            </p>
            <Button
              onClick={onStartTour}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Start Tour
            </Button>
          </CardContent>
        </Card>

        <Card variant="outline" className="p-4">
          <CardContent className="text-center space-y-3">
            <Zap className="w-8 h-8 mx-auto text-viral-500" />
            <h4 className="font-semibold">Create Your First Content</h4>
            <p className="text-sm text-gray-600">
              Jump right in and start creating
            </p>
            <Button
              variant="viral"
              size="sm"
              className="w-full"
            >
              Create Content
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Feature Tour Modal Component
interface FeatureTourModalProps {
  onClose: () => void;
  role: UserRole;
}

const FeatureTourModal: React.FC<FeatureTourModalProps> = ({ onClose, role }) => {
  const [step, setStep] = useState(0);

  const tourSteps = [
    {
      title: 'Content Creation',
      description: 'Use AI to generate viral content for your platforms',
      feature: 'Smart AI suggestions based on trending topics'
    },
    {
      title: 'Analytics Dashboard',
      description: 'Track your performance with real-time insights',
      feature: 'Detailed metrics and viral prediction scores'
    },
    {
      title: 'Collaboration Tools',
      description: 'Work with your team in real-time',
      feature: 'Live editing, comments, and version control'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full"
      >
        <div className="text-center space-y-6">
          <h3 className="text-xl font-bold">Feature Tour</h3>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{tourSteps[step].title}</h4>
            <p className="text-gray-600">{tourSteps[step].description}</p>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{tourSteps[step].feature}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {step + 1} of {tourSteps.length}
            </span>

            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  onClick={() => setStep(step - 1)}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
              )}

              {step < tourSteps.length - 1 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  variant="viral"
                  size="sm"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={onClose}
                  variant="viral"
                  size="sm"
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OnboardingFlow;