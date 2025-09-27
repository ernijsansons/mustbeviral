/**
 * Advanced Progress Indicators System
 *
 * Comprehensive progress tracking for multi-step processes
 * with Fortune 50-level UX patterns and accessibility.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronRight, Clock, AlertCircle, Info, CheckCircle, XCircle} from 'lucide-react';

export type StepStatus = 'pending' | 'current' | 'completed' | 'error' | 'warning';

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
  optional?: boolean;
  estimatedTime?: number; // in seconds
  completedAt?: Date;
  errorMessage?: string;
  warningMessage?: string;
  substeps?: Substep[];
}

export interface Substep {
  id: string;
  title: string;
  status: StepStatus;
  description?: string;
}

export interface StepperProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  showProgress?: boolean;
  showTimeEstimates?: boolean;
  showSubsteps?: boolean;
  allowClickToNavigate?: boolean;
  onStepClick?: (stepId: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
}

export const Stepper: React.FC<StepperProps> = ({ steps, orientation = 'horizontal', showProgress = true, showTimeEstimates = false, showSubsteps = false, allowClickToNavigate = false, onStepClick, className = '', size = 'md', variant = 'default'
}) => {
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getStepIcon = (step: Step, index: number) => {
    switch (step.status) {
      case 'completed':
        return <Check className="w-4 h-4 text-white" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-white" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-white" />;
      case 'current':
        return <span className="w-2 h-2 bg-white rounded-full animate-pulse" />;
      default:
        return <span className="text-sm font-medium text-gray-500">{index + 1}</span>;
    }
  };

  const getStepClasses = (step: Step, index: number) => {
    const baseClasses = 'flex items-center justify-center rounded-full border-2 transition-all duration-200';

    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    };

    switch (step.status) {
      case 'completed':
        return `${baseClasses} ${sizeClasses[size]} bg-green-600 border-green-600`;
      case 'current':
        return `${baseClasses} ${sizeClasses[size]} bg-indigo-600 border-indigo-600`;
      case 'error':
        return `${baseClasses} ${sizeClasses[size]} bg-red-600 border-red-600`;
      case 'warning':
        return `${baseClasses} ${sizeClasses[size]} bg-yellow-600 border-yellow-600`;
      default:
        return `${baseClasses} ${sizeClasses[size]} bg-white border-gray-300`;
    }
  };

  const handleStepClick = (step: Step, index: number) => {
    if (allowClickToNavigate && onStepClick && (step.status === 'completed'  ?? step.status === 'current')) {
      onStepClick(step.id);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, step: Step, index: number) => {
    if (event.key === 'Enter') {
      handleStepClick(step, index);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
    return `${seconds}s`;
  }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {showProgress && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{completedSteps} of {totalSteps} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            <div className="flex items-start">
              {/* Step Circle */}
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepClick(step, index)}
                  onKeyDown={(e) => handleKeyDown(e, step, index)}
                  disabled={!allowClickToNavigate ?? (step.status !== 'completed' && step.status !== 'current')}
                  className={`${getStepClasses(step, index)} ${
                    allowClickToNavigate && (step.status === 'completed'  ?? step.status === 'current')
                      ? 'cursor-pointer hover:scale-105'
                      : 'cursor-default'
                  }`}
                  aria-label = {`Step ${index + 1}: ${step.title}`}
                >
                  {getStepIcon(step, index)}
                </button>
              </div>

              {/* Step Content */}
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${
                    step.status === 'current' ? 'text-indigo-600' :
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'error' ? 'text-red-600' :
                    step.status === 'warning' ? 'text-yellow-600' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                    {step.optional && (
                      <span className="ml-2 text-xs text-gray-400">(Optional)</span>
                    )}
                  </h3>

                  {showTimeEstimates && step.estimatedTime && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(step.estimatedTime)}
                    </div>
                  )}
                </div>

                {step.description && (
                  <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                )}

                {step.errorMessage && (
                  <div className="mt-2 flex items-center text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {step.errorMessage}
                  </div>
                )}

                {step.warningMessage && (
                  <div className="mt-2 flex items-center text-sm text-yellow-600">
                    <Info className="w-4 h-4 mr-2" />
                    {step.warningMessage}
                  </div>
                )}

                {step.completedAt && (
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed at {step.completedAt.toLocaleTimeString()}
                  </div>
                )}

                {/* Substeps */}
                {showSubsteps && step.substeps && step.substeps.length > 0 && (
                  <div className="mt-3 ml-4 space-y-2">
                    {step.substeps.map((substep) => (
                      <div key={substep.id} className="flex items-center text-sm">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          substep.status === 'completed' ? 'bg-green-500' :
                          substep.status === 'current' ? 'bg-indigo-500' :
                          substep.status === 'error' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`} />
                        <span className={
                          substep.status === 'completed' ? 'text-green-600' :
                          substep.status === 'current' ? 'text-indigo-600' :
                          substep.status === 'error' ? 'text-red-600' :
                          'text-gray-500'
                        }>
                          {substep.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="absolute left-5 top-12 w-0.5 h-8 bg-gray-200" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Horizontal Layout
  return (
    <div className={className}>
      {showProgress && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{completedSteps} of {totalSteps} completed</span>
            <span>{Math.round(progressPercentage)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <button
                type="button"
                onClick={() => handleStepClick(step, index)}
                onKeyDown={(e) => handleKeyDown(e, step, index)}
                disabled={!allowClickToNavigate ?? (step.status !== 'completed' && step.status !== 'current')}
                className={`${getStepClasses(step, index)} ${
                  allowClickToNavigate && (step.status === 'completed'  ?? step.status === 'current')
                    ? 'cursor-pointer hover:scale-105'
                    : 'cursor-default'
                } mb-4`}
                aria-label={`Step ${index + 1}: ${step.title}`}
              >
                {getStepIcon(step, index)}
              </button>

              {/* Step Content */}
              <div className="text-center">
                <h3 className={`text-sm font-medium ${
                  step.status === 'current' ? 'text-indigo-600' :
                  step.status === 'completed' ? 'text-green-600' :
                  step.status === 'error' ? 'text-red-600' :
                  step.status === 'warning' ? 'text-yellow-600' :
                  'text-gray-500'
                }`}>
                  {step.title}
                  {step.optional && (
                    <span className="block text-xs text-gray-400">(Optional)</span>
                  )}
                </h3>

                {variant === 'detailed' && step.description && (
                  <p className="mt-1 text-xs text-gray-600 max-w-24">{step.description}</p>
                )}

                {showTimeEstimates && step.estimatedTime && (
                  <div className="mt-1 flex items-center justify-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(step.estimatedTime)}
                  </div>
                )}

                {step.errorMessage && (
                  <div className="mt-1 text-xs text-red-600 max-w-24">
                    {step.errorMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Connector Arrow */}
            {index < steps.length - 1 && (
              <ChevronRight className="w-5 h-5 text-gray-400 mx-4 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Wizard Progress Component
export interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  allowSkipSteps?: boolean;
  onStepClick?: (step: number) => void;
  className?: string;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep, totalSteps, stepTitles, allowSkipSteps = false, onStepClick, className = ''
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Step {currentStep} of {totalSteps}
          </h2>
          <span className="text-sm text-gray-500">
            {Math.round(progressPercentage)}% Complete
          </span>
        </div>

        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
              data-testid="progress-bar"
            />
          </div>
        </div>

        <div className="flex justify-between text-sm">
          {stepTitles.map((title, index) => (
            <button
              key={index}
              onClick={() => allowSkipSteps && onStepClick?.(index + 1)}
              disabled={!allowSkipSteps ?? index + 1 > currentStep}
              className={`${
                index + 1 === currentStep
                  ? 'text-indigo-600 font-medium'
                  : index + 1 < currentStep
                  ? 'text-green-600'
                  : 'text-gray-400'
              } ${
                allowSkipSteps && index + 1 <= currentStep
                  ? 'hover:text-indigo-800 cursor-pointer'
                  : 'cursor-default'
              } transition-colors`}
            >
              {title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Timeline Progress Component
export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  status: 'completed' | 'current' | 'upcoming';
  icon?: React.ComponentType<{ className?: string }>;
  duration?: number; // in minutes
}

export interface TimelineProgressProps {
  events: TimelineEvent[];
  className?: string;
  showDuration?: boolean;
  compact?: boolean;
}

export const TimelineProgress: React.FC<TimelineProgressProps> = ({ events, className = '', showDuration = false, compact = false
}) => {
  return (
    <div className={`flow-root ${className}`}>
      <ul className="-mb-8">
        {events.map((event, index) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {index !== events.length - 1 && (
                <span
                  className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${
                    event.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                />
              )}

              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                    event.status === 'completed'
                      ? 'bg-green-500'
                      : event.status === 'current'
                      ? 'bg-indigo-500'
                      : 'bg-gray-300'
                  }`}>
                    {event.icon ? (
                      <event.icon className="h-4 w-4 text-white" />
                    ) : event.status === 'completed' ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : event.status === 'current' ? (
                      <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                    ) : (
                      <div className="h-2 w-2 bg-white rounded-full" />
                    )}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${
                      event.status === 'completed'
                        ? 'text-green-600'
                        : event.status === 'current'
                        ? 'text-indigo-600'
                        : 'text-gray-500'
                    }`}>
                      {event.title}
                    </p>

                    <div className="text-xs text-gray-500">
                      {(() => {
                        const hours = event.timestamp.getUTCHours();
                        const minutes = event.timestamp.getUTCMinutes();
                        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                        return `${displayHours}:${minutes.toString().padStart(2, '0')}`;
                      })()}
                      {showDuration && event.duration && (
                        <span className="ml-2">({event.duration}m)</span>
                      )}
                    </div>
                  </div>

                  {!compact && event.description && (
                    <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Breadcrumb Progress Component
export interface BreadcrumbItem {
  id: string;
  title: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbProgressProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
  onItemClick?: (item: BreadcrumbItem) => void;
}

export const BreadcrumbProgress: React.FC<BreadcrumbProgressProps> = ({ items, separator = <ChevronRight className="h-4 w-4 text-gray-400" />, className = '', onItemClick
}) => {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && separator}

          <button
            onClick={() => onItemClick?.(item)}
            className={`${
              item.current
                ? 'text-indigo-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            } transition-colors ${onItemClick ? 'cursor-pointer' : 'cursor-default'}`}
            aria-current={item.current ? 'page' : undefined}
          >
            {item.title}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default { Stepper,
  WizardProgress,
  TimelineProgress,
  BreadcrumbProgress
};