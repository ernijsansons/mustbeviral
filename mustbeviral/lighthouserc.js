module.exports = {
  ci: {
    // Build configuration
    collect: {
      // URLs to test
      url: [
        'http://localhost:5173',
        'http://localhost:5173/dashboard',
        'http://localhost:5173/trends',
        'http://localhost:5173/analytics'
      ],
      // Lighthouse settings
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        // Use mobile simulation for performance testing
        preset: 'desktop',
        // Custom audit categories
        onlyCategories: ['performance', 'best-practices', 'seo', 'accessibility'],
        // Throttling settings
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        // Skip certain audits that might be flaky in CI
        skipAudits: [
          'canonical',
          'uses-http2',
          'bf-cache'
        ]
      },
      // Number of runs for more stable results
      numberOfRuns: 3,
      // Start local server automatically
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 15000
    },
    
    // Performance budget enforcement
    assert: {
      // Performance budgets
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        
        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }], // 100KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000000 }], // 1MB
        'resource-summary:font:size': ['warn', { maxNumericValue: 300000 }], // 300KB
        'resource-summary:total:size': ['error', { maxNumericValue: 2000000 }], // 2MB
        
        // Performance optimizations
        'unused-css-rules': ['warn', { maxNumericValue: 100000 }],
        'unused-javascript': ['warn', { maxNumericValue: 200000 }],
        'modern-image-formats': ['warn', { minScore: 0.8 }],
        'offscreen-images': ['warn', { minScore: 0.8 }],
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],
        'unminified-css': ['error', { minScore: 1 }],
        'unminified-javascript': ['error', { minScore: 1 }],
        'efficient-animated-content': ['warn', { minScore: 0.8 }],
        
        // Security and best practices
        'is-on-https': ['error', { minScore: 1 }],
        'uses-responsive-images': ['warn', { minScore: 0.8 }],
        'uses-optimized-images': ['warn', { minScore: 0.8 }],
        'uses-text-compression': ['error', { minScore: 1 }],
        'uses-rel-preconnect': ['warn', { minScore: 0.8 }],
        'preload-lcp-image': ['warn', { minScore: 0.8 }],
        
        // JavaScript performance
        'bootup-time': ['warn', { maxNumericValue: 3000 }],
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 3000 }],
        'long-tasks': ['warn', { maxNumericValue: 200 }],
        
        // Network efficiency
        'total-byte-weight': ['error', { maxNumericValue: 2000000 }],
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        'critical-request-chains': ['warn', { maxLength: 3 }]
      }
    },
    
    // Upload configuration (if using LHCI server)
    upload: {
      target: 'temporary-public-storage',
      // Alternative: use your own LHCI server
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: 'your-build-token'
    },
    
    // Server configuration (if running LHCI server locally)
    server: {
      port: 9001,
      storage: {
        storageMethod: 'fs',
        storagePath: './lhci-data'
      }
    }
  }
};