// Universe-Bending Card Component
import React, { forwardRef } from 'react';
import { _cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const cardVariants = cva(
  'rounded-lg border border-neutral-200 bg-white text-neutral-950 shadow-sm transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'border-neutral-200 bg-white shadow-sm',
        outline: 'border-2 border-neutral-300 bg-transparent',
        elevated: 'border-neutral-200 bg-white shadow-lg hover:shadow-xl',

        // Universe-bending variants
        cosmic: 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 backdrop-blur-sm glow-cosmic',
        plasma: 'bg-gradient-to-br from-pink-900/20 to-violet-900/20 border-pink-500/30 backdrop-blur-sm glow-plasma',
        aurora: 'bg-gradient-to-br from-orange-900/20 to-pink-900/20 border-orange-500/30 backdrop-blur-sm glow-aurora',
        quantum: 'bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30 backdrop-blur-sm glow-quantum',
        energy: 'bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/30 backdrop-blur-sm glow-energy',
        glass: 'glass border-white/20',
        neuro: 'neuro-light dark:neuro-dark border-none',
      },
      size: {
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      animation: {
        none: '',
        float: 'animate-float',
        pulse: 'animate-pulse-glow',
        lift: 'hover-lift',
        scale: 'hover-scale',
      },
      interactive: {
        none: '',
        hover: 'hover:shadow-md cursor-pointer',
        glow: 'hover-glow cursor-pointer',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
      interactive: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ _className, variant, size, animation, interactive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? 'div' : 'div';

    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ _variant, size, animation, interactive, className }))}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ _className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ _className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ _className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ _className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ _className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-6', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };