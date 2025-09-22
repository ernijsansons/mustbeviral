import { ArrowRight, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { GradientText } from './ui/GradientText';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export function HeroSection() {
  return (
    <section
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 via-white to-viral-50"
      aria-labelledby="hero-heading"
      role="banner">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-20 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-viral-200 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold-200 rounded-full blur-3xl opacity-10 animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-primary-200 mb-6 animate-fade-in">
          <Sparkles className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-medium text-gray-700">AI-Powered Viral Intelligence</span>
        </div>

        {/* Main headline */}
        <h1 id="hero-heading" className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <GradientText size="6xl" variant="viral" className="block mb-2">
            Turn Every Post Into
          </GradientText>
          <GradientText size="6xl" variant="neural" animate className="block">
            a Viral Moment
          </GradientText>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          The AI-powered platform that predicts viral performance before you publish.
          <span className="block mt-2 text-lg">Join 50,000+ creators who've cracked the algorithm.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <Link href="/onboard">
            <Button variant="viral" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
              Start Creating Viral Content
            </Button>
          </Link>
          <Button variant="viral-outline" size="lg">
            Watch Demo (2 min)
          </Button>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-viral-500" />
            <span>87% Viral Prediction Accuracy</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-500" />
            <span>Used by Fortune 500 Brands</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-gold-500" />
            <span>10M+ Viral Posts Analyzed</span>
          </div>
        </div>

        {/* Before/After preview */}
        <div className="mt-16 relative animate-scale-in" style={{ animationDelay: '0.5s' }} role="presentation" aria-label="Before and after content transformation comparison">
          <div className="relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Before card */}
              <div className="relative group" role="img" aria-label="Content performance before optimization: 2.3% engagement, 1.2K reach">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                <div className="relative bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500 mb-2">BEFORE</div>
                  <div className="space-y-3">
                    <div className="h-2 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded w-full" />
                    <div className="h-2 bg-gray-200 rounded w-2/3" />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Engagement</span>
                      <span className="text-sm font-semibold text-gray-600">2.3%</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">Reach</span>
                      <span className="text-sm font-semibold text-gray-600">1.2K</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex">
                <div className="bg-gradient-to-r from-primary-500 to-viral-500 text-white rounded-full p-3 shadow-lg animate-pulse">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>

              {/* After card */}
              <div className="relative group" role="img" aria-label="Content performance after AI optimization: 18.7% engagement, 245K reach, 713% improvement">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-viral-500 rounded-xl blur-xl opacity-30 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-white rounded-xl shadow-xl p-6 border-2 border-primary-200">
                  <div className="text-sm font-medium text-viral-600 mb-2">AFTER</div>
                  <div className="space-y-3">
                    <div className="h-2 bg-gradient-to-r from-primary-400 to-viral-400 rounded w-3/4" />
                    <div className="h-2 bg-gradient-to-r from-viral-400 to-gold-400 rounded w-full" />
                    <div className="h-2 bg-gradient-to-r from-gold-400 to-primary-400 rounded w-2/3" />
                  </div>
                  <div className="mt-4 pt-4 border-t border-primary-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Engagement</span>
                      <span className="text-sm font-semibold text-viral-600">18.7%</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">Reach</span>
                      <span className="text-sm font-semibold text-viral-600">245K</span>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-viral-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    +713%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}