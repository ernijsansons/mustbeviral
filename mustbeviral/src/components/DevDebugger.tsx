// Development Mode Debugger
import React, { _useState, useEffect } from 'react';
import { env } from '../lib/env';

interface DebugInfo {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

export function DevDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);

  // Only show in development
  if (env.APP_ENV !== 'development') {
    return null;
  }

  useEffect(() => {
    // Capture console logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addDebugLog = (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => {
      setDebugLogs(prev => [...prev.slice(-49), {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        data
      }]);
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      addDebugLog('info', args.join(' '), args.length > 1 ? args.slice(1) : undefined);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addDebugLog('warn', args.join(' '), args.length > 1 ? args.slice(1) : undefined);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addDebugLog('error', args.join(' '), args.length > 1 ? args.slice(1) : undefined);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Open Debug Panel"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-80 bg-gray-900 text-green-400 rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
        <h3 className="font-mono text-sm">🐛 Debug Console</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-2 font-mono text-xs">
        {debugLogs.map((log, _index) => (
          <div key={index} className={`mb-1 ${
            log.level === 'error' ? 'text-red-400' :
            log.level === 'warn' ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            <span className="text-gray-500">[{log.timestamp}]</span>
            <span className={`ml-2 ${
              log.level === 'error' ? 'text-red-300' :
              log.level === 'warn' ? 'text-yellow-300' :
              'text-blue-300'
            }`}>
              {log.level.toUpperCase()}
            </span>
            <span className="ml-2">{log.message}</span>
          </div>
        ))}
        {debugLogs.length === 0 && (
          <div className="text-gray-500 text-center mt-8">
            No debug logs yet...
          </div>
        )}
      </div>

      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={() => setDebugLogs([])}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => {
              const logs = debugLogs.map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`).join('\n');
              navigator.clipboard.writeText(logs);
            }}
            className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

export default DevDebugger;