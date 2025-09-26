import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression2'

// Advanced Vite Configuration for Enterprise Performance
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  
  return {
    plugins: [
      // React plugin with performance optimizations
      react({
        jsxRuntime: 'automatic',
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: isProduction ? [
            // Remove console statements in production
            ['transform-remove-console', { exclude: ['error', 'warn'] }],
            // Dead code elimination
            ['babel-plugin-transform-remove-undefined'],
            // Inline constants
            ['babel-plugin-transform-inline-environment-variables']
          ] : []
        }
      }),

      // Bundle analysis (only when explicitly enabled)
      process.env.ANALYZE && visualizer({
        open: true,
        filename: 'dist/bundle-analysis.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap' // or 'sunburst', 'network'
      }),

      // Advanced compression
      isProduction && compression({
        algorithm: 'brotliCompress',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 1024,
        compressionOptions: {
          level: 11, // Maximum compression
        },
        deleteOriginFile: false,
      }),

      // Gzip fallback
      isProduction && compression({
        algorithm: 'gzip',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 1024,
        compressionOptions: {
          level: 9,
        },
        deleteOriginFile: false,
      }),

      // PWA support for offline functionality
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   workbox: {
      //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      //     runtimeCaching: [
      //       {
      //         urlPattern: /^https:\/\/api\.mustbeviral\.com\//,
      //         handler: 'CacheFirst',
      //         options: {
      //           cacheName: 'api-cache',
      //           expiration: {
      //             maxEntries: 100,
      //             maxAgeSeconds: 60 * 60 * 24 // 24 hours
      //           }
      //         }
      //       }
      //     ]
      //   }
      // })

    ].filter(Boolean),

    // Path resolution for cleaner imports
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/lib': path.resolve(__dirname, './src/lib'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/styles': path.resolve(__dirname, './src/styles'),
        '@/assets': path.resolve(__dirname, './src/assets'),
        '@/utils': path.resolve(__dirname, './src/lib/utils'),
      },
      // Optimize module resolution
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      mainFields: ['browser', 'module', 'main']
    },

    // Global constants for runtime optimization
    define: {
      __DEV__: JSON.stringify(isDevelopment),
      __PROD__: JSON.stringify(isProduction),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      // Feature flags
      __ENABLE_ANALYTICS__: JSON.stringify(process.env.ENABLE_ANALYTICS !== 'false'),
      __ENABLE_ERROR_REPORTING__: JSON.stringify(process.env.ENABLE_ERROR_REPORTING !== 'false'),
    },

    // Environment variables prefix
    envPrefix: ['VITE_', 'REACT_APP_'],

    // Development server configuration
    server: {
      port: 5173,
      host: true,
      open: true,
      cors: true,
      // HMR optimizations
      hmr: {
        overlay: true,
        port: 5174
      },
      // Proxy configuration for API
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          ws: true, // WebSocket support
        },
        '/socket.io': {
          target: process.env.VITE_WS_URL || 'http://localhost:3000',
          changeOrigin: true,
          ws: true,
        }
      }
    },

    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
      open: true
    },

    // Build configuration with enterprise optimizations
    build: {
      target: ['es2020', 'chrome87', 'firefox78', 'safari14', 'edge88'],
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isDevelopment ? true : 'hidden', // Hidden sourcemaps for production
      minify: isProduction ? 'terser' : false,
      
      // Terser configuration for maximum optimization
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 3, // Multiple passes for better compression
          unsafe: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_methods: true,
          module: true,
          toplevel: true,
        },
        mangle: {
          toplevel: true,
          safari10: true,
        },
        format: {
          comments: false,
        },
      } : {},

      // CSS code splitting for better caching
      cssCodeSplit: true,
      
      // Asset inlining threshold
      assetsInlineLimit: 4096, // 4KB

      // Chunk size warning threshold
      chunkSizeWarningLimit: 1000, // 1MB

      // Advanced Rollup configuration
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          // Additional entry points can be added here
        },
        
        output: {
          // Enterprise-grade chunking strategy
          manualChunks: (id) => {
            // Vendor chunk splitting for optimal caching
            if (id.includes('node_modules')) {
              // Core React libraries (highest priority - changes rarely)
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor'
              }
              
              // State management
              if (id.includes('@tanstack/react-query') || id.includes('zustand') || id.includes('redux')) {
                return 'state-vendor'
              }
              
              // Routing
              if (id.includes('wouter') || id.includes('react-router')) {
                return 'router-vendor'
              }
              
              // UI libraries
              if (id.includes('lucide-react') || id.includes('@radix-ui') || id.includes('framer-motion')) {
                return 'ui-vendor'
              }
              
              // Charts and visualizations
              if (id.includes('recharts') || id.includes('d3') || id.includes('chart.js')) {
                return 'charts-vendor'
              }
              
              // Payment and crypto
              if (id.includes('stripe') || id.includes('crypto') || id.includes('jose')) {
                return 'crypto-vendor'
              }
              
              // AI and ML libraries
              if (id.includes('@langchain') || id.includes('openai') || id.includes('tensorflow')) {
                return 'ai-vendor'
              }
              
              // Cloudflare and edge computing
              if (id.includes('@cloudflare') || id.includes('drizzle')) {
                return 'cloudflare-vendor'
              }
              
              // Utilities (smaller, more stable libraries)
              if (id.includes('clsx') || id.includes('class-variance-authority') || 
                  id.includes('tailwind') || id.includes('date-fns') || id.includes('lodash')) {
                return 'utils-vendor'
              }
              
              // Large but less frequently used libraries
              if (id.includes('monaco-editor') || id.includes('codemirror')) {
                return 'editor-vendor'
              }
              
              // Everything else goes to common vendor
              return 'common-vendor'
            }
            
            // Application code splitting
            if (id.includes('src/')) {
              // Core application components (loaded on every route)
              if (id.includes('src/components/layouts') || 
                  id.includes('src/components/ui') || 
                  id.includes('src/lib/auth') ||
                  id.includes('src/hooks')) {
                return 'app-core'
              }
              
              // Feature-based chunks (lazy loaded)
              if (id.includes('src/components/analytics') || id.includes('src/lib/analytics')) {
                return 'analytics-feature'
              }
              
              if (id.includes('src/components/marketplace') || id.includes('src/lib/marketplace')) {
                return 'marketplace-feature'
              }
              
              if (id.includes('src/components/creator') || id.includes('src/lib/creator')) {
                return 'creator-feature'
              }
              
              if (id.includes('src/lib/ai') || id.includes('src/agents')) {
                return 'ai-feature'
              }
              
              if (id.includes('src/lib/collaboration') || id.includes('src/components/collaboration')) {
                return 'collaboration-feature'
              }
              
              if (id.includes('src/pages')) {
                // Page-based chunks
                const pageName = id.match(/src\/pages\/([^/]+)/)?.[1]
                if (pageName) {
                  return `page-${pageName.toLowerCase()}`
                }
              }
              
              // Performance and monitoring utilities
              if (id.includes('src/lib/performance') || 
                  id.includes('src/lib/monitoring') ||
                  id.includes('src/lib/errors')) {
                return 'performance-utils'
              }
              
              // Security utilities
              if (id.includes('src/lib/security') || 
                  id.includes('src/lib/validation') ||
                  id.includes('src/middleware')) {
                return 'security-utils'
              }
            }
            
            // Default chunk
            return 'main'
          },

          // Optimized asset naming for better caching
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.')
            const extType = info?.[info.length - 1] || 'asset'
            
            // Images with content hash for long-term caching
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif)$/i.test(assetInfo.name || '')) {
              return `assets/images/[name]-[hash][extname]`
            }
            
            // Fonts with content hash
            if (/\.(woff2?|ttf|otf|eot)$/i.test(assetInfo.name || '')) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            
            // CSS files
            if (/\.css$/i.test(assetInfo.name || '')) {
              return `assets/styles/[name]-[hash][extname]`
            }
            
            // Videos and audio
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i.test(assetInfo.name || '')) {
              return `assets/media/[name]-[hash][extname]`
            }
            
            // Everything else
            return `assets/[ext]/[name]-[hash][extname]`
          },

          // JavaScript chunks with content hash
          chunkFileNames: (chunkInfo) => {
            // Feature chunks get descriptive names
            if (chunkInfo.name.includes('feature') || chunkInfo.name.includes('vendor')) {
              return `assets/js/[name]-[hash].js`
            }
            // Everything else gets generic naming
            return `assets/js/chunk-[hash].js`
          },

          // Entry files
          entryFileNames: 'assets/js/[name]-[hash].js',
        },

        // Tree-shaking configuration for maximum optimization
        treeshake: {
          moduleSideEffects: (id) => {
            // Keep side effects for these modules
            if (id.includes('polyfill') || 
                id.includes('global.css') || 
                id.includes('index.css')) {
              return true
            }
            return false
          },
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
          unknownGlobalSideEffects: false,
        },

        // External dependencies (for micro-frontend architecture)
        external: (id) => {
          // Keep everything bundled for now
          return false
        }
      },

      // CSS optimization
      cssMinify: 'lightningcss',
      
      // Report compressed size
      reportCompressedSize: true,
      
      // Write bundle info for analysis
      write: true,

      // Build performance optimizations
      watch: isDevelopment ? {
        include: ['src/**'],
        exclude: ['node_modules/**', 'dist/**']
      } : undefined,
    },

    // Dependency optimization
    optimizeDeps: {
      // Pre-bundle these dependencies for faster dev server startup
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'wouter',
        'lucide-react',
        '@tanstack/react-query',
        'clsx',
        'class-variance-authority',
        'tailwind-merge'
      ],
      
      // Exclude problematic or large dependencies
      exclude: [
        '@cloudflare/workers-types',
      ],

      // ESBuild options for dependency optimization
      esbuildOptions: {
        target: 'es2020',
        define: {
          global: 'globalThis',
        },
        // Keep JSX for React 18
        jsx: 'automatic',
        // Optimize for speed
        minify: false,
        // Source maps for debugging
        sourcemap: isDevelopment,
      },

      // Force optimization of these dependencies
      force: isDevelopment ? [] : [
        'react',
        'react-dom'
      ],
    },

    // ESBuild configuration for transpilation
    esbuild: isProduction ? {
      // Production optimizations
      pure: ['console.log', 'console.debug', 'console.trace'],
      legalComments: 'none',
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      treeShaking: true,
      // Target modern browsers for smaller output
      target: 'es2020',
      // JSX configuration
      jsx: 'automatic',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    } : {
      // Development optimizations
      target: 'es2020',
      jsx: 'automatic',
    },

    // CSS configuration
    css: {
      // PostCSS configuration
      postcss: {
        plugins: [
          // Tailwind CSS
          require('tailwindcss'),
          require('autoprefixer'),
          // Production-only optimizations
          ...(isProduction ? [
            require('@fullhuman/postcss-purgecss')({
              content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
              defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
              safelist: {
                standard: [/^(bg|text|border|shadow|ring|rounded|p|m|w|h)-/, /^dark:/],
                deep: [/^lucide-/, /^recharts-/],
                greedy: [/^transition-/, /^duration-/, /^ease-/]
              }
            }),
            require('cssnano')({
              preset: ['advanced', {
                autoprefixer: false,
                cssDeclarationSorter: false,
                discardComments: { removeAll: true },
                mergeIdents: false,
                normalizeUrl: false,
                reduceIdents: false,
                zindex: false
              }]
            })
          ] : [])
        ]
      },
      
      // CSS modules configuration
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isProduction 
          ? '[hash:base64:5]'
          : '[name]__[local]__[hash:base64:5]'
      },

      // Lightning CSS for ultra-fast processing
      transformer: 'lightningcss',
      lightningcss: {
        targets: {
          chrome: 87,
          firefox: 78,
          safari: 14,
          edge: 88
        },
        drafts: {
          nesting: true,
          customMedia: true
        }
      }
    },

    // Performance optimizations
    performance: {
      // Configure performance hints
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 500000, // 500KB
      maxEntrypointSize: 1000000, // 1MB
    },

    // Worker configuration for web workers
    worker: {
      format: 'es',
      plugins: [
        // Same plugins for workers
        react()
      ],
    },

    // Test configuration
    test: isDevelopment ? {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}'
        ]
      }
    } : undefined,

    // Experimental features
    experimental: {
      // Enable build parallelization
      renderBuiltUrl: (filename) => {
        // Custom URL transformation for CDN
        if (process.env.CDN_URL) {
          return `${process.env.CDN_URL}/${filename}`
        }
        return filename
      }
    },

    // Logging configuration
    logLevel: isDevelopment ? 'info' : 'warn',
    clearScreen: false, // Keep terminal history visible

    // Custom logger for enterprise monitoring
    customLogger: {
      info: (msg) => console.log(`[VITE] ${msg}`),
      warn: (msg) => console.warn(`[VITE] ${msg}`),
      error: (msg) => console.error(`[VITE] ${msg}`),
      warnOnce: (msg) => console.warn(`[VITE] ${msg}`),
      hasWarned: false,
    },
  }
})