// Universe-Bending React Query Configuration
// Optimized for performance and user experience

import { QueryClient, DefaultOptions} from '@tanstack/react-query';
import { ApiClientError} from './api';
import { getEnvBoolean, isFeatureEnabled, isDevelopment, isProduction, getEnvVar} from './env';

// Query configuration optimized for universe-bending UX
const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: Data considered fresh for 5 minutes
    staleTime: 1000 * 60 * 5,

    // Cache time: Keep unused data in cache for 10 minutes
    gcTime: 1000 * 60 * 10,

    // Retry configuration for resilience
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error instanceof ApiClientError && error.status === 401) {
        return false;
      }

      // Don't retry client errors (4xx)
      if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
        return false;
      }

      // Retry up to 3 times for server errors
      return failureCount < 3;
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Background refetch configuration
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  },

  mutations: {
    // Optimistic updates and error handling
    retry: (failureCount, error) => {
      // Don't retry mutations with client errors
      if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
        return false;
      }

      // Retry once for server errors
      return failureCount < 1;
    },

    retryDelay: 1000,
  },
};

// Create the Query Client with universe-bending configuration
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,

  // Global error handler
  // This will capture all unhandled query/mutation errors
  // and can be used for global error notifications
});

// Query Keys Factory - Centralized key management
export const queryKeys = {
  // Authentication
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Content
  content: {
    all: ['content'] as const,
    list: () => [...queryKeys.content.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.content.all, 'detail', id] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    overview: (timeRange: string) => [...queryKeys.analytics.all, 'overview', timeRange] as const,
    realtime: () => [...queryKeys.analytics.all, 'realtime'] as const,
  },

  // Health
  health: {
    all: ['health'] as const,
    check: () => [...queryKeys.health.all, 'check'] as const,
  },
} as const;

// Query client utilities for advanced features
export const queryUtils = {
  // Invalidate all queries
  invalidateAll: () => queryClient.invalidateQueries(),

  // Invalidate queries by pattern
  invalidateByPattern: (pattern: readonly string[]) =>
    queryClient.invalidateQueries({ queryKey: pattern }),

  // Prefetch data for faster navigation
  prefetchUser: () =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.auth.user(),
      queryFn: () => import('./api').then(({ auth }) => auth.getCurrentUser()),
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),

  // Set optimistic data
  setOptimisticData: <T>(queryKey: readonly string[], updater: (old: T | undefined) => T) =>
    queryClient.setQueryData(queryKey, updater),

  // Remove query from cache
  removeQuery: (queryKey: readonly string[]) =>
    queryClient.removeQueries({ queryKey }),

  // Cancel outgoing queries
  cancelQueries: (queryKey?: readonly string[]) =>
    queryClient.cancelQueries({ queryKey }),
};

// Performance monitoring for queries
if (typeof window !== 'undefined' && isFeatureEnabled('ENABLE_PERFORMANCE_MONITORING')) {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'queryAdded') {
      const startTime = Date.now();

      event.query.subscribe_(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log slow queries in development
        if (duration > 2000 && isDevelopment()) {
          console.warn(`🐌 Slow query detected: ${JSON.stringify(event.query.queryKey)} took ${duration}ms`);
        }
      });
    }
  });
}

// Error reporting integration
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'queryError') {
    const error = event.query.state.error;

    // Log errors in development
    if (isDevelopment()) {
      console.error('🚨 Query Error:', {
        queryKey: event.query.queryKey,
        error: error,
        timestamp: new Date().toISOString(),
      });
    }

    // In production, you would send to error tracking service
    if (isProduction() && getEnvVar('ERROR_TRACKING_DSN')) {
      // Send to error tracking service (Sentry, Bugsnag, etc.)
      // Example: captureException(error, { tags: { queryKey: JSON.stringify(event.query.queryKey) } });
    }
  }
});