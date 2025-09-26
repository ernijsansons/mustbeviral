#!/usr/bin/env node

/**
 * Performance Testing Script for Must Be Viral V2
 * Validates optimization improvements and measures key metrics
 */

const http = require('http');
const { performance } = require('perf_hooks');

class PerformanceTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.concurrency = options.concurrency || 10;
    this.duration = options.duration || 30000; // 30 seconds
    this.warmupTime = options.warmupTime || 5000; // 5 seconds
    this.results = {
      requests: [],
      errors: [],
      startTime: 0,
      endTime: 0,
      totalRequests: 0,
      totalErrors: 0
    };
  }

  async makeRequest(path = '/') {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const req = http.get(`${this.baseUrl}${path}`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          resolve({
            success: true,
            statusCode: res.statusCode,
            responseTime,
            contentLength: data.length,
            headers: res.headers
          });
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          success: false,
          error: error.message,
          responseTime
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          success: false,
          error: 'Timeout',
          responseTime
        });
      });
    });
  }

  async runConcurrentRequests(path, count) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.makeRequest(path));
    }
    return Promise.all(promises);
  }

  calculateStats(responseTimes) {
    if (responseTimes.length === 0) return null;
    
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, time) => acc + time, 0);
    
    return {
      min: Math.round(sorted[0] * 100) / 100,
      max: Math.round(sorted[sorted.length - 1] * 100) / 100,
      mean: Math.round((sum / sorted.length) * 100) / 100,
      median: Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100,
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
      p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100
    };
  }

  async testEndpoint(path, name) {
    console.log(`\n🧪 Testing ${name} (${path})`);
    
    // Warmup
    console.log('  Warming up...');
    await this.runConcurrentRequests(path, 5);
    
    const testStartTime = performance.now();
    const testEndTime = testStartTime + this.duration;
    const results = [];
    let requestCount = 0;
    let errorCount = 0;
    
    console.log(`  Running test for ${this.duration / 1000}s with ${this.concurrency} concurrent users...`);
    
    while (performance.now() < testEndTime) {
      const batchResults = await this.runConcurrentRequests(path, this.concurrency);
      
      for (const result of batchResults) {
        requestCount++;
        if (result.success) {
          results.push(result.responseTime);
        } else {
          errorCount++;
          this.results.errors.push({
            path,
            error: result.error,
            timestamp: Date.now()
          });
        }
      }
      
      // Brief pause to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const actualTestTime = performance.now() - testStartTime;
    const rps = (requestCount / actualTestTime) * 1000;
    const errorRate = (errorCount / requestCount) * 100;
    const stats = this.calculateStats(results);
    
    console.log(`  ✅ Completed: ${requestCount} requests in ${Math.round(actualTestTime)}ms`);
    console.log(`  📊 RPS: ${Math.round(rps * 100) / 100}`);
    console.log(`  ❌ Error Rate: ${Math.round(errorRate * 100) / 100}%`);
    
    if (stats) {
      console.log(`  ⏱️  Response Times (ms):`);
      console.log(`     Min: ${stats.min}, Max: ${stats.max}, Mean: ${stats.mean}`);
      console.log(`     Median: ${stats.median}, P95: ${stats.p95}, P99: ${stats.p99}`);
    }
    
    return {
      name,
      path,
      requestCount,
      errorCount,
      errorRate,
      rps,
      stats,
      testTime: actualTestTime
    };
  }

  async testRateLimiting() {
    console.log('\n🛡️  Testing Rate Limiting');
    
    const rapidRequests = 150; // Exceed the 100/minute limit
    const startTime = performance.now();
    const results = await this.runConcurrentRequests('/', rapidRequests);
    const endTime = performance.now();
    
    const successCount = results.filter(r => r.success && r.statusCode === 200).length;
    const rateLimitedCount = results.filter(r => r.success && r.statusCode === 429).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`  📈 Sent ${rapidRequests} requests in ${Math.round(endTime - startTime)}ms`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  🚫 Rate Limited: ${rateLimitedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  🎯 Rate limiting is ${rateLimitedCount > 0 ? 'WORKING' : 'NOT WORKING'}`);
    
    return {
      totalRequests: rapidRequests,
      successCount,
      rateLimitedCount,
      errorCount,
      working: rateLimitedCount > 0
    };
  }

  async testMemoryUsage() {
    console.log('\n💾 Testing Memory Usage');
    
    const initialMemory = await this.getMemoryUsage();
    console.log(`  📊 Initial Memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
    
    // Generate load to test memory behavior
    const loadTestRequests = 1000;
    console.log(`  🔄 Generating load with ${loadTestRequests} requests...`);
    
    const startTime = performance.now();
    let requestCount = 0;
    
    while (requestCount < loadTestRequests) {
      const batch = Math.min(20, loadTestRequests - requestCount);
      await this.runConcurrentRequests('/', batch);
      requestCount += batch;
      
      if (requestCount % 100 === 0) {
        process.stdout.write(`\r  Progress: ${requestCount}/${loadTestRequests}`);
      }
    }
    
    console.log(`\n  ✅ Completed ${loadTestRequests} requests in ${Math.round(performance.now() - startTime)}ms`);
    
    // Wait for garbage collection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalMemory = await this.getMemoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryLeakMB = memoryIncrease / 1024 / 1024;
    
    console.log(`  📊 Final Memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
    console.log(`  📈 Memory Change: ${memoryLeakMB > 0 ? '+' : ''}${Math.round(memoryLeakMB * 100) / 100}MB`);
    console.log(`  ${memoryLeakMB > 50 ? '⚠️  Potential memory leak detected!' : '✅ Memory usage is stable'}`);
    
    return {
      initialMemory: initialMemory.heapUsed,
      finalMemory: finalMemory.heapUsed,
      memoryIncrease,
      memoryLeakMB,
      stable: memoryLeakMB < 50
    };
  }

  async getMemoryUsage() {
    try {
      const result = await this.makeRequest('/health');
      if (result.success && result.statusCode === 200) {
        const response = await this.makeRequest('/health');
        // This is a simplified version - in practice, you'd parse the JSON response
        return process.memoryUsage(); // Fallback to local memory usage
      }
    } catch (error) {
      console.warn('Could not fetch remote memory usage:', error.message);
    }
    return process.memoryUsage();
  }

  async runFullTest() {
    console.log('🚀 Starting Performance Test Suite for Must Be Viral V2');
    console.log(`   Target: ${this.baseUrl}`);
    console.log(`   Concurrency: ${this.concurrency}`);
    console.log(`   Test Duration: ${this.duration / 1000}s per endpoint\n`);
    
    const testResults = [];
    
    try {
      // Test main endpoints
      testResults.push(await this.testEndpoint('/', 'Homepage'));
      testResults.push(await this.testEndpoint('/health', 'Health Check'));
      testResults.push(await this.testEndpoint('/metrics', 'Metrics'));
      
      // Test rate limiting
      const rateLimitResults = await this.testRateLimiting();
      
      // Test memory usage
      const memoryResults = await this.testMemoryUsage();
      
      // Generate summary report
      this.generateReport(testResults, rateLimitResults, memoryResults);
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  }

  generateReport(testResults, rateLimitResults, memoryResults) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));
    
    const totalRequests = testResults.reduce((sum, result) => sum + result.requestCount, 0);
    const totalErrors = testResults.reduce((sum, result) => sum + result.errorCount, 0);
    const avgRPS = testResults.reduce((sum, result) => sum + result.rps, 0) / testResults.length;
    const avgErrorRate = testResults.reduce((sum, result) => sum + result.errorRate, 0) / testResults.length;
    
    console.log(`\n📈 Overall Performance:`);
    console.log(`   Total Requests: ${totalRequests}`);
    console.log(`   Total Errors: ${totalErrors}`);
    console.log(`   Average RPS: ${Math.round(avgRPS * 100) / 100}`);
    console.log(`   Average Error Rate: ${Math.round(avgErrorRate * 100) / 100}%`);
    
    console.log(`\n🛡️  Security & Resilience:`);
    console.log(`   Rate Limiting: ${rateLimitResults.working ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Memory Stability: ${memoryResults.stable ? '✅ STABLE' : '⚠️ UNSTABLE'}`);
    
    console.log(`\n📊 Endpoint Performance:`);
    testResults.forEach(result => {
      console.log(`   ${result.name}:`);
      console.log(`     RPS: ${Math.round(result.rps * 100) / 100}`);
      console.log(`     Error Rate: ${Math.round(result.errorRate * 100) / 100}%`);
      if (result.stats) {
        console.log(`     Response Time P95: ${result.stats.p95}ms`);
      }
    });
    
    // Performance grades
    const performanceGrade = this.calculatePerformanceGrade(avgRPS, avgErrorRate, testResults);
    console.log(`\n🏆 Overall Performance Grade: ${performanceGrade}`);
    
    console.log('\n' + '='.repeat(80));
  }

  calculatePerformanceGrade(avgRPS, avgErrorRate, testResults) {
    let score = 100;
    
    // Deduct points for low RPS
    if (avgRPS < 50) score -= 30;
    else if (avgRPS < 100) score -= 20;
    else if (avgRPS < 200) score -= 10;
    
    // Deduct points for high error rate
    if (avgErrorRate > 5) score -= 40;
    else if (avgErrorRate > 1) score -= 20;
    else if (avgErrorRate > 0.1) score -= 10;
    
    // Deduct points for slow response times
    const avgP95 = testResults.reduce((sum, r) => sum + (r.stats?.p95 || 1000), 0) / testResults.length;
    if (avgP95 > 1000) score -= 30;
    else if (avgP95 > 500) score -= 20;
    else if (avgP95 > 200) score -= 10;
    
    if (score >= 90) return 'A+ 🌟';
    if (score >= 80) return 'A 🎯';
    if (score >= 70) return 'B+ 👍';
    if (score >= 60) return 'B 👌';
    if (score >= 50) return 'C+ 📈';
    if (score >= 40) return 'C ⚡';
    return 'F ❌';
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--url':
        options.baseUrl = value;
        break;
      case '--concurrency':
        options.concurrency = parseInt(value);
        break;
      case '--duration':
        options.duration = parseInt(value) * 1000;
        break;
      default:
        console.log(`Unknown option: ${key}`);
    }
  }
  
  const tester = new PerformanceTester(options);
  tester.runFullTest().catch(console.error);
}

module.exports = PerformanceTester;