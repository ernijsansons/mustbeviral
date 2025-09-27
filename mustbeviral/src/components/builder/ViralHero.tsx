/**
 * ViralHero - Builder.io Custom Component
 * 
 * A hero section component designed for viral content with cosmic styling,
 * animations, and Builder.io integration.
 */

import React from 'react';
import { Button} from '../ui/Button';
import { Card} from '../ui/Card';
import { GradientText} from '../ui/GradientText';
import { cn} from '../../lib/utils';

interface ViralHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaVariant?: 'viral' | 'gold' | 'cosmic' | 'plasma' | 'aurora' | 'default';
  backgroundVariant?: 'cosmic' | 'plasma' | 'aurora' | 'quantum' | 'energy';
  animation?: 'float' | 'pulse' | 'shimmer' | 'none';
  className?: string;
  // Builder.io specific props
  builderBlock?: any;
  builderState?: any;
}

export function ViralHero({
  title, subtitle, description, ctaText = "Start Creating", ctaVariant = "viral", backgroundVariant = "cosmic", animation = "float", className, _builderBlock, _builderState, ...props
}: ViralHeroProps) {
  const backgroundClasses = {
    cosmic: 'bg-gradient-to-br from-purple-900/20 to-blue-900/20',
    plasma: 'bg-gradient-to-br from-pink-900/20 to-violet-900/20',
    aurora: 'bg-gradient-to-br from-orange-900/20 to-pink-900/20',
    quantum: 'bg-gradient-to-br from-cyan-900/20 to-blue-900/20',
    energy: 'bg-gradient-to-br from-indigo-900/20 to-purple-900/20',
  };

  const animationClasses = {
    float: 'animate-float',
    pulse: 'animate-pulse-glow',
    shimmer: 'animate-shimmer',
    none: '',
  };

  return (
    <section
      className={cn(
        'relative min-h-screen flex items-center justify-center overflow-hidden',
        backgroundClasses[backgroundVariant],
        className
      )}
      {...props}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-viral-500/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipseatcenter,var(--tw-gradient-stops))] from-primary-500/20 via-transparent to-transparent" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary-500/20 rounded-full blur-xl animate-float" />
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-viral-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-3/4 w-16 h-16 bg-gold-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <Card
          variant={backgroundVariant}
          size="xl"
          animation={animation}
          className="backdrop-blur-sm border-white/20"
        >
          <CardHeader centered spacing="loose">
            {/* Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-heading mb-6">
              <GradientText className="text-6xl md:text-7xl lg:text-8xl">
                {title}
              </GradientText>
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <h2 className="text-2xl md:text-3xl font-semibold text-white/90 mb-4">
                {subtitle}
              </h2>
            )}

            {/* Description */}
            {description && (
              <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
                {description}
              </p>
            )}
          </CardHeader>

          {/* CTA Section */}
          {ctaText && (
            <CardContent spacing="lg">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  variant={ctaVariant}
                  size="xl"
                  animation="shimmer"
                  rippleEffect
                  hapticFeedback
                  className="min-w-[200px]"
                >
                  {ctaText}
                </Button>
                
                {/* Secondary CTA */}
                <Button
                  variant="outline"
                  size="xl"
                  className="min-w-[200px] border-white/30 text-white hover:bg-white/10"
                >
                  Learn More
                </Button>
              </div>
            </CardContent>
          )}

          {/* Viral Stats */}
          <CardFooter justify="center" spacing="lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-viral-400">2.5M+</div>
                <div className="text-white/70">Viral Posts Created</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gold-400">87%</div>
                <div className="text-white/70">Accuracy Rate</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary-400">50K+</div>
                <div className="text-white/70">Happy Creators</div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
}

// Builder.io component registration
if (typeof window !== 'undefined' && (window as any).Builder) {
  (window as any).Builder.registerComponent(ViralHero, {
    name: 'ViralHero',
    friendlyName: 'Viral Hero Section',
    description: 'Hero section with viral styling and cosmic animations',
    inputs: [
      {
        name: 'title',
        type: 'string',
        required: true,
        defaultValue: 'Go Viral with AI',
      },
      {
        name: 'subtitle',
        type: 'string',
        defaultValue: 'Create content that spreads like wildfire',
      },
      {
        name: 'description',
        type: 'longText',
        defaultValue: 'Join thousands of creators making viral content with our AI-powered platform.',
      },
      {
        name: 'ctaText',
        type: 'string',
        defaultValue: 'Start Creating',
      },
      {
        name: 'ctaVariant',
        type: 'string',
        enum: ['viral', 'gold', 'cosmic', 'plasma', 'aurora', 'default'],
        defaultValue: 'viral',
      },
      {
        name: 'backgroundVariant',
        type: 'string',
        enum: ['cosmic', 'plasma', 'aurora', 'quantum', 'energy'],
        defaultValue: 'cosmic',
      },
      {
        name: 'animation',
        type: 'string',
        enum: ['float', 'pulse', 'shimmer', 'none'],
        defaultValue: 'float',
      },
    ],
  });
}




