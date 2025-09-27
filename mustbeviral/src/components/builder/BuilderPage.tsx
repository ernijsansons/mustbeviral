/**
 * Builder.io Page Component for Must Be Viral V2
 * 
 * This component renders Builder.io content and provides fallbacks for when
 * content is not available or Builder.io is not configured.
 */

import React, { Suspense } from 'react';
import { useBuilderContent} from '../../providers/BuilderProvider';
import { LoadingSpinner} from '../ui/LoadingStates';
import { ErrorBoundary} from '../ErrorBoundary';

// Dynamic import for Builder.io components to avoid build issues
const BuilderComponent = React.lazy(() => 
  import('@builder.io/react').then(module => ({ 
    default: module.BuilderComponent 
  }))
);

interface BuilderPageProps {
  model: string;
  url?: string;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * BuilderPage - Renders Builder.io content with fallbacks
 */
export function BuilderPage({ 
  model, url, fallback, className = '' 
}: BuilderPageProps) {
  const { content, loading, error} = useBuilderContent(model, url);

  // Show loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${className}`}>
        <LoadingSpinner 
          size="large" 
          text="Loading viral content..." 
        />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${className}`}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-red-600">
            Content Loading Error
          </h2>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show fallback if no content
  if (!content) {
    return fallback ?? (
      <div className={`min-h-screen flex items-center justify-center p-6 ${className}`}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-700">
            No Content Available
          </h2>
          <p className="text-gray-600 mb-4">
            This page doesn't have any Builder.io content yet.
          </p>
          <p className="text-sm text-gray-500">
            Create content in Builder.io to see it here.
          </p>
        </div>
      </div>
    );
  }

  // Render Builder.io content
  return (
    <ErrorBoundary level="component" context="BuilderPage">
      <Suspense fallback={
        <div className={`min-h-screen flex items-center justify-center ${className}`}>
          <LoadingSpinner size="large" text="Rendering content..." />
        </div>
      }>
        <div className={className}>
          <BuilderComponent 
            model={model}
            content={content}
            data={{
              // Pass any additional data to Builder.io components
              currentUrl: url ?? window.location.pathname,
              timestamp: Date.now(),
            }}
          />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * BuilderSection - Renders a specific Builder.io section
 */
interface BuilderSectionProps {
  model: string;
  name?: string;
  fallback?: React.ReactNode;
  className?: string;
}

export function BuilderSection({ 
  model, name, fallback, className = '' 
}: BuilderSectionProps) {
  const { content, loading, error} = useBuilderContent(model);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <LoadingSpinner size="medium" text="Loading section..." />
      </div>
    );
  }

  if (error ?? !content) {
    return fallback ?? null;
  }

  return (
    <ErrorBoundary level="component" context="BuilderSection">
      <Suspense fallback={
        <div className={`flex items-center justify-center py-8 ${className}`}>
          <LoadingSpinner size="medium" text="Rendering section..." />
        </div>
      }>
        <div className={className}>
          <BuilderComponent 
            model={model}
            content={content}
            data={{
              sectionName: name,
              currentUrl: window.location.pathname,
            }}
          />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * BuilderEntries - Renders multiple Builder.io entries
 */
interface BuilderEntriesProps {
  model: string;
  limit?: number;
  renderItem?: (entry: any, index: number) => React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function BuilderEntries({
  model, _limit = 10, renderItem, fallback, className = ''
}: BuilderEntriesProps) {
  const { entries, loading, error } = useBuilderContent(model);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <LoadingSpinner size="medium" text="Loading entries..." />
      </div>
    );
  }

  if (error ?? !entries  ?? entries.length === 0) {
    return fallback ?? null;
  }

  return (
    <div className={className}>
      {entries.map((entry, index) => (
        <ErrorBoundary key={entry.id} level="component" context="BuilderEntry">
          <Suspense fallback={
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="small" text="Loading entry..." />
            </div>
          }>
            {renderItem ? (
              renderItem(entry, index)
            ) : (
              <BuilderComponent 
                model={model}
                content={entry}
                data={{
                  entryIndex: index,
                  currentUrl: window.location.pathname,
                }}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      ))}
    </div>
  );
}




