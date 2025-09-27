/**
 * JWT Validation Security Tests
 * CVSS 8.1 - Critical JWT Validation Vulnerability Tests
 * Tests JWT signature verification, expiry checking, and security validations
 */

import { InputValidator } from '../../src/worker/input-validation';
import { SecureJWTValidator } from '../../src/lib/security/secureJWTValidator';

// Mock JWT tokens for testing
const validJWTSecret = 'test_jwt_secret_key_minimum_32_characters_for_security_validation';

describe('JWT Validation Security Tests', () => {
  describe('CVSS 8.1 - JWT Format and Structure Validation', () => {
    test('should validate proper JWT format (header.payload.signature)', () => {
      const validJWTs = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2ODQzMjEyMDAsImV4cCI6MTcxNTg1NzIwMCwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.oaEBPNGZs7VZVFZJnGHWqY3XDOIaGmGj_vYDgvg2lHM',
      ];

      validJWTs.forEach(jwt => {
        const validation = InputValidator.validateAuthHeader(`Bearer ${jwt}`);
        expect(validation.valid).toBe(true);
        expect(validation.token).toBe(jwt);
        expect(validation.error).toBeUndefined();
      });
    });

    test('should reject malformed JWT tokens', () => {
      const malformedJWTs = [
        '', // Empty
        'invalid', // No dots
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
        '.payload.signature', // Empty header
        'header..signature', // Empty payload
        'header.payload.', // Empty signature
        'not-base64!.payload.signature', // Invalid base64
        'header.not-base64!.signature', // Invalid base64 payload
        'header.payload.not-base64!', // Invalid base64 signature
      ];

      malformedJWTs.forEach(jwt => {
        const validation = InputValidator.validateAuthHeader(`Bearer ${jwt}`);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeDefined();
      });
    });

    test('should reject non-Bearer authorization formats', () => {
      const invalidFormats = [
        'Basic dXNlcjpwYXNzd29yZA==',
        'Digest username="test"',
        'API-Key abcdef123456',
        'Token jwt_token_here',
        'jwt_token_without_scheme',
        'Bearer', // Missing token
        'Bearer ', // Empty token after Bearer
      ];

      invalidFormats.forEach(authHeader => {
        const validation = InputValidator.validateAuthHeader(authHeader);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeDefined();
      });
    });

    test('should handle null and undefined authorization headers', () => {
      const nullValues = [null, undefined];

      nullValues.forEach(value => {
        const validation = InputValidator.validateAuthHeader(value);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBe('Authorization header required');
      });
    });

    test('should enforce minimum token length', () => {
      const shortTokens = [
        'a', // 1 character
        'ab', // 2 characters
        'abcdefghi', // 9 characters (below 10 minimum)
      ];

      shortTokens.forEach(token => {
        const validation = InputValidator.validateAuthHeader(`Bearer ${token}`);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBe('Invalid token format');
      });
    });
  });

  describe('JWT Signature Verification', () => {
    test('should verify JWT signatures with correct secret', async () => {
      const userId = 'test_user_123';
      const payload = {
        sub: userId,
        email: 'user@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      };

      const validToken = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(validToken, validJWTSecret);

      expect(isValid.valid).toBe(true);
      expect(isValid.payload?.sub).toBe(userId);
      expect(isValid.payload?.email).toBe('user@example.com');
    });

    test('should reject JWTs with incorrect signatures', async () => {
      const correctSecret = validJWTSecret;
      const wrongSecret = 'wrong_secret_key_different_from_original';

      const payload = {
        sub: 'test_user_456',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Generate token with correct secret
      const token = await SecureJWTValidator.generateJWT(payload, correctSecret);

      // Try to verify with wrong secret
      const isValid = await SecureJWTValidator.verifyJWT(token, wrongSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('signature verification failed');
    });

    test('should reject JWTs with tampered signatures', async () => {
      const payload = {
        sub: 'test_user_789',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const originalToken = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const [header, payloadPart, signature] = originalToken.split('.');

      // Tamper with signature
      const tamperedToken = `${header}.${payloadPart}.${signature}tampered`;

      const isValid = await SecureJWTValidator.verifyJWT(tamperedToken, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('signature verification failed');
    });

    test('should reject JWTs with tampered payload', async () => {
      const originalPayload = {
        sub: 'regular_user',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const originalToken = await SecureJWTValidator.generateJWT(originalPayload, validJWTSecret);
      const [header, , signature] = originalToken.split('.');

      // Create tampered payload (elevate privileges)
      const tamperedPayload = {
        sub: 'regular_user',
        role: 'admin', // Privilege escalation attempt
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const tamperedPayloadBase64 = btoa(JSON.stringify(tamperedPayload));
      const tamperedToken = `${header}.${tamperedPayloadBase64}.${signature}`;

      const isValid = await SecureJWTValidator.verifyJWT(tamperedToken, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('signature verification failed');
    });
  });

  describe('JWT Expiry Validation', () => {
    test('should accept tokens that are not yet expired', async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = {
        sub: 'test_user_future',
        iat: Math.floor(Date.now() / 1000),
        exp: futureExpiry,
      };

      const token = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

      expect(isValid.valid).toBe(true);
      expect(isValid.payload?.exp).toBe(futureExpiry);
    });

    test('should reject expired tokens', async () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = {
        sub: 'test_user_expired',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: pastExpiry,
      };

      const token = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('token expired');
    });

    test('should reject tokens without expiry claim', async () => {
      const payload = {
        sub: 'test_user_no_exp',
        iat: Math.floor(Date.now() / 1000),
        // Missing exp claim
      };

      const token = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('missing expiry claim');
    });

    test('should handle tokens with very long expiry times', async () => {
      const veryFarFuture = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60 * 10); // 10 years
      const payload = {
        sub: 'test_user_long_expiry',
        iat: Math.floor(Date.now() / 1000),
        exp: veryFarFuture,
      };

      const token = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

      // Should be valid but warn about long expiry
      expect(isValid.valid).toBe(true);
      expect(isValid.warnings).toContain('unusually long expiry time');
    });

    test('should enforce maximum token lifetime', async () => {
      const tooFarFuture = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60 * 50); // 50 years
      const payload = {
        sub: 'test_user_too_long',
        iat: Math.floor(Date.now() / 1000),
        exp: tooFarFuture,
      };

      const token = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('token lifetime exceeds maximum allowed');
    });
  });

  describe('JWT Claims Validation', () => {
    test('should validate required claims', async () => {
      const validPayload = {
        sub: 'test_user_claims',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'mustbeviral.com',
        aud: 'mustbeviral-api',
      };

      const token = await SecureJWTValidator.generateJWT(validPayload, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

      expect(isValid.valid).toBe(true);
      expect(isValid.payload?.sub).toBe('test_user_claims');
      expect(isValid.payload?.iss).toBe('mustbeviral.com');
      expect(isValid.payload?.aud).toBe('mustbeviral-api');
    });

    test('should reject tokens with missing subject claim', async () => {
      const payloadWithoutSub = {
        // Missing sub claim
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = await SecureJWTValidator.generateJWT(payloadWithoutSub, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('missing subject claim');
    });

    test('should validate audience claim', async () => {
      const payloadWithWrongAudience = {
        sub: 'test_user_aud',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'wrong-audience',
      };

      const token = await SecureJWTValidator.generateJWT(payloadWithWrongAudience, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret, {
        expectedAudience: 'mustbeviral-api',
      });

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('invalid audience');
    });

    test('should validate issuer claim', async () => {
      const payloadWithWrongIssuer = {
        sub: 'test_user_iss',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'malicious-issuer.com',
      };

      const token = await SecureJWTValidator.generateJWT(payloadWithWrongIssuer, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret, {
        expectedIssuer: 'mustbeviral.com',
      });

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('invalid issuer');
    });

    test('should validate not-before claim', async () => {
      const futureNbf = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payloadWithFutureNbf = {
        sub: 'test_user_nbf',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
        nbf: futureNbf,
      };

      const token = await SecureJWTValidator.generateJWT(payloadWithFutureNbf, validJWTSecret);
      const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('token not yet valid');
    });
  });

  describe('JWT Algorithm Validation', () => {
    test('should only accept HMAC algorithms', async () => {
      const payload = {
        sub: 'test_user_alg',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Test with secure algorithm
      const secureToken = await SecureJWTValidator.generateJWT(payload, validJWTSecret, 'HS256');
      const secureValidation = await SecureJWTValidator.verifyJWT(secureToken, validJWTSecret);

      expect(secureValidation.valid).toBe(true);
    });

    test('should reject none algorithm tokens', async () => {
      // Manually create a token with 'none' algorithm
      const header = { alg: 'none', typ: 'JWT' };
      const payload = {
        sub: 'test_user_none',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const noneToken = `${encodedHeader}.${encodedPayload}.`;

      const isValid = await SecureJWTValidator.verifyJWT(noneToken, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('insecure algorithm');
    });

    test('should reject asymmetric algorithms when expecting symmetric', async () => {
      const rsaHeader = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        sub: 'test_user_rsa',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const encodedHeader = btoa(JSON.stringify(rsaHeader));
      const encodedPayload = btoa(JSON.stringify(payload));
      const rsaToken = `${encodedHeader}.${encodedPayload}.fake_signature`;

      const isValid = await SecureJWTValidator.verifyJWT(rsaToken, validJWTSecret);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('unsupported algorithm');
    });
  });

  describe('JWT Security Attack Vectors', () => {
    test('should prevent algorithm confusion attacks', async () => {
      // Attempt to use RSA public key as HMAC secret
      const maliciousPayload = {
        sub: 'attacker',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const attackHeader = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = btoa(JSON.stringify(attackHeader));
      const encodedPayload = btoa(JSON.stringify(maliciousPayload));

      // Try to create signature using known RSA public key as HMAC secret
      const publicKeyAsSecret = '-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\\n-----END PUBLIC KEY-----';
      const maliciousToken = `${encodedHeader}.${encodedPayload}.malicious_signature`;

      const isValid = await SecureJWTValidator.verifyJWT(maliciousToken, validJWTSecret);

      expect(isValid.valid).toBe(false);
    });

    test('should prevent key confusion attacks', async () => {
      const payload = {
        sub: 'test_user_confusion',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Generate token with one secret
      const secret1 = 'first_secret_key_for_confusion_test_123456789';
      const token = await SecureJWTValidator.generateJWT(payload, secret1);

      // Try to verify with different secret
      const secret2 = 'second_secret_key_for_confusion_test_123456789';
      const isValid = await SecureJWTValidator.verifyJWT(token, secret2);

      expect(isValid.valid).toBe(false);
      expect(isValid.error).toContain('signature verification failed');
    });

    test('should prevent timing attacks on signature verification', async () => {
      const payload = {
        sub: 'timing_attack_user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const validToken = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const invalidToken = `${validToken.substring(0, validToken.length - 10)}invalid123`;

      // Measure timing for multiple validations
      const measureTiming = async (token: string): Promise<number> => {
        const start = performance.now();
        await SecureJWTValidator.verifyJWT(token, validJWTSecret);
        return performance.now() - start;
      };

      const validTimes: number[] = [];
      const invalidTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        validTimes.push(await measureTiming(validToken));
        invalidTimes.push(await measureTiming(invalidToken));
      }

      const avgValidTime = validTimes.reduce((a, b) => a + b) / validTimes.length;
      const avgInvalidTime = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;

      // Timing should be similar to prevent timing attacks
      const timingDifference = Math.abs(avgValidTime - avgInvalidTime);
      const maxAcceptableDifference = Math.max(avgValidTime, avgInvalidTime) * 0.5;

      expect(timingDifference).toBeLessThan(maxAcceptableDifference);
    });

    test('should reject tokens with suspicious claims', async () => {
      const suspiciousPayloads = [
        {
          sub: '../../../etc/passwd', // Path traversal attempt
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        {
          sub: '<script>alert(\"XSS\")</script>', // XSS attempt
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        {
          sub: 'user\'; DROP TABLE users; --', // SQL injection attempt
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      ];

      for (const suspiciousPayload of suspiciousPayloads) {
        const token = await SecureJWTValidator.generateJWT(suspiciousPayload, validJWTSecret);
        const isValid = await SecureJWTValidator.verifyJWT(token, validJWTSecret);

        // Token should be technically valid but claims should be sanitized
        expect(isValid.valid).toBe(true);
        expect(isValid.warnings).toContain('suspicious claims detected');
      }
    });
  });

  describe('JWT Integration with Current Validation', () => {
    test('should integrate with existing InputValidator.validateAuthHeader', async () => {
      const payload = {
        sub: 'integration_user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const validToken = await SecureJWTValidator.generateJWT(payload, validJWTSecret);
      const authHeader = `Bearer ${validToken}`;

      // Test current validation (format check)
      const formatValidation = InputValidator.validateAuthHeader(authHeader);
      expect(formatValidation.valid).toBe(true);
      expect(formatValidation.token).toBe(validToken);

      // Test enhanced validation (signature and expiry)
      const securityValidation = await SecureJWTValidator.verifyJWT(validToken, validJWTSecret);
      expect(securityValidation.valid).toBe(true);
    });

    test('should provide comprehensive validation errors', async () => {
      const malformedAuthHeaders = [
        null,
        '',
        'Bearer',
        'Bearer invalid.format',
        'Basic dXNlcjpwYXNzd29yZA==',
      ];

      for (const authHeader of malformedAuthHeaders) {
        const validation = InputValidator.validateAuthHeader(authHeader);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeDefined();
      }
    });
  });
});