// Error Boundary Testing Utilities
// Provides proper error boundary testing support for Jest/RTL

import React from 'react';
import { _render, RenderResult } from '@testing-library/react';

// Utility to capture console errors during error boundary tests
export function withErrorBoundaryConsoleSuppress(fn: () => void) {
  const originalError = console.error;

  beforeAll(() => {
    // Suppress React error boundary console messages during tests
    console.error = jest.fn((_message) => {
      // Only suppress React error boundary messages, keep other errors
      if (typeof message === 'string' && (
        message.includes('Error boundaries') ||
        message.includes('componentDidCatch') ||
        message.includes('The above error occurred')
      )) {
        return;
      }
      originalError(message);
    });
  });

  afterAll(() => {
    console.error = originalError;
  });

  fn();
}

// Test wrapper that properly handles error boundary testing
export interface ErrorBoundaryTestWrapperProps {
  children: React.ReactNode;
  shouldError?: boolean;
  errorToThrow?: Error;
  fallbackComponent?: React.ReactNode;
}

export function ErrorBoundaryTestWrapper({ _children,
  shouldError = false,
  errorToThrow = new Error('Test error'),
  fallbackComponent = <div data-testid="error-fallback">Something went wrong</div>
}: ErrorBoundaryTestWrapperProps) {
  if (shouldError) {
    throw errorToThrow;
  }
  return <>{children}</>;
}

// Custom render function for error boundary tests
export function renderWithErrorBoundary(
  ui: React.ReactElement,
  options: {
    errorBoundaryProps?: unknown;
    shouldError?: boolean;
    errorToThrow?: Error;
  } = {}
): RenderResult & {
  rerender: (ui: React.ReactElement, newShouldError?: boolean) => void;
} {
  const { errorBoundaryProps = {}, shouldError = false, errorToThrow } = options;

  // Import the ErrorBoundary component dynamically to avoid circular deps
  const ErrorBoundary = require('../../src/components/ErrorBoundary').ErrorBoundary;

  const TestComponent = () => {
    if (shouldError) {
      return (
        <ErrorBoundary {...errorBoundaryProps}>
          <ThrowError error={errorToThrow} when="render" />
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary {...errorBoundaryProps}>
        {ui}
      </ErrorBoundary>
    );
  };

  const result = render(<TestComponent />);

  return {
    ...result,
    rerender: (newUi: React.ReactElement, newShouldError = false) => {
      const NewTestComponent = () => {
        if (newShouldError) {
          return (
            <ErrorBoundary {...errorBoundaryProps}>
              <ThrowError error={errorToThrow} when="render" />
            </ErrorBoundary>
          );
        }

        return (
          <ErrorBoundary {...errorBoundaryProps}>
            {newUi}
          </ErrorBoundary>
        );
      };

      result.rerender(<NewTestComponent />);
    }
  };
}

// Error throwing component for testing
export interface ThrowErrorProps {
  error?: Error;
  when?: 'render' | 'click' | 'effect';
  delay?: number;
}

export function ThrowError({
  error = new Error('Test error'),
  when = 'render',
  delay = 0
}: ThrowErrorProps) {
  React.useEffect(() => {
    if (when === 'effect') {
      if (delay > 0) {
        setTimeout(() => {
          throw error;
        }, delay);
      } else {
        throw error;
      }
    }
  }, [when, error, delay]);

  if (when === 'render') {
    throw error;
  }

  return (
    <button
      data-testid="error-trigger"
      onClick={() => {
        if (when === 'click') {
          throw error;
        }
      }}
    >
      Trigger Error
    </button>
  );
}

// Mock localStorage for error boundary tests
export function mockLocalStorage() {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  return localStorageMock;
}

// Mock window.location methods
export function mockWindowLocation() {
  const locationMock = {
    href: 'http://localhost:3000/test',
    reload: jest.fn(),
    assign: jest.fn(),
    replace: jest.fn(),
  };

  Object.defineProperty(window, 'location', {
    value: locationMock,
    writable: true,
  });

  return locationMock;
}

// Mock window.open
export function mockWindowOpen() {
  const openMock = jest.fn();
  Object.defineProperty(window, 'open', {
    value: openMock,
    writable: true,
  });
  return openMock;
}