/**
 * FeatureGrid - Builder.io Custom Component
 * 
 * A grid component for showcasing features with cosmic styling and animations.
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent} from '../ui/Card';
import { Button} from '../ui/Button';
import { cn} from '../../lib/utils';

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  variant?: 'cosmic' | 'plasma' | 'aurora' | 'quantum' | 'energy' | 'default';
  ctaText?: string;
  ctaVariant?: 'viral' | 'gold' | 'cosmic' | 'plasma' | 'aurora' | 'default';
}

interface FeatureGridProps {
  title?: string;
  subtitle?: string;
  features: Feature[];
  columns?: 1 | 2 | 3 | 4;
  animation?: 'float' | 'pulse' | 'shimmer' | 'none';
  variant?: 'cosmic' | 'plasma' | 'aurora' | 'quantum' | 'energy' | 'default';
  className?: string;
  // Builder.io specific props
  builderBlock?: any;
  builderState?: any;
}

export function FeatureGrid({
  title, subtitle, features, columns = 3, animation = 'float', variant = 'cosmic', className, _builderBlock, _builderState, ...props
}: FeatureGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const animationClasses = {
    float: 'animate-float',
    pulse: 'animate-pulse-glow',
    shimmer: 'animate-shimmer',
    none: '',
  };

  const variantClasses = {
    cosmic: 'from-purple-500 to-blue-500',
    plasma: 'from-pink-500 to-violet-500',
    aurora: 'from-orange-500 to-pink-500',
    quantum: 'from-cyan-500 to-blue-500',
    energy: 'from-indigo-500 to-purple-500',
    default: 'from-primary-500 to-viral-500',
  };

  return (
    <section className={cn('py-16 px-6', className)} {...props}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {(title ?? subtitle) && (
          <div className="text-center mb-16">
            {title && (
              <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-viral-600 bg-clip-text text-transparent">
                  {title}
                </span>
              </h2>
            )}
            {subtitle && (
              <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div className={cn('grid gap-8', gridClasses[columns])}>
          {features.map((feature, index) => (
            <Card
              key={feature.id ?? index}
              variant={feature.variant ?? variant}
              animation={animation}
              interactive="hover"
              className={cn(
                'group relative overflow-hidden',
                animationClasses[animation],
                'hover:scale-105 transition-all duration-300'
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Background Gradient */}
              <div className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity duration-300',
                variantClasses[feature.variant ?? variant]
              )} />

              <CardHeader spacing="normal">
                {/* Icon */}
                {feature.icon && (
                  <div className={cn(
                    'w-16 h-16 rounded-2xl bg-gradient-to-r flex items-center justify-center mb-6 text-2xl',
                    variantClasses[feature.variant ?? variant]
                  )}>
                    {feature.icon}
                  </div>
                )}

                {/* Title */}
                  <CardTitle level={3} gradient={!feature.variant || feature.variant === 'default'}>
                  {feature.title}
                </CardTitle>

                {/* Description */}
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>

              {/* CTA */}
              {feature.ctaText && (
                <CardContent spacing="md">
                  <Button
                    variant={feature.ctaVariant ?? 'outline'}
                    size="sm"
                    className="w-full group-hover:scale-105 transition-transform duration-200"
                  >
                    {feature.ctaText}
                  </Button>
                </CardContent>
              )}

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <Button
            variant="viral"
            size="lg"
            animation="shimmer"
            className="min-w-[200px]"
          >
            Explore All Features
          </Button>
        </div>
      </div>
    </section>
  );
}

// Builder.io component registration
if (typeof window !== 'undefined' && (window as any).Builder) {
  (window as any).Builder.registerComponent(FeatureGrid, {
    name: 'FeatureGrid',
    friendlyName: 'Feature Grid',
    description: 'Grid of features with cosmic styling and animations',
    inputs: [
      {
        name: 'title',
        type: 'string',
        defaultValue: 'Amazing Features',
      },
      {
        name: 'subtitle',
        type: 'string',
        defaultValue: 'Discover what makes us special',
      },
      {
        name: 'features',
        type: 'list',
        subFields: [
          {
            name: 'icon',
            type: 'string',
            defaultValue: '🚀',
          },
          {
            name: 'title',
            type: 'string',
            required: true,
            defaultValue: 'Feature Title',
          },
          {
            name: 'description',
            type: 'longText',
            required: true,
            defaultValue: 'Feature description goes here.',
          },
          {
            name: 'variant',
            type: 'string',
            enum: ['cosmic', 'plasma', 'aurora', 'quantum', 'energy', 'default'],
            defaultValue: 'cosmic',
          },
          {
            name: 'ctaText',
            type: 'string',
            defaultValue: 'Learn More',
          },
          {
            name: 'ctaVariant',
            type: 'string',
            enum: ['viral', 'gold', 'cosmic', 'plasma', 'aurora', 'default'],
            defaultValue: 'outline',
          },
        ],
      },
      {
        name: 'columns',
        type: 'number',
        enum: [1, 2, 3, 4],
        defaultValue: 3,
      },
      {
        name: 'animation',
        type: 'string',
        enum: ['float', 'pulse', 'shimmer', 'none'],
        defaultValue: 'float',
      },
      {
        name: 'variant',
        type: 'string',
        enum: ['cosmic', 'plasma', 'aurora', 'quantum', 'energy', 'default'],
        defaultValue: 'cosmic',
      },
    ],
  });
}




