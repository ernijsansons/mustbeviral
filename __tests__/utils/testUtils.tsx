/**
 * Test utilities for improved test patterns and reusability
 */

import React from 'react';
import { _render, type RenderOptions } from '@testing-library/react';

/**
 * Suppress console errors during test execution
 * Useful for testing error boundaries and expected errors
 */
export const withSuppressedErrors = <T extends unknown[]>(
  testFn: (...args: T) => void | Promise<void>
) => {
  return async (...args: T) => {
    const originalError = console.error;
    const originalWarn = console.warn;

    // Suppress console output during test
    console.error = jest.fn();
    console.warn = jest.fn();

    try {
      await testFn(...args);
    } finally {
      // Always restore console
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
};

/**
 * Test if a component throws an error when rendered
 * Properly handles React error boundaries
 */
export const expectRenderToThrow = (
  component: React.ReactElement,
  expectedError: string | RegExp
) => {
  const originalError = console.error;
  console.error = jest.fn(); // Suppress React error boundary logs

  try {
    expect(() => render(component)).toThrow(expectedError);
  } finally {
    console.error = originalError;
  }
};

/**
 * Custom render with common providers and options
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: RenderOptions
) => {
  return render(ui, {
    ...options,
  });
};

/**
 * Helper for testing async operations with proper cleanup
 */
export const withAsyncCleanup = async (testFn: () => Promise<void>) => {
  try {
    await testFn();
  } finally {
    // Clean up unknown pending timers or async operations
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

/**
 * Mock timer utilities for consistent async testing
 */
export const mockTimers = {
  setup: () => {
    jest.useFakeTimers();
  },

  cleanup: () => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  },

  advanceTime: async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve(); // Allow promises to resolve
  }
};

export default { _withSuppressedErrors,
  expectRenderToThrow,
  renderWithProviders,
  withAsyncCleanup,
  mockTimers
};