/**
 * Comprehensive Loading States System
 *
 * Provides consistent loading indicators, skeletons, and progress indicators
 * for a Fortune 50-level user experience.
 */

import React from 'react';
import { Loader2, Sparkles, Zap, TrendingUp, FileText, User} from 'lucide-react';

// Basic Loading Spinner
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
  'data-testid'?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md', color = 'primary', className = '', 'data-testid': testId = 'loading-spinner'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-indigo-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    gray: 'text-gray-400'
  };

  return (
    <Loader2
      data-testid={testId}
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      aria-label="Loading"
    />
  );
};

// Full Page Loading
export interface PageLoadingProps {
  message?: string;
  description?: string;
  animated?: boolean;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Loading...', description, animated = true, className = ''
}) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${className}`}>
      <div className="text-center">
        {animated ? (
          <div className="relative mb-8">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-pulse" />
              <div className="absolute inset-2 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent" />
              <div className="absolute inset-4 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <LoadingSpinner size="xl" className="mb-8" />
        )}

        <h2 className="text-xl font-semibold text-gray-900 mb-2">{message}</h2>
        {description && (
          <p className="text-gray-600 max-w-md mx-auto">{description}</p>
        )}
      </div>
    </div>
  );
};

// Button Loading State
export interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  'data-testid'?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false, children, disabled = false, variant = 'primary', size = 'md', className = '', onClick, type = 'button', 'data-testid': testId = 'loading-button'
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
    ghost: 'text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled ?? loading}
      data-testid={testId}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && (
        <LoadingSpinner
          size="sm"
          color={variant === 'outline'  ?? variant === 'ghost' ? 'primary' : 'white'}
          className="mr-2"
        />
      )}
      {children}
    </button>
  );
};

// Skeleton Loaders
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%', height = '1rem', className = '', rounded = false, animated = true
}) => {
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-gray-200 ${rounded ? 'rounded-full' : 'rounded'} ${
        animated ? 'animate-pulse' : ''
      } ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-label="Loading content"
    />
  );
};

// Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="flex items-center mb-4">
      <Skeleton width={40} height={40} rounded className="mr-3" />
      <div className="flex-1">
        <Skeleton width="60%" height="1.25rem" className="mb-2" />
        <Skeleton width="40%" height="1rem" />
      </div>
    </div>
    <Skeleton width="100%" height="1rem" className="mb-2" />
    <Skeleton width="80%" height="1rem" className="mb-4" />
    <div className="flex space-x-2">
      <Skeleton width={80} height={32} rounded />
      <Skeleton width={80} height={32} rounded />
    </div>
  </div>
);

// Table Skeleton
export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
    {/* Header */}
    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="120px" height="1rem" />
        ))}
      </div>
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={colIndex === 0 ? '150px' : '100px'}
              height="1rem"
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Progress Bar
export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showValue?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, className = '', color = 'primary', size = 'md', animated = true, showValue = false, label
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    primary: 'bg-indigo-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  };

  return (
    <div className={className}>
      {(label ?? showValue) && (
        <div className="flex justify-between text-sm text-gray-700 mb-1">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label ?? `Progress: ${Math.round(percentage)}%`}
        />
      </div>
    </div>
  );
};

// Circular Progress
export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  label?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ value, max = 100, size = 120, strokeWidth = 8, className = '', color = 'primary', showValue = true, label
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: 'stroke-indigo-600',
    success: 'stroke-green-600',
    warning: 'stroke-yellow-600',
    danger: 'stroke-red-600'
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-300 ${colorClasses[color]}`}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {showValue && (
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(percentage)}%
            </div>
            {label && (
              <div className="text-sm text-gray-600">{label}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Loading States for Specific Contexts
export const DashboardLoading: React.FC = () => (
  <div className="space-y-6 p-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div>
        <Skeleton width="200px" height="2rem" className="mb-2" />
        <Skeleton width="300px" height="1rem" />
      </div>
      <Skeleton width="120px" height="2.5rem" rounded />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton width="80px" height="1rem" className="mb-2" />
              <Skeleton width="60px" height="1.5rem" />
            </div>
            <Skeleton width={40} height={40} rounded />
          </div>
        </div>
      ))}
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CardSkeleton />
      <TableSkeleton rows={3} columns={3} />
    </div>
  </div>
);

export const ContentLoading: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="flex justify-between items-center">
      <Skeleton width="150px" height="2rem" />
      <Skeleton width="100px" height="2.5rem" rounded />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Loading with Context Messages
export interface ContextualLoadingProps {
  context: 'dashboard' | 'content' | 'profile' | 'analytics' | 'upload' | 'processing';
  progress?: number;
  className?: string;
}

export const ContextualLoading: React.FC<ContextualLoadingProps> = ({ context, progress, className = ''
}) => {
  const contextConfig = {
    dashboard: {
      icon: TrendingUp,
      message: 'Loading your dashboard',
      description: 'Gathering your latest analytics and content performance'
    },
    content: {
      icon: FileText,
      message: 'Loading content',
      description: 'Fetching your viral content and trend insights'
    },
    profile: {
      icon: User,
      message: 'Loading profile',
      description: 'Retrieving your account information and preferences'
    },
    analytics: {
      icon: TrendingUp,
      message: 'Analyzing performance',
      description: 'Processing your engagement metrics and growth data'
    },
    upload: {
      icon: Zap,
      message: 'Uploading content',
      description: 'Securely transferring your files to our servers'
    },
    processing: {
      icon: Sparkles,
      message: 'Processing content',
      description: 'Analyzing virality potential and optimizing for engagement'
    }
  };

  const config = contextConfig[context];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
          <Icon className="w-8 h-8 text-indigo-600" />
        </div>
        <div className="absolute -top-1 -right-1">
          <LoadingSpinner size="md" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{config.message}</h3>
      <p className="text-gray-600 text-center max-w-sm mb-6">{config.description}</p>

      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <ProgressBar
            value={progress}
            showValue
            animated
            className="mb-2"
          />
        </div>
      )}
    </div>
  );
};

export default { LoadingSpinner,
  PageLoading,
  LoadingButton,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  ProgressBar,
  CircularProgress,
  DashboardLoading,
  ContentLoading,
  ContextualLoading
};