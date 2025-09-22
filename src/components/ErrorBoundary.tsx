/**
 * Error Boundary Components
 * Provides graceful error handling and recovery for React components
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { logger } from '../lib/logging/productionLogger';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'component' | 'critical';
  context?: string;
  enableRetry?: boolean;
  maxRetries?: number;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  retry: () => void;
  canRetry: boolean;
  level: 'page' | 'component' | 'critical';
  context?: string;
}

/**
 * Main Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private readonly maxRetries: number;
  private readonly retryDelay = 3000; // 3 seconds

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.maxRetries = props.maxRetries || 3;

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Error caught by error boundary', error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        componentStack: errorInfo.componentStack,
        context: this.props.context,
        level: this.props.level
      }
    });

    this.setState({ _error,
      errorInfo
    });

    // Report error to external service
    this.reportError(error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for component-level errors
    if (this.props.enableRetry && this.props.level === 'component') {
      this.scheduleAutoRetry();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { _resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.children !== this.props.children) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some(
        (key, _index) => key !== prevResetKeys[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private scheduleAutoRetry = (): void => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    this.resetTimeoutId = window.setTimeout(() => {
      logger.info('Auto-retrying after error', {
        component: 'ErrorBoundary',
        action: 'autoRetry',
        metadata: { retryCount: this.state.retryCount, delay: this.retryDelay }
      });
      this.handleRetry();
    }, this.retryDelay);
  };

  private resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0
    });
  };

  private handleRetry = (): void => {
    const { retryCount } = this.state;

    if (retryCount >= this.maxRetries) {
      logger.warn('Maximum retry attempts exceeded', {
        component: 'ErrorBoundary',
        action: 'retryLimitReached',
        metadata: { _retryCount, maxRetries: this.maxRetries }
      });
      return;
    }

    logger.info('Retrying error boundary', {
      component: 'ErrorBoundary',
      action: 'retry',
      metadata: { attempt: retryCount + 1, maxRetries: this.maxRetries }
    });

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private reportError = (error: Error, errorInfo: ErrorInfo): void => {
    try {
      // Report to error tracking service (e.g., Sentry)
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context: this.props.context,
        level: this.props.level,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount
      };

      // In a real app, send this to your error tracking service
      logger.error('Error report generated', undefined, {
        component: 'ErrorBoundary',
        action: 'reportError',
        metadata: {
          errorMessage: error.message,
          context: this.props.context,
          level: this.props.level,
          retryCount: this.state.retryCount
        }
      });

      // Store in localStorage for offline reporting
      const storedErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      storedErrors.push(errorReport);

      // Keep only last 10 errors
      if (storedErrors.length > 10) {
        storedErrors.splice(0, storedErrors.length - 10);
      }

      localStorage.setItem('errorReports', JSON.stringify(storedErrors));

    } catch (reportingError: unknown) {
      logger.error('Failed to report error', reportingError instanceof Error ? reportingError : new Error(String(reportingError)), {
        component: 'ErrorBoundary',
        action: 'reportErrorFailed',
        metadata: { originalError: error.message }
      });
    }
  };

  render(): ReactNode {
    const { _hasError, error, errorInfo, retryCount } = this.state;
    const { _children, fallback, level = 'component', context, enableRetry = true } = this.props;

    if (hasError && error && errorInfo) {
      if (fallback) {
        return fallback;
      }

      const canRetry = enableRetry && retryCount < this.maxRetries;

      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          retry={this.handleRetry}
          canRetry={canRetry}
          level={level}
          context={context}
        />
      );
    }

    return children;
  }
}

/**
 * Error Fallback Component
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ _error,
  errorInfo,
  retry,
  canRetry,
  level,
  context
}) => {
  const getErrorTitle = (): string => {
    switch (level) {
      case 'critical':
        return 'Critical System Error';
      case 'page':
        return 'Page Error';
      case 'component':
        return 'Component Error';
      default:
        return 'Something went wrong';
    }
  };

  const getErrorMessage = (): string => {
    if (level === 'critical') {
      return 'A critical error has occurred that affects the entire application. Please refresh the page or contact support if the problem persists.';
    }

    if (level === 'page') {
      return 'This page encountered an error and cannot be displayed properly. Try refreshing the page or navigating to a different section.';
    }

    return 'This component encountered an error. You can try again or continue using other parts of the application.';
  };

  const getErrorSeverityColor = (): string => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'page':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'component':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleGoHome = (): void => {
    window.location.href = '/';
  };

  const handleReload = (): void => {
    window.location.reload();
  };

  const handleReportBug = (): void => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
      level,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    const mailtoLink = `mailto:support@mustbeviral.com?subject=Bug Report&body=${encodeURIComponent(
      `Error Details:\n${JSON.stringify(errorDetails, null, 2)}`
    )}`;

    window.open(mailtoLink);
  };

  return (
    <div className={`p-6 border rounded-lg ${getErrorSeverityColor()}`}>
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{getErrorTitle()}</h3>
          <p className="text-sm mb-4">{getErrorMessage()}</p>

          {context && (
            <p className="text-xs mb-4 opacity-75">
              Context: {context}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {canRetry && (
              <button
                onClick={retry}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            )}

            {level === 'page' && (
              <button
                onClick={handleGoHome}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </button>
            )}

            {level === 'critical' && (
              <button
                onClick={handleReload}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </button>
            )}

            <button
              onClick={handleReportBug}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Bug
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-sm font-medium cursor-pointer">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 p-3 text-xs bg-gray-100 rounded overflow-auto">
                <strong>Error:</strong> {error.message}
                {'\n\n'}
                <strong>Stack:</strong>
                {'\n'}
                {error.stack}
                {'\n\n'}
                <strong>Component Stack:</strong>
                {'\n'}
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Page-level Error Boundary
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode; context?: string }> = ({ _children,
  context
}) => (
  <ErrorBoundary
    level="page"
    context={context}
    enableRetry={true}
    maxRetries={2}
    resetOnPropsChange={true}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Component-level Error Boundary
 */
export const ComponentErrorBoundary: React.FC<{ children: ReactNode; context?: string }> = ({ _children,
  context
}) => (
  <ErrorBoundary
    level="component"
    context={context}
    enableRetry={true}
    maxRetries={3}
    resetOnPropsChange={true}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Critical Error Boundary (for app-level errors)
 */
export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="critical"
    context="Application Root"
    enableRetry={false}
    maxRetries={0}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Async Component Error Boundary
 * Specifically for handling errors in async components and lazy loading
 */
export const AsyncErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ _children,
  fallback
}) => {
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading component...</p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      level="component"
      context="Async Component"
      enableRetry={true}
      maxRetries={2}
      fallback={fallback || defaultFallback}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Hook for manually triggering error boundary
 */
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: ErrorInfo) => {
    logger.error('Manual error handler triggered', error, {
      component: 'useErrorHandler',
      action: 'manualErrorTrigger',
      metadata: { errorInfo }
    });

    // This will trigger the nearest error boundary
    throw error;
  };
};

/**
 * HOC for adding error boundary to unknown component
 */
export function withErrorBoundary<T extends {}>(
  Component: React.ComponentType<T>,
  errorBoundaryConfig?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}