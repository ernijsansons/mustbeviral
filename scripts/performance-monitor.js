#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Monitors application performance metrics and reports bottlenecks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  firstContentfulPaint: 2000, // 2 seconds
  largestContentfulPaint: 4000, // 4 seconds
  totalBlockingTime: 500, // 0.5 seconds
  cumulativeLayoutShift: 0.1,
  speedIndex: 3000, // 3 seconds
  bundleSize: 1024 * 1024, // 1MB
  serverResponseTime: 200, // 200ms
  memoryUsage: 512 * 1024 * 1024, // 512MB
};

class PerformanceMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      metrics: {},
      violations: [],
      recommendations: [],
    };
  }

  // Monitor bundle size
  async checkBundleSize() {
    console.log('📦 Analyzing bundle size...');
    
    try {
      const distPath = path.join(__dirname, '../mustbeviral/dist');
      if (!fs.existsSync(distPath)) {
        console.log('⚠️  Build directory not found. Run npm run build first.');
        return;
      }

      // Get bundle sizes
      const jsFiles = this.getFilesWithExtension(distPath, '.js');
      const cssFiles = this.getFilesWithExtension(distPath, '.css');
      
      const totalJSSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
      const totalCSSSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSize = totalJSSize + totalCSSSize;

      this.results.metrics.bundleSize = {
        totalSize,
        jsSize: totalJSSize,
        cssSize: totalCSSSize,
        files: {
          js: jsFiles.length,
          css: cssFiles.length,
        },
      };

      // Check thresholds
      if (totalSize > PERFORMANCE_THRESHOLDS.bundleSize) {
        this.results.violations.push({
          type: 'bundleSize',
          actual: totalSize,
          threshold: PERFORMANCE_THRESHOLDS.bundleSize,
          impact: 'high',
          message: `Bundle size (${this.formatBytes(totalSize)}) exceeds threshold (${this.formatBytes(PERFORMANCE_THRESHOLDS.bundleSize)})`,
        });

        this.results.recommendations.push({
          category: 'bundleOptimization',
          priority: 'high',
          action: 'Implement code splitting and tree shaking',
          impact: 'Reduce initial load time by 40-60%',
        });
      }

      console.log(`✅ Bundle analysis complete: ${this.formatBytes(totalSize)}`);
    } catch (error) {
      console.error('❌ Bundle size analysis failed:', error.message);
    }
  }

  // Monitor server performance
  async checkServerPerformance() {
    console.log('🖥️  Analyzing server performance...');
    
    try {
      // Test health endpoint response time
      const startTime = Date.now();
      const response = await fetch('http://localhost:3000/health');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json();
        
        this.results.metrics.server = {
          responseTime,
          uptime: healthData.uptime,
          memory: healthData.memory,
          workerId: healthData.worker_id,
        };

        // Check response time threshold
        if (responseTime > PERFORMANCE_THRESHOLDS.serverResponseTime) {
          this.results.violations.push({
            type: 'serverResponseTime',
            actual: responseTime,
            threshold: PERFORMANCE_THRESHOLDS.serverResponseTime,
            impact: 'medium',
            message: `Server response time (${responseTime}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.serverResponseTime}ms)`,
          });

          this.results.recommendations.push({
            category: 'serverOptimization',
            priority: 'medium',
            action: 'Implement response caching and connection pooling',
            impact: 'Reduce response time by 50-70%',
          });
        }

        // Check memory usage
        if (healthData.memory.heapUsed > PERFORMANCE_THRESHOLDS.memoryUsage) {
          this.results.violations.push({
            type: 'memoryUsage',
            actual: healthData.memory.heapUsed,
            threshold: PERFORMANCE_THRESHOLDS.memoryUsage,
            impact: 'high',
            message: `Memory usage (${this.formatBytes(healthData.memory.heapUsed)}) exceeds threshold`,
          });
        }

        console.log(`✅ Server analysis complete: ${responseTime}ms response time`);
      }
    } catch (error) {
      console.error('❌ Server performance check failed:', error.message);
      this.results.violations.push({
        type: 'serverAvailability',
        message: 'Server not responding',
        impact: 'critical',
      });
    }
  }

  // Analyze package dependencies
  checkDependencies() {
    console.log('📚 Analyzing dependencies...');
    
    try {
      const packagePath = path.join(__dirname, '../mustbeviral/package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});
      
      this.results.metrics.dependencies = {
        production: dependencies.length,
        development: devDependencies.length,
        total: dependencies.length + devDependencies.length,
      };

      // Check for heavy dependencies
      const heavyDeps = ['lodash', 'moment', 'webpack', '@babel/core'];
      const foundHeavyDeps = dependencies.filter(dep => 
        heavyDeps.some(heavy => dep.includes(heavy))
      );

      if (foundHeavyDeps.length > 0) {
        this.results.recommendations.push({
          category: 'dependencyOptimization',
          priority: 'medium',
          action: `Consider lightweight alternatives for: ${foundHeavyDeps.join(', ')}`,
          impact: 'Reduce bundle size by 20-30%',
        });
      }

      console.log(`✅ Dependencies analyzed: ${dependencies.length} production, ${devDependencies.length} dev`);
    } catch (error) {
      console.error('❌ Dependencies analysis failed:', error.message);
    }
  }

  // Generate performance report
  generateReport() {
    console.log('\n📊 Performance Analysis Report\n' + '='.repeat(50));
    
    // Summary
    console.log(`📅 Generated: ${this.results.timestamp}`);
    console.log(`🔍 Violations: ${this.results.violations.length}`);
    console.log(`💡 Recommendations: ${this.results.recommendations.length}\n`);

    // Metrics
    if (Object.keys(this.results.metrics).length > 0) {
      console.log('📈 Metrics:');
      
      if (this.results.metrics.bundleSize) {
        const { totalSize, jsSize, cssSize } = this.results.metrics.bundleSize;
        console.log(`   📦 Bundle Size: ${this.formatBytes(totalSize)} (JS: ${this.formatBytes(jsSize)}, CSS: ${this.formatBytes(cssSize)})`);
      }
      
      if (this.results.metrics.server) {
        const { responseTime, uptime } = this.results.metrics.server;
        console.log(`   🖥️  Server: ${responseTime}ms response, ${Math.floor(uptime)}s uptime`);
      }
      
      if (this.results.metrics.dependencies) {
        const { production, development } = this.results.metrics.dependencies;
        console.log(`   📚 Dependencies: ${production} prod, ${development} dev`);
      }
      
      console.log();
    }

    // Violations
    if (this.results.violations.length > 0) {
      console.log('⚠️  Performance Violations:');
      this.results.violations.forEach((violation, index) => {
        console.log(`   ${index + 1}. [${violation.impact?.toUpperCase()}] ${violation.message}`);
      });
      console.log();
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('💡 Optimization Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority?.toUpperCase()}] ${rec.action}`);
        console.log(`      Impact: ${rec.impact}`);
      });
      console.log();
    }

    // Overall score
    const score = this.calculatePerformanceScore();
    console.log(`🎯 Performance Score: ${score}/100`);
    
    if (score >= 90) {
      console.log('🌟 Excellent! Your application is well optimized.');
    } else if (score >= 70) {
      console.log('👍 Good performance, but there\'s room for improvement.');
    } else {
      console.log('⚠️  Performance needs attention. Address the violations above.');
    }

    // Save report to file
    const reportPath = path.join(__dirname, '../performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  // Helper methods
  getFilesWithExtension(dir, ext) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...this.getFilesWithExtension(fullPath, ext));
      } else if (item.isFile() && item.name.endsWith(ext)) {
        const stats = fs.statSync(fullPath);
        files.push({
          name: item.name,
          path: fullPath,
          size: stats.size,
        });
      }
    }
    
    return files;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  calculatePerformanceScore() {
    let score = 100;
    
    this.results.violations.forEach(violation => {
      switch (violation.impact) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  // Main execution
  async run() {
    console.log('🚀 Starting Performance Analysis...\n');
    
    await this.checkBundleSize();
    await this.checkServerPerformance();
    this.checkDependencies();
    
    this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.run().catch(console.error);
}

module.exports = PerformanceMonitor;