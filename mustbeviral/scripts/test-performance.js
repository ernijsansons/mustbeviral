#!/usr/bin/env node

/**
 * Test Performance Monitoring Script
 *
 * Analyzes test execution times and provides optimization insights
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PERFORMANCE_LOG_FILE = path.join(__dirname, '..', '.jest-cache', 'performance.json');

class TestPerformanceMonitor {
  constructor() {
    this.performanceData = this.loadPerformanceData();
  }

  loadPerformanceData() {
    try {
      if (fs.existsSync(PERFORMANCE_LOG_FILE)) {
        return JSON.parse(fs.readFileSync(PERFORMANCE_LOG_FILE, 'utf8'));
      }
    } catch (error) {
      console.log('No previous performance data found, starting fresh');
    }
    return {
      runs: [],
      averages: {},
      trends: {}
    };
  }

  savePerformanceData() {
    const dir = path.dirname(PERFORMANCE_LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PERFORMANCE_LOG_FILE, JSON.stringify(this.performanceData, null, 2));
  }

  async runPerformanceTest(testType = 'all') {
    console.log(`🚀 Running performance test for: ${testType}`);
    const startTime = Date.now();

    let command;
    switch (testType) {
      case 'unit':
        command = 'npm run test:unit -- --silent';
        break;
      case 'frontend':
        command = 'npm run test:frontend -- --silent';
        break;
      case 'backend':
        command = 'npm run test:backend -- --silent';
        break;
      case 'integration':
        command = 'npm run test:integration -- --silent';
        break;
      default:
        command = 'npm test -- --silent';
    }

    try {
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: 120000 // 2 minute timeout
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const testResults = this.parseTestOutput(output);

      const runData = {
        timestamp: new Date().toISOString(),
        testType,
        duration,
        ...testResults
      };

      this.performanceData.runs.push(runData);
      this.updateAverages(testType);
      this.savePerformanceData();

      return runData;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      return null;
    }
  }

  parseTestOutput(output) {
    const results = {
      testsPassed: 0,
      testsFailed: 0,
      testsTotal: 0,
      testSuites: 0
    };

    // Parse Jest output for test counts
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const totalMatch = output.match(/Tests:\s+(\d+) total/);
    const suitesMatch = output.match(/Test Suites:\s+(\d+) passed.*?(\d+) total/);

    if (passedMatch) results.testsPassed = parseInt(passedMatch[1]);
    if (failedMatch) results.testsFailed = parseInt(failedMatch[1]);
    if (totalMatch) results.testsTotal = parseInt(totalMatch[1]);
    if (suitesMatch) results.testSuites = parseInt(suitesMatch[2]);

    return results;
  }

  updateAverages(testType) {
    const recentRuns = this.performanceData.runs
      .filter(run => run.testType === testType)
      .slice(-10); // Last 10 runs

    if (recentRuns.length > 0) {
      const avgDuration = recentRuns.reduce((sum, run) => sum + run.duration, 0) / recentRuns.length;
      const avgTests = recentRuns.reduce((sum, run) => sum + run.testsTotal, 0) / recentRuns.length;

      this.performanceData.averages[testType] = {
        duration: Math.round(avgDuration),
        testsTotal: Math.round(avgTests),
        testsPerSecond: Math.round((avgTests / avgDuration) * 1000)
      };
    }
  }

  generateReport() {
    console.log('\n📊 Test Performance Report');
    console.log('=' .repeat(50));

    Object.entries(this.performanceData.averages).forEach(([testType, averages]) => {
      console.log(`\n🧪 ${testType.toUpperCase()} Tests:`);
      console.log(`   Average Duration: ${(averages.duration / 1000).toFixed(2)}s`);
      console.log(`   Average Tests: ${averages.testsTotal}`);
      console.log(`   Tests/Second: ${averages.testsPerSecond}`);
    });

    // Performance recommendations
    console.log('\n💡 Performance Recommendations:');

    Object.entries(this.performanceData.averages).forEach(([testType, averages]) => {
      if (averages.duration > 30000) { // 30+ seconds
        console.log(`   ⚠️  ${testType} tests are slow (${(averages.duration/1000).toFixed(1)}s) - consider optimization`);
      }
      if (averages.testsPerSecond < 10) {
        console.log(`   🐌 ${testType} has low throughput (${averages.testsPerSecond} tests/s) - check for slow tests`);
      }
    });

    console.log('\n');
  }

  async benchmark() {
    console.log('🏁 Starting test performance benchmark...\n');

    const testTypes = ['frontend', 'backend', 'unit'];
    const results = [];

    for (const testType of testTypes) {
      const result = await this.runPerformanceTest(testType);
      if (result) {
        results.push(result);
        console.log(`✅ ${testType}: ${(result.duration / 1000).toFixed(2)}s (${result.testsTotal} tests)`);
      }
    }

    this.generateReport();
    return results;
  }
}

// CLI interface
async function main() {
  const monitor = new TestPerformanceMonitor();
  const args = process.argv.slice(2);
  const command = args[0] || 'benchmark';

  switch (command) {
    case 'benchmark':
      await monitor.benchmark();
      break;
    case 'report':
      monitor.generateReport();
      break;
    case 'run':
      const testType = args[1] || 'all';
      await monitor.runPerformanceTest(testType);
      break;
    default:
      console.log('Usage: node test-performance.js [benchmark|report|run [testType]]');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestPerformanceMonitor;