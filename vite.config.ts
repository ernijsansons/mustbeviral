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
    port: 5173,
    host: true,
    open: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
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
        // Advanced chunking strategy
        manualChunks: (id) => {
          // Core vendor chunk
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts';
            }
            if (id.includes('stripe')) {
              return 'payments';
            }
            if (id.includes('jose') || id.includes('bcrypt')) {
              return 'crypto';
            }
            if (id.includes('zod') || id.includes('immer')) {
              return 'utils';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('@cloudflare')) {
              return 'cloudflare';
            }
            // All other vendor deps
            return 'vendor';
          }
          // Application code splitting
          if (id.includes('src/lib/animations')) {
            return 'animations';
          }
          if (id.includes('src/lib/ml') || id.includes('src/lib/analytics')) {
            return 'analytics';
          }
          if (id.includes('src/lib/security') || id.includes('src/lib/auth')) {
            return 'auth';
          }
          if (id.includes('src/components/ui')) {
            return 'ui-components';
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