// Universe-Bending Input Component
import React, { _forwardRef, useState } from 'react';
import { _cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { _Eye, EyeOff } from 'lucide-react';

const inputVariants = cva(
  'flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-neutral-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 hover:border-neutral-400',
        destructive: 'border-error-300 focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-2',
        success: 'border-success-300 focus-visible:ring-2 focus-visible:ring-success-500 focus-visible:ring-offset-2',

        // Universe-bending variants
        cosmic: 'border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:glow-cosmic hover:border-purple-400',
        plasma: 'border-pink-300 bg-gradient-to-r from-pink-50 to-violet-50 focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:glow-plasma hover:border-pink-400',
        aurora: 'border-orange-300 bg-gradient-to-r from-orange-50 to-pink-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:glow-aurora hover:border-orange-400',
        quantum: 'border-cyan-300 bg-gradient-to-r from-cyan-50 to-blue-50 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:glow-quantum hover:border-cyan-400',
        energy: 'border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:glow-energy hover:border-indigo-400',
        glass: 'glass border-white/30 placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2',
        neuro: 'neuro-light dark:neuro-dark border-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3',
        lg: 'h-12 px-4 text-base',
        xl: 'h-14 px-6 text-lg',
      },
      animation: {
        none: '',
        shimmer: 'animate-shimmer',
        float: 'animate-float',
        pulse: 'animate-pulse-glow',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ _className,
    variant,
    size,
    animation,
    type,
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    showPasswordToggle = false,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = showPasswordToggle && type === 'password'
      ? (showPassword ? 'text' : 'password')
      : type;

    const hasError = !!error;
    const effectiveVariant = hasError ? 'destructive' : variant;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            type={inputType}
            className={cn(
              inputVariants({ variant: effectiveVariant, size, animation }),
              leftIcon && 'pl-10',
              (rightIcon || showPasswordToggle) && 'pr-10',
              isFocused && animation === 'shimmer' && 'animate-shimmer',
              className
            )}
            ref={ref}
            onFocus={(_e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(_e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* Right icon or password toggle */}
          {(rightIcon || showPasswordToggle) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {showPasswordToggle && type === 'password' ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none focus:text-neutral-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="text-neutral-400 pointer-events-none">
                  {rightIcon}
                </div>
              )}
            </div>
          )}

          {/* Shimmer effect overlay */}
          {animation === 'shimmer' && isFocused && (
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none rounded-lg" />
          )}
        </div>

        {/* Helper text or error */}
        {(helperText || error) && (
          <p className={cn(
            'mt-2 text-sm',
            hasError ? 'text-error-600' : 'text-neutral-500'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };