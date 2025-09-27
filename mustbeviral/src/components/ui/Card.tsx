// Enhanced Universe-Bending Card Component with Smooth Interactions
import React, { forwardRef, useState, useRef, useCallback } from 'react';
import { cva, type VariantProps} from 'class-variance-authority';
import { cn} from '../../lib/utils';

const cardVariants = cva(
  'rounded-lg border bg-white text-neutral-950 transition-all duration-300 overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-neutral-200 bg-white shadow-sm hover:shadow-md',
        outline: 'border-2 border-neutral-300 bg-transparent hover:border-neutral-400 hover:shadow-sm',
        elevated: 'border-neutral-200 bg-white shadow-lg hover:shadow-xl transform hover:-translate-y-1',

        // Universe-bending variants with enhanced interactions
        cosmic: 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 backdrop-blur-sm glow-cosmic hover:glow-plasma hover:shadow-2xl hover:shadow-purple-500/25 transform hover:-translate-y-2 hover:scale-[1.02]',
        plasma: 'bg-gradient-to-br from-pink-900/20 to-violet-900/20 border-pink-500/30 backdrop-blur-sm glow-plasma hover:glow-aurora hover:shadow-2xl hover:shadow-pink-500/25 transform hover:-translate-y-2 hover:scale-[1.02]',
        aurora: 'bg-gradient-to-br from-orange-900/20 to-pink-900/20 border-orange-500/30 backdrop-blur-sm glow-aurora hover:glow-cosmic hover:shadow-2xl hover:shadow-orange-500/25 transform hover:-translate-y-2 hover:scale-[1.02]',
        quantum: 'bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30 backdrop-blur-sm glow-quantum hover:glow-energy hover:shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-2 hover:scale-[1.02]',
        energy: 'bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/30 backdrop-blur-sm glow-energy hover:glow-cosmic hover:shadow-2xl hover:shadow-indigo-500/25 transform hover:-translate-y-2 hover:scale-[1.02]',
        glass: 'glass border-white/20 backdrop-blur-md hover:backdrop-blur-lg hover:shadow-xl hover:shadow-white/10 hover:border-white/30',
        neuro: 'neuro-light dark:neuro-dark border-none shadow-inner hover:shadow-lg transform hover:scale-[1.01]',
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
        tilt: 'hover:rotate-1 transform-gpu',
        shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-1000',
      },
      interactive: {
        none: '',
        hover: 'hover:shadow-md cursor-pointer group',
        glow: 'hover-glow cursor-pointer group',
        clickable: 'cursor-pointer group active:scale-[0.98] active:shadow-sm transition-transform duration-75',
      },
      loading: {
        none: '',
        skeleton: 'animate-pulse bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]',
        shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
      interactive: 'none',
      loading: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
  loading?: boolean;
  skeletonLines?: number;
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'tilt' | 'none';
  clickable?: boolean;
  badge?: string | number;
  overflow?: 'hidden' | 'visible';
  onHover?: (isHovered: boolean) => void;
}

  const Card = forwardRef<HTMLDivElement, CardProps>(({ 
      className, variant, size, animation, interactive, loading: loadingVariant, asChild = false, loading = false, skeletonLines = 3, hoverEffect = 'none', clickable = false, badge, overflow = 'hidden', onHover, children, onMouseEnter, onMouseLeave, onClick, ...props 
    }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
    const cardRef = useRef<HTMLDivElement>(null);
    const rippleId = useRef(0);

    // Handle hover events
    const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(true);
      onHover?.(true);
      onMouseEnter?.(event);
    }, [onHover, onMouseEnter]);

    const handleMouseLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(false);
      onHover?.(false);
      onMouseLeave?.(event);
    }, [onHover, onMouseLeave]);

    // Handle click with ripple effect
    const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
      if (clickable ?? interactive === 'clickable') {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const newRipple = { id: rippleId.current++, x, y };
        setRipples(prev => [...prev, newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
        }, 600);
      }

      onClick?.(event);
    }, [clickable, interactive, onClick]);

    const Comp = asChild ? 'div' : 'div';
    const effectiveInteractive = clickable ? 'clickable' : interactive;
    const effectiveLoading = loading ? 'skeleton' : loadingVariant;

    // Apply hover effect to animation
    const effectiveAnimation = hoverEffect !== 'none' ? hoverEffect : animation;

    return (
      <div className="relative inline-flex group">
        <Comp
          ref={ref ?? cardRef}
          className={cn(
            cardVariants({ 
              variant, 
              size, 
              animation: effectiveAnimation, 
              interactive: effectiveInteractive,
              loading: effectiveLoading
            }),
            overflow === 'hidden' && 'overflow-hidden',
            'motion-reduce:transform-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0',
            className
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          role={clickable ?? interactive === 'clickable' ? 'button' : undefined}
          tabIndex={clickable ?? interactive === 'clickable' ? 0 : undefined}
          aria-pressed={clickable && isHovered ? true : undefined}
          {...props}
        >
          {/* Ripple effects for clickable cards */}
          {(clickable ?? interactive === 'clickable') && ripples.map(ripple => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-primary-500/20 pointer-events-none animate-ping"
              style={{
                left: ripple.x - 20,
                top: ripple.y - 20,
                width: 40,
                height: 40,
              }}
            />
          ))}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-neutral-300 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-300 rounded animate-pulse" />
                  <div className="h-3 bg-neutral-300 rounded w-3/4 animate-pulse" />
                </div>
              </div>
              {Array.from({ length: skeletonLines }).map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    'h-3 bg-neutral-300 rounded animate-pulse',
                    i === skeletonLines - 1 && 'w-2/3'
                  )}
                />
              ))}
            </div>
          )}

          {/* Card content */}
          {!loading && (
            <div className={cn(
              'transition-all duration-200',
              isHovered && hoverEffect === 'scale' && 'scale-105',
              isHovered && hoverEffect === 'lift' && 'transform -translate-y-1'
            )}>
              {children}
            </div>
          )}

          {/* Shimmer effect overlay */}
          {animation === 'shimmer' && (
            <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
              <div className={cn(
                'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000',
                isHovered ? 'translate-x-full' : '-translate-x-full'
              )} />
            </div>
          )}
        </Comp>

        {/* Badge */}
        {badge && (
          <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse z-10">
            {badge}
          </span>
        )}

        {/* Glow effect for cosmic variants */}
        {(variant === 'cosmic' || variant === 'plasma' || variant === 'aurora' || variant === 'quantum' || variant === 'energy') && isHovered && (
          <div className="absolute inset-0 rounded-lg opacity-75 blur-xl -z-10 transition-opacity duration-300" 
               style={{
                 background: variant === 'cosmic' ? 'linear-gradient(45deg, #8b5cf6, #3b82f6)' :
                           variant === 'plasma' ? 'linear-gradient(45deg, #ec4899, #8b5cf6)' :
                           variant === 'aurora' ? 'linear-gradient(45deg, #fb923c, #ec4899)' :
                           variant === 'quantum' ? 'linear-gradient(45deg, #06b6d4, #3b82f6)' :
                           'linear-gradient(45deg, #6366f1, #8b5cf6)'
               }} />
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    centered?: boolean;
    spacing?: 'tight' | 'normal' | 'loose';
  }
  >(({ className, centered = false, spacing = 'normal', ...props }, ref) => {
  const spacingClasses = {
    tight: 'space-y-1 pb-4',
    normal: 'space-y-1.5 pb-6',
    loose: 'space-y-2 pb-8'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col',
        spacingClasses[spacing],
        centered && 'text-center items-center',
        className
      )}
      {...props}
    />
  );
});
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    gradient?: boolean;
  }
  >(({ className, children, level = 3, gradient = false, ...props }, ref) => {
  const Comp = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Comp
      ref={ref}
      className={cn(
        'font-semibold leading-none tracking-tight',
        level === 1 && 'text-4xl',
        level === 2 && 'text-3xl',
        level === 3 && 'text-2xl',
        level === 4 && 'text-xl',
        level === 5 && 'text-lg',
        level === 6 && 'text-base',
        gradient && 'bg-gradient-to-r from-primary-600 to-viral-600 bg-clip-text text-transparent',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    muted?: boolean;
  }
>(({ className, muted = true, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-sm',
      muted ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-300',
      className
    )}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    spacing?: 'none' | 'sm' | 'md' | 'lg';
  }
  >(({ className, spacing = 'none', ...props }, ref) => {
  const spacingClasses = {
    none: 'pt-0',
    sm: 'pt-2',
    md: 'pt-4',
    lg: 'pt-6'
  };

  return (
    <div 
      ref={ref} 
      className={cn(spacingClasses[spacing], className)} 
      {...props} 
    />
  );
});
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
    spacing?: 'sm' | 'md' | 'lg';
  }
  >(({ className, justify = 'start', spacing = 'lg', ...props }, ref) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  };

  const spacingClasses = {
    sm: 'pt-4',
    md: 'pt-6',
    lg: 'pt-8'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center',
        justifyClasses[justify],
        spacingClasses[spacing],
        className
      )}
      {...props}
    />
  );
});
CardFooter.displayName = 'CardFooter';

// Higher-order component for enhanced Card with performance optimizations
const EnhancedCard = React.memo(forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <Card ref={ref} {...props} />
)));
EnhancedCard.displayName = 'EnhancedCard';

export { 
  Card, 
  EnhancedCard,
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
};