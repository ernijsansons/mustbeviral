/**
 * Error Boundary Component Tests
 */

import React from 'react';
import { _screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { _ErrorBoundary,
  PageErrorBoundary,
  ComponentErrorBoundary,
  CriticalErrorBoundary,
  useErrorHandler
} from '../../../src/components/ErrorBoundary';
import { _withErrorBoundaryConsoleSuppress,
  renderWithErrorBoundary,
  ThrowError,
  mockLocalStorage,
  mockWindowLocation,
  mockWindowOpen
} from '../../setup/errorBoundaryTestUtils';

withErrorBoundaryConsoleSuppress(() => {});

// Normal test component
const NormalComponent: React.FC<{ text?: string }> = ({ text = 'Normal component' }) => (
  <div data-testid="normal-component">{text}</div>
);

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Error Handling', () => {
    it('should catch and display error when child component throws', () => {
      renderWithErrorBoundary(
        <div>Normal content</div>,
        { shouldError: true }
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/Test error/i)).toBeInTheDocument();
    });

    it('should render children normally when no error occurs', () => {
      renderWithErrorBoundary(
        <NormalComponent text="Hello World" />,
        { shouldError: false }
      );

      expect(screen.getByTestId('normal-component')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should display custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      renderWithErrorBoundary(
        <div>Normal content</div>,
        {
          shouldError: true,
          errorBoundaryProps: { fallback: customFallback }
        }
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });
  });

  describe('Error Retry Functionality', () => {
    it('should show retry button when error occurs and enableRetry is true', () => {
      renderWithErrorBoundary(
        <div>Normal content</div>,
        {
          shouldError: true,
          errorBoundaryProps: { enableRetry: true }
        }
      );

      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
    });

    it('should not show retry button when enableRetry is false', () => {
      renderWithErrorBoundary(
        <div>Normal content</div>,
        {
          shouldError: true,
          errorBoundaryProps: { enableRetry: false }
        }
      );

      expect(screen.queryByText(/Try Again/i)).not.toBeInTheDocument();
    });

    it('should retry rendering when retry button is clicked', async () => {
      let attemptCount = 0;

      const RetryableComponent: React.FC = () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('First attempt failed');
        }
        return <div data-testid="success">Success on retry!</div>;
      };

      render(
        <ErrorBoundary enableRetry={true}>
          <RetryableComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/First attempt failed/i)).toBeInTheDocument();

      const retryButton = screen.getByText(/Try Again/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('success')).toBeInTheDocument();
        expect(screen.getByText('Success on retry!')).toBeInTheDocument();
      });
    });

    it('should limit retry attempts based on maxRetries', () => {
      let retryCount = 0;

      render(
        <ErrorBoundary enableRetry={true} maxRetries={2}>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText(/Try Again/i);

      // First retry
      fireEvent.click(retryButton);
      retryCount++;
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();

      // Second retry (max reached)
      fireEvent.click(retryButton);
      retryCount++;

      // Button should be disabled or not shown after max retries
      waitFor(() => {
        const button = screen.queryByText(/Try Again/i);
        expect(button).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Levels', () => {
    it('should display page-level error message for PageErrorBoundary', () => {
      render(
        <PageErrorBoundary context="TestPage">
          <ThrowError />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/Page Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Go Home/i)).toBeInTheDocument();
    });

    it('should display component-level error message for ComponentErrorBoundary', () => {
      render(
        <ComponentErrorBoundary context="TestComponent">
          <ThrowError />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
    });

    it('should display critical error message for CriticalErrorBoundary', () => {
      render(
        <CriticalErrorBoundary>
          <ThrowError />
        </CriticalErrorBoundary>
      );

      expect(screen.getByText(/Critical System Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Reload Page/i)).toBeInTheDocument();
    });
  });

  describe('Error Context and Reporting', () => {
    it('should display context information when provided', () => {
      render(
        <ErrorBoundary context="UserProfile">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/UserProfile/i)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' }),
        expect.objectContaining({ componentStack: expect.unknown(String) })
      );
    });

    it('should store error report in localStorage', () => {
      const localStorageMock = mockLocalStorage();

      renderWithErrorBoundary(
        <div>Normal content</div>,
        { shouldError: true }
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'errorReports',
        expect.stringContaining('Test error')
      );
    });
  });

  describe('Reset on Props Change', () => {
    it('should reset error boundary when resetOnPropsChange is true and props change', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      // Change props by providing different children
      rerender(
        <ErrorBoundary resetOnPropsChange={true}>
          <NormalComponent text="New content" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
      expect(screen.getByText('New content')).toBeInTheDocument();
    });

    it('should reset error boundary when resetKeys change', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['key1']}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      // Change reset keys
      rerender(
        <ErrorBoundary resetKeys={['key2']}>
          <NormalComponent text="Reset successful" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
      expect(screen.getByText('Reset successful')).toBeInTheDocument();
    });
  });

  describe('Development vs Production Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Detailed error message')} />
        </ErrorBoundary>
      );

      const detailsElement = screen.getByText(/Error Details/i);
      expect(detailsElement).toBeInTheDocument();

      // Click to expand details
      fireEvent.click(detailsElement);

      expect(screen.getByText(/Detailed error message/i)).toBeInTheDocument();
      expect(screen.getByText(/Stack:/i)).toBeInTheDocument();
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Sensitive error info')} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Error Details/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sensitive error info/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Stack:/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Boundary Actions', () => {
    it('should handle Go Home button click in page error', () => {
      const locationMock = mockWindowLocation();

      renderWithErrorBoundary(
        <div>Normal content</div>,
        {
          shouldError: true,
          errorBoundaryProps: {
            level: 'page',
            context: 'TestPage'
          }
        }
      );

      const goHomeButton = screen.getByText(/Go Home/i);
      fireEvent.click(goHomeButton);

      expect(locationMock.href).toBe('/');
    });

    it('should handle Reload Page button click in critical error', () => {
      const locationMock = mockWindowLocation();

      renderWithErrorBoundary(
        <div>Normal content</div>,
        {
          shouldError: true,
          errorBoundaryProps: { level: 'critical' }
        }
      );

      const reloadButton = screen.getByText(/Reload Page/i);
      fireEvent.click(reloadButton);

      expect(locationMock.reload).toHaveBeenCalled();
    });

    it('should handle Report Bug button click', () => {
      const openMock = mockWindowOpen();

      renderWithErrorBoundary(
        <div>Normal content</div>,
        { shouldError: true }
      );

      const reportButton = screen.getByText(/Report Bug/i);
      fireEvent.click(reportButton);

      expect(openMock).toHaveBeenCalledWith(
        expect.stringContaining('mailto:support@mustbeviral.com')
      );
    });
  });

  describe('useErrorHandler Hook', () => {
    const TestHookComponent: React.FC = () => {
      const throwError = useErrorHandler();

      return (
        <button
          onClick={() => throwError(new Error('Hook error'))}
          data-testid="throw-error-button"
        >
          Throw Error
        </button>
      );
    };

    it('should trigger error boundary when error is thrown via hook', () => {
      render(
        <ErrorBoundary>
          <TestHookComponent />
        </ErrorBoundary>
      );

      const button = screen.getByTestId('throw-error-button');

      // Wrap in act to handle the error throw
      expect(() => fireEvent.click(button)).toThrow('Hook error');
    });
  });

  describe('Auto-retry Functionality', () => {
    it('should automatically retry component-level errors', async () => {
      jest.useFakeTimers();

      render(
        <ErrorBoundary level="component" enableRetry={true}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Component Error/i)).toBeInTheDocument();

      // Fast-forward time to trigger auto-retry
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        // Component should attempt to re-render
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Auto-retrying after error')
        );
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error messages', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should have proper focus management for retry button', () => {
      render(
        <ErrorBoundary enableRetry={true}>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText(/Try Again/i);
      expect(retryButton).toHaveAttribute('tabIndex', '0');
      expect(retryButton).not.toBeDisabled();
    });
  });
});