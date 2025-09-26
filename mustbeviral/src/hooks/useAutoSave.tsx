// Smart Auto-Save Hook with Conflict Resolution
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AutoSaveOptions {
  /** Auto-save interval in milliseconds (default: 3000) */
  interval?: number;
  /** Enable immediate save on focus loss */
  saveOnFocusLoss?: boolean;
  /** Enable immediate save before navigation */
  saveOnBeforeUnload?: boolean;
  /** Maximum number of versions to keep */
  maxVersions?: number;
  /** Storage key prefix for localStorage fallback */
  storageKey?: string;
  /** Debug mode for development */
  debug?: boolean;
}

export interface AutoSaveState {
  /** Current save status */
  status: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  /** Last save timestamp */
  lastSaved?: Date;
  /** Error message if save failed */
  error?: string;
  /** Conflict data if detected */
  conflict?: {
    localVersion: any;
    serverVersion: any;
    timestamp: Date;
  };
  /** Number of pending saves */
  pendingSaves: number;
}

export interface AutoSaveHookReturn {
  /** Current auto-save state */
  state: AutoSaveState;
  /** Manually trigger a save */
  saveNow: () => Promise<void>;
  /** Mark content as dirty to trigger auto-save */
  markDirty: () => void;
  /** Resolve conflicts manually */
  resolveConflict: (resolution: 'local' | 'server' | 'merge') => Promise<void>;
  /** Check if there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Recover from localStorage */
  recover: () => any | null;
}

export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: AutoSaveOptions = {}
): AutoSaveHookReturn {
  const {
    interval = 3000,
    saveOnFocusLoss = true,
    saveOnBeforeUnload = true,
    maxVersions = 10,
    storageKey = 'autosave',
    debug = false
  } = options;

  const [state, setState] = useState<AutoSaveState>({
    status: 'idle',
    pendingSaves: 0
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const dataRef = useRef(data);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingSaveRef = useRef<Promise<void> | null>(null);
  const lastSavedDataRef = useRef<T>();
  const versionsRef = useRef<Array<{ data: T; timestamp: Date }>>([]);

  // Update data reference
  useEffect(() => {
    const hasChanged = JSON.stringify(dataRef.current) !== JSON.stringify(data);
    dataRef.current = data;
    
    if (hasChanged && JSON.stringify(lastSavedDataRef.current) !== JSON.stringify(data)) {
      setHasUnsavedChanges(true);
      markDirty();
    }
  }, [data]);

  // Debug logging
  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[AutoSave]', ...args);
    }
  }, [debug]);

  // Save to localStorage as fallback
  const saveToLocalStorage = useCallback((data: T) => {
    try {
      const saveData = {
        data,
        timestamp: new Date().toISOString(),
        version: Date.now()
      };
      localStorage.setItem(`${storageKey}_current`, JSON.stringify(saveData));
      
      // Keep version history
      const versions = versionsRef.current.slice(0, maxVersions - 1);
      versions.unshift({ data, timestamp: new Date() });
      versionsRef.current = versions;
      localStorage.setItem(`${storageKey}_versions`, JSON.stringify(versions));
      
      log('Saved to localStorage:', saveData);
    } catch (error) {
      log('LocalStorage save failed:', error);
    }
  }, [storageKey, maxVersions, log]);

  // Recover from localStorage
  const recover = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(`${storageKey}_current`);
      if (saved) {
        const saveData = JSON.parse(saved);
        log('Recovered from localStorage:', saveData);
        return saveData.data;
      }
    } catch (error) {
      log('Recovery failed:', error);
    }
    return null;
  }, [storageKey, log]);

  // Main save function with conflict detection
  const performSave = useCallback(async (data: T): Promise<void> => {
    setState(prev => ({ 
      ...prev, 
      status: 'saving',
      pendingSaves: prev.pendingSaves + 1
    }));

    try {
      log('Attempting save:', data);
      
      // Save to localStorage first as backup
      saveToLocalStorage(data);
      
      // Attempt server save
      await saveFunction(data);
      
      // Success
      lastSavedDataRef.current = data;
      setHasUnsavedChanges(false);
      
      setState(prev => ({
        ...prev,
        status: 'saved',
        lastSaved: new Date(),
        error: undefined,
        conflict: undefined,
        pendingSaves: Math.max(0, prev.pendingSaves - 1)
      }));
      
      log('Save successful');
      
      // Clear saved state after 2 seconds
      setTimeout(() => {
        setState(prev => prev.status === 'saved' ? { ...prev, status: 'idle' } : prev);
      }, 2000);
      
    } catch (error: any) {
      log('Save failed:', error);
      
      // Check if it's a conflict error
      if (error.code === 'CONFLICT' && error.serverVersion) {
        setState(prev => ({
          ...prev,
          status: 'conflict',
          conflict: {
            localVersion: data,
            serverVersion: error.serverVersion,
            timestamp: new Date()
          },
          pendingSaves: Math.max(0, prev.pendingSaves - 1)
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error.message || 'Save failed',
          pendingSaves: Math.max(0, prev.pendingSaves - 1)
        }));
      }
    }
  }, [saveFunction, saveToLocalStorage, log]);

  // Manual save function
  const saveNow = useCallback(async (): Promise<void> => {
    if (pendingSaveRef.current) {
      return pendingSaveRef.current;
    }

    pendingSaveRef.current = performSave(dataRef.current);
    
    try {
      await pendingSaveRef.current;
    } finally {
      pendingSaveRef.current = null;
    }
  }, [performSave]);

  // Mark content as dirty to trigger auto-save
  const markDirty = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (hasUnsavedChanges && state.status !== 'saving' && state.status !== 'conflict') {
        saveNow();
      }
    }, interval);
  }, [interval, hasUnsavedChanges, state.status, saveNow]);

  // Resolve conflicts
  const resolveConflict = useCallback(async (resolution: 'local' | 'server' | 'merge'): Promise<void> => {
    if (!state.conflict) return;

    let resolvedData: T;
    
    switch (resolution) {
      case 'local':
        resolvedData = state.conflict.localVersion;
        break;
      case 'server':
        resolvedData = state.conflict.serverVersion;
        setHasUnsavedChanges(false);
        break;
      case 'merge':
        // Basic merge strategy - in practice, this would need domain-specific logic
        resolvedData = { ...state.conflict.serverVersion, ...state.conflict.localVersion };
        break;
      default:
        throw new Error('Invalid resolution strategy');
    }

    setState(prev => ({ ...prev, status: 'idle', conflict: undefined }));
    
    if (resolution !== 'server') {
      await performSave(resolvedData);
    }
  }, [state.conflict, performSave]);

  // Handle focus loss
  useEffect(() => {
    if (!saveOnFocusLoss) return;

    const handleFocusLoss = () => {
      if (hasUnsavedChanges && state.status !== 'saving' && state.status !== 'conflict') {
        saveNow();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss();
      }
    };

    window.addEventListener('blur', handleFocusLoss);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleFocusLoss);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveOnFocusLoss, hasUnsavedChanges, state.status, saveNow]);

  // Handle before unload
  useEffect(() => {
    if (!saveOnBeforeUnload) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Try to save quickly
        saveNow().catch(() => {
          // Fallback to localStorage if server save fails
          saveToLocalStorage(dataRef.current);
        });

        // Show confirmation dialog
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveOnBeforeUnload, hasUnsavedChanges, saveNow, saveToLocalStorage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    saveNow,
    markDirty,
    resolveConflict,
    hasUnsavedChanges,
    recover
  };
}

// Auto-save status component for UI feedback
export const AutoSaveStatus: React.FC<{ 
  state: AutoSaveState; 
  className?: string 
}> = ({ state, className = '' }) => {
  const getStatusText = () => {
    switch (state.status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return `Saved ${state.lastSaved ? `at ${state.lastSaved.toLocaleTimeString()}` : ''}`;
      case 'error':
        return `Error: ${state.error}`;
      case 'conflict':
        return 'Conflict detected - manual resolution required';
      default:
        return state.pendingSaves > 0 ? 'Changes pending...' : '';
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'saving':
        return 'text-blue-600';
      case 'saved':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'conflict':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (state.status === 'idle' && state.pendingSaves === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${getStatusColor()} ${className}`}>
      {state.status === 'saving' && (
        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      )}
      {state.status === 'saved' && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {state.status === 'error' && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      {state.status === 'conflict' && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      <span>{getStatusText()}</span>
    </div>
  );
};