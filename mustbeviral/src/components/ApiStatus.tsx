// API Status Component - Tests our React Query setup
import React from 'react';
import { useHealthCheck } from '../hooks/api';
import { env } from '../lib/env';

export function ApiStatus() {
  const { data: healthData, isLoading, isError, error } = useHealthCheck();

  if (!env.ENABLE_ANALYTICS_DASHBOARD) {
    return null; // Feature flag disabled
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          ) : isError ? (
            <div className="h-5 w-5 bg-red-500 rounded-full"></div>
          ) : (
            <div className="h-5 w-5 bg-green-500 rounded-full"></div>
          )}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-gray-900">
            API Status
          </h3>
          <div className="mt-1 text-sm text-gray-600">
            {isLoading && 'Checking connection...'}
            {isError && `Connection failed: ${error?.message || 'Unknown error'}`}
            {healthData && (
              <span>
                Backend: {healthData.status} |
                Services: {Object.values(healthData.services).filter(s => s === 'healthy').length}/{Object.keys(healthData.services).length} healthy
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}