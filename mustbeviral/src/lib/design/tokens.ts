// Universe-Bending Design Tokens
// Foundational constants for the design system

export const designTokens = {
  // Color System - Universe-Inspired Palettes
  colors: {
    // Primary Universe Colors
    universe: {
      cosmic: '#0F0C29',      // Deep space
      nebula: '#24243e',      // Space mist
      starlight: '#302b63',   // Distant stars
      plasma: '#6c5ce7',      // Energy fields
      quantum: '#a29bfe',     // Quantum effects
      aurora: '#fd79a8',      // Cosmic aurora
      supernova: '#fdcb6e',   // Stellar explosion
      galaxy: '#e17055',      // Galaxy cores
    },

    // Functional Colors
    primary: {
      50: '#f0f4ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b',
    },

    // Semantic Colors
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },

    // Neutral Grays
    neutral: {
      0: '#ffffff',
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },

    // Gradient Sets
    gradients: {
      cosmic: 'linear-gradient(135deg, #0F0C29 0%, #24243e 50%, #302b63 100%)',
      plasma: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 50%, #fd79a8 100%)',
      aurora: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 50%, #e17055 100%)',
      energy: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      nebula: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      quantum: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  },

  // Typography System
  typography: {
    fonts: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
      display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
    },

    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
      '7xl': '4.5rem',   // 72px
      '8xl': '6rem',     // 96px
      '9xl': '8rem',     // 128px
    },

    weights: {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },

    lineHeights: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },

    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // Spacing System (based on 4px grid)
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
    36: '9rem',       // 144px
    40: '10rem',      // 160px
    44: '11rem',      // 176px
    48: '12rem',      // 192px
    52: '13rem',      // 208px
    56: '14rem',      // 224px
    60: '15rem',      // 240px
    64: '16rem',      // 256px
    72: '18rem',      // 288px
    80: '20rem',      // 320px
    96: '24rem',      // 384px
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows - Universe-themed
  shadows: {
    // Standard shadows
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

    // Universe-themed glows
    cosmic: '0 0 20px rgba(108, 92, 231, 0.4), 0 0 40px rgba(108, 92, 231, 0.2)',
    plasma: '0 0 20px rgba(162, 155, 254, 0.4), 0 0 40px rgba(162, 155, 254, 0.2)',
    aurora: '0 0 20px rgba(253, 121, 168, 0.4), 0 0 40px rgba(253, 121, 168, 0.2)',
    quantum: '0 0 20px rgba(79, 172, 254, 0.4), 0 0 40px rgba(79, 172, 254, 0.2)',
    energy: '0 0 30px rgba(102, 126, 234, 0.5), 0 0 60px rgba(118, 75, 162, 0.3)',
  },

  // Z-Index Scale
  zIndex: {
    auto: 'auto',
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    max: 2147483647,
  },

  // Animation System
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '750ms',
      slowest: '1000ms',
    },

    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      // Custom universe easing
      cosmic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      quantum: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      energy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },

    // Keyframes for universe effects
    keyframes: {
      float: {
        '0%, 100%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-20px)' },
      },
      pulse: {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
      },
      shimmer: {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(100%)' },
      },
      rotate: {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
      },
      scale: {
        '0%, 100%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
      },
    },
  },

  // Breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Universe-specific constants
  universe: {
    // Particle effects
    particles: {
      count: {
        low: 50,
        medium: 100,
        high: 200,
        ultra: 500,
      },
      size: {
        small: '1px',
        medium: '2px',
        large: '3px',
      },
    },

    // 3D transformations
    transform3d: {
      perspective: '1000px',
      depth: {
        shallow: '50px',
        medium: '100px',
        deep: '200px',
        infinite: '500px',
      },
    },

    // Cosmic timing
    timing: {
      orbit: '20s',
      pulse: '2s',
      twinkle: '1.5s',
      drift: '30s',
    },
  },
} as const;

// Type definitions for design tokens
export type DesignTokens = typeof designTokens;
export type ColorTokens = typeof designTokens.colors;
export type TypographyTokens = typeof designTokens.typography;
export type SpacingTokens = typeof designTokens.spacing;
export type AnimationTokens = typeof designTokens.animation;

// Utility functions for accessing tokens
export const getColor = (path: string): string => {
  const keys = path.split('.');
  let value: unknown = designTokens.colors;

  for (const key of keys) {
    value = value?.[key];
  }

  return value ?? '#000000';
};

export const getSpacing = (key: keyof typeof designTokens.spacing): string => {
  return designTokens.spacing[key];
};

export const getShadow = (key: keyof typeof designTokens.shadows): string => {
  return designTokens.shadows[key];
};

export const getGradient = (key: keyof typeof designTokens.colors.gradients): string => {
  return designTokens.colors.gradients[key];
};