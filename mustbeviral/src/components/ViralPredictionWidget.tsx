// Viral Prediction Widget with Advanced Analytics and Accessibility
import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Target, Clock, Users, Eye, Heart, Share2, Zap, Info} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle} from './ui/Card';
import { Button} from './ui/Button';
import { cn} from '../lib/utils';

export interface ViralScore {
  overall: number; // 0-100
  factors: {
    engagement: number;
    timing: number;
    trending: number;
    audience: number;
    format: number;
  };
  recommendations: Array<{
    id: string;
    type: 'improvement' | 'optimization' | 'timing';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'easy' | 'moderate' | 'complex';
  }>;
  prediction: {
    reach: { min: number; max: number; confidence: number };
    engagement: { min: number; max: number; confidence: number };
    shares: { min: number; max: number; confidence: number };
  };
}

export interface ViralPredictionWidgetProps {
  score: ViralScore;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  onApplyRecommendation?: (recommendationId: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPredictions?: boolean;
  showRecommendations?: boolean;
  animated?: boolean;
}

export const ViralPredictionWidget: React.FC<ViralPredictionWidgetProps> = ({
  score, loading = false, onRefresh, onApplyRecommendation, className, size = 'md', showPredictions = true, showRecommendations = true, animated = true
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [expandedFactors, setExpandedFactors] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  // Animate score counting
  useEffect_(() => {
    if (!animated ?? loading) {return;}

    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = score.overall / steps;

    let currentStep = 0;
    const timer = setInterval_(() => {
      currentStep++;
      setAnimatedScore(Math.min(score.overall, increment * currentStep));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedScore(score.overall);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [score.overall, animated, loading]);

  // Get score color and description
  const getScoreColor = useCallback((value: number) => {
    if (value >= 80) {
    return 'text-green-600';
  }
    if (value >= 60) {
    return 'text-yellow-600';
  }
    if (value >= 40) {
    return 'text-orange-600';
  }
    return 'text-red-600';
  }, []);

  const getScoreBgColor = useCallback((value: number) => {
    if (value >= 80) {
    return 'from-green-500 to-emerald-500';
  }
    if (value >= 60) {
    return 'from-yellow-500 to-orange-500';
  }
    if (value >= 40) {
    return 'from-orange-500 to-red-500';
  }
    return 'from-red-500 to-red-600';
  }, []);

  const getScoreDescription = useCallback((value: number) => {
    if (value >= 80) {
    return 'Excellent viral potential';
  }
    if (value >= 60) {
    return 'Good viral potential';
  }
    if (value >= 40) {
    return 'Moderate viral potential';
  }
    return 'Low viral potential';
  }, []);

  // Format numbers for display
  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
    if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
    return num.toString();
  }, []);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl'
  };

  const displayScore = animated ? animatedScore : score.overall;

  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        className
      )}
      variant="elevated"
      hoverEffect="lift"
    >
      <CardHeader>
        <CardTitle level={3} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-600" />
            Viral Prediction
          </div>
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="ghost"
              size="sm"
              disabled={loading}
              aria-label="Refresh viral prediction"
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-32 h-32 mx-auto mb-4">
            {/* Background circle */}
            <svg 
              className="w-full h-full transform -rotate-90" 
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-neutral-200"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#viral-gradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - displayScore / 100)}`}
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.4))'
                }}
              />
              <defs>
                <linearGradient id="viral-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={cn('stop-color-primary-500')} />
                  <stop offset="100%" className={cn('stop-color-viral-500')} />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className={cn(
                  'font-bold leading-none',
                  sizeClasses[size],
                  getScoreColor(displayScore)
                )}
                aria-label={`Viral score: ${Math.round(displayScore)} out of 100`}
              >
                {Math.round(displayScore)}
              </span>
              <span className="text-xs text-neutral-500 mt-1">out of 100</span>
            </div>
          </div>

          <p 
            className={cn('text-lg font-medium', getScoreColor(displayScore))}
            aria-live="polite"
          >
            {getScoreDescription(displayScore)}
          </p>
        </div>

        {/* Factors Breakdown */}
        <div className="space-y-3">
          <button
            onClick={() => setExpandedFactors(!expandedFactors)}
            className="w-full flex items-center justify-between text-left p-3 rounded-lg hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-expanded={expandedFactors}
            aria-controls="factors-breakdown"
          >
            <span className="font-medium">Score Breakdown</span>
            <div className={cn(
              'transform transition-transform duration-200',
              expandedFactors && 'rotate-180'
            )}>
              <Info className="w-4 h-4" />
            </div>
          </button>

          {expandedFactors && (
            <div id="factors-breakdown" className="space-y-3">
              {Object.entries(score.factors).map(([factor, value]) => {
                const Icon = {
                  engagement: Heart,
                  timing: Clock,
                  trending: TrendingUp,
                  audience: Users,
                  format: Eye
                }[factor]  ?? Target;

                return (
                  <div key={factor} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Icon className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm capitalize">{factor}</span>
                    </div>
                    
                    <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-1000 ease-out',
                          `bg-gradient-to-r ${getScoreBgColor(value)}`
                        )}
                        style={{ width: `${value}%` }}
                        aria-label={`${factor}: ${value}%`}
                      />
                    </div>
                    
                    <span className={cn('text-sm font-medium w-8', getScoreColor(value))}>
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Predictions */}
        {showPredictions && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Eye className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-lg font-semibold text-blue-600">
                {formatNumber(score.prediction.reach.min)}-{formatNumber(score.prediction.reach.max)}
              </div>
              <div className="text-xs text-neutral-600">Expected Reach</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Heart className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-lg font-semibold text-red-600">
                {formatNumber(score.prediction.engagement.min)}-{formatNumber(score.prediction.engagement.max)}
              </div>
              <div className="text-xs text-neutral-600">Engagement</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Share2 className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-lg font-semibold text-green-600">
                {formatNumber(score.prediction.shares.min)}-{formatNumber(score.prediction.shares.max)}
              </div>
              <div className="text-xs text-neutral-600">Shares</div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {showRecommendations && score.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-neutral-900">Optimization Recommendations</h4>
            <div className="space-y-2">
              {score.recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    'p-3 rounded-lg border transition-all duration-200 cursor-pointer',
                    selectedRecommendation === rec.id 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  )}
                  onClick={() => setSelectedRecommendation(
                    selectedRecommendation === rec.id ? null : rec.id
                  )}
                  role="button"
                  tabIndex={0}
                  aria-expanded={selectedRecommendation === rec.id}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{rec.title}</span>
                        <div className="flex gap-1">
                          <span className={cn(
                            'px-2 py-0.5 text-xs rounded-full',
                            rec.impact === 'high' ? 'bg-green-100 text-green-700' :
                            rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {rec.impact} impact
                          </span>
                          <span className={cn(
                            'px-2 py-0.5 text-xs rounded-full',
                            rec.effort === 'easy' ? 'bg-blue-100 text-blue-700' :
                            rec.effort === 'moderate' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {rec.effort}
                          </span>
                        </div>
                      </div>
                      
                      {selectedRecommendation === rec.id && (<div className="mt-2 space-y-3">
                          <p className="text-sm text-neutral-600">{rec.description}</p>
                          {onApplyRecommendation && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onApplyRecommendation(rec.id);
                              }}
                              size="sm"
                              variant="default"
                            >
                              Apply Recommendation
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-neutral-600">Analyzing viral potential...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};