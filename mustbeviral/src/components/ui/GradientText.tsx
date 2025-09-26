import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'viral' | 'gold' | 'neural';
  animate?: boolean;
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
}

const variantClasses = {
  primary: 'from-primary-500 to-primary-700',
  viral: 'from-primary-500 to-viral-500',
  gold: 'from-gold-500 to-gold-300',
  neural: 'from-primary-600 via-viral-500 to-gold-500',
};

const sizeClasses = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl',
};

export function GradientText({
  children,
  className,
  variant = 'viral',
  animate = false,
  size = '3xl',
}: GradientTextProps) {
  return (
    <span
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent font-heading font-bold',
        variantClasses[variant],
        sizeClasses[size],
        animate && 'animate-gradient bg-[length:200%_auto]',
        className
      )}
    >
      {children}
    </span>
  );
}