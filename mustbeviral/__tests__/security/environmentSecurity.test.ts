/**
 * Environment Security Tests
 * CVSS 9.8 - Critical Hardcoded Secrets Vulnerability Tests
 * Tests secure environment variable handling and secret management
 */

import * as fs from 'fs';
import * as path from 'path';
import { SecretManager } from '../../src/lib/security/secretManager';

describe('Environment Security Tests', () => {
  const testEnvPath = path.join(__dirname, '../../.env.test');
  const prodEnvPath = path.join(__dirname, '../../.env.production');

  beforeEach(() => {
    // Clean up any test files
    if (fs.existsSync(testEnvPath)) {
      fs.unlinkSync(testEnvPath);
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testEnvPath)) {
      fs.unlinkSync(testEnvPath);
    }
  });

  describe('CVSS 9.8 - Hardcoded Secrets Detection', () => {
    test('should detect development secrets in environment files', () => {
      const devSecrets = [
        'dev_jwt_secret_key_for_local_testing',
        'dev_encryption_key_32chars_exact',
        'dev_session_secret_key_for_local_testing_only',
        'Dev_Postgres_Pass_2025!',
        'Dev_Redis_Pass_2025!',
        'sk_test_51234567890abcdefghijklmnopqrstuvwxyz',
      ];

      // Create a test env file with dev secrets
      const envContent = devSecrets.map(secret => `SECRET_KEY=${secret}`).join('\n');
      fs.writeFileSync(testEnvPath, envContent);

      const content = fs.readFileSync(testEnvPath, 'utf-8');

      devSecrets.forEach(secret => {
        expect(content).toContain(secret);
      });

      // These should be flagged as insecure for production
      const detectedSecrets = SecretManager.detectInsecureSecrets(content);
      expect(detectedSecrets.length).toBeGreaterThan(0);
      expect(detectedSecrets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'hardcoded_development_secret',
            severity: 'critical'
          })
        ])
      );
    });

    test('should validate secret entropy and strength', () => {
      const weakSecrets = [
        'password123',
        'admin',
        'secret',
        '1234567890',
        'qwerty',
        'password',
        'changeme',
      ];

      weakSecrets.forEach(secret => {
        const entropy = SecretManager.calculateEntropy(secret);
        expect(entropy).toBeLessThan(50); // Low entropy threshold

        const strength = SecretManager.validateSecretStrength(secret);
        expect(strength.valid).toBe(false);
        expect(strength.issues).toContain('insufficient_entropy');
      });
    });

    test('should require strong secrets for production', () => {
      const strongSecrets = [
        SecretManager.generateSecureSecret(64),
        SecretManager.generateSecureSecret(32),
        'sK3$2@mN8#vP9&qR4%tY7*uI1!oE5^wQ6+zA3_xC',
      ];

      strongSecrets.forEach(secret => {
        const entropy = SecretManager.calculateEntropy(secret);
        expect(entropy).toBeGreaterThan(80); // High entropy threshold

        const strength = SecretManager.validateSecretStrength(secret);
        expect(strength.valid).toBe(true);
        expect(strength.issues).toHaveLength(0);
      });
    });

    test('should detect common secret patterns', () => {
      const commonPatterns = [
        'sk_test_1234567890',     // Stripe test key
        'pk_test_1234567890',     // Stripe publishable key
        'sk_live_1234567890',     // Stripe live key
        'AKIA1234567890123456',   // AWS access key
        'AIza1234567890123456',   // Google API key
        'ya29.1234567890123456',  // Google OAuth token
        'ghp_1234567890123456',   // GitHub personal token
        'xoxb-1234567890123456',  // Slack bot token
      ];

      commonPatterns.forEach(pattern => {
        const detected = SecretManager.detectSecretPatterns(pattern);
        expect(detected).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: expect.any(String),
              severity: 'high'
            })
          ])
        );
      });
    });

    test('should scan environment files for leaked credentials', () => {
      const leakedEnvContent = `
        AWS_ACCESS_KEY_ID=FAKE_AWS_ACCESS_KEY_FOR_TESTING
        AWS_SECRET_ACCESS_KEY=FAKE_AWS_SECRET_FOR_TESTING_PURPOSES
        STRIPE_SECRET_KEY=sk_test_FAKE_STRIPE_KEY_FOR_TESTING_ONLY
        GITHUB_TOKEN=ghp_FAKE_GITHUB_TOKEN_FOR_TESTING_ONLY
        GOOGLE_API_KEY=AIza_FAKE_GOOGLE_API_KEY_FOR_TESTING
        DATABASE_PASSWORD=password123
        JWT_SECRET=weak_secret
      `;

      fs.writeFileSync(testEnvPath, leakedEnvContent);

      const scanResults = SecretManager.scanEnvironmentFile(testEnvPath);

      expect(scanResults.vulnerabilities.length).toBeGreaterThan(0);
      expect(scanResults.score).toBeLessThan(50); // Poor security score

      const criticalIssues = scanResults.vulnerabilities.filter(v => v.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Secure Secret Management', () => {
    test('should generate cryptographically secure secrets', () => {
      const iterations = 20; // Test multiple generations
      const secrets = [];

      for (let i = 0; i < iterations; i++) {
        const secret = SecretManager.generateSecureSecret(64);

        expect(secret).toHaveLength(64);
        expect(secrets).not.toContain(secret); // No duplicates
        expect(SecretManager.calculateEntropy(secret)).toBeGreaterThan(80);

        secrets.push(secret);
      }
    });

    test('should validate production environment configuration', () => {
      const prodEnvVars = {
        NODE_ENV: 'production',
        JWT_SECRET: SecretManager.generateSecureSecret(64),
        ENCRYPTION_KEY: SecretManager.generateSecureSecret(32),
        DATABASE_PASSWORD: SecretManager.generateSecureSecret(32),
        SESSION_SECRET: SecretManager.generateSecureSecret(64),
      };

      const validation = SecretManager.validateProductionSecrets(prodEnvVars);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.score).toBeGreaterThan(90);
    });

    test('should reject insecure production configurations', () => {
      const insecureProdEnvVars = {
        NODE_ENV: 'production',
        JWT_SECRET: 'dev_jwt_secret',
        ENCRYPTION_KEY: 'changeme',
        DATABASE_PASSWORD: 'password123',
        SESSION_SECRET: 'secret',
      };

      const validation = SecretManager.validateProductionSecrets(insecureProdEnvVars);

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.score).toBeLessThan(30);

      expect(validation.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'JWT_SECRET',
            issue: 'insufficient_entropy'
          }),
          expect.objectContaining({
            field: 'DATABASE_PASSWORD',
            issue: 'common_password'
          })
        ])
      );
    });

    test('should encrypt sensitive environment variables', async () => {
      const sensitiveData = {
        password: 'super_secret_password',
        apiKey: 'secret_api_key_12345',
        token: 'bearer_token_abcdef',
      };

      const masterKey = SecretManager.generateSecureSecret(32);

      for (const [key, value] of Object.entries(sensitiveData)) {
        const encrypted = await SecretManager.encryptSecret(value, masterKey);

        expect(encrypted).not.toBe(value);
        expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern

        const decrypted = await SecretManager.decryptSecret(encrypted, masterKey);
        expect(decrypted).toBe(value);
      }
    });

    test('should implement secret rotation capabilities', async () => {
      const oldSecret = SecretManager.generateSecureSecret(64);
      const newSecret = SecretManager.generateSecureSecret(64);

      const rotation = await SecretManager.rotateSecret('JWT_SECRET', oldSecret, newSecret);

      expect(rotation.success).toBe(true);
      expect(rotation.oldSecret).toBe(oldSecret);
      expect(rotation.newSecret).toBe(newSecret);
      expect(rotation.rotatedAt).toBeInstanceOf(Date);

      // Verify new secret meets security requirements
      const validation = SecretManager.validateSecretStrength(newSecret);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Environment Variable Validation', () => {
    test('should validate required environment variables exist', () => {
      const requiredVars = [
        'NODE_ENV',
        'JWT_SECRET',
        'DATABASE_URL',
        'ENCRYPTION_KEY',
        'SESSION_SECRET',
      ];

      const mockEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: SecretManager.generateSecureSecret(64),
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        ENCRYPTION_KEY: SecretManager.generateSecureSecret(32),
        // Missing SESSION_SECRET
      };

      const validation = SecretManager.validateRequiredVars(mockEnv, requiredVars);

      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('SESSION_SECRET');
    });

    test('should sanitize environment variables in logs', () => {
      const envVars = {
        PUBLIC_API_URL: 'https://api.example.com',
        JWT_SECRET: 'super_secret_jwt_key_12345',
        DATABASE_PASSWORD: 'database_password_67890',
        DEBUG_MODE: 'true',
      };

      const sanitized = SecretManager.sanitizeForLogging(envVars);

      expect(sanitized.PUBLIC_API_URL).toBe('https://api.example.com');
      expect(sanitized.JWT_SECRET).toBe('***REDACTED***');
      expect(sanitized.DATABASE_PASSWORD).toBe('***REDACTED***');
      expect(sanitized.DEBUG_MODE).toBe('true');
    });

    test('should implement secure environment variable loading', () => {
      const secureEnvContent = `
        # Production configuration
        NODE_ENV=production

        # Database (encrypted values)
        DATABASE_URL_ENCRYPTED=U2FsdGVkX1+abc123def456

        # API Keys (encrypted)
        STRIPE_SECRET_ENCRYPTED=U2FsdGVkX1+xyz789uvw012

        # Public values (unencrypted)
        API_BASE_URL=https://api.mustbeviral.com
        CORS_ORIGINS=https://mustbeviral.com,https://www.mustbeviral.com
      `;

      fs.writeFileSync(testEnvPath, secureEnvContent);

      const loaded = SecretManager.loadSecureEnvironment(testEnvPath);

      expect(loaded.encrypted).toEqual([
        'DATABASE_URL_ENCRYPTED',
        'STRIPE_SECRET_ENCRYPTED'
      ]);
      expect(loaded.public).toEqual([
        'API_BASE_URL',
        'CORS_ORIGINS'
      ]);
      expect(loaded.secrets).toHaveLength(0); // No plaintext secrets
    });
  });

  describe('Secret Leakage Prevention', () => {
    test('should prevent secrets from appearing in error messages', () => {
      const secret = 'super_secret_key_12345';
      const error = new Error(`Authentication failed with key: ${secret}`);

      const sanitizedError = SecretManager.sanitizeErrorMessage(error.message);

      expect(sanitizedError).not.toContain(secret);
      expect(sanitizedError).toContain('***REDACTED***');
    });

    test('should detect potential secret exposure in responses', () => {
      const responseData = {
        user: {
          id: '123',
          email: 'user@example.com',
          password_hash: '$2b$10$abc123def456',
        },
        token: 'jwt_token_12345',
        config: {
          api_key: 'secret_api_key',
          public_url: 'https://api.example.com',
        },
      };

      const exposure = SecretManager.detectSecretExposure(responseData);

      expect(exposure.exposed).toBe(true);
      expect(exposure.fields).toEqual(['password_hash', 'token', 'config.api_key']);
    });

    test('should implement runtime secret detection', () => {
      const suspiciousStrings = [
        'sk_live_abcdef123456',
        'AKIA1234567890123456',
        'password=secret123',
        'token=bearer_abc123',
      ];

      suspiciousStrings.forEach(str => {
        const detected = SecretManager.detectRuntimeSecrets(str);
        expect(detected).toBe(true);
      });

      const safeStrings = [
        'user@example.com',
        'https://api.example.com',
        'Hello world',
        '2023-12-01T00:00:00Z',
      ];

      safeStrings.forEach(str => {
        const detected = SecretManager.detectRuntimeSecrets(str);
        expect(detected).toBe(false);
      });
    });
  });
});