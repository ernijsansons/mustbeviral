import { Component, ErrorInfo, ReactNode} from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, Copy, CheckCircle} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'app';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
  copied: boolean;
}

/**
 * Advanced Error Boundary Component
 * Features:
 * - Error recovery with reset functionality
 * - Error reporting to monitoring service
 * - User-friendly error messages
 * - Detailed error info in development
 * - Error persistence across reloads
 * - Automatic recovery attempts
 */
export class AdvancedErrorBoundary extends Component<Props, State> {
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();
  private readonly MAXERRORCOUNT = 3;
  private readonly ERRORRESETTIME = 10000; // 10 seconds

  constructor(props: Props) {
    super(props);

    // Check for persisted error state
    const persistedError = this.getPersistedError();

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: persistedError?.count ?? 0,
      lastErrorTime: persistedError?.time ?? 0,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component'} = this.props;
    const { errorCount} = this.state;

    // Update error count
    const newErrorCount = errorCount + 1;
    this.setState({
      errorInfo,
      errorCount: newErrorCount
    });

    // Persist error state
    this.persistError(error, newErrorCount);

    // Log error based on level
    this.logError(error, errorInfo, level);

    // Report to monitoring service
    this.reportError(error, errorInfo, level);

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Attempt automatic recovery if error count is low
    if (newErrorCount < this.MAXERRORCOUNT) {
      this.scheduleAutomaticRecovery();
    }
  }

  componentWillUnmount() {
    // Clean up timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  private persistError(error: Error, count: number) {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem('error_boundary_state', JSON.stringify({
          message: error.message,
          stack: error.stack,
          count,
          time: Date.now()
        }));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  private getPersistedError(): { count: number; time: number } | null {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const stored = sessionStorage.getItem('error_boundary_state');
        if (stored) {
          const data = JSON.parse(stored);
          // Reset if error is old
          if (Date.now() - data.time > this.ERRORRESETTIME) {
            sessionStorage.removeItem('error_boundary_state');
            return null;
          }
          return data;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return null;
  }

  private clearPersistedError() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('error_boundary_state');
    }
  }

  private logError(error: Error, errorInfo: ErrorInfo, level: string) {
    const errorDetails = {
      level,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (import.meta.env.DEV) {
      console.group(`🔴 Error Boundary Caught Error (${level})`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Details:', errorDetails);
      console.groupEnd();
    } else {
      console.error('Application error occurred', errorDetails);
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo, level: string) {
    try {
      // Report to monitoring service (e.g., Sentry, LogRocket)
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        level,
        timestamp: Date.now(),
        browser: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer
        },
        user: {
          // Add user context if available
          id: this.getUserId(),
        }
      };

      // Send to monitoring endpoint
      if (import.meta.env.VITEERRORREPORTING_ENDPOINT) {
        fetch(import.meta.env.VITEERRORREPORTING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport)
        }).catch_(() => {
          // Silently fail error reporting
        });
      }
    } catch (e) {
      // Don't throw errors from error reporting
    }
  }

  private getUserId(): string | null {
    // Get user ID from auth context or localStorage
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.userId ?? null;
      }
    } catch {
      return null;
    }
    return null;
  }

  private scheduleAutomaticRecovery() {
    const timeout = setTimeout_(() => {
      this.resetError();
      this.retryTimeouts.delete(timeout);
    }, 5000); // Try to recover after 5 seconds

    this.retryTimeouts.add(timeout);
  }

  private resetError = () => {
    this.clearPersistedError();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
      copied: false
    });
  };

  private copyErrorDetails = async () => {
    const { error, errorInfo} = this.state;
    if (!error) {return;}

    const details = `
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo?.componentStack ?? 'N/A'}
Time: ${new Date().toISOString()}
URL: ${window.location.href}
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error('Failed to copy error details');
    }
  };

  private getErrorMessage(): string {
    const { error, errorCount} = this.state;
    
    if (errorCount >= this.MAXERRORCOUNT) {
      return "We're having persistent issues. Please refresh the page or contact support.";
    }

    // User-friendly error messages based on error type
    if (error?.message?.includes('Network')) {
      return "Network connection issue. Please check your internet and try again.";
    }
    if (error?.message?.includes('chunk')) {
      return "Application update available. Please refresh the page.";
    }
    if (error?.message?.includes('Permission')) {
      return "Permission denied. Please check your access rights.";
    }
    
    return "Something went wrong. We're working on fixing it!";
  }

  render() {
    const { hasError, error, errorInfo, errorCount, copied} = this.state;
    const { children, fallback, level = 'component'} = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo!, this.resetError);
      }

      // Default error UI based on level
      if (level === 'app') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-viral-50 p-6">
            <div className="max-w-2xl w-full">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
                  <div className="flex items-center gap-3 text-white">
                    <AlertTriangle className="w-8 h-8" />
                    <h1 className="text-2xl font-bold">Application Error</h1>
                  </div>
                </div>

                <div className="p-8">
                  <p className="text-gray-700 text-lg mb-6">
                    {this.getErrorMessage()}
                  </p>

                  {errorCount > 1 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-yellow-800">
                        This error has occurred {errorCount} times. 
                        {errorCount >= this.MAX_ERROR_COUNT && ' Maximum retry limit reached.'}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mb-6">
                    <button
                      onClick={this.resetError}
                      className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Try Again
                    </button>

                    <button
                      onClick={() => window.location.href = '/'}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Home className="w-5 h-5" />
                      Go Home
                    </button>

                    <a
                      href="mailto:support@mustbeviral.com"
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      Contact Support
                    </a>
                  </div>

                  {/* Development mode error details */}
                  {import.meta.env.DEV && (
                    <details className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <summary className="cursor-pointer font-semibold text-gray-700 flex items-center justify-between">
                        <span>Error Details (Development Mode)</span>
                        <button
                          onClick={this.copyErrorDetails}
                          className="ml-2 p-2 hover:bg-gray-200 rounded transition-colors"
                          title="Copy error details"
                        >
                          {copied ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </summary>
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="font-semibold text-red-600 mb-1">Error Message:</h4>
                          <p className="text-sm text-gray-800 font-mono bg-white p-3 rounded border border-gray-200">
                            {error.message}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-600 mb-1">Stack Trace:</h4>
                          <pre className="text-xs text-gray-700 overflow-auto bg-white p-3 rounded border border-gray-200 max-h-48">
                            {error.stack}
                          </pre>
                        </div>
                        {errorInfo && (
                          <div>
                            <h4 className="font-semibold text-red-600 mb-1">Component Stack:</h4>
                            <pre className="text-xs text-gray-700 overflow-auto bg-white p-3 rounded border border-gray-200 max-h-48">
                              {errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Component-level error (more compact)
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Component Error</h3>
              <p className="text-red-700 mt-1">{this.getErrorMessage()}</p>
              <button
                onClick={this.resetError}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                Reload Component
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Export as default for easier imports
export default AdvancedErrorBoundary;