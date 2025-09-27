// Enhanced Universe-Bending Button Component with Micro-interactions
import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { cva, type VariantProps} from 'class-variance-authority';
import { cn} from '../../lib/utils';

const buttonVariants = cva(
  // Enhanced base styles with micro-interactions
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden transform-gpu active:scale-[0.98] hover:scale-[1.02] focus:scale-[1.02] motion-reduce:transform-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
  {
    variants: {
      variant: {
        // Enhanced standard variants with micro-interactions
        default: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 hover:shadow-lg hover:shadow-primary-500/25 active:shadow-md transition-shadow',
        destructive: 'bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-500 hover:shadow-lg hover:shadow-error-500/25 active:shadow-md transition-shadow',
        outline: 'border border-neutral-300 bg-transparent hover:bg-neutral-50 hover:border-neutral-400 focus-visible:ring-primary-500 hover:shadow-md active:shadow-sm transition-shadow',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-500 hover:shadow-md active:shadow-sm transition-shadow',
        ghost: 'hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-500 hover:shadow-sm transition-shadow',
        link: 'text-primary-600 underline-offset-4 hover:underline focus-visible:ring-primary-500 hover:text-primary-700 transition-colors',

        // Universe-bending variants
        cosmic: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 glow-cosmic hover:glow-plasma focus-visible:ring-purple-500',
        plasma: 'bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600 glow-plasma hover:glow-aurora focus-visible:ring-pink-500',
        aurora: 'bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:from-orange-500 hover:to-pink-600 glow-aurora hover:glow-cosmic focus-visible:ring-orange-500',
        quantum: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-600 glow-quantum hover:glow-energy focus-visible:ring-cyan-500',
        energy: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 glow-energy hover:glow-cosmic focus-visible:ring-indigo-500',

        // Enhanced viral brand variants with delightful interactions
        viral: 'bg-gradient-to-r from-primary-500 to-viral-500 text-white hover:from-primary-600 hover:to-viral-600 shadow-viral hover:shadow-glow-viral focus-visible:ring-primary-500 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300',
        'viral-outline': 'border-2 gradient-border bg-white text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-500 hover:shadow-viral hover:shadow-lg hover:shadow-primary-500/20 transition-all duration-300',
        gold: 'bg-gradient-to-r from-gold-500 to-gold-400 text-white hover:from-gold-600 hover:to-gold-500 shadow-gold hover:shadow-glow-gold focus-visible:ring-gold-500 hover:shadow-xl hover:shadow-gold-500/30 transition-all duration-300',
        glass: 'glass text-neutral-900 dark:text-white hover:bg-white/20 dark:hover:bg-black/20 border border-white/20 focus-visible:ring-white/50 backdrop-blur-md hover:backdrop-blur-lg transition-all',
        neuro: 'neuro-light dark:neuro-dark text-neutral-900 dark:text-white hover:scale-105 focus-visible:ring-neutral-500 transition-transform duration-200 ease-out',
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
        shimmer: 'animate-shimmer before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-1000',
        scale: 'hover-scale',
        lift: 'hover-lift',
        bounce: 'hover:animate-bounce-subtle',
        wiggle: 'hover:animate-wiggle',
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
  hapticFeedback?: boolean;
  rippleEffect?: boolean;
  loadingText?: string;
  successState?: boolean;
  errorState?: boolean;
  tooltip?: string;
  badge?: string | number;
}

  const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, animation, asChild = false, loading = false, leftIcon, rightIcon, children, disabled, hapticFeedback = false, rippleEffect = false, loadingText, successState = false, errorState = false, tooltip, badge, onClick, onMouseDown, onKeyDown, ...props
    }, ref) => {
    const [isPressed, setIsPressed] = useState(false);
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const rippleId = useRef(0);

    // Haptic feedback simulation
    const simulateHapticFeedback = useCallback_(() => {
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(10); // 10ms vibration
      }
    }, [hapticFeedback]);

    // Ripple effect handler
    const handleRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        if (!rippleEffect || disabled || loading) {return;}

      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newRipple = { id: rippleId.current++, x, y };
      setRipples(prev => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }, [rippleEffect, disabled, loading]);

    // Enhanced click handler
    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled ?? loading) {return;}

      simulateHapticFeedback();
      handleRipple(event);
      
      // Show success state briefly if enabled
      if (successState && !showSuccess) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }

      onClick?.(event);
    }, [disabled, loading, simulateHapticFeedback, handleRipple, successState, showSuccess, onClick]);

    // Enhanced mouse down handler
    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(true);
      onMouseDown?.(event);
    }, [onMouseDown]);

    // Enhanced key down handler for accessibility
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === ' ' || event.key === 'Enter') {
        setIsPressed(true);
        simulateHapticFeedback();
      }
      onKeyDown?.(event);
    }, [simulateHapticFeedback, onKeyDown]);

    // Reset pressed state
    useEffect(() => {
      const handleMouseUp = () => setIsPressed(false);
      const handleKeyUp = () => setIsPressed(false);
      
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keyup', handleKeyUp);
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }, []);

    const Comp = asChild ? 'span' : 'button';
    const isInteractive = !disabled && !loading;
    const showLoadingText = loading && loadingText;
    const effectiveVariant = errorState ? 'destructive' : variant;

    return (
      <div className="relative inline-flex group">
        <Comp
          className={cn(
            buttonVariants({ variant: effectiveVariant, size, animation }),
            isPressed && isInteractive && 'scale-95 transition-transform duration-75',
            className
          )}
          ref={ref ?? buttonRef}
          disabled={disabled ?? loading}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          aria-label={tooltip}
          aria-describedby={tooltip ? 'button-tooltip' : undefined}
          aria-pressed={isPressed}
          role="button"
          tabIndex={disabled ? -1 : 0}
          {...props}
        >
          {/* Ripple effects */}
          {rippleEffect && ripples.map(ripple => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/30 pointer-events-none animate-ping"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
              }}
            />
          ))}

          {/* Loading spinner with enhanced animation */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Success checkmark */}
          {showSuccess && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg">
              <svg className="w-4 h-4 text-current animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Content wrapper with enhanced states */}
          <div className={cn(
            'flex items-center gap-2 transition-opacity duration-200',
            (loading ?? showSuccess) && 'opacity-0'
          )}>
            {leftIcon && (
              <span className={cn(
                'flex-shrink-0 transition-transform duration-200',
                isPressed && isInteractive && 'scale-90'
              )}>
                {leftIcon}
              </span>
            )}
            <span className="transition-transform duration-200">
              {showLoadingText ? loadingText : children}
            </span>
            {rightIcon && (
              <span className={cn(
                'flex-shrink-0 transition-transform duration-200',
                isPressed && isInteractive && 'scale-90'
              )}>
                {rightIcon}
              </span>
            )}
          </div>

          {/* Enhanced shimmer effect */}
          {animation === 'shimmer' && (
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          )}
        </Comp>

        {/* Badge */}
        {badge && (
          <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse">
            {badge}
          </span>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            id="button-tooltip"
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
            role="tooltip"
          >
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };