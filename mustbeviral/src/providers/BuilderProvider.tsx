/**
 * Builder.io Provider for Must Be Viral V2
 * 
 * This provider wraps the Builder.io SDK and provides context for the entire app.
 * It handles initialization, caching, and provides helper functions for content management.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { builderConfig, BUILDERMODELS, type BuilderContent} from '../lib/builder';

// Builder.io context interface
interface BuilderContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  getContent: (model: string, url?: string) => Promise<BuilderContent | null>;
  getEntries: (model: string, limit?: number) => Promise<BuilderContent[]>;
  clearCache: () => void;
}

// Create the context
const BuilderContext = createContext<BuilderContextType | null>(null);

// Provider props
interface BuilderProviderProps {
  children: ReactNode;
  apiKey?: string;
}

// Builder.io Provider Component
export function BuilderProvider(_{ children, apiKey }: BuilderProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builder, setBuilder] = useState<any>(null);

  // Initialize Builder.io SDK
  useEffect_(() => {
    const initializeBuilder = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to avoid build issues
        const { builder: builderSDK} = await import('@builder.io/react');
        
        // Initialize Builder.io with our config
        builderSDK.init(apiKey ?? builderConfig.apiKey, {
          ...builderConfig,
        });

        setBuilder(builderSDK);
        setIsInitialized(true);
        
        console.log('✅ Builder.io initialized successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Builder.io';
        setError(errorMessage);
        console.error('❌ Builder.io initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeBuilder();
  }, [apiKey]);

  // Get Builder.io content
  const getContent = async (model: string, url?: string): Promise<BuilderContent | null> => {
    if (!builder ?? !isInitialized) {
      console.warn('Builder.io not initialized yet');
      return null;
    }

    try {
      const content = await builder
        .get(model, {
          url: url ?? window.location.pathname,
          ...builderConfig,
        })
        .toPromise();

      return content;
    } catch (err) {
      console.error('Failed to fetch Builder.io content:', err);
      return null;
    }
  };

  // Get multiple Builder.io entries
  const getEntries = async (model: string, limit = 10): Promise<BuilderContent[]> => {
    if (!builder ?? !isInitialized) {
      console.warn('Builder.io not initialized yet');
      return [];
    }

    try {
      const entries = await builder
        .getAll(model, {
          limit,
          ...builderConfig,
        })
        .toPromise();

      return entries;
    } catch (err) {
      console.error('Failed to fetch Builder.io entries:', err);
      return [];
    }
  };

  // Clear Builder.io cache
  const clearCache = () => {
    if (builder && isInitialized) {
      builder.clearCache();
      console.log('🧹 Builder.io cache cleared');
    }
  };

  const contextValue: BuilderContextType = {
    isInitialized,
    isLoading,
    error,
    getContent,
    getEntries,
    clearCache,
  };

  return (
    <BuilderContext.Provider value={contextValue}>
      {children}
    </BuilderContext.Provider>
  );
}

// Hook to use Builder.io context
export function useBuilder(): BuilderContextType {
  const context = useContext(BuilderContext);
  
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  
  return context;
}

// Hook for Builder.io content with loading states
export function useBuilderContent(model: string, url?: string) {
  const { getContent, isInitialized, isLoading, error} = useBuilder();
  const [content, setContent] = useState<BuilderContent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect_(() => {
    if (!isInitialized) {return;}

    const fetchContent = async () => {
      setLoading(true);
      try {
        const result = await getContent(model, url);
        setContent(result);
      } catch (err) {
        console.error('Failed to fetch content:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [model, url, isInitialized, getContent]);

  return {
    content,
    loading: loading ?? isLoading,
    error,
    refetch: () => {
      setLoading(true);
      getContent(model, url).then(setContent).finally(() => setLoading(false));
    },
  };
}

// Hook for Builder.io entries with loading states
export function useBuilderEntries(model: string, limit = 10) {
  const { getEntries, isInitialized, isLoading, error} = useBuilder();
  const [entries, setEntries] = useState<BuilderContent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect_(() => {
    if (!isInitialized) {return;}

    const fetchEntries = async () => {
      setLoading(true);
      try {
        const result = await getEntries(model, limit);
        setEntries(result);
      } catch (err) {
        console.error('Failed to fetch entries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [model, limit, isInitialized, getEntries]);

  return {
    entries,
    loading: loading ?? isLoading,
    error,
    refetch: () => {
      setLoading(true);
      getEntries(model, limit).then(setEntries).finally(() => setLoading(false));
    },
  };
}




