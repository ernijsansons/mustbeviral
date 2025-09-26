/**
 * Centralized Test Wrapper Component
 * Provides consistent testing environment with all necessary providers
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

// Create a test-specific QueryClient with no retries and shorter timeouts
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  },
});

export interface TestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  withErrorBoundary?: boolean;
}

/**
 * Standard test wrapper with all necessary providers
 */
export const TestWrapper: React.FC<TestWrapperProps> = ({ children,
  queryClient,
  withErrorBoundary = false
}) => {
  const testQueryClient = queryClient || createTestQueryClient();

  const wrappedChildren = withErrorBoundary ? (
    <ErrorBoundary level="component" enableRetry={false}>
      {children}
    </ErrorBoundary>
  ) : children;

  return (
    <QueryClientProvider client={testQueryClient}>
      {wrappedChildren}
    </QueryClientProvider>
  );
};

/**
 * Minimal test wrapper for components that don't need providers
 */
export const MinimalTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

/**
 * Test wrapper with error boundary for testing error scenarios
 */
export const ErrorTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TestWrapper withErrorBoundary={true}>
    {children}
  </TestWrapper>
);

export default TestWrapper;