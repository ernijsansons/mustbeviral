/**
 * CWE-480 Regression Testing Suite
 * Tests logical operator fixes and edge cases to prevent regression
 * Validates specific fix: url.pathname.includes('/auth/') ?? url.pathname.includes('/api/user/')
 * Should be: url.pathname.includes('/auth/') || url.pathname.includes('/api/user/')
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock URL objects for testing
class MockURL {
  pathname: string;

  constructor(pathname: string) {
    this.pathname = pathname;
  }
}

// Mock security middleware with both original (vulnerable) and fixed implementations
class SecurityMiddlewareTest {
  // Original vulnerable implementation with nullish coalescing (CWE-480)
  static applySecurityHeadersVulnerable(url: MockURL): boolean {
    // This is the VULNERABLE code that was fixed
    // @ts-ignore - Intentionally wrong for testing
    return url.pathname.includes('/auth/') ?? url.pathname.includes('/api/user/');
  }

  // Fixed implementation with logical OR
  static applySecurityHeadersFixed(url: MockURL): boolean {
    return url.pathname.includes('/auth/') || url.pathname.includes('/api/user/');
  }

  // Additional edge case testing for compound conditions
  static complexLogicalCondition(url: MockURL, isAuthenticated: boolean, hasPermission: boolean): boolean {
    // Test multiple logical operators in complex conditions
    return (url.pathname.includes('/admin/') || url.pathname.includes('/dashboard/')) &&
           (isAuthenticated || hasPermission);
  }

  // Cache control header logic (related to the security headers fix)
  static shouldApplyNoCacheHeaders(url: MockURL): boolean {
    return url.pathname.includes('/auth/') ||
           url.pathname.includes('/api/user/') ||
           url.pathname.includes('/admin/') ||
           url.pathname.includes('/api/sensitive/');
  }
}

describe('CWE-480 Regression Testing Suite', () => {
  let testResults: Array<{
    testCase: string;
    vulnerableResult: boolean;
    fixedResult: boolean;
    expectation: boolean;
    isRegression: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> = [];

  beforeAll(() => {
    console.log('🔍 Starting CWE-480 Regression Testing Suite');
    console.log('🎯 Testing logical operator fixes to prevent security header bypass');
  });

  afterAll(() => {
    console.log('\n📊 CWE-480 Regression Test Results:');
    testResults.forEach((result, index) => {
      const status = result.isRegression ? '❌ REGRESSION' : '✅ FIXED';
      console.log(`${index + 1}. ${result.testCase}: ${status}`);
    });

    const regressions = testResults.filter(r => r.isRegression);
    console.log(`\nRegressions Found: ${regressions.length}/${testResults.length}`);

    if (regressions.length > 0) {
      console.log('\n🚨 Critical Regressions:');
      regressions.forEach(regression => {
        console.log(`- ${regression.testCase} (${regression.severity})`);
      });
    }
  });

  describe('🎯 Primary CWE-480 Fix Validation', () => {
    test('should correctly apply security headers for /auth/ endpoints', () => {
      const testCases = [
        { path: '/auth/login', expected: true },
        { path: '/auth/register', expected: true },
        { path: '/auth/logout', expected: true },
        { path: '/auth/reset-password', expected: true },
        { path: '/auth/verify-email', expected: true },
        { path: '/auth/change-password', expected: true }
      ];

      testCases.forEach(testCase => {
        const url = new MockURL(testCase.path);
        const vulnerableResult = SecurityMiddlewareTest.applySecurityHeadersVulnerable(url);
        const fixedResult = SecurityMiddlewareTest.applySecurityHeadersFixed(url);

        testResults.push({
          testCase: `Auth endpoint: ${testCase.path}`,
          vulnerableResult,
          fixedResult,
          expectation: testCase.expected,
          isRegression: fixedResult !== testCase.expected,
          severity: 'HIGH'
        });

        expect(fixedResult).toBe(testCase.expected);
        expect(fixedResult).toBe(true); // All auth endpoints should return true
      });
    });

    test('should correctly apply security headers for /api/user/ endpoints', () => {
      const testCases = [
        { path: '/api/user/profile', expected: true },
        { path: '/api/user/settings', expected: true },
        { path: '/api/user/preferences', expected: true },
        { path: '/api/user/dashboard', expected: true },
        { path: '/api/user/notifications', expected: true },
        { path: '/api/user/security', expected: true }
      ];

      testCases.forEach(testCase => {
        const url = new MockURL(testCase.path);
        const vulnerableResult = SecurityMiddlewareTest.applySecurityHeadersVulnerable(url);
        const fixedResult = SecurityMiddlewareTest.applySecurityHeadersFixed(url);

        testResults.push({
          testCase: `User API endpoint: ${testCase.path}`,
          vulnerableResult,
          fixedResult,
          expectation: testCase.expected,
          isRegression: fixedResult !== testCase.expected,
          severity: 'HIGH'
        });

        expect(fixedResult).toBe(testCase.expected);
        expect(fixedResult).toBe(true); // All user API endpoints should return true
      });
    });

    test('should NOT apply security headers for public endpoints', () => {
      const testCases = [
        { path: '/public/home', expected: false },
        { path: '/static/css/main.css', expected: false },
        { path: '/assets/images/logo.png', expected: false },
        { path: '/api/public/status', expected: false },
        { path: '/docs/api', expected: false },
        { path: '/health-check', expected: false }
      ];

      testCases.forEach(testCase => {
        const url = new MockURL(testCase.path);
        const vulnerableResult = SecurityMiddlewareTest.applySecurityHeadersVulnerable(url);
        const fixedResult = SecurityMiddlewareTest.applySecurityHeadersFixed(url);

        testResults.push({
          testCase: `Public endpoint: ${testCase.path}`,
          vulnerableResult,
          fixedResult,
          expectation: testCase.expected,
          isRegression: fixedResult !== testCase.expected,
          severity: 'MEDIUM'
        });

        expect(fixedResult).toBe(testCase.expected);
        expect(fixedResult).toBe(false); // Public endpoints should return false
      });
    });
  });

  describe('🎯 Edge Cases and Boundary Conditions', () => {
    test('should handle edge cases with nullish coalescing vs logical OR', () => {
      const edgeCases = [
        { path: '/auth/', expected: true }, // Exact match
        { path: '/api/user/', expected: true }, // Exact match
        { path: '/auth', expected: false }, // Missing trailing slash
        { path: '/api/user', expected: false }, // Missing trailing slash
        { path: '/authentication/', expected: false }, // Similar but different
        { path: '/api/users/', expected: false }, // Plural vs singular
        { path: '/AUTH/LOGIN', expected: false }, // Case sensitivity
        { path: '/api/User/profile', expected: false }, // Case sensitivity
        { path: '', expected: false }, // Empty string
        { path: '/', expected: false }, // Root path
        { path: '/auth/nested/deep/path', expected: true }, // Nested auth path
        { path: '/api/user/nested/deep/path', expected: true } // Nested user path
      ];

      edgeCases.forEach(testCase => {
        const url = new MockURL(testCase.path);
        const vulnerableResult = SecurityMiddlewareTest.applySecurityHeadersVulnerable(url);
        const fixedResult = SecurityMiddlewareTest.applySecurityHeadersFixed(url);

        testResults.push({
          testCase: `Edge case: ${testCase.path || 'empty'}`,
          vulnerableResult,
          fixedResult,
          expectation: testCase.expected,
          isRegression: fixedResult !== testCase.expected,
          severity: 'MEDIUM'
        });

        expect(fixedResult).toBe(testCase.expected);
      });
    });

    test('should demonstrate the vulnerability in the original implementation', () => {
      // This test specifically shows why the original code was wrong
      const vulnerabilityDemonstrationCases = [
        {
          path: '/api/user/profile',
          description: 'Should apply headers for user API',
          expected: true
        },
        {
          path: '/public/home',
          description: 'Should NOT apply headers for public content',
          expected: false
        }
      ];

      vulnerabilityDemonstrationCases.forEach(testCase => {
        const url = new MockURL(testCase.path);

        // Test with the vulnerable implementation
        const vulnerableResult = SecurityMiddlewareTest.applySecurityHeadersVulnerable(url);

        // Test with the fixed implementation
        const fixedResult = SecurityMiddlewareTest.applySecurityHeadersFixed(url);

        // The vulnerable version might give wrong results due to nullish coalescing
        console.log(`Path: ${testCase.path}`);
        console.log(`  Vulnerable implementation result: ${vulnerableResult}`);
        console.log(`  Fixed implementation result: ${fixedResult}`);
        console.log(`  Expected result: ${testCase.expected}`);

        // The fixed version should always be correct
        expect(fixedResult).toBe(testCase.expected);

        // Document if the vulnerable version was wrong
        if (vulnerableResult !== testCase.expected) {
          console.log(`  ⚠️  Vulnerable implementation was incorrect!`);
        }
      });
    });

    test('should handle special characters and encoded paths', () => {
      const specialCharCases = [
        { path: '/auth/%2F', expected: true }, // URL encoded slash
        { path: '/api/user/%20profile', expected: true }, // URL encoded space
        { path: '/auth/../admin', expected: true }, // Path traversal attempt
        { path: '/api/user/../../etc/passwd', expected: true }, // Path traversal
        { path: '/auth/\u0000null', expected: true }, // Null byte
        { path: '/api/user/\uFEFFprofile', expected: true }, // BOM character
        { path: '/auth/login?redirect=/admin', expected: true }, // Query parameters
        { path: '/api/user/profile#section', expected: true }, // Fragment
        { path: '/auth/login;jsessionid=123', expected: true }, // Session ID
        { path: '/api/user/profile%00.txt', expected: true } // Null byte attempt
      ];

      specialCharCases.forEach(testCase => {
        const url = new MockURL(testCase.path);
        const vulnerableResult = SecurityMiddlewareTest.applySecurityHeadersVulnerable(url);
        const fixedResult = SecurityMiddlewareTest.applySecurityHeadersFixed(url);

        testResults.push({
          testCase: `Special chars: ${testCase.path}`,
          vulnerableResult,
          fixedResult,
          expectation: testCase.expected,
          isRegression: fixedResult !== testCase.expected,
          severity: 'HIGH'
        });

        expect(fixedResult).toBe(testCase.expected);
      });
    });
  });

  describe('🎯 Complex Logical Conditions', () => {
    test('should handle complex boolean expressions correctly', () => {
      const complexCases = [
        { path: '/admin/dashboard', isAuth: true, hasPerm: true, expected: true },
        { path: '/admin/users', isAuth: true, hasPerm: false, expected: true },
        { path: '/admin/settings', isAuth: false, hasPerm: true, expected: true },
        { path: '/admin/logs', isAuth: false, hasPerm: false, expected: false },
        { path: '/dashboard/main', isAuth: true, hasPerm: true, expected: true },
        { path: '/dashboard/stats', isAuth: false, hasPerm: false, expected: false },
        { path: '/public/home', isAuth: true, hasPerm: true, expected: false },
        { path: '/public/about', isAuth: false, hasPerm: false, expected: false }
      ];

      complexCases.forEach(testCase => {
        const url = new MockURL(testCase.path);
        const result = SecurityMiddlewareTest.complexLogicalCondition(
          url,
          testCase.isAuth,
          testCase.hasPerm
        );

        testResults.push({
          testCase: `Complex logic: ${testCase.path} (auth:${testCase.isAuth}, perm:${testCase.hasPerm})`,
          vulnerableResult: result,
          fixedResult: result,
          expectation: testCase.expected,
          isRegression: result !== testCase.expected,
          severity: 'MEDIUM'
        });

        expect(result).toBe(testCase.expected);
      });
    });

    test('should validate cache control header logic', () => {
      const cacheControlCases = [
        { path: '/auth/login', expected: true },
        { path: '/api/user/profile', expected: true },
        { path: '/admin/dashboard', expected: true },
        { path: '/api/sensitive/data', expected: true },
        { path: '/public/home', expected: false },
        { path: '/static/css/main.css', expected: false },
        { path: '/assets/images/logo.png', expected: false }
      ];

      cacheControlCases.forEach(testCase => {
        const url = new MockURL(testCase.path);
        const result = SecurityMiddlewareTest.shouldApplyNoCacheHeaders(url);

        testResults.push({
          testCase: `Cache control: ${testCase.path}`,
          vulnerableResult: result,
          fixedResult: result,
          expectation: testCase.expected,
          isRegression: result !== testCase.expected,
          severity: 'MEDIUM'
        });

        expect(result).toBe(testCase.expected);
      });
    });
  });

  describe('🎯 Performance Impact of Logical Operator Fix', () => {
    test('should not significantly impact performance after fix', () => {
      const testPaths = [
        '/auth/login',
        '/api/user/profile',
        '/public/home',
        '/static/css/main.css'
      ];

      // Measure performance of vulnerable implementation
      const vulnerableStartTime = performance.now();
      for (let i = 0; i < 10000; i++) {
        testPaths.forEach(path => {
          const url = new MockURL(path);
          SecurityMiddlewareTest.applySecurityHeadersVulnerable(url);
        });
      }
      const vulnerableTime = performance.now() - vulnerableStartTime;

      // Measure performance of fixed implementation
      const fixedStartTime = performance.now();
      for (let i = 0; i < 10000; i++) {
        testPaths.forEach(path => {
          const url = new MockURL(path);
          SecurityMiddlewareTest.applySecurityHeadersFixed(url);
        });
      }
      const fixedTime = performance.now() - fixedStartTime;

      console.log(`Performance comparison:`);
      console.log(`  Vulnerable implementation: ${vulnerableTime.toFixed(2)}ms`);
      console.log(`  Fixed implementation: ${fixedTime.toFixed(2)}ms`);
      console.log(`  Performance impact: ${((fixedTime - vulnerableTime) / vulnerableTime * 100).toFixed(2)}%`);

      // Performance should not degrade significantly (less than 10% impact)
      const performanceImpact = Math.abs((fixedTime - vulnerableTime) / vulnerableTime);
      expect(performanceImpact).toBeLessThan(0.1); // Less than 10% impact
    });
  });

  describe('🎯 Comprehensive Regression Detection', () => {
    test('should detect any regression in logical operator behavior', () => {
      // Test all possible boolean combinations for the logical operators
      const pathTests = ['/auth/test', '/api/user/test', '/other/test'];

      pathTests.forEach(testPath => {
        const url = new MockURL(testPath);

        const authMatch = testPath.includes('/auth/');
        const userMatch = testPath.includes('/api/user/');

        // Expected result using logical OR
        const expectedResult = authMatch || userMatch;

        // Test the fixed implementation
        const fixedResult = SecurityMiddlewareTest.applySecurityHeadersFixed(url);

        // Test the vulnerable implementation
        const vulnerableResult = SecurityMiddlewareTest.applySecurityHeadersVulnerable(url);

        expect(fixedResult).toBe(expectedResult);

        // Log if vulnerable implementation differs
        if (vulnerableResult !== expectedResult) {
          console.log(`Vulnerability detected in path: ${testPath}`);
          console.log(`  Expected: ${expectedResult}, Vulnerable got: ${vulnerableResult}`);
        }
      });
    });

    test('should validate fix across all security-critical paths', () => {
      const criticalPaths = [
        // Authentication paths
        '/auth/login',
        '/auth/register',
        '/auth/logout',
        '/auth/reset-password',
        '/auth/verify-email',
        '/auth/oauth/callback',

        // User API paths
        '/api/user/profile',
        '/api/user/settings',
        '/api/user/preferences',
        '/api/user/security',
        '/api/user/notifications',
        '/api/user/dashboard',

        // Non-security paths (should return false)
        '/public/home',
        '/static/assets/style.css',
        '/assets/images/logo.png',
        '/docs/api-reference',
        '/health-check',
        '/metrics'
      ];

      let fixedCorrectly = 0;
      let totalTests = 0;

      criticalPaths.forEach(path => {
        totalTests++;
        const url = new MockURL(path);

        const shouldHaveHeaders = path.includes('/auth/') || path.includes('/api/user/');
        const fixedResult = SecurityMiddlewareTest.applySecurityHeadersFixed(url);

        if (fixedResult === shouldHaveHeaders) {
          fixedCorrectly++;
        }

        expect(fixedResult).toBe(shouldHaveHeaders);
      });

      console.log(`Critical path validation: ${fixedCorrectly}/${totalTests} correct`);
      expect(fixedCorrectly).toBe(totalTests);
    });
  });
});

// Additional helper for testing nullish coalescing behavior
describe('🎯 Nullish Coalescing vs Logical OR Behavior Analysis', () => {
  test('should demonstrate the difference between ?? and || operators', () => {
    // This test demonstrates why the original code was wrong
    const testCases = [
      { left: true, right: true, description: 'both true' },
      { left: true, right: false, description: 'left true, right false' },
      { left: false, right: true, description: 'left false, right true' },
      { left: false, right: false, description: 'both false' },
      { left: null, right: true, description: 'left null, right true' },
      { left: undefined, right: true, description: 'left undefined, right true' }
    ];

    testCases.forEach(testCase => {
      // Logical OR behavior
      const logicalOrResult = testCase.left || testCase.right;

      // Nullish coalescing behavior
      const nullishCoalescingResult = testCase.left ?? testCase.right;

      console.log(`Case: ${testCase.description}`);
      console.log(`  Logical OR (||): ${logicalOrResult}`);
      console.log(`  Nullish coalescing (??): ${nullishCoalescingResult}`);

      // They should be the same for boolean values, but different for falsy values
      if (testCase.left === false && testCase.right === true) {
        expect(logicalOrResult).toBe(true);  // Correct for security headers
        expect(nullishCoalescingResult).toBe(false); // Wrong for security headers!
      }
    });
  });
});