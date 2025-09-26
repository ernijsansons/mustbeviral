// Universe-Bending API Hooks
// Type-safe React Query hooks with optimistic updates and error handling

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { logger } from '../lib/logging/productionLogger';

import {
  auth,
  content,
  analytics,
  apiClient,
  User,
  Content,
  AnalyticsData,
  LoginCredentials,
  RegisterData,
  ApiResponse,
  ApiClientError,
} from '../lib/api';

// Query keys factory for consistent cache management
export const queryKeys = {
  auth: {
    user: () => ['auth', 'user'] as const,
    session: () => ['auth', 'session'] as const,
  },
  content: {
    all: () => ['content'] as const,
    list: (filters?: Record<string, unknown>) => ['content', 'list', filters] as const,
    detail: (id: string) => ['content', 'detail', id] as const,
    byUser: (userId: string) => ['content', 'user', userId] as const,
  },
  analytics: {
    overview: (timeRange?: string) => ['analytics', 'overview', timeRange] as const,
    metrics: (type: string, timeRange?: string) => ['analytics', 'metrics', type, timeRange] as const,
  },
} as const;

// Query utilities for common operations
export const queryUtils = {
  prefetchUser: (queryClient: ReturnType<typeof useQueryClient>) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.auth.user(),
      queryFn: async () => {
        const response = await auth.getCurrentUser();
        if (!response.success) {
          throw new ApiClientError(response.error || 'Failed to get user', 401);
        }
        return response.data!;
      },
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
  },
  
  invalidateUserData: (queryClient: ReturnType<typeof useQueryClient>) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all() }),
    ]);
  },
} as const;

// ==============================================
// Authentication Hooks
// ==============================================

export function useAuth() {
  const queryClient = useQueryClient();

  // Get current user query
  const userQuery = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await auth.getCurrentUser();
      if (!response.success) {
        throw new ApiClientError(response.error || 'Failed to get user', 401);
      }
      return response.data!;
    },
    retry: false, // Don't retry auth failures
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Login mutation with proper error handling
  const loginMutation = useMutation({
    mutationFn: auth.login,
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Update user cache optimistically
        queryClient.setQueryData(queryKeys.auth.user(), response.data.user);

        // Prefetch user-related data
        queryUtils.prefetchUser(queryClient).catch((error: unknown) => {
          logger.warn('Failed to prefetch user data', error instanceof Error ? error : new Error(String(error)));
        });
        
        logger.info('User logged in successfully', undefined, {
          component: 'useAuth',
          action: 'loginSuccess',
          metadata: { userId: response.data.user.id }
        });
      }
    },
    onError: (error: unknown) => {
      logger.error('Login failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useAuth',
        action: 'loginFailed'
      });
    },
  });

  // Register mutation with proper error handling
  const registerMutation = useMutation({
    mutationFn: auth.register,
    onSuccess: (response) => {
      if (response.success && response.data) {
        queryClient.setQueryData(queryKeys.auth.user(), response.data.user);
        
        logger.info('User registered successfully', undefined, {
          component: 'useAuth',
          action: 'registerSuccess',
          metadata: { userId: response.data.user.id }
        });
      }
    },
    onError: (error: unknown) => {
      logger.error('Registration failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useAuth',
        action: 'registerFailed'
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: auth.logout,
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
    },
  });

  // Complete onboarding mutation with cache invalidation
  const completeOnboardingMutation = useMutation({
    mutationFn: auth.completeOnboarding,
    onSuccess: (response) => {
      if (response.success && response.data) {
        queryClient.setQueryData(queryKeys.auth.user(), response.data.user);
        
        // Invalidate related data that might have changed
        queryUtils.invalidateUserData(queryClient).catch((error: unknown) => {
          logger.warn('Failed to invalidate user data after onboarding', error instanceof Error ? error : new Error(String(error)));
        });
        
        logger.info('Onboarding completed successfully', undefined, {
          component: 'useAuth',
          action: 'onboardingComplete',
          metadata: { userId: response.data.user.id }
        });
      }
    },
    onError: (error: unknown) => {
      logger.error('Onboarding completion failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useAuth',
        action: 'onboardingFailed'
      });
    },
  });

  return {
    // Query state
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    isAuthenticated: !!userQuery.data && !userQuery.isError,
    isError: userQuery.isError,
    error: userQuery.error,

    // Actions
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    completeOnboarding: completeOnboardingMutation.mutate,

    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isCompletingOnboarding: completeOnboardingMutation.isPending,

    // Errors
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    onboardingError: completeOnboardingMutation.error,

    // Utilities
    refetch: userQuery.refetch,
  };
}

// ==============================================
// Content Hooks
// ==============================================

export function useContent() {
  const queryClient = useQueryClient();

  // Get all content
  const contentQuery = useQuery({
    queryKey: queryKeys.content.list(),
    queryFn: async () => {
      const response = await content.getAll();
      if (!response.success) {
        throw new ApiClientError(response.error || 'Failed to get content', 500);
      }
      return response.data!;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for content
  });

  // Create content mutation
  const createContentMutation = useMutation({
    mutationFn: content.create,
    onMutate: async (_newContent) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.content.list() });

      // Snapshot previous value
      const previousContent = queryClient.getQueryData<Content[]>(queryKeys.content.list());

      // Optimistically update
      if (previousContent) {
        const optimisticContent: Content = {
          id: `temp-${Date.now()}`,
          user_id: '',
          title: newContent.title || 'Untitled',
          body: newContent.body || '',
          status: 'draft',
          type: 'blog_post',
          generated_by_ai: false,
          ethics_check_status: 'pending',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...newContent,
        } as Content;

        queryClient.setQueryData<Content[]>(
          queryKeys.content.list(),
          [...previousContent, optimisticContent]
        );
      }

      return { previousContent };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousContent) {
        queryClient.setQueryData(queryKeys.content.list(), context.previousContent);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.content.list() });
    },
  });

  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: ({ _id, data }: { id: string; data: Partial<Content> }) =>
      content.update(id, data),
    onMutate: async ({ _id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.content.list() });

      const previousContent = queryClient.getQueryData<Content[]>(queryKeys.content.list());

      if (previousContent) {
        queryClient.setQueryData<Content[]>(
          queryKeys.content.list(),
          previousContent.map((_item) =>
            item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
          )
        );
      }

      return { previousContent };
    },
    onError: (error, variables, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(queryKeys.content.list(), context.previousContent);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.list() });
    },
  });

  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: content.delete,
    onMutate: async (_id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.content.list() });

      const previousContent = queryClient.getQueryData<Content[]>(queryKeys.content.list());

      if (previousContent) {
        queryClient.setQueryData<Content[]>(
          queryKeys.content.list(),
          previousContent.filter((_item) => item.id !== id)
        );
      }

      return { previousContent };
    },
    onError: (error, variables, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(queryKeys.content.list(), context.previousContent);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.list() });
    },
  });

  return {
    // Query state
    content: contentQuery.data || [],
    isLoading: contentQuery.isLoading,
    isError: contentQuery.isError,
    error: contentQuery.error,

    // Actions
    createContent: createContentMutation.mutate,
    updateContent: updateContentMutation.mutate,
    deleteContent: deleteContentMutation.mutate,

    // Mutation states
    isCreating: createContentMutation.isPending,
    isUpdating: updateContentMutation.isPending,
    isDeleting: deleteContentMutation.isPending,

    // Errors
    createError: createContentMutation.error,
    updateError: updateContentMutation.error,
    deleteError: deleteContentMutation.error,

    // Utilities
    refetch: contentQuery.refetch,
  };
}

// ==============================================
// Analytics Hooks
// ==============================================

export function useAnalytics(timeRange = '7d') {
  return useQuery({
    queryKey: queryKeys.analytics.overview(timeRange),
    queryFn: async () => {
      const response = await analytics.getData(timeRange);
      if (!response.success) {
        throw new ApiClientError(response.error || 'Failed to get analytics', 500);
      }
      return response.data!;
    },
    staleTime: 1000 * 60 * 1, // 1 minute for analytics
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

// Real-time analytics hook with EventSource
export function useRealtimeAnalytics() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.analytics.realtime(),
    queryFn: () => {
      // Return a promise that resolves with EventSource
      return new Promise<EventSource>((_resolve) => {
        const eventSource = apiClient.createEventSource('/api/analytics-stream');
        if (eventSource) {
          eventSource.onopen = () => resolve(eventSource);
          eventSource.onmessage = (_event) => {
            try {
              const data = JSON.parse(event.data);
              // Update analytics cache with real-time data
              queryClient.setQueryData(
                queryKeys.analytics.overview('realtime'),
                (old: AnalyticsData | undefined) => {
                  if (!old) return data;
                  return { ...old, real_time_metrics: data.real_time_metrics };
                }
              );
            } catch (error: unknown) {
              logger.error('Failed to parse real-time analytics', error instanceof Error ? error : new Error(String(error)), {
                component: 'useRealTimeAnalytics',
                action: 'parseAnalyticsFailed'
              });
            }
          };
        }
      });
    },
    enabled: typeof window !== 'undefined',
    staleTime: Infinity, // EventSource doesn't go stale
    gcTime: 0, // Don't cache EventSource
  });
}

// ==============================================
// Health Check Hook
// ==============================================

export function useHealthCheck() {
  return useQuery({
    queryKey: queryKeys.health.check(),
    queryFn: async () => {
      const response = await apiClient.healthCheck();
      if (!response.success) {
        throw new ApiClientError(response.error || 'Health check failed', 500);
      }
      return response.data!;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Check every minute
    retry: 3,
  });
}

// ==============================================
// Universe-Bending Utilities
// ==============================================

// Hook for optimistic updates with undo functionality
export function useOptimisticMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: {
    onOptimisticUpdate?: (variables: TVariables) => void;
    onUndo?: () => void;
    undoTimeoutMs?: number;
  }
) {
  const { _onOptimisticUpdate, onUndo, undoTimeoutMs = 5000 } = options || {};

  return useMutation({ _mutationFn,
    onMutate: (_variables) => {
      onOptimisticUpdate?.(variables);

      // Set up undo timeout
      if (onUndo) {
        const undoTimeout = setTimeout(() => {
          // Auto-commit after timeout
        }, undoTimeoutMs);

        return { undoTimeout };
      }
    },
    onError: (error, variables, context) => {
      // Clear undo timeout on error
      if (context?.undoTimeout) {
        clearTimeout(context.undoTimeout);
      }
      onUndo?.();
    },
    onSuccess: (data, variables, context) => {
      // Clear undo timeout on success
      if (context?.undoTimeout) {
        clearTimeout(context.undoTimeout);
      }
    },
  });
}