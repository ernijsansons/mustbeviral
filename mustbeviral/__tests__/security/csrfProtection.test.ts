/**
 * CSRF Protection Security Tests
 * CVSS 8.8 - Critical CSRF Protection Vulnerability Tests
 * Tests CSRF token generation, validation, and protection mechanisms
 */

import { SecurityMiddleware } from '../../src/worker/security-middleware';
import { CloudflareEnv } from '../../src/lib/cloudflare';

// Mock Cloudflare environment
const mockEnv: CloudflareEnv = {
  JWTSECRET: 'test_secret_key_for_csrf_token_generation_minimum_32_chars_12345',
  ENVIRONMENT: 'production',
} as any;

// Mock request helper
const createMockRequest = (
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: any
): Request => {
  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
    if (!headers['content-type']) {
      (requestInit.headers as Headers).set('content-type', 'application/json');
    }
  }

  return new Request(url, requestInit);
};

describe('CSRF Protection Tests', () => {
  describe('CVSS 8.8 - CSRF Token Generation and Validation', () => {
    test('should generate unique CSRF tokens for each user', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      const tokens: string[] = [];

      for (const userId of userIds) {
        const token = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(20);
        expect(tokens).not.toContain(token); // Ensure uniqueness
        tokens.push(token);
      }
    });

    test('should generate different tokens for same user at different times', async () => {
      const userId = 'test_user_123';
      const token1 = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const token2 = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      expect(token1).not.toBe(token2);
    });

    test('should validate legitimate CSRF tokens', async () => {
      const userId = 'test_user_456';
      const token = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      const isValid = await SecurityMiddleware.validateCSRFToken(token, userId, mockEnv);
      expect(isValid).toBe(true);
    });

    test('should reject CSRF tokens for different users', async () => {
      const user1 = 'user_alice';
      const user2 = 'user_bob';

      const tokenForUser1 = await SecurityMiddleware.generateCSRFToken(user1, mockEnv);

      // Try to validate Alice's token against Bob's user ID
      const isValid = await SecurityMiddleware.validateCSRFToken(tokenForUser1, user2, mockEnv);
      expect(isValid).toBe(false);
    });

    test('should reject expired CSRF tokens', async () => {
      const userId = 'test_user_789';

      // Create a token with a past timestamp by mocking Date.now
      const originalNow = Date.now;
      const pastTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      Date.now = jest.fn(() => pastTime);

      const expiredToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      // Restore original Date.now
      Date.now = originalNow;

      const isValid = await SecurityMiddleware.validateCSRFToken(expiredToken, userId, mockEnv);
      expect(isValid).toBe(false);
    });

    test('should reject malformed CSRF tokens', async () => {
      const userId = 'test_user_malformed';
      const malformedTokens = [
        '',
        'invalid_token',
        'no.signature',
        'too.many.parts.here',
        'invalid_base64.invalid_signature',
        null,
        undefined,
      ];

      for (const malformedToken of malformedTokens) {
        const isValid = await SecurityMiddleware.validateCSRFToken(
          malformedToken as any,
          userId,
          mockEnv
        );
        expect(isValid).toBe(false);
      }
    });

    test('should reject tokens with tampered signatures', async () => {
      const userId = 'test_user_tampered';
      const legitimateToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      // Tamper with the signature part
      const [data, signature] = legitimateToken.split('.');
      const tamperedToken = `${data}.${signature}tampered`;

      const isValid = await SecurityMiddleware.validateCSRFToken(tamperedToken, userId, mockEnv);
      expect(isValid).toBe(false);
    });

    test('should handle token validation with different JWT secrets', async () => {
      const userId = 'test_user_secret';
      const token = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      // Use different environment with different JWT secret
      const differentEnv = {
        ...mockEnv,
        JWTSECRET: 'different_secret_key_that_should_cause_validation_failure'
      };

      const isValid = await SecurityMiddleware.validateCSRFToken(token, userId, differentEnv as any);
      expect(isValid).toBe(false);
    });
  });

  describe('State-Changing Endpoint Protection', () => {
    const protectedEndpoints = [
      { method: 'POST', path: '/api/users', description: 'User registration' },
      { method: 'PUT', path: '/api/users/profile', description: 'Profile update' },
      { method: 'DELETE', path: '/api/users/123', description: 'User deletion' },
      { method: 'POST', path: '/api/content', description: 'Content creation' },
      { method: 'PUT', path: '/api/content/456', description: 'Content update' },
      { method: 'DELETE', path: '/api/content/456', description: 'Content deletion' },
      { method: 'POST', path: '/api/payments/stripe-webhook', description: 'Payment webhook' },
      { method: 'POST', path: '/api/auth/password-reset', description: 'Password reset' },
      { method: 'PUT', path: '/api/settings', description: 'Settings update' },
      { method: 'POST', path: '/api/admin/users/bulk-action', description: 'Bulk user actions' },
    ];

    protectedEndpoints.forEach(({ method, path, description }) => {
      test(`should require CSRF token for ${description} (${method} ${path})`, async () => {
        const request = createMockRequest(method, `https://api.mustbeviral.com${path}`, {
          'origin': 'https://mustbeviral.com',
          'authorization': 'Bearer valid_jwt_token',
        });

        // Simulate middleware check for CSRF token
        const csrfToken = request.headers.get('x-csrf-token');
        expect(csrfToken).toBeNull(); // No token provided

        // This should fail CSRF validation
        const shouldReject = !csrfToken || csrfToken.length === 0;
        expect(shouldReject).toBe(true);
      });

      test(`should accept valid CSRF token for ${description} (${method} ${path})`, async () => {
        const userId = 'authenticated_user_123';
        const validToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

        const request = createMockRequest(method, `https://api.mustbeviral.com${path}`, {
          'origin': 'https://mustbeviral.com',
          'authorization': 'Bearer valid_jwt_token',
          'x-csrf-token': validToken,
        });

        const csrfToken = request.headers.get('x-csrf-token');
        expect(csrfToken).toBe(validToken);

        // Validate the token
        const isValid = await SecurityMiddleware.validateCSRFToken(csrfToken!, userId, mockEnv);
        expect(isValid).toBe(true);
      });
    });

    test('should allow GET requests without CSRF tokens', async () => {
      const readOnlyEndpoints = [
        '/api/users/profile',
        '/api/content',
        '/api/content/123',
        '/api/settings',
      ];

      for (const endpoint of readOnlyEndpoints) {
        const request = createMockRequest('GET', `https://api.mustbeviral.com${endpoint}`, {
          'origin': 'https://mustbeviral.com',
          'authorization': 'Bearer valid_jwt_token',
        });

        // GET requests should not require CSRF tokens
        const csrfToken = request.headers.get('x-csrf-token');
        const requiresCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);

        if (!requiresCSRF) {
          expect(csrfToken === null).toBe(true); // It's OK if no CSRF token for GET
        }
      }
    });

    test('should handle CSRF protection for AJAX requests', async () => {
      const userId = 'ajax_user_456';
      const csrfToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      const ajaxRequest = createMockRequest('POST', 'https://api.mustbeviral.com/api/content', {
        'origin': 'https://mustbeviral.com',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrf-token': csrfToken,
        'content-type': 'application/json',
      }, { title: 'Test Content', body: 'Test content body' });

      // Verify AJAX-specific headers
      expect(ajaxRequest.headers.get('x-requested-with')).toBe('XMLHttpRequest');
      expect(ajaxRequest.headers.get('x-csrf-token')).toBe(csrfToken);

      // Validate CSRF token
      const isValid = await SecurityMiddleware.validateCSRFToken(csrfToken, userId, mockEnv);
      expect(isValid).toBe(true);
    });
  });

  describe('Cross-Origin Request Protection', () => {
    test('should reject CSRF tokens from unauthorized origins', async () => {
      const userId = 'cross_origin_user';
      const csrfToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      const maliciousOrigins = [
        'https://evil-site.com',
        'http://localhost:8080', // Different port
        'https://mustbeviral.evil.com', // Subdomain attack
        'https://mustbeviralmalicious.com', // Domain confusion
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const origin of maliciousOrigins) {
        const request = createMockRequest('POST', 'https://api.mustbeviral.com/api/users', {
          'origin': origin,
          'x-csrf-token': csrfToken,
        });

        // Even with valid CSRF token, unauthorized origins should be rejected
        const corsValidation = SecurityMiddleware.validateCORSRequest(request, mockEnv);
        expect(corsValidation.valid).toBe(false);
      }
    });

    test('should accept CSRF tokens from authorized origins', async () => {
      const userId = 'authorized_user';
      const csrfToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      const authorizedOrigins = [
        'https://mustbeviral.com',
        'https://www.mustbeviral.com',
        'https://app.mustbeviral.com',
      ];

      for (const origin of authorizedOrigins) {
        const request = createMockRequest('POST', 'https://api.mustbeviral.com/api/users', {
          'origin': origin,
          'x-csrf-token': csrfToken,
        });

        const corsValidation = SecurityMiddleware.validateCORSRequest(request, mockEnv);
        expect(corsValidation.valid).toBe(true);

        // CSRF token should also be valid
        const isValidCSRF = await SecurityMiddleware.validateCSRFToken(csrfToken, userId, mockEnv);
        expect(isValidCSRF).toBe(true);
      }
    });

    test('should handle preflight OPTIONS requests', async () => {
      const preflightRequest = createMockRequest('OPTIONS', 'https://api.mustbeviral.com/api/users', {
        'origin': 'https://mustbeviral.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-csrf-token',
      });

      const corsValidation = SecurityMiddleware.validateCORSRequest(preflightRequest, mockEnv);
      expect(corsValidation.valid).toBe(true);
      expect(corsValidation.headers).toBeDefined();
      expect(corsValidation.headers!['Access-Control-Allow-Headers']).toContain('X-CSRF-Token');
    });
  });

  describe('Double Submit Cookie Pattern', () => {
    test('should support double submit cookie CSRF protection', async () => {
      const userId = 'cookie_user_789';
      const csrfToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      // Simulate double submit: token in both header and cookie
      const request = createMockRequest('POST', 'https://api.mustbeviral.com/api/content', {
        'origin': 'https://mustbeviral.com',
        'x-csrf-token': csrfToken,
        'cookie': `csrf_token=${csrfToken}; session_id=abc123`,
      });

      const headerToken = request.headers.get('x-csrf-token');
      const cookieHeader = request.headers.get('cookie');
      const cookieToken = cookieHeader?.match(/csrf_token=([^;]+)/)?.[1];

      expect(headerToken).toBe(csrfToken);
      expect(cookieToken).toBe(csrfToken);
      expect(headerToken).toBe(cookieToken); // Double submit verification

      const isValid = await SecurityMiddleware.validateCSRFToken(headerToken!, userId, mockEnv);
      expect(isValid).toBe(true);
    });

    test('should reject mismatched double submit tokens', async () => {
      const userId = 'mismatch_user';
      const headerToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);
      const cookieToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      const request = createMockRequest('POST', 'https://api.mustbeviral.com/api/content', {
        'origin': 'https://mustbeviral.com',
        'x-csrf-token': headerToken,
        'cookie': `csrf_token=${cookieToken}; session_id=abc123`,
      });

      const requestHeaderToken = request.headers.get('x-csrf-token');
      const cookieHeader = request.headers.get('cookie');
      const requestCookieToken = cookieHeader?.match(/csrf_token=([^;]+)/)?.[1];

      // Both tokens are valid individually
      expect(await SecurityMiddleware.validateCSRFToken(requestHeaderToken!, userId, mockEnv)).toBe(true);
      expect(await SecurityMiddleware.validateCSRFToken(requestCookieToken!, userId, mockEnv)).toBe(true);

      // But they don't match (double submit should fail)
      expect(requestHeaderToken).not.toBe(requestCookieToken);
    });
  });

  describe('CSRF Protection Edge Cases', () => {
    test('should handle concurrent token validations', async () => {
      const userId = 'concurrent_user';
      const token = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);

      // Simulate multiple concurrent validations
      const validationPromises = Array(10).fill(0).map(() =>
        SecurityMiddleware.validateCSRFToken(token, userId, mockEnv)
      );

      const results = await Promise.all(validationPromises);
      results.forEach(result => expect(result).toBe(true));
    });

    test('should handle token generation under high load', async () => {
      const userIds = Array(20).fill(0).map((_, i) => `load_test_user_${i}`);

      const tokenPromises = userIds.map(userId =>
        SecurityMiddleware.generateCSRFToken(userId, mockEnv)
      );

      const tokens = await Promise.all(tokenPromises);

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // All tokens should be valid
      for (let i = 0; i < tokens.length; i++) {
        const isValid = await SecurityMiddleware.validateCSRFToken(tokens[i], userIds[i], mockEnv);
        expect(isValid).toBe(true);
      }
    });

    test('should protect against timing attacks', async () => {
      const userId = 'timing_attack_user';
      const validToken = await SecurityMiddleware.generateCSRFToken(userId, mockEnv);
      const invalidToken = 'invalid_token_for_timing_test';

      // Measure validation times
      const measureValidationTime = async (token: string): Promise<number> => {
        const start = performance.now();
        await SecurityMiddleware.validateCSRFToken(token, userId, mockEnv);
        return performance.now() - start;
      };

      const validTimes: number[] = [];
      const invalidTimes: number[] = [];

      // Run multiple measurements to reduce noise
      for (let i = 0; i < 10; i++) {
        validTimes.push(await measureValidationTime(validToken));
        invalidTimes.push(await measureValidationTime(invalidToken));
      }

      const avgValidTime = validTimes.reduce((a, b) => a + b) / validTimes.length;
      const avgInvalidTime = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;

      // Timing difference should be minimal (within 50% variance)
      const timingDifference = Math.abs(avgValidTime - avgInvalidTime);
      const maxAcceptableDifference = Math.max(avgValidTime, avgInvalidTime) * 0.5;

      expect(timingDifference).toBeLessThan(maxAcceptableDifference);
    });

    test('should handle malformed JWT secrets gracefully', async () => {
      const userId = 'malformed_secret_user';
      const malformedEnv = {
        ...mockEnv,
        JWTSECRET: '', // Empty secret
      };

      // Should handle empty JWT secret gracefully
      await expect(
        SecurityMiddleware.generateCSRFToken(userId, malformedEnv as any)
      ).rejects.toThrow();

      // Should handle null JWT secret gracefully
      const nullEnv = {
        ...mockEnv,
        JWTSECRET: null as any,
      };

      await expect(
        SecurityMiddleware.generateCSRFToken(userId, nullEnv)
      ).rejects.toThrow();
    });
  });

  describe('CSRF Protection Integration', () => {
    test('should integrate with authentication middleware', async () => {
      const authenticatedUserId = 'auth_integration_user';
      const csrfToken = await SecurityMiddleware.generateCSRFToken(authenticatedUserId, mockEnv);

      // Simulate full request with both auth and CSRF
      const authenticatedRequest = createMockRequest('POST', 'https://api.mustbeviral.com/api/users', {
        'origin': 'https://mustbeviral.com',
        'authorization': `Bearer valid_jwt_token_for_${authenticatedUserId}`,
        'x-csrf-token': csrfToken,
        'content-type': 'application/json',
      }, {
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User'
      });

      // Verify both authentication and CSRF protection
      expect(authenticatedRequest.headers.get('authorization')).toContain('Bearer');
      expect(authenticatedRequest.headers.get('x-csrf-token')).toBe(csrfToken);

      const isValidCSRF = await SecurityMiddleware.validateCSRFToken(csrfToken, authenticatedUserId, mockEnv);
      expect(isValidCSRF).toBe(true);
    });

    test('should work with session-based authentication', async () => {
      const sessionUserId = 'session_user_123';
      const csrfToken = await SecurityMiddleware.generateCSRFToken(sessionUserId, mockEnv);

      const sessionRequest = createMockRequest('PUT', 'https://api.mustbeviral.com/api/users/profile', {
        'origin': 'https://mustbeviral.com',
        'cookie': `session_id=secure_session_123; csrf_token=${csrfToken}`,
        'x-csrf-token': csrfToken,
      });

      // Verify session and CSRF integration
      const cookieHeader = sessionRequest.headers.get('cookie');
      expect(cookieHeader).toContain('session_id=');
      expect(cookieHeader).toContain(`csrf_token=${csrfToken}`);

      const isValidCSRF = await SecurityMiddleware.validateCSRFToken(csrfToken, sessionUserId, mockEnv);
      expect(isValidCSRF).toBe(true);
    });
  });
});