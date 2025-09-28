import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression2'

// Advanced Vite Configuration for Bundle Optimization
export default defineConfig({
  plugins: [
    react({
      // Use automatic JSX runtime for smaller bundle
      jsxRuntime: 'automatic',
    }),
    // Bundle analysis plugin (only in analyze mode)
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
    // Compression plugin for production
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 10240,
      deleteOriginFile: false,
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/styles': path.resolve(__dirname, './src/styles'),
    },
  },

  define: {
    // Global feature flags for runtime optimization
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },

  envPrefix: ['VITE_'],

  server: {
    port: parseInt(process.env.VITE_PORT || '5173'),
    host: process.env.VITE_HOST || true,
    open: process.env.VITE_OPEN !== 'false',
    cors: true,
    strictPort: false, // Allow fallback to different port if busy
  },

  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for production debugging
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'], // Only remove log and debug, keep warn and error
        passes: 2,
      },
      format: {
        comments: false,
      },
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Advanced chunking strategy with dynamic imports and bundle optimization
        manualChunks: (id) => {
          // Core vendor chunks (critical path) - optimized for HTTP/2 parallelization
          if (id.includes('node_modules')) {
            // Split React into smaller chunks for better caching
            if (id.includes('react-dom')) {
              return 'react-dom';
            }
            if (id.includes('react') && !id.includes('react-dom')) {
              return 'react';
            }
            // Query management - high priority
            if (id.includes('@tanstack/react-query')) {
              return 'react-query';
            }
            // Routing - high priority
            if (id.includes('wouter')) {
              return 'router';
            }
            // Charts and visualization - lazy load
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts-vendor';
            }
            // Payment processing - lazy load
            if (id.includes('stripe')) {
              return 'payments-vendor';
            }
            // Cryptography - security critical
            if (id.includes('jose') || id.includes('bcrypt')) {
              return 'crypto-vendor';
            }
            // Utility libraries - medium priority
            if (id.includes('zod') || id.includes('immer')) {
              return 'utils-vendor';
            }
            // Icons - lazy load, cached
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Cloudflare specific - infrastructure
            if (id.includes('@cloudflare') || id.includes('drizzle')) {
              return 'cloudflare-vendor';
            }
            // AI libraries - lazy load
            if (id.includes('@langchain')) {
              return 'ai-vendor';
            }
            // UI utilities - high priority
            if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
              return 'ui-utils-vendor';
            }
            // All other vendor deps - lowest priority
            return 'vendor-misc';
          }
          
          // Application code splitting (lazy-loaded chunks)
          if (id.includes('src/lib/animations')) {
            return 'animations';
          }
          if (id.includes('src/lib/ml') || id.includes('src/lib/analytics')) {
            return 'analytics';
          }
          if (id.includes('src/lib/ai')) {
            return 'ai-engine';
          }
          if (id.includes('src/lib/security') || id.includes('src/lib/auth')) {
            return 'auth';
          }
          if (id.includes('src/lib/database')) {
            return 'database';
          }
          if (id.includes('src/components/ui')) {
            return 'ui-components';
          }
          if (id.includes('src/pages')) {
            return 'pages';
          }
          if (id.includes('src/lib/collaboration')) {
            return 'collaboration';
          }
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|ttf|otf|eot)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
      // Tree-shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    // Target modern browsers for smaller bundles
    target: ['es2020', 'chrome87', 'firefox78', 'safari14', 'edge88'],
    // CSS optimizations
    cssMinify: 'lightningcss',
    // Aggressive code splitting for better caching
    assetsInlineLimit: 4096, // Inline smaller assets
    modulePreload: {
      polyfill: false, // Remove polyfill for modern browsers
    },
    reportCompressedSize: false, // Faster builds
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      'lucide-react',
      '@tanstack/react-query',
    ],
    exclude: [
      '@cloudflare/workers-types',
    ],
    esbuildOptions: {
      target: 'es2020',
      define: {
        global: 'globalThis',
      },
    },
  },

  // Production-specific optimizations
  ...(process.env.NODE_ENV === 'production' && {
    esbuild: {
      pure: ['console.log', 'console.debug'],
      legalComments: 'none',
    },
  }),
})