import { useState, useCallback} from 'react';
import { Sparkles, TrendingUp, Clock, Hash, AlertCircle} from 'lucide-react';
import { GradientText} from './ui/GradientText';
import { Button} from './ui/Button';
import { cn} from '../lib/utils';

interface PredictionResult {
  score: number;
  confidence: 'Low' | 'Medium' | 'High' | 'Very High';
  bestTime: string;
  suggestedHashtags: string[];
  improvements: string[];
}

export function ViralPredictor() {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

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

  const analyzeContent = () => {
    const sanitizedContent = sanitizeInput(content);
    if (!sanitizedContent) {return;}

    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout_(() => {
      const score = Math.min(95, Math.max(40, sanitizedContent.length * 2 + Math.random() * 30));

      setPrediction({
        score: Math.round(score),
        confidence: score > 80 ? 'Very High' : score > 60 ? 'High' : score > 40 ? 'Medium' : 'Low',
        bestTime: '2:00 PM - 4:00 PM EST',
        suggestedHashtags: ['#viral', '#trending', '#contentcreator', '#socialmedia', '#growth'],
        improvements: [
          'Add a compelling hook in the first 3 seconds',
          'Include a clear call-to-action',
          'Optimize for mobile viewing',
          'Use trending audio or music',
        ],
      });
      setIsAnalyzing(false);
    }, 2000);
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
          {/* Input section */}
          <div className="mb-6">
            <label htmlFor="content-input" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your content idea or caption
            </label>
            <textarea
              id="content-input"
              value={content}
              onChange={(e) => setContent(sanitizeInput(e.target.value))}
              placeholder="Example: Check out this amazing productivity hack that changed my life..."
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
                disabled={!content.trim()  ?? isAnalyzing}
                loading={isAnalyzing}
                leftIcon={<Sparkles className="w-4 h-4" />}
                aria-label={isAnalyzing ? 'Analyzing content' : 'Analyze your content for viral potential'}
              >
                {isAnalyzing ? 'Analyzing...' : 'Predict Virality'}
              </Button>
            </div>
          </div>

          {/* Results section */}
          {prediction && !isAnalyzing && (
            <div className="border-t border-gray-200 pt-6 animate-slide-up">
              {/* Viral score */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Viral Probability Score</h3>
                  <span className={cn('text-sm font-medium', getScoreColor(prediction.score))}>
                    {prediction.confidence} Confidence
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
              </div>

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

                {/* Trending indicators */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <TrendingUp className="w-4 h-4 text-viral-500" />
                    <span className="font-medium">Trend Alignment</span>
                  </div>
                  <p className="text-sm text-gray-600 pl-6">Matches 3 trending topics</p>
                </div>

                {/* Suggested hashtags */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Hash className="w-4 h-4 text-gold-500" />
                    <span className="font-medium">Recommended Hashtags</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {prediction.suggestedHashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Improvements */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">Quick Improvements</span>
                  </div>
                  <ul className="space-y-1 pl-6">
                    {prediction.improvements.slice(0, 2).map((improvement, index) => (
                      <li key={index} className="text-xs text-gray-600">
                        • {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 p-4 bg-gradient-to-r from-primary-50 to-viral-50 rounded-lg text-center">
                <p className="text-sm text-gray-700 mb-2">
                  Want detailed insights and optimization suggestions?
                </p>
                <a
                  href="/onboard"
                  className="text-primary-600 font-semibold hover:text-primary-700"
                >
                  Start your free trial →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}