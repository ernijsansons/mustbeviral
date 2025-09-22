// Universe-Bending Button Component
import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
  {
    variants: {
      variant: {
        // Standard variants
        default: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
        destructive: 'bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-500',
        outline: 'border border-neutral-300 bg-transparent hover:bg-neutral-50 hover:border-neutral-400 focus-visible:ring-primary-500',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-500',
        ghost: 'hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-500',
        link: 'text-primary-600 underline-offset-4 hover:underline focus-visible:ring-primary-500',

        // Universe-bending variants
        cosmic: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 glow-cosmic hover:glow-plasma focus-visible:ring-purple-500',
        plasma: 'bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600 glow-plasma hover:glow-aurora focus-visible:ring-pink-500',
        aurora: 'bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:from-orange-500 hover:to-pink-600 glow-aurora hover:glow-cosmic focus-visible:ring-orange-500',
        quantum: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-600 glow-quantum hover:glow-energy focus-visible:ring-cyan-500',
        energy: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 glow-energy hover:glow-cosmic focus-visible:ring-indigo-500',

        // Viral brand variants
        viral: 'bg-gradient-to-r from-primary-500 to-viral-500 text-white hover:from-primary-600 hover:to-viral-600 shadow-viral hover:shadow-glow-viral focus-visible:ring-primary-500 hover:-translate-y-0.5 transition-all',
        'viral-outline': 'border-2 gradient-border bg-white text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-500 hover:shadow-viral transition-all',
        gold: 'bg-gradient-to-r from-gold-500 to-gold-400 text-white hover:from-gold-600 hover:to-gold-500 shadow-gold hover:shadow-glow-gold focus-visible:ring-gold-500 hover:-translate-y-0.5 transition-all',
        glass: 'glass text-neutral-900 dark:text-white hover:bg-white/20 dark:hover:bg-black/20 border border-white/20 focus-visible:ring-white/50',
        neuro: 'neuro-light dark:neuro-dark text-neutral-900 dark:text-white hover:scale-105 focus-visible:ring-neutral-500',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-8 text-base',
        xl: 'h-14 px-10 text-lg',
        icon: 'h-10 w-10',
      },
      animation: {
        none: '',
        float: 'animate-float',
        pulse: 'animate-pulse-glow',
        shimmer: 'animate-shimmer',
        scale: 'hover-scale',
        lift: 'hover-lift',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className,
    variant,
    size,
    animation,
    asChild = false,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? 'span' : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, animation, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Content wrapper */}
        <div className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </div>

        {/* Shimmer effect overlay */}
        {animation === 'shimmer' && (
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };