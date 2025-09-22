// Universe-Bending Theme Provider
import React, { _createContext, useContext, useEffect, useState } from 'react';
// Safely import design tokens with fallback
let designTokens: unknown = {};
try {
  const tokens = require('../lib/design/tokens');
  designTokens = tokens.designTokens || tokens.default || {};
} catch (error: unknown) {
  console.warn('Design tokens not available, using fallback:', error);
  // Basic fallback tokens
  designTokens = {
    colors: {
      primary: {
        500: '#3b82f6',
        600: '#2563eb',
      },
      neutral: {
        0: '#ffffff',
        50: '#f9fafb',
        900: '#111827',
        950: '#030712',
      }
    },
    spacing: {},
    typography: {},
    animation: {},
    breakpoints: {}
  };
}

type ThemeMode = 'light' | 'dark' | 'cosmic' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  tokens: typeof designTokens;
  isAnimationEnabled: boolean;
  setAnimationEnabled: (enabled: boolean) => void;
  cosmicEffectsLevel: 'minimal' | 'moderate' | 'maximum';
  setCosmicEffectsLevel: (level: 'minimal' | 'moderate' | 'maximum') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  enableSystemTheme?: boolean;
}

export function ThemeProvider({ _children,
  defaultMode = 'auto',
  enableSystemTheme = true,
}: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [isAnimationEnabled, setAnimationEnabled] = useState(true);
  const [cosmicEffectsLevel, setCosmicEffectsLevel] = useState<'minimal' | 'moderate' | 'maximum'>('moderate');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    const savedAnimations = localStorage.getItem('theme-animations');
    const savedEffects = localStorage.getItem('theme-cosmic-effects') as 'minimal' | 'moderate' | 'maximum';

    if (savedMode) {
      setMode(savedMode);
    } else if (enableSystemTheme) {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(systemPrefersDark ? 'dark' : 'light');
    }

    if (savedAnimations !== null) {
      setAnimationEnabled(savedAnimations === 'true');
    } else {
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setAnimationEnabled(!prefersReducedMotion);
    }

    if (savedEffects) {
      setCosmicEffectsLevel(savedEffects);
    }
  }, [enableSystemTheme]);

  // Listen to system theme changes
  useEffect(() => {
    if (!enableSystemTheme || mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setMode(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, enableSystemTheme]);

  // Apply theme to document (safely)
  useEffect(() => {
    try {
      const root = document.documentElement;
      const body = document.body;

      // Remove existing theme classes
      root.classList.remove('theme-light', 'theme-dark', 'theme-cosmic');
      body.classList.remove('animations-disabled', 'cosmic-minimal', 'cosmic-moderate', 'cosmic-maximum');

      // Apply theme class
      let effectiveMode = mode;
      if (mode === 'auto') {
        effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      root.classList.add(`theme-${effectiveMode}`);

      // Apply animation preference
      if (!isAnimationEnabled) {
        body.classList.add('animations-disabled');
      }

      // Apply cosmic effects level
      body.classList.add(`cosmic-${cosmicEffectsLevel}`);

      // Set CSS custom properties for dynamic theming (safely)
      const setThemeProperties = () => {
        try {
          if (effectiveMode === 'cosmic') {
            // Cosmic theme - extra universe effects
            root.style.setProperty('--bg-primary', 'linear-gradient(135deg, #0F0C29 0%, #24243e 50%, #302b63 100%)');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--surface-primary', 'rgba(255, 255, 255, 0.1)');
            root.style.setProperty('--border-primary', 'rgba(162, 155, 254, 0.3)');
          } else if (effectiveMode === 'dark') {
            // Dark theme
            root.style.setProperty('--bg-primary', '#030712');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--surface-primary', '#111827');
            root.style.setProperty('--border-primary', '#374151');
          } else {
            // Light theme
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--text-primary', '#030712');
            root.style.setProperty('--surface-primary', '#f9fafb');
            root.style.setProperty('--border-primary', '#e5e7eb');
          }
        } catch (error: unknown) {
          console.warn('Failed to set CSS custom properties:', error);
        }
      };

      setThemeProperties();
    } catch (error: unknown) {
      console.warn('Theme application failed:', error);
    }
  }, [mode, isAnimationEnabled, cosmicEffectsLevel]);

  // Save preferences to localStorage
  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  const handleSetAnimationEnabled = (enabled: boolean) => {
    setAnimationEnabled(enabled);
    localStorage.setItem('theme-animations', enabled.toString());
  };

  const handleSetCosmicEffectsLevel = (level: 'minimal' | 'moderate' | 'maximum') => {
    setCosmicEffectsLevel(level);
    localStorage.setItem('theme-cosmic-effects', level);
  };

  const contextValue: ThemeContextType = { _mode,
    setMode: handleSetMode,
    tokens: designTokens,
    isAnimationEnabled,
    setAnimationEnabled: handleSetAnimationEnabled,
    cosmicEffectsLevel,
    setCosmicEffectsLevel: handleSetCosmicEffectsLevel,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme utility components
export function ThemeToggle() {
  const { _mode, setMode } = useTheme();

  const handleToggle = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'cosmic', 'auto'];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMode(nextMode);
  };

  const getIcon = () => {
    switch (mode) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'cosmic':
        return '🌌';
      case 'auto':
        return '🔄';
      default:
        return '🌙';
    }
  };

  const getLabel = () => {
    switch (mode) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'cosmic':
        return 'Cosmic Mode';
      case 'auto':
        return 'Auto Mode';
      default:
        return 'Toggle Theme';
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
      aria-label={getLabel()}
      title={getLabel()}
    >
      <span className="text-lg" role="img" aria-label={getLabel()}>
        {getIcon()}
      </span>
    </button>
  );
}

export function CosmicEffectsControl() {
  const { _cosmicEffectsLevel, setCosmicEffectsLevel } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="cosmic-effects" className="text-sm font-medium text-neutral-700">
        Cosmic Effects:
      </label>
      <select
        id="cosmic-effects"
        value={cosmicEffectsLevel}
        onChange={(_e) => setCosmicEffectsLevel(e.target.value as 'minimal' | 'moderate' | 'maximum')}
        className="text-sm border border-neutral-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="minimal">Minimal</option>
        <option value="moderate">Moderate</option>
        <option value="maximum">Maximum</option>
      </select>
    </div>
  );
}

export function AnimationToggle() {
  const { _isAnimationEnabled, setAnimationEnabled } = useTheme();

  return (
    <label className="inline-flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isAnimationEnabled}
        onChange={(_e) => setAnimationEnabled(e.target.checked)}
        className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
      />
      <span className="text-sm font-medium text-neutral-700">
        Enable Animations
      </span>
    </label>
  );
}