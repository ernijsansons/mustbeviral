#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Tracks bundle size, load times, and performance metrics
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PERFORMANCE_BUDGETS = {
  // Bundle size budgets (in bytes)
  totalBundle: 2 * 1024 * 1024, // 2MB
  jsBundle: 500 * 1024, // 500KB
  cssBundle: 100 * 1024, // 100KB
  vendorBundle: 800 * 1024, // 800KB
  
  // Performance timing budgets (in ms)
  firstContentfulPaint: 1500,
  largestContentfulPaint: 2500,
  timeToInteractive: 3500,
  totalBlockingTime: 200,
  
  // Core Web Vitals
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100
};

class PerformanceMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      bundleAnalysis: {},
      performanceMetrics: {},
      violations: [],
      recommendations: []
    };
  }

  async analyzeBundleSize() {
    console.log('📊 Analyzing bundle size...');
    
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('Build not found. Run npm run build first.');
    }

    // Calculate total bundle size
    const totalSize = this.calculateDirectorySize(distPath);
    
    // Analyze individual chunks
    const jsFiles = this.getFilesByExtension(distPath, '.js');
    const cssFiles = this.getFilesByExtension(distPath, '.css');
    
    const jsSize = jsFiles.reduce((sum, file) => sum + this.getFileSize(file), 0);
    const cssSize = cssFiles.reduce((sum, file) => sum + this.getFileSize(file), 0);
    
    // Categorize chunks
    const vendorSize = jsFiles
      .filter(file => file.includes('vendor') || file.includes('react-vendor'))
      .reduce((sum, file) => sum + this.getFileSize(file), 0);

    this.results.bundleAnalysis = {
      totalSize,
      jsSize,
      cssSize,
      vendorSize,
      assetCount: {
        js: jsFiles.length,
        css: cssFiles.length,
        images: this.getFilesByExtension(distPath, ['.png', '.jpg', '.jpeg', '.svg', '.webp']).length,
        fonts: this.getFilesByExtension(distPath, ['.woff', '.woff2', '.ttf', '.otf']).length
      },
      largestChunks: this.getLargestChunks(jsFiles, 5)
    };

    // Check budget violations
    this.checkBudgetViolations();
  }

  checkBudgetViolations() {
    const { bundleAnalysis } = this.results;
    
    if (bundleAnalysis.totalSize > PERFORMANCE_BUDGETS.totalBundle) {
      this.results.violations.push({
        type: 'bundle-size',
        metric: 'Total Bundle Size',
        actual: this.formatBytes(bundleAnalysis.totalSize),
        budget: this.formatBytes(PERFORMANCE_BUDGETS.totalBundle),
        severity: 'error'
      });
    }

    if (bundleAnalysis.jsSize > PERFORMANCE_BUDGETS.jsBundle) {
      this.results.violations.push({
        type: 'bundle-size',
        metric: 'JavaScript Bundle Size',
        actual: this.formatBytes(bundleAnalysis.jsSize),
        budget: this.formatBytes(PERFORMANCE_BUDGETS.jsBundle),
        severity: 'warning'
      });
    }

    if (bundleAnalysis.cssSize > PERFORMANCE_BUDGETS.cssBundle) {
      this.results.violations.push({
        type: 'bundle-size',
        metric: 'CSS Bundle Size',
        actual: this.formatBytes(bundleAnalysis.cssSize),
        budget: this.formatBytes(PERFORMANCE_BUDGETS.cssBundle),
        severity: 'warning'
      });
    }
  }

  generateRecommendations() {
    const { bundleAnalysis, violations } = this.results;
    
    // Bundle size recommendations
    if (bundleAnalysis.vendorSize > PERFORMANCE_BUDGETS.vendorBundle) {
      this.results.recommendations.push({
        type: 'optimization',
        priority: 'high',
        description: 'Consider splitting vendor bundles further',
        action: 'Implement webpack.optimization.splitChunks with specific vendor chunks',
        implementation: `
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                maxSize: 200000
              },
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                name: 'react-vendor',
                chunks: 'all'
              }
            }
          }
        `,
        estimatedSavings: '20-30% bundle size reduction'
      });
    }

    if (bundleAnalysis.largestChunks[0]?.size > 200 * 1024) {
      this.results.recommendations.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Large chunks detected - implement lazy loading',
        action: 'Convert large components to dynamic imports with React.lazy()',
        implementation: `
          const LazyComponent = React.lazy(() => import('./LargeComponent'));
          
          // Usage with Suspense
          <Suspense fallback={<LoadingSpinner />}>
            <LazyComponent />
          </Suspense>
        `,
        estimatedSavings: '15-25% initial load improvement'
      });
    }

    // Performance recommendations based on modern optimization techniques
    if (violations.some(v => v.type === 'bundle-size')) {
      this.results.recommendations.push({
        type: 'performance',
        priority: 'high',
        description: 'Enable aggressive tree-shaking and dead code elimination',
        action: 'Configure Webpack/Vite for optimal tree-shaking',
        implementation: `
          // Vite config
          build: {
            rollupOptions: {
              treeshake: {
                preset: 'recommended',
                moduleSideEffects: false
              }
            },
            minify: 'terser',
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log']
              }
            }
          }
        `,
        estimatedSavings: '10-20% bundle size reduction'
      });
    }

    // Advanced optimization recommendations
    this.results.recommendations.push({
      type: 'optimization',
      priority: 'high',
      description: 'Implement modern loading strategies',
      action: 'Add resource hints and optimize critical loading path',
      implementation: `
        // Add to HTML head
        <link rel="preload" href="/critical.css" as="style">
        <link rel="prefetch" href="/lazy-route.js" as="script">
        <link rel="preconnect" href="https://api.mustbeviral.com">
        
        // Implement service worker for caching
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js');
        }
      `,
      estimatedSavings: '30-50% initial load improvement'
    });

    // Image optimization recommendation
    this.results.recommendations.push({
      type: 'optimization',
      priority: 'medium',
      description: 'Implement next-gen image formats and optimization',
      action: 'Use WebP/AVIF images with fallbacks and responsive loading',
      implementation: `
        <picture>
          <source srcset="/image.avif" type="image/avif">
          <source srcset="/image.webp" type="image/webp">
          <img src="/image.jpg" alt="..." loading="lazy" decoding="async">
        </picture>
      `,
      estimatedSavings: '40-60% image size reduction'
    });

    // Bundle analysis recommendation
    this.results.recommendations.push({
      type: 'monitoring',
      priority: 'medium',
      description: 'Set up continuous bundle analysis',
      action: 'Integrate bundle analyzer into CI/CD pipeline',
      implementation: `
        // package.json script
        "analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js",
        
        // CI/CD integration
        - name: Bundle Analysis
          run: |
            npm run build:analyze
            npx bundlephobia-cli check package.json
      `,
      estimatedSavings: 'Ongoing performance monitoring'
    });

    // Code splitting by routes recommendation
    if (bundleAnalysis.assetCount.js > 5) {
      this.results.recommendations.push({
        type: 'optimization',
        priority: 'high',
        description: 'Implement route-based code splitting',
        action: 'Split application by routes using dynamic imports',
        implementation: `
          // Router with lazy loading
          const Dashboard = React.lazy(() => import('./pages/Dashboard'));
          const Analytics = React.lazy(() => import('./pages/Analytics'));
          
          const AppRouter = () => (
            <Router>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                </Routes>
              </Suspense>
            </Router>
          );
        `,
        estimatedSavings: '30-50% initial bundle reduction'
      });
    }
  }

  calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        totalSize += this.calculateDirectorySize(filePath);
      } else {
        totalSize += fs.statSync(filePath).size;
      }
    }
    
    return totalSize;
  }

  getFilesByExtension(dirPath, extensions) {
    const exts = Array.isArray(extensions) ? extensions : [extensions];
    const files = [];
    
    const scanDirectory = (currentPath) => {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        
        if (item.isDirectory()) {
          scanDirectory(itemPath);
        } else {
          const ext = path.extname(item.name);
          if (exts.includes(ext)) {
            files.push(itemPath);
          }
        }
      }
    };
    
    scanDirectory(dirPath);
    return files;
  }

  getFileSize(filePath) {
    return fs.statSync(filePath).size;
  }

  getLargestChunks(files, count = 5) {
    return files
      .map(file => ({
        name: path.basename(file),
        path: file,
        size: this.getFileSize(file)
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, count)
      .map(chunk => ({
        ...chunk,
        sizeFormatted: this.formatBytes(chunk.size)
      }));
  }

  formatBytes(bytes) {
    if (bytes === 0) {return '0 Bytes';}
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    console.log('\n📈 Performance Monitoring Report');
    console.log('='.repeat(50));
    console.log(`Timestamp: ${this.results.timestamp}`);
    
    // Bundle Analysis Report
    console.log('\n📊 Bundle Analysis:');
    const { bundleAnalysis } = this.results;
    console.log(`  Total Size: ${this.formatBytes(bundleAnalysis.totalSize)}`);
    console.log(`  JavaScript: ${this.formatBytes(bundleAnalysis.jsSize)}`);
    console.log(`  CSS: ${this.formatBytes(bundleAnalysis.cssSize)}`);
    console.log(`  Vendor: ${this.formatBytes(bundleAnalysis.vendorSize)}`);
    
    console.log('\n📁 Asset Count:');
    Object.entries(bundleAnalysis.assetCount).forEach(([type, count]) => {
      console.log(`  ${type.toUpperCase()}: ${count} files`);
    });

    console.log('\n🔥 Largest Chunks:');
    bundleAnalysis.largestChunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.name} - ${chunk.sizeFormatted}`);
    });

    // Violations Report
    if (this.results.violations.length > 0) {
      console.log('\n⚠️  Budget Violations:');
      this.results.violations.forEach(violation => {
        const emoji = violation.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${emoji} ${violation.metric}: ${violation.actual} (budget: ${violation.budget})`);
      });
    } else {
      console.log('\n✅ All performance budgets passed!');
    }

    // Recommendations Report
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        const priorityEmoji = rec.priority === 'high' ? '🔴' : '🟡';
        console.log(`  ${index + 1}. ${priorityEmoji} ${rec.description}`);
        console.log(`     Action: ${rec.action}`);
        console.log(`     Impact: ${rec.estimatedSavings}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }

  async saveReport() {
    const reportPath = path.join(process.cwd(), 'performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  async run() {
    try {
      console.log('🚀 Starting performance monitoring...');
      
      await this.analyzeBundleSize();
      this.generateRecommendations();
      this.generateReport();
      await this.saveReport();
      
      // Exit with error code if there are critical violations
      const criticalViolations = this.results.violations.filter(v => v.severity === 'error');
      if (criticalViolations.length > 0) {
        console.log('\n❌ Critical performance violations detected!');
        process.exit(1);
      }
      
      console.log('\n✅ Performance monitoring completed successfully!');
      
    } catch (error) {
      console.error('❌ Performance monitoring failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new PerformanceMonitor();
  monitor.run();
}

export default PerformanceMonitor;