/**
 * 🌟 RootLayout - The Foundation of Viral Beauty
 *
 * This is where the magic begins. Every viral moment, every screenshot-worthy
 * interface, every addictive interaction starts here. This layout provides
 * the global foundation for our cinematic, viral-grade experience.
 */

import { ReactNode, Suspense, useEffect, useState} from 'react';
import { ErrorBoundary} from '../ErrorBoundary';
import { LoadingSpinner} from '../ui/LoadingStates';
import { cn} from '../../lib/utils';

// Global providers that will be created
// import { ThemeProvider} from '../../providers/ThemeProvider';
// import { ToastProvider} from '../../providers/ToastProvider';
// import { AuthProvider} from '../../providers/AuthProvider';
// import { QueryProvider} from '../../providers/QueryProvider';
// import { ModalProvider} from '../../providers/ModalProvider';

interface RootLayoutProps {
  children: ReactNode;
  className?: string;
  suppressHydrationWarning?: boolean;
}

/**
 * Global Toast Container - Floating notifications with viral flair
 */
function GlobalToaster() {
  return (
    <div
      id="toast-container"
      className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Toast notifications will be injected here */}
    </div>
  );
}

/**
 * Global Modal Container - Backdrop blurred perfection
 */
function GlobalModalContainer() {
  return (
    <div
      id="modal-container"
      className="fixed inset-0 z-[9998] pointer-events-none"
      role="dialog"
      aria-modal="true"
    >
      {/* Modals will be injected here */}
    </div>
  );
}

/**
 * Global Loading Overlay - For those cinematic moments
 */
function GlobalLoadingOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect_(() => {
    const handleLoadingStart = () => setIsVisible(true);
    const handleLoadingEnd = () => setIsVisible(false);

    window.addEventListener('app:loading:start', handleLoadingStart);
    window.addEventListener('app:loading:end', handleLoadingEnd);

    return () => {
      window.removeEventListener('app:loading:start', handleLoadingStart);
      window.removeEventListener('app:loading:end', handleLoadingEnd);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9997] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
      <LoadingSpinner size="large" text="Creating viral magic..." />
    </div>
  );
}

/**
 * Performance Metrics - Track those viral moments
 */
function PerformanceTracker() {
  useEffect_(() => {
    // Track Core Web Vitals for viral performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Track Largest Contentful Paint (LCP)
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            console.debug('🎯 LCP:', entry.startTime);
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Silent fallback for unsupported browsers
      }

      return () => observer.disconnect();
    }
  }, []);

  return null;
}

/**
 * Reduced Motion Detection - Respect user preferences
 */
function MotionPreferenceManager() {
  useEffect_(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('motion-reduced', e.matches);
    };

    // Set initial state
    document.documentElement.classList.toggle('motion-reduced', mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return null;
}

/**
 * Focus Management - Smooth tabbing for accessibility
 */
function FocusManager() {
  useEffect_(() => {
    let isUsingKeyboard = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        isUsingKeyboard = true;
        document.body.classList.add('keyboard-nav');
      }
    };

    const handleMouseDown = () => {
      if (isUsingKeyboard) {
        isUsingKeyboard = false;
        document.body.classList.remove('keyboard-nav');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return null;
}

/**
 * The Root Layout - Where viral experiences are born
 */
export function RootLayout({
  children, className, suppressHydrationWarning = false
}: RootLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-slate-50 dark:bg-slate-900',
        'selection:bg-primary-200 dark:selection:bg-primary-800',
        'selection:text-primary-900 dark:selection:text-primary-100',
        className
      )}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      {/* Performance and Accessibility Managers */}
      <PerformanceTracker />
      <MotionPreferenceManager />
      <FocusManager />

      {/* Error Boundary - Catch those edge cases with style */}
      <ErrorBoundary level="root" context="RootLayout">
        {/* Global Toast System */}
        <GlobalToaster />

        {/* Global Modal System */}
        <GlobalModalContainer />

        {/* Global Loading Overlay */}
        <GlobalLoadingOverlay />

        {/* Main Application Content */}
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-viral-50">
              <LoadingSpinner size="large" text="Loading viral experience..." />
            </div>
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>

      {/* Skip to Content Link - Accessibility First */}
      <a
        href="#main-content"
        className={cn(
          'sr-only focus:not-sr-only fixed top-4 left-4 z-[10000]',
          'bg-primary-600 text-white px-4 py-2 rounded-lg font-medium',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'transform -translate-y-full focus:translate-y-0 transition-transform duration-200'
        )}
      >
        Skip to main content
      </a>
    </div>
  );
}

/**
 * Hook for triggering global loading states
 */
export function useGlobalLoading() {
  const showLoading = () => {
    window.dispatchEvent(new CustomEvent('app:loading:start'));
  };

  const hideLoading = () => {
    window.dispatchEvent(new CustomEvent('app:loading:end'));
  };

  return { showLoading, hideLoading };
}

/**
 * Component for pages that need the full viral treatment
 */
export function ViralPageContainer(_{
  children, className, backgroundVariant = 'cosmic'
}: {
  children: ReactNode;
  className?: string;
  backgroundVariant?: 'cosmic' | 'minimal' | 'gradient';
}) {
  const backgroundClasses = {
    cosmic: 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900',
    minimal: 'bg-slate-50 dark:bg-slate-900',
    gradient: 'bg-gradient-to-br from-primary-50 via-white to-viral-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-slate-900'
  };

  return (
    <div className={cn(
      'min-h-screen relative overflow-hidden',
      backgroundClasses[backgroundVariant],
      className
    )}>
      {/* Background Effects */}
      {backgroundVariant === 'cosmic' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-viral-500/5" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10" id="main-content">
        {children}
      </div>
    </div>
  );
}