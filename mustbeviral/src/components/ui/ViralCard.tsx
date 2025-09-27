import { ReactNode} from 'react';
import { cn} from '../../lib/utils';

interface ViralCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  variant?: 'default' | 'gradient' | 'glass' | 'bordered';
  hover?: boolean;
  onClick?: () => void;
}

const variantClasses = {
  default: 'bg-white border border-gray-200 shadow-lg',
  gradient: 'bg-gradient-to-br from-primary-50 to-viral-50 border border-primary-200',
  glass: 'backdrop-blur-lg bg-white/80 border border-white/20 shadow-xl',
  bordered: 'bg-white border-2 gradient-border',
};

export function ViralCard({
  children, className, title, subtitle, icon, variant = 'default', hover = true, onClick }: ViralCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl p-6 transition-all duration-300',
        variantClasses[variant],
        hover && 'hover:shadow-viral hover:-translate-y-1 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Gradient overlay for hover effect */}
      {hover && variant === 'gradient' && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/10 to-viral-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}

      {/* Icon */}
      {icon && (
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-viral-500 text-white">
          {icon}
        </div>
      )}

      {/* Title and Subtitle */}
      {(title ?? subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-xl font-heading font-semibold text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Decorative corner accent */}
      {variant === 'gradient' && (
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-viral-400/20 to-transparent rounded-bl-full" />
      )}
    </div>
  );
}