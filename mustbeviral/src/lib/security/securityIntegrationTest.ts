/**
 * Security Integration Test Suite
 * Comprehensive testing of the runtime security monitoring system
 */

import { securityOrchestrator } from './securityOrchestrator';
import { runtimeSecurityMonitor } from './runtimeSecurityMonitor';
import { securityHealthChecker } from './securityHealthCheck';
import { securityAlerting } from './alertingSystem';

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: any;
  errors?: string[];
  recommendations?: string[];
}

export interface IntegrationTestReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    overallScore: number;
    duration: number;
  };
  categories: {
    vulnerabilityDetection: TestResult[];
    alerting: TestResult[];
    healthMonitoring: TestResult[];
    compliance: TestResult[];
    performance: TestResult[];
  };
  criticalFailures: string[];
  recommendations: string[];
  nextSteps: string[];
}

/**
 * Run comprehensive security integration tests
 */
export async function runSecurityIntegrationTests(): Promise<IntegrationTestReport> {
  console.log('🧪 Starting comprehensive security integration tests...');

  const startTime = Date.now();
  const testResults: Record<string, TestResult[]> = {
    vulnerabilityDetection: [],
    alerting: [],
    healthMonitoring: [],
    compliance: [],
    performance: []
  };

  try {
    // Run all test categories in parallel
    const [
      vulnTests,
      alertTests,
      healthTests,
      complianceTests,
      perfTests
    ] = await Promise.all([
      testVulnerabilityDetection(),
      testAlertingSystem(),
      testHealthMonitoring(),
      testCompliance(),
      testPerformance()
    ]);

    testResults.vulnerabilityDetection = vulnTests;
    testResults.alerting = alertTests;
    testResults.healthMonitoring = healthTests;
    testResults.compliance = complianceTests;
    testResults.performance = perfTests;

    // Calculate summary statistics
    const allTests = Object.values(testResults).flat();
    const totalTests = allTests.length;
    const passed = allTests.filter(t => t.passed).length;
    const failed = totalTests - passed;
    const overallScore = totalTests > 0 ? (passed / totalTests) * 100 : 0;
    const duration = Date.now() - startTime;

    // Identify critical failures
    const criticalFailures = allTests
      .filter(t => !t.passed && isCriticalTest(t.testName))
      .map(t => `${t.testName}: ${t.errors?.join(', ') || 'Unknown error'}`);

    // Generate recommendations
    const recommendations = generateTestRecommendations(testResults, overallScore);

    // Generate next steps
    const nextSteps = generateNextSteps(criticalFailures, overallScore);

    const report: IntegrationTestReport = {
      summary: {
        totalTests,
        passed,
        failed,
        overallScore: Math.round(overallScore),
        duration
      },
      categories: testResults as any,
      criticalFailures,
      recommendations,
      nextSteps
    };

    console.log('✅ Security integration tests completed', {
      score: report.summary.overallScore,
      passed: report.summary.passed,
      failed: report.summary.failed,
      criticalFailures: criticalFailures.length
    });

    return report;

  } catch (error) {
    console.error('❌ Security integration tests failed:', error);
    throw error;
  }
}

/**
 * Test vulnerability detection capabilities
 */
async function testVulnerabilityDetection(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: SQL Injection Detection
  const sqlTest = await runTest('SQL Injection Detection', async () => {
    const mockReq = createMockRequest({
      method: 'GET',
      path: '/api/users',
      query: { search: "'; DROP TABLE users; --" }
    });

    const result = await runtimeSecurityMonitor.detectSQLInjection(mockReq, {
      requestId: 'test-001'
    });

    if (!result.detected) {
      throw new Error('Failed to detect SQL injection attempt');
    }

    return {
      detected: result.detected,
      confidence: result.confidence,
      patterns: result.patterns
    };
  });
  tests.push(sqlTest);

  // Test 2: Authentication Bypass Detection
  const authTest = await runTest('Authentication Bypass Detection', async () => {
    const mockReq = createMockRequest({
      method: 'GET',
      path: '/api/admin',
      headers: { 'Authorization': 'Bearer null' }
    });

    const result = await runtimeSecurityMonitor.detectAuthenticationBypass(mockReq, {
      requestId: 'test-002'
    });

    if (!result.detected) {
      throw new Error('Failed to detect authentication bypass attempt');
    }

    return {
      detected: result.detected,
      techniques: result.techniques,
      risk: result.risk
    };
  });
  tests.push(authTest);

  // Test 3: JWT Security Validation
  const jwtTest = await runTest('JWT Security Validation', async () => {
    const result = await runtimeSecurityMonitor.validateJWTSecurity(
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.',
      { requestId: 'test-003' }
    );

    if (result.valid) {
      throw new Error('Failed to detect JWT none algorithm vulnerability');
    }

    return {
      valid: result.valid,
      vulnerabilities: result.vulnerabilities,
      recommendations: result.recommendations
    };
  });
  tests.push(jwtTest);

  // Test 4: CSRF Detection
  const csrfTest = await runTest('CSRF Attack Detection', async () => {
    const mockReq = createMockRequest({
      method: 'POST',
      path: '/api/transfer',
      headers: {
        'Referer': 'https://malicious-site.com',
        'Origin': 'https://malicious-site.com'
      },
      body: { amount: 1000 }
    });

    const result = await runtimeSecurityMonitor.detectCSRFAttack(mockReq, {
      requestId: 'test-004'
    });

    if (!result.detected) {
      throw new Error('Failed to detect CSRF attack');
    }

    return {
      detected: result.detected,
      indicators: result.indicators,
      confidence: result.confidence
    };
  });
  tests.push(csrfTest);

  // Test 5: Vulnerability Simulation
  const simTest = await runTest('Vulnerability Simulation', async () => {
    const result = await runtimeSecurityMonitor.runSecuritySimulation('sql_injection');

    const detectionRate = result.summary.detectionRate;
    if (detectionRate < 0.8) {
      throw new Error(`Low detection rate: ${detectionRate}`);
    }

    return result.summary;
  });
  tests.push(simTest);

  return tests;
}

/**
 * Test alerting system functionality
 */
async function testAlertingSystem(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Alert Generation
  const alertGenTest = await runTest('Alert Generation', async () => {
    const mockIncident = createMockIncident();
    await securityAlerting.processSecurityIncident(mockIncident);

    const stats = securityAlerting.getAlertStatistics();
    return {
      alertsGenerated: stats.total,
      alertsSent: stats.sent,
      alertsFailed: stats.failed
    };
  });
  tests.push(alertGenTest);

  // Test 2: Channel Configuration
  const channelTest = await runTest('Alert Channel Configuration', async () => {
    const stats = securityAlerting.getAlertStatistics();

    if (stats.channelStats.length === 0) {
      throw new Error('No alert channels configured');
    }

    return {
      channelsConfigured: stats.channelStats.length,
      channelStats: stats.channelStats
    };
  });
  tests.push(channelTest);

  return tests;
}

/**
 * Test health monitoring system
 */
async function testHealthMonitoring(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Health Check Execution
  const healthTest = await runTest('Security Health Check', async () => {
    const health = await securityHealthChecker.performHealthCheck();

    if (health.overall.score < 70) {
      throw new Error(`Low health score: ${health.overall.score}`);
    }

    return {
      overallScore: health.overall.score,
      status: health.overall.status,
      recommendationsCount: health.recommendations.length
    };
  });
  tests.push(healthTest);

  // Test 2: Security Controls Testing
  const controlsTest = await runTest('Security Controls Testing', async () => {
    const controlResults = await securityHealthChecker.testSecurityControls();

    const failedControls = Array.from(controlResults.values())
      .filter(result => !result.passed && result.critical);

    if (failedControls.length > 0) {
      throw new Error(`Critical security controls failed: ${failedControls.length}`);
    }

    return {
      totalControls: controlResults.size,
      passedControls: Array.from(controlResults.values()).filter(r => r.passed).length,
      failedCritical: failedControls.length
    };
  });
  tests.push(controlsTest);

  // Test 3: Vulnerability Testing
  const vulnTestTest = await runTest('Vulnerability Testing', async () => {
    const testResults = await securityHealthChecker.testVulnerabilityDetection('sql_injection');

    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;

    if (totalTests === 0) {
      throw new Error('No vulnerability tests executed');
    }

    return {
      totalTests,
      passedTests,
      successRate: passedTests / totalTests
    };
  });
  tests.push(vulnTestTest);

  return tests;
}

/**
 * Test compliance monitoring
 */
async function testCompliance(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Compliance Report Generation
  const complianceTest = await runTest('Compliance Report Generation', async () => {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const report = await runtimeSecurityMonitor.generateComplianceReport({
      start: startTime,
      end: endTime
    });

    return {
      owaspScore: report.owaspCompliance.injection.score,
      gdprCompliant: report.gdprCompliance.dataProcessing,
      auditTrail: report.auditTrail.totalEvents
    };
  });
  tests.push(complianceTest);

  return tests;
}

/**
 * Test performance impact
 */
async function testPerformance(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  // Test 1: Security Overhead Measurement
  const perfTest = await runTest('Security Overhead Measurement', async () => {
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      const mockReq = createMockRequest({
        method: 'GET',
        path: '/api/test',
        query: { test: 'performance' }
      });

      await runtimeSecurityMonitor.detectSQLInjection(mockReq, {
        requestId: `perf-test-${i}`
      });

      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const maxTime = Math.max(...times);

    if (avgTime > 100) {
      throw new Error(`High security overhead: ${avgTime}ms average`);
    }

    return {
      iterations,
      averageTime: avgTime,
      maxTime,
      totalTime: times.reduce((sum, time) => sum + time, 0)
    };
  });
  tests.push(perfTest);

  return tests;
}

/**
 * Run individual test with error handling
 */
async function runTest(testName: string, testFunction: () => Promise<any>): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;

    return {
      testName,
      passed: true,
      duration,
      details: result
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      testName,
      passed: false,
      duration,
      details: null,
      errors: [errorMessage],
      recommendations: [`Fix ${testName.toLowerCase()} implementation`]
    };
  }
}

/**
 * Create mock request for testing
 */
function createMockRequest(config: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
}): any {
  return {
    method: config.method,
    path: config.path,
    url: config.path + (config.query ? '?' + new URLSearchParams(config.query).toString() : ''),
    headers: config.headers || {},
    query: config.query || {},
    body: config.body || {},
    params: {},
    get: (header: string) => config.headers?.[header] || config.headers?.[header.toLowerCase()],
    ip: '127.0.0.1'
  };
}

/**
 * Create mock security incident
 */
function createMockIncident(): any {
  return {
    id: `test-incident-${Date.now()}`,
    timestamp: new Date(),
    vulnerability: 'SQL_INJECTION',
    severity: 'HIGH',
    source: {
      ip: '192.168.1.100',
      userAgent: 'Test Agent',
      userId: undefined,
      sessionId: undefined
    },
    attack: {
      type: 'SQL_INJECTION',
      payload: { search: "'; DROP TABLE users; --" },
      endpoint: '/api/users',
      method: 'GET'
    },
    detection: {
      patterns: ['UNION_SELECT', 'SQL_COMMENTS'],
      confidence: 0.9,
      automated: true,
      responseTime: 25
    },
    response: {
      action: 'BLOCKED',
      blocked: true,
      quarantined: false,
      alertSent: false,
      escalated: false
    },
    impact: {
      usersAffected: 0,
      dataExposed: false,
      serviceDisrupted: false,
      estimatedCost: 0
    },
    investigation: {
      status: 'OPEN',
      notes: [],
      timeline: [{
        timestamp: new Date(),
        action: 'INCIDENT_CREATED',
        user: 'SYSTEM'
      }]
    }
  };
}

/**
 * Check if test is critical
 */
function isCriticalTest(testName: string): boolean {
  const criticalTests = [
    'SQL Injection Detection',
    'Authentication Bypass Detection',
    'JWT Security Validation',
    'Security Health Check'
  ];

  return criticalTests.includes(testName);
}

/**
 * Generate recommendations based on test results
 */
function generateTestRecommendations(
  testResults: Record<string, TestResult[]>,
  overallScore: number
): string[] {
  const recommendations: string[] = [];

  // Overall score recommendations
  if (overallScore < 80) {
    recommendations.push('Overall security test score is below 80% - immediate review required');
  }

  // Category-specific recommendations
  Object.entries(testResults).forEach(([category, tests]) => {
    const failedTests = tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      recommendations.push(`${category} has ${failedTests.length} failed tests - investigate and fix`);
    }
  });

  // Critical failure recommendations
  const criticalFailures = Object.values(testResults)
    .flat()
    .filter(t => !t.passed && isCriticalTest(t.testName));

  if (criticalFailures.length > 0) {
    recommendations.push('Critical security tests are failing - immediate attention required');
  }

  // Performance recommendations
  const performanceTests = testResults.performance || [];
  const slowTests = performanceTests.filter(t => t.duration > 1000);
  if (slowTests.length > 0) {
    recommendations.push('Some security tests are running slowly - optimize performance');
  }

  return recommendations;
}

/**
 * Generate next steps based on test results
 */
function generateNextSteps(criticalFailures: string[], overallScore: number): string[] {
  const nextSteps: string[] = [];

  if (criticalFailures.length > 0) {
    nextSteps.push('Address critical security test failures immediately');
    nextSteps.push('Run focused tests on failing components');
  }

  if (overallScore < 90) {
    nextSteps.push('Improve security test coverage and implementation');
    nextSteps.push('Review and update security monitoring patterns');
  }

  nextSteps.push('Schedule regular security integration testing');
  nextSteps.push('Monitor security metrics dashboard for ongoing issues');
  nextSteps.push('Update security documentation based on test results');

  return nextSteps.slice(0, 5); // Limit to 5 next steps
}

/**
 * Export test runner for external use
 */
export default runSecurityIntegrationTests;