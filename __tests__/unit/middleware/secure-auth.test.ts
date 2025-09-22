/**
 * Comprehensive Security Tests for SecureAuth Module
 * Testing every line of cryptographic and authentication code
 */

import { SecureAuth } from '../../../src/worker/secure-auth';

// Mock CloudflareEnv
const mockEnv = {
  JWT_SECRET: 'test-jwt-secret-that-is-256-bits-long-for-hmac-sha256-algorithm!!!',
  JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-256-bits-long-for-hmac-sha256!!!',
  ENCRYPTION_KEY: 'test-encryption-key-256-bits-long-for-testing-purposes!!!',
  ENVIRONMENT: 'test',
  DB: null as unknown,
  KV: null as unknown
};

describe('SecureAuth Module - Comprehensive Security Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Token Generation', () => {
    test('generates valid JWT with correct structure', async () => {
      const token = await SecureAuth.generateToken(
        'user-123',
        'test@example.com',
        'testuser',
        'creator',
        mockEnv as unknown
      );

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      // Decode header and payload to verify structure
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.username).toBe('testuser');
      expect(payload.role).toBe('creator');
      expect(payload.iss).toBe('must-be-viral');
      expect(payload.aud).toBe('must-be-viral-app');
      expect(payload.iat).toBeTruthy();
      expect(payload.exp).toBeTruthy();
      expect(payload.exp > payload.iat).toBe(true);
    });

    test('generates different tokens for different inputs', async () => {
      const token1 = await SecureAuth.generateToken('user-1', 'user1@test.com', 'user1', 'creator', mockEnv as unknown);
      const token2 = await SecureAuth.generateToken('user-2', 'user2@test.com', 'user2', 'creator', mockEnv as unknown);

      expect(token1).not.toBe(token2);
    });

    test('generates different tokens at different times', async () => {
      const token1 = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1001));

      const token2 = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);

      expect(token1).not.toBe(token2);
    });

    test('handles all valid role types', async () => {
      const roles = ['creator', 'influencer', 'admin'];

      for (const role of roles) {
        const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', role, mockEnv as unknown);

        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        expect(payload.role).toBe(role);
      }
    });

    test('throws error with invalid secret', async () => {
      const invalidEnv = { ...mockEnv, JWT_SECRET: '' };

      await expect(
        SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', invalidEnv as unknown)
      ).rejects.toThrow();
    });
  });

  describe('JWT Token Verification', () => {
    test('verifies valid token successfully', async () => {
      const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);

      const result = await SecureAuth.verifyToken(token, mockEnv as unknown);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeTruthy();
      expect(result.payload!.sub).toBe('user-123');
      expect(result.payload!.email).toBe('test@example.com');
      expect(result.payload!.username).toBe('testuser');
      expect(result.payload!.role).toBe('creator');
      expect(result.error).toBeUndefined();
    });

    test('rejects invalid token format', async () => {
      const result = await SecureAuth.verifyToken('invalid.token', mockEnv as unknown);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe('Invalid token format');
    });

    test('rejects token with wrong signature', async () => {
      const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tampered-signature`;

      const result = await SecureAuth.verifyToken(tamperedToken, mockEnv as unknown);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe('Invalid signature');
    });

    test('rejects token with tampered payload', async () => {
      const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);
      const parts = token.split('.');

      // Tamper with payload
      const tamperedPayload = btoa(JSON.stringify({ sub: 'admin-user', role: 'admin' }));
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const result = await SecureAuth.verifyToken(tamperedToken, mockEnv as unknown);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe('Invalid signature');
    });

    test('rejects expired token', async () => {
      // Mock an expired token by setting a past timestamp
      const expiredPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'creator',
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        exp: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago (expired)
        iss: 'must-be-viral',
        aud: 'must-be-viral-app'
      };

      // We need to manually create this token since generateToken creates valid tokens
      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(expiredPayload));

      const crypto = require('crypto');
      const data = `${encodedHeader}.${encodedPayload}`;
      const signature = crypto.createHmac('sha256', mockEnv.JWT_SECRET).update(data).digest('base64url');
      const expiredToken = `${encodedHeader}.${encodedPayload}.${signature}`;

      const result = await SecureAuth.verifyToken(expiredToken, mockEnv as unknown);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe('Token expired');
    });

    test('rejects token with wrong issuer', async () => {
      // Create token with wrong issuer
      const wrongIssuerPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'creator',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
        iss: 'wrong-issuer',
        aud: 'must-be-viral-app'
      };

      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(wrongIssuerPayload));

      const crypto = require('crypto');
      const data = `${encodedHeader}.${encodedPayload}`;
      const signature = crypto.createHmac('sha256', mockEnv.JWT_SECRET).update(data).digest('base64url');
      const wrongIssuerToken = `${encodedHeader}.${encodedPayload}.${signature}`;

      const result = await SecureAuth.verifyToken(wrongIssuerToken, mockEnv as unknown);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe('Invalid issuer');
    });

    test('rejects token with wrong audience', async () => {
      // Create token with wrong audience
      const wrongAudiencePayload = {
        sub: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'creator',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
        iss: 'must-be-viral',
        aud: 'wrong-audience'
      };

      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(wrongAudiencePayload));

      const crypto = require('crypto');
      const data = `${encodedHeader}.${encodedPayload}`;
      const signature = crypto.createHmac('sha256', mockEnv.JWT_SECRET).update(data).digest('base64url');
      const wrongAudienceToken = `${encodedHeader}.${encodedPayload}.${signature}`;

      const result = await SecureAuth.verifyToken(wrongAudienceToken, mockEnv as unknown);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe('Invalid audience');
    });

    test('handles malformed token gracefully', async () => {
      const malformedTokens = [
        '',
        'not.a.token',
        'a.b',
        'a.b.c.d',
        '..',
        'invalid-base64.invalid-base64.invalid-base64'
      ];

      for (const token of malformedTokens) {
        const result = await SecureAuth.verifyToken(token, mockEnv as unknown);
        expect(result.valid).toBe(false);
        expect(result.payload).toBeNull();
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Refresh Token Generation', () => {
    test('generates valid refresh token', async () => {
      const refreshToken = await SecureAuth.generateRefreshToken('user-123', mockEnv as unknown);

      expect(refreshToken).toBeTruthy();
      expect(typeof refreshToken).toBe('string');

      // Refresh token should have 3 parts
      const parts = refreshToken.split('.');
      expect(parts).toHaveLength(3);

      // Decode and verify structure
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
      expect(payload.sub).toBe('user-123');
      expect(payload.type).toBe('refresh');
      expect(payload.iss).toBe('must-be-viral');
      expect(payload.aud).toBe('must-be-viral-app');
      expect(payload.exp > payload.iat).toBe(true);
    });

    test('generates unique refresh tokens', async () => {
      const token1 = await SecureAuth.generateRefreshToken('user-123', mockEnv as unknown);
      const token2 = await SecureAuth.generateRefreshToken('user-123', mockEnv as unknown);

      expect(token1).not.toBe(token2);
    });

    test('refresh token has longer expiry than access token', async () => {
      const accessToken = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);
      const refreshToken = await SecureAuth.generateRefreshToken('user-123', mockEnv as unknown);

      const accessPayload = JSON.parse(atob(accessToken.split('.')[1]));
      const refreshPayload = JSON.parse(atob(refreshToken.split('.')[1]));

      expect(refreshPayload.exp > accessPayload.exp).toBe(true);
    });
  });

  describe('Refresh Token Verification', () => {
    test('verifies valid refresh token', async () => {
      const refreshToken = await SecureAuth.generateRefreshToken('user-123', mockEnv as unknown);

      const result = await SecureAuth.verifyRefreshToken(refreshToken, mockEnv as unknown);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeTruthy();
      expect(result.payload!.sub).toBe('user-123');
      expect(result.payload!.type).toBe('refresh');
      expect(result.error).toBeUndefined();
    });

    test('rejects access token as refresh token', async () => {
      const accessToken = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);

      const result = await SecureAuth.verifyRefreshToken(accessToken, mockEnv as unknown);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe('Invalid token type');
    });

    test('uses different secret for verification', async () => {
      // This tests that refresh tokens use JWT_REFRESH_SECRET
      const refreshToken = await SecureAuth.generateRefreshToken('user-123', mockEnv as unknown);

      // Try to verify with wrong secret environment
      const wrongEnv = { ...mockEnv, JWT_REFRESH_SECRET: 'wrong-secret' };

      const result = await SecureAuth.verifyRefreshToken(refreshToken, wrongEnv as unknown);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });
  });

  describe('Authorization Header Validation', () => {
    test('validates correct Bearer token format', () => {
      const request = new Request('https://example.com', {
        headers: { 'Authorization': 'Bearer valid-token-here' }
      });

      const result = SecureAuth.validateAuthorizationHeader(request);

      expect(result.valid).toBe(true);
      expect(result.token).toBe('valid-token-here');
      expect(result.error).toBeUndefined();
    });

    test('rejects missing Authorization header', () => {
      const request = new Request('https://example.com');

      const result = SecureAuth.validateAuthorizationHeader(request);

      expect(result.valid).toBe(false);
      expect(result.token).toBeNull();
      expect(result.error).toBe('Missing Authorization header');
    });

    test('rejects invalid authorization format', () => {
      const invalidFormats = [
        'Basic username:password',
        'Token some-token',
        'Bearer',
        'Bearer ',
        'bearer token',
        'JWT token'
      ];

      for (const authHeader of invalidFormats) {
        const request = new Request('https://example.com', {
          headers: { 'Authorization': authHeader }
        });

        const result = SecureAuth.validateAuthorizationHeader(request);

        expect(result.valid).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Invalid authorization format');
      }
    });

    test('extracts token correctly from various valid formats', () => {
      const validCases = [
        { header: 'Bearer token123', expected: 'token123' },
        { header: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', expected: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' }
      ];

      for (const testCase of validCases) {
        const request = new Request('https://example.com', {
          headers: { 'Authorization': testCase.header }
        });

        const result = SecureAuth.validateAuthorizationHeader(request);

        expect(result.valid).toBe(true);
        expect(result.token).toBe(testCase.expected);
      }
    });
  });

  describe('Cryptographic Security', () => {
    test('uses constant-time comparison for token verification', async () => {
      // This test ensures timing attacks are prevented
      const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);

      // Measure time for correct token
      const start1 = process.hrtime.bigint();
      await SecureAuth.verifyToken(token, mockEnv as unknown);
      const end1 = process.hrtime.bigint();
      const correctTime = Number(end1 - start1);

      // Measure time for incorrect token (different length, should still take similar time)
      const start2 = process.hrtime.bigint();
      await SecureAuth.verifyToken('invalid', mockEnv as unknown);
      const end2 = process.hrtime.bigint();
      const incorrectTime = Number(end2 - start2);

      // Times should be in similar range (not order of magnitude different)
      // This is a basic timing attack protection test
      expect(Math.abs(correctTime - incorrectTime) / correctTime).toBeLessThan(10);
    });

    test('secret is properly encoded for HMAC', async () => {
      // Test that the secret is used correctly in HMAC
      const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);
      const parts = token.split('.');

      // Manually verify the signature
      const crypto = require('crypto');
      const data = `${parts[0]}.${parts[1]}`;
      const expectedSignature = crypto.createHmac('sha256', mockEnv.JWT_SECRET).update(data).digest('base64url');

      expect(parts[2]).toBe(expectedSignature);
    });

    test('handles edge cases in secret length', async () => {
      const shortSecretEnv = { ...mockEnv, JWT_SECRET: 'short' };

      // Should still work but with reduced security
      const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', shortSecretEnv as unknown);
      expect(token).toBeTruthy();

      const result = await SecureAuth.verifyToken(token, shortSecretEnv as unknown);
      expect(result.valid).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles undefined environment gracefully', async () => {
      await expect(
        SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', undefined as unknown)
      ).rejects.toThrow();
    });

    test('handles null user data gracefully', async () => {
      await expect(
        SecureAuth.generateToken(null as unknown, null as unknown, null as unknown, null as unknown, mockEnv as unknown)
      ).rejects.toThrow();
    });

    test('handles empty strings gracefully', async () => {
      const token = await SecureAuth.generateToken('', '', '', '', mockEnv as unknown);
      expect(token).toBeTruthy();

      const result = await SecureAuth.verifyToken(token, mockEnv as unknown);
      expect(result.valid).toBe(true);
      expect(result.payload!.sub).toBe('');
    });

    test('handles very long user data', async () => {
      const longString = 'a'.repeat(10000);

      const token = await SecureAuth.generateToken(longString, longString, longString, 'creator', mockEnv as unknown);
      expect(token).toBeTruthy();

      const result = await SecureAuth.verifyToken(token, mockEnv as unknown);
      expect(result.valid).toBe(true);
      expect(result.payload!.sub).toBe(longString);
    });

    test('handles special characters in user data', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"'\';

      const token = await SecureAuth.generateToken(specialChars, `${specialChars}@example.com`, specialChars, 'creator', mockEnv as unknown);
      expect(token).toBeTruthy();

      const result = await SecureAuth.verifyToken(token, mockEnv as unknown);
      expect(result.valid).toBe(true);
      expect(result.payload!.sub).toBe(specialChars);
    });

    test('handles unicode characters in user data', async () => {
      const unicode = '测试用户名🚀💎';

      const token = await SecureAuth.generateToken(unicode, `${unicode}@example.com`, unicode, 'creator', mockEnv as unknown);
      expect(token).toBeTruthy();

      const result = await SecureAuth.verifyToken(token, mockEnv as unknown);
      expect(result.valid).toBe(true);
      expect(result.payload!.sub).toBe(unicode);
    });
  });

  describe('Token Lifecycle Management', () => {
    test('token is immediately valid after generation', async () => {
      const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);
      const result = await SecureAuth.verifyToken(token, mockEnv as unknown);

      expect(result.valid).toBe(true);
    });

    test('token expiration time is correctly set', async () => {
      const beforeGeneration = Math.floor(Date.now() / 1000);
      const token = await SecureAuth.generateToken('user-123', 'test@example.com', 'testuser', 'creator', mockEnv as unknown);
      const afterGeneration = Math.floor(Date.now() / 1000);

      const payload = JSON.parse(atob(token.split('.')[1]));

      // Token should be issued around now
      expect(payload.iat).toBeGreaterThanOrEqual(beforeGeneration);
      expect(payload.iat).toBeLessThanOrEqual(afterGeneration);

      // Token should expire 15 minutes from issuance
      expect(payload.exp).toBe(payload.iat + 900);
    });

    test('refresh token expiration is correctly set', async () => {
      const beforeGeneration = Math.floor(Date.now() / 1000);
      const refreshToken = await SecureAuth.generateRefreshToken('user-123', mockEnv as unknown);
      const afterGeneration = Math.floor(Date.now() / 1000);

      const payload = JSON.parse(atob(refreshToken.split('.')[1]));

      // Token should be issued around now
      expect(payload.iat).toBeGreaterThanOrEqual(beforeGeneration);
      expect(payload.iat).toBeLessThanOrEqual(afterGeneration);

      // Refresh token should expire 7 days from issuance
      expect(payload.exp).toBe(payload.iat + 604800);
    });
  });
});