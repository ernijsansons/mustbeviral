/**
 * Comprehensive Load Testing Suite
 * Runs all load tests in sequence and generates consolidated report
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8787';

const loadTests = [
  {
    name: 'Authentication Load Test',
    file: 'auth-load.js',
    description: 'Tests user registration, login, and token refresh under load',
    duration: '16m',
    estimatedRequests: 5000
  },
  {
    name: 'Content Management Load Test',
    file: 'content-load.js',
    description: 'Tests content CRUD operations and browsing under load',
    duration: '13m',
    estimatedRequests: 3000
  },
  {
    name: 'Payment System Load Test',
    file: 'payment-load.js',
    description: 'Tests payment processing and boost creation under load',
    duration: '9m',
    estimatedRequests: 1500
  }
];

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');

  // Check if k6 is installed
  try {
    execSync('k6 version', { stdio: 'pipe' });
    console.log('✅ k6 is installed');
  } catch (error) {
    console.error('❌ k6 is not installed. Please install k6: https://k6.io/docs/get-started/installation/');
    process.exit(1);
  }

  // Check if application is running
  try {
    const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}`, {
      stdio: 'pipe',
      timeout: 10000
    });

    if (response.toString().trim() === '200') {
      console.log('✅ Application is running');
    } else {
      console.error('❌ Application is not responding. Please start the development server.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Cannot reach application. Please ensure it\'s running on', BASE_URL);
    process.exit(1);
  }

  console.log('✅ All prerequisites met');
}

function runLoadTest(test) {
  console.log(`\n🚀 Starting ${test.name}...`);
  console.log(`📝 ${test.description}`);
  console.log(`⏱️  Estimated duration: ${test.duration}`);
  console.log(`📊 Estimated requests: ~${test.estimatedRequests}`);

  const startTime = Date.now();

  try {
    const command = `k6 run --env BASE_URL=${BASE_URL} --env API_BASE_URL=${API_BASE_URL} ${test.file}`;
    console.log(`\n🔧 Running: ${command}\n`);

    execSync(command, {
      stdio: 'inherit',
      cwd: path.dirname(process.argv[1])
    });

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`\n✅ ${test.name} completed in ${duration}s`);
    return { success: true, duration };

  } catch (error) {
    console.error(`\n❌ ${test.name} failed:`, error.message);
    return { success: false, duration: 0, error: error.message };
  }
}

function generateConsolidatedReport(results) {
  console.log('\n📊 Generating consolidated report...');

  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: BASE_URL,
      apiBaseUrl: API_BASE_URL,
      nodeVersion: process.version,
      platform: process.platform
    },
    summary: {
      totalTests: loadTests.length,
      passedTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    },
    testResults: results.map((result, index) => ({
      ...loadTests[index],
      ...result
    }))
  };

  // Write consolidated report
  const reportPath = 'load-test-consolidated-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  fs.writeFileSync('load-test-report.md', markdownReport);

  console.log(`✅ Consolidated report saved to: ${reportPath}`);
  console.log(`✅ Markdown report saved to: load-test-report.md`);

  return report;
}

function generateMarkdownReport(report) {
  const { summary, testResults } = report;
  const successRate = ((summary.passedTests / summary.totalTests) * 100).toFixed(1);

  return `# Must Be Viral - Load Testing Report

## Executive Summary

- **Test Date**: ${new Date(report.timestamp).toLocaleString()}
- **Environment**: ${report.environment.baseUrl}
- **Success Rate**: ${successRate}% (${summary.passedTests}/${summary.totalTests} tests passed)
- **Total Duration**: ${Math.round(summary.totalDuration / 60)} minutes

## Test Environment

- **Base URL**: ${report.environment.baseUrl}
- **API URL**: ${report.environment.apiBaseUrl}
- **Node Version**: ${report.environment.nodeVersion}
- **Platform**: ${report.environment.platform}

## Test Results

${testResults.map(test => `
### ${test.name}

- **Status**: ${test.success ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${test.duration}s
- **Description**: ${test.description}
- **Estimated Requests**: ~${test.estimatedRequests}
${test.error ? `- **Error**: ${test.error}` : ''}

`).join('')}

## Performance Insights

### Key Findings

${testResults.filter(t => t.success).length > 0 ? `
✅ **Successful Tests**: ${testResults.filter(t => t.success).map(t => t.name).join(', ')}
` : ''}

${testResults.filter(t => !t.success).length > 0 ? `
❌ **Failed Tests**: ${testResults.filter(t => !t.success).map(t => t.name).join(', ')}
` : ''}

### Recommendations

${successRate >= 100 ? `
🎉 **Excellent Performance**: All load tests passed successfully. The system demonstrates robust performance under the tested load conditions.

**Next Steps**:
- Consider increasing load test intensity for stress testing
- Implement monitoring dashboards for production metrics
- Plan for horizontal scaling strategies
` : ''}

${successRate >= 80 && successRate < 100 ? `
⚠️ **Good Performance with Issues**: Most tests passed, but some areas need attention.

**Action Items**:
- Investigate failed test scenarios
- Optimize performance bottlenecks
- Review error logs for patterns
- Consider caching strategies
` : ''}

${successRate < 80 ? `
🚨 **Performance Issues Detected**: Multiple tests failed, indicating serious performance concerns.

**Immediate Actions Required**:
- Review system architecture and bottlenecks
- Implement performance optimizations
- Consider infrastructure scaling
- Analyze error patterns and fix critical issues
` : ''}

## Detailed Reports

Individual test reports are available in:
- \`auth-load-results.json\`
- \`content-load-results.json\`
- \`payment-load-results.json\`

---

*Report generated by Must Be Viral Load Testing Suite*
`;
}

function main() {
  console.log('🎯 Must Be Viral - Comprehensive Load Testing Suite');
  console.log('==================================================\n');

  checkPrerequisites();

  console.log('\n📋 Test Plan:');
  loadTests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name} (${test.duration})`);
  });

  const totalEstimatedTime = loadTests.reduce((sum, test) => {
    const minutes = parseInt(test.duration);
    return sum + minutes;
  }, 0);

  console.log(`\n⏱️  Total estimated time: ~${totalEstimatedTime} minutes`);
  console.log('🚀 Starting load test suite...\n');

  const results = [];

  for (let i = 0; i < loadTests.length; i++) {
    const test = loadTests[i];
    const result = runLoadTest(test);
    results.push(result);

    // Brief pause between tests
    if (i < loadTests.length - 1) {
      console.log('\n⏸️  Pausing 30 seconds before next test...');
      execSync('timeout 30 >nul 2>&1 || sleep 30', { stdio: 'inherit' });
    }
  }

  console.log('\n🏁 All load tests completed!');

  const report = generateConsolidatedReport(results);

  // Print summary
  console.log('\n📊 Final Summary:');
  console.log('================');
  console.log(`✅ Passed: ${report.summary.passedTests}/${report.summary.totalTests}`);
  console.log(`❌ Failed: ${report.summary.failedTests}/${report.summary.totalTests}`);
  console.log(`⏱️  Total Time: ${Math.round(report.summary.totalDuration / 60)} minutes`);

  if (report.summary.failedTests > 0) {
    console.log('\n❌ Some tests failed. Please review the detailed reports.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed successfully!');
  }
}

// Run the main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, loadTests, checkPrerequisites, runLoadTest, generateConsolidatedReport };