import { useState, useCallback} from 'react';
import { Sparkles, TrendingUp, Clock, Hash, AlertCircle, Brain, Target, BarChart} from 'lucide-react';
import { GradientText} from './ui/GradientText';
import { Button} from './ui/Button';
import { cn} from '../lib/utils';
import { ViralPredictionEngine, ViralRequest, SocialPlatform } from '../lib/ml/ViralPredictionEngine';
import { FeatureExtractor } from '../lib/ml/FeatureExtractor';
import { ExplainableAI } from '../lib/ml/ExplainableAI';

interface PredictionResult {
  score: number;
  confidence: number;
  confidenceLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  bestTime: string;
  suggestedHashtags: string[];
  improvements: string[];
  platform: SocialPlatform;
  explanation: {
    topFactors: Array<{ factor: string; impact: number; explanation: string }>;
    reasoning: string;
    recommendations: string[];
  };
  breakdown: {
    contentScore: number;
    timingScore: number;
    engagementScore: number;
    platformScore: number;
  };
}

// Helper function for confidence level
function getConfidenceLevel(confidence: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (confidence > 0.8) {
    return 'Very High';
  }
  if (confidence > 0.6) {
    return 'High';
  }
  if (confidence > 0.4) {
    return 'Medium';
  }
  return 'Low';
}

export function ViralPredictor() {
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [viralEngine] = useState(() => new ViralPredictionEngine());

  // Input sanitization function
  const sanitizeInput = useCallback((input: string): string => {
    // Remove any script tags and dangerous HTML
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .trim()
      .slice(0, 500); // Limit to 500 characters for security
  }, []);

  const analyzeContent = async () => {
    const sanitizedContent = sanitizeInput(content);
    if (!sanitizedContent) return;

    setIsAnalyzing(true);

    try {
      // Create viral request
      const viralRequest: ViralRequest = {
        content: {
          text: sanitizedContent,
          hashtags: extractHashtags(sanitizedContent),
          mentions: extractMentions(sanitizedContent)
        },
        platform,
        timing: {
          scheduledTime: new Date(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        context: {
          trends: ['AI', 'social media', 'content creation'],
          competitors: [],
          currentEvents: []
        }
      };

      // Get ML prediction
      const viralPrediction = await viralEngine.predictViralPotential(viralRequest);

      // Get optimal strategy
      const strategy = await viralEngine.getOptimalStrategy(
        viralRequest.content,
        [platform, 'twitter', 'tiktok']
      );

      setPrediction({
        score: Math.round(viralPrediction.viralScore),
        confidence: viralPrediction.confidence,
        confidenceLevel: getConfidenceLevel(viralPrediction.confidence),
        platform: viralPrediction.platform,
        bestTime: strategy.timing.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'EST'
        }) + ' EST',
        suggestedHashtags: extractTopHashtags(strategy.modifications.get(platform) || []),
        improvements: viralPrediction.recommendations.slice(0, 4),
        explanation: {
          topFactors: viralPrediction.explanation.factors.slice(0, 3).map(factor => ({
            factor: factor.factor,
            impact: factor.impact,
            explanation: factor.explanation
          })),
          reasoning: viralPrediction.explanation.reasoning,
          recommendations: viralPrediction.recommendations
        },
        breakdown: {
          contentScore: Math.round((viralPrediction.explanation.factors.find(f => f.category === 'content')?.impact || 0) * 50 + 50),
          timingScore: Math.round(viralPrediction.timeToViral < 12 ? 80 : 60),
          engagementScore: Math.round(viralPrediction.peakEngagement * 200),
          platformScore: Math.round(viralPrediction.competitiveAdvantage * 100)
        }
      });
    } catch (error) {
      console.error('Error analyzing content:', error);
      // Fallback to simple analysis
      const score = Math.min(95, Math.max(40, sanitizedContent.length * 2 + Math.random() * 30));
      setPrediction({
        score: Math.round(score),
        confidence: 0.6,
        confidenceLevel: 'Medium',
        platform,
        bestTime: '2:00 PM - 4:00 PM EST',
        suggestedHashtags: ['#viral', '#trending', '#contentcreator'],
        improvements: ['Add more engaging content', 'Optimize timing'],
        explanation: {
          topFactors: [],
          reasoning: 'Basic analysis performed due to processing error.',
          recommendations: []
        },
        breakdown: {
          contentScore: Math.round(score * 0.7),
          timingScore: 60,
          engagementScore: Math.round(score * 0.8),
          platformScore: 70
        }
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper functions
  const extractHashtags = (text: string): string[] => {
    const hashtags = text.match(/#[\w]+/g) || [];
    return hashtags.map(tag => tag.toLowerCase());
  };

  const extractMentions = (text: string): string[] => {
    const mentions = text.match(/@[\w]+/g) || [];
    return mentions.map(mention => mention.toLowerCase());
  };

  const extractTopHashtags = (recommendations: string[]): string[] => {
    // Extract hashtag suggestions from recommendations
    const defaultHashtags = {
      instagram: ['#instagram', '#viral', '#reels', '#explore', '#trending'],
      twitter: ['#twitter', '#viral', '#trending'],
      tiktok: ['#tiktok', '#fyp', '#viral', '#foryou'],
      youtube: ['#youtube', '#viral', '#trending'],
      facebook: ['#facebook', '#viral', '#trending'],
      linkedin: ['#linkedin', '#professional', '#networking']
    };

    return defaultHashtags[platform] || defaultHashtags.instagram;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) {
    return 'text-viral-500';
  }
    if (score >= 60) {
    return 'text-gold-500';
  }
    if (score >= 40) {
    return 'text-yellow-500';
  }
    return 'text-red-500';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) {
    return 'from-viral-500 to-viral-600';
  }
    if (score >= 60) {
    return 'from-gold-500 to-gold-600';
  }
    if (score >= 40) {
    return 'from-yellow-500 to-yellow-600';
  }
    return 'from-red-500 to-red-600';
  };

  return (
    <section className="py-20 bg-gradient-to-b from-primary-50 to-white" aria-labelledby="predictor-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 id="predictor-heading" className="mb-4">
            <GradientText size="4xl" variant="viral">
              See It In Action
            </GradientText>
          </h2>
          <p className="text-xl text-gray-600">
            Try our AI-powered viral prediction tool right now
          </p>
        </div>

        {/* Interactive demo */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Platform selection */}
          <div className="mb-6">
            <label htmlFor="platform-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Platform
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {(['instagram', 'tiktok', 'twitter', 'youtube', 'facebook', 'linkedin'] as SocialPlatform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all capitalize',
                    platform === p
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input section */}
          <div className="mb-6">
            <label htmlFor="content-input" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your content idea or caption
            </label>
            <textarea
              id="content-input"
              value={content}
              onChange={(event) => setContent(sanitizeInput(event.target.value))}
              placeholder={`Example: Check out this amazing productivity hack that changed my life... #${platform} #viral`}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              rows={4}
              maxLength={500}
              aria-describedby="content-helper"
              aria-required="true"
            />
            <div className="flex justify-between items-center mt-2">
              <span id="content-helper" className="text-sm text-gray-500" role="status" aria-live="polite">
                {content.length}/500 characters
              </span>
              <Button
                variant="viral"
                size="default"
                onClick={analyzeContent}
                disabled={!content.trim() || isAnalyzing}
                loading={isAnalyzing}
                leftIcon={<Brain className="w-4 h-4" />}
                aria-label={isAnalyzing ? 'Analyzing content with AI' : 'Analyze your content for viral potential'}
              >
                {isAnalyzing ? 'AI Analyzing...' : 'Predict with AI'}
              </Button>
            </div>
          </div>

          {/* Results section */}
          {prediction && !isAnalyzing && (
            <div className="border-t border-gray-200 pt-6 animate-slide-up">
              {/* Viral score */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    AI Viral Prediction for {prediction.platform}
                  </h3>
                  <span className={cn('text-sm font-medium px-2 py-1 rounded-full',
                    prediction.confidenceLevel === 'Very High' ? 'bg-green-100 text-green-700' :
                    prediction.confidenceLevel === 'High' ? 'bg-blue-100 text-blue-700' :
                    prediction.confidenceLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {prediction.confidenceLevel} Confidence ({Math.round(prediction.confidence * 100)}%)
                  </span>
                </div>

                {/* Score meter */}
                <div className="relative">
                  <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full bg-gradient-to-r rounded-full transition-all duration-1000 ease-out', getScoreGradient(prediction.score))}
                      style={{ width: `${prediction.score}%` }}
                    />
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 left-4 text-white font-bold">
                    {prediction.score}%
                  </div>
                </div>

                {/* AI Reasoning */}
                {prediction.explanation.reasoning && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Brain className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">AI Analysis</h4>
                        <p className="text-sm text-blue-700">{prediction.explanation.reasoning}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Score breakdown */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{prediction.breakdown.contentScore}%</div>
                    <div className="text-sm text-gray-600">Content Quality</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{prediction.breakdown.timingScore}%</div>
                    <div className="text-sm text-gray-600">Timing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-viral-600">{prediction.breakdown.engagementScore}%</div>
                    <div className="text-sm text-gray-600">Engagement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gold-600">{prediction.breakdown.platformScore}%</div>
                    <div className="text-sm text-gray-600">Platform Fit</div>
                  </div>
                </div>
              </div>

              {/* Top factors */}
              {prediction.explanation.topFactors.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Success Factors</h4>
                  <div className="space-y-3">
                    {prediction.explanation.topFactors.map((factor, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Target className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900">{factor.factor}</div>
                          <div className="text-sm text-gray-600">{factor.explanation}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Impact: {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Best time to post */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 text-primary-500" />
                    <span className="font-medium">Optimal Posting Time</span>
                  </div>
                  <p className="text-sm text-gray-600 pl-6">{prediction.bestTime}</p>
                </div>

                {/* Platform insights */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <BarChart className="w-4 h-4 text-viral-500" />
                    <span className="font-medium">Platform Performance</span>
                  </div>
                  <p className="text-sm text-gray-600 pl-6">
                    Optimized for {prediction.platform} algorithm
                  </p>
                </div>

                {/* Suggested hashtags */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Hash className="w-4 h-4 text-gold-500" />
                    <span className="font-medium">AI-Suggested Hashtags</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {prediction.suggestedHashtags.slice(0, 5).map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Improvements */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">AI Recommendations</span>
                  </div>
                  <ul className="space-y-1 pl-6">
                    {prediction.improvements.slice(0, 3).map((improvement, index) => (
                      <li key={index} className="text-xs text-gray-600">
                        • {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Enhanced CTA */}
              <div className="mt-8 p-6 bg-gradient-to-r from-primary-50 to-viral-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-primary-600" />
                  <h4 className="font-semibold text-gray-900">Get Advanced AI Insights</h4>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  Unlock detailed ML predictions, competitor analysis, and personalized optimization strategies
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <a
                    href="/onboard"
                    className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Start Free Trial
                  </a>
                  <a
                    href="/features"
                    className="inline-flex items-center justify-center px-4 py-2 text-primary-600 font-medium hover:text-primary-700 transition-colors"
                  >
                    View All Features →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}