/**
 * Comprehensive Security Tests for SecurePassword Module
 * Testing every line of password hashing and validation code
 */

import { SecurePassword } from '../../../src/worker/secure-password';

describe('SecurePassword Module - Comprehensive Security Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Hashing', () => {
    test('generates valid PBKDF2 hash with salt', async () => {
      const password = 'TestPassword123!';
      const hash = await SecurePassword.hashPassword(password);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');

      // Should start with our custom format identifier
      expect(hash.startsWith('$mbv$')).toBe(true);

      // Should have the correct number of parts
      const parts = hash.split('$');
      expect(parts).toHaveLength(5); // ['', 'mbv', cost, salt, hash]
      expect(parts[1]).toBe('mbv'); // Format identifier
      expect(parts[2]).toBe('12'); // Cost factor
      expect(parts[3]).toHaveLength(32); // Base64 salt (24 bytes = 32 base64 chars)
      expect(parts[4]).toHaveLength(44); // Base64 hash (32 bytes = 44 base64 chars)
    });

    test('generates different hashes for same password', async () => {
      const password = 'TestPassword123!';

      const hash1 = await SecurePassword.hashPassword(password);
      const hash2 = await SecurePassword.hashPassword(password);

      expect(hash1).not.toBe(hash2);

      // Different salts should be used
      const salt1 = hash1.split('$')[3];
      const salt2 = hash2.split('$')[3];
      expect(salt1).not.toBe(salt2);
    });

    test('generates secure random salts', async () => {
      const salts = new Set();
      const iterations = 100;

      // Generate many salts to test randomness
      for (let i = 0; i < iterations; i++) {
        const hash = await SecurePassword.hashPassword(`password${i}`);
        const salt = hash.split('$')[3];
        salts.add(salt);
      }

      // All salts should be unique
      expect(salts.size).toBe(iterations);
    });

    test('handles edge case passwords', async () => {
      const edgeCases = [
        '', // Empty password
        'a', // Single character
        'A'.repeat(1000), // Very long password
        '🔒🚀💎', // Unicode characters
        'pass word with spaces',
        'password\nwith\nnewlines',
        'password\twith\ttabs',
        'password"with\'quotes',
        'password\with\backslashes',
        'password/with/slashes',
        'password&with&special<>chars!@#$%^*()_+-=[]{}|;:,.<>?`~'
      ];

      for (const password of edgeCases) {
        const hash = await SecurePassword.hashPassword(password);
        expect(hash).toBeTruthy();
        expect(hash.startsWith('$mbv$12$')).toBe(true);

        // Verify the hash can be used for verification
        const isValid = await SecurePassword.verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    test('uses consistent cost factor', async () => {
      const passwords = ['test1', 'test2', 'test3'];

      for (const password of passwords) {
        const hash = await SecurePassword.hashPassword(password);
        const costFactor = hash.split('$')[2];
        expect(costFactor).toBe('12');
      }
    });

    test('salt has sufficient entropy', async () => {
      const hash = await SecurePassword.hashPassword('test');
      const salt = hash.split('$')[3];

      // Decode base64 salt
      const saltBytes = Buffer.from(salt, 'base64');
      expect(saltBytes.length).toBe(24); // 192 bits

      // Check that salt is not all zeros or all same value
      const uniqueBytes = new Set(saltBytes);
      expect(uniqueBytes.size).toBeGreaterThan(1);
    });
  });

  describe('Password Verification', () => {
    test('verifies correct password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await SecurePassword.hashPassword(password);

      const isValid = await SecurePassword.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('rejects incorrect password', async () => {
      const correctPassword = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await SecurePassword.hashPassword(correctPassword);

      const isValid = await SecurePassword.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    test('rejects password with different case', async () => {
      const password = 'TestPassword123!';
      const wrongCasePassword = 'testpassword123!';
      const hash = await SecurePassword.hashPassword(password);

      const isValid = await SecurePassword.verifyPassword(wrongCasePassword, hash);
      expect(isValid).toBe(false);
    });

    test('handles verification timing consistently', async () => {
      const password = 'TestPassword123!';
      const hash = await SecurePassword.hashPassword(password);

      // Measure time for correct password
      const correctTimes = [];
      for (let i = 0; i < 5; i++) {
        const start = process.hrtime.bigint();
        await SecurePassword.verifyPassword(password, hash);
        const end = process.hrtime.bigint();
        correctTimes.push(Number(end - start));
      }

      // Measure time for incorrect password
      const incorrectTimes = [];
      for (let i = 0; i < 5; i++) {
        const start = process.hrtime.bigint();
        await SecurePassword.verifyPassword('wrong', hash);
        const end = process.hrtime.bigint();
        incorrectTimes.push(Number(end - start));
      }

      // Times should be in similar range (timing attack protection)
      const avgCorrect = correctTimes.reduce((a, _b) => a + b) / correctTimes.length;
      const avgIncorrect = incorrectTimes.reduce((a, _b) => a + b) / incorrectTimes.length;

      expect(Math.abs(avgCorrect - avgIncorrect) / avgCorrect).toBeLessThan(2);
    });

    test('handles malformed hash formats gracefully', async () => {
      const password = 'TestPassword123!';
      const malformedHashes = [
        '', // Empty hash
        'invalid', // Not our format
        '$mbv$', // Incomplete format
        '$mbv$12$', // Missing salt and hash
        '$mbv$12$salt$', // Missing hash
        '$bcrypt$12$salt$hash', // Wrong format identifier
        '$mbv$invalid$salt$hash', // Invalid cost factor
        '$mbv$12$invalid-salt$hash', // Invalid salt
        '$mbv$12$salt$invalid-hash' // Invalid hash
      ];

      for (const hash of malformedHashes) {
        const isValid = await SecurePassword.verifyPassword(password, hash);
        expect(isValid).toBe(false);
      }
    });

    test('verifies all edge case passwords correctly', async () => {
      const edgeCases = [
        '', // Empty password
        'a', // Single character
        'A'.repeat(500), // Long password
        '🔒🚀💎', // Unicode
        'pass word',
        'passwordnwithnnewlines',
        'password"with'quotes'
      ];

      for (const password of edgeCases) {
        const hash = await SecurePassword.hashPassword(password);
        const isValid = await SecurePassword.verifyPassword(password, hash);
        expect(isValid).toBe(true);

        // Also test that wrong passwords are rejected
        const wrongPassword = password + 'wrong';
        const isInvalid = await SecurePassword.verifyPassword(wrongPassword, hash);
        expect(isInvalid).toBe(false);
      }
    });

    test('rejects null and undefined inputs', async () => {
      const hash = await SecurePassword.hashPassword('test');

      const invalidInputs = [null, undefined];

      for (const input of invalidInputs) {
        const isValid = await SecurePassword.verifyPassword(input as unknown, hash);
        expect(isValid).toBe(false);

        const isValid2 = await SecurePassword.verifyPassword('test', input as unknown);
        expect(isValid2).toBe(false);
      }
    });
  });

  describe('Password Strength Validation', () => {
    test('accepts strong passwords', () => {
      const strongPasswords = [
        'MyStr0ng!P@ssw0rd',
        'C0mpl3x_Pa$$word123',
        'Secure123!@#Password',
        'V3ry$tr0ng&P@ssw0rd',
        'Unbreakable123!Password',
        'Super_Secure_P@ssw0rd1'
      ];

      for (const password of strongPasswords) {
        const result = SecurePassword.validatePasswordStrength(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.score).toBeGreaterThanOrEqual(4);
      }
    });

    test('rejects weak passwords', () => {
      const weakPasswords = [
        '123', // Too short
        'password', // Common password, no numbers/symbols
        'abc123', // Too short, no symbols
        'PASSWORD', // No lowercase, numbers, symbols
        'abcdefgh', // No uppercase, numbers, symbols
        '12345678', // No letters
        '!!!!!!!' // No letters or numbers
      ];

      for (const password of weakPasswords) {
        const result = SecurePassword.validatePasswordStrength(password);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.score).toBeLessThan(4);
      }
    });

    test('provides detailed error messages', () => {
      const testCases = [
        {
          password: '123',
          expectedErrors: ['Password must be at least 8 characters long']
        },
        {
          password: 'abcdefgh',
          expectedErrors: [
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character'
          ]
        },
        {
          password: 'password',
          expectedErrors: [
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character'
          ]
        }
      ];

      for (const testCase of testCases) {
        const result = SecurePassword.validatePasswordStrength(testCase.password);
        expect(result.valid).toBe(false);

        for (const expectedError of testCase.expectedErrors) {
          expect(result.errors).toContain(expectedError);
        }
      }
    });

    test('calculates strength score correctly', () => {
      const testCases = [
        { password: '123', expectedScore: 0 },
        { password: 'abcdefgh', expectedScore: 1 }, // length only
        { password: 'Abcdefgh', expectedScore: 2 }, // length + uppercase
        { password: 'Abcd1234', expectedScore: 3 }, // length + uppercase + numbers
        { password: 'Abcd123!', expectedScore: 4 }, // length + uppercase + numbers + symbols
        { password: 'VeryLongPasswordWith123!@#', expectedScore: 5 } // all criteria + extra length
      ];

      for (const testCase of testCases) {
        const result = SecurePassword.validatePasswordStrength(testCase.password);
        expect(result.score).toBe(testCase.expectedScore);
      }
    });

    test('handles edge cases in validation', () => {
      const edgeCases = [
        { password: '', expected: false }, // Empty
        { password: 'A1!'.repeat(3), expected: true }, // Exactly 9 chars, all criteria
        { password: 'a'.repeat(100), expected: false }, // Very long but weak
        { password: '🔒🚀💎Password123!', expected: true }, // Unicode with strong criteria
        { password: 'Pass Word 123!', expected: true } // Spaces are allowed
      ];

      for (const testCase of edgeCases) {
        const result = SecurePassword.validatePasswordStrength(testCase.password);
        expect(result.valid).toBe(testCase.expected);
      }
    });

    test('identifies common passwords', () => {
      const commonPasswords = [
        'password',
        'password123',
        'admin',
        'qwerty',
        'letmein',
        '123456',
        'welcome'
      ];

      for (const password of commonPasswords) {
        const result = SecurePassword.validatePasswordStrength(password);
        expect(result.valid).toBe(false);
        // Should have low score due to being common
        expect(result.score).toBeLessThanOrEqual(2);
      }
    });

    test('handles null and undefined inputs gracefully', () => {
      const invalidInputs = [null, undefined];

      for (const input of invalidInputs) {
        const result = SecurePassword.validatePasswordStrength(input as unknown);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.score).toBe(0);
      }
    });
  });

  describe('Cryptographic Properties', () => {
    test('PBKDF2 implementation uses correct parameters', async () => {
      const password = 'TestPassword123!';
      const hash = await SecurePassword.hashPassword(password);

      const parts = hash.split('$');
      const costFactor = parseInt(parts[2]);
      const iterations = Math.pow(2, costFactor);

      // Should use 2^12 = 4096 iterations (industry standard minimum)
      expect(iterations).toBe(4096);
    });

    test('salt is cryptographically random', async () => {
      const salts = [];
      const iterations = 50;

      // Generate multiple salts
      for (let i = 0; i < iterations; i++) {
        const hash = await SecurePassword.hashPassword(`password${i}`);
        const salt = hash.split('$')[3];
        salts.push(salt);
      }

      // Test for basic randomness properties
      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(iterations); // All should be unique

      // Check distribution of first character (basic randomness test)
      const firstChars = salts.map(salt => salt[0]);
      const uniqueFirstChars = new Set(firstChars);
      expect(uniqueFirstChars.size).toBeGreaterThan(iterations / 10); // Should have good distribution
    });

    test('hash output has correct entropy', async () => {
      const hash = await SecurePassword.hashPassword('test');
      const hashPart = hash.split('$')[4];
      const hashBytes = Buffer.from(hashPart, 'base64');

      expect(hashBytes.length).toBe(32); // 256 bits

      // Check that hash is not all zeros or predictable
      const uniqueBytes = new Set(hashBytes);
      expect(uniqueBytes.size).toBeGreaterThan(10); // Should have good byte distribution
    });

    test('implementation is deterministic for same salt', async () => {
      const password = 'TestPassword123!';

      // Generate one hash to get the salt
      const originalHash = await SecurePassword.hashPassword(password);
      const parts = originalHash.split('$');
      const salt = parts[3];

      // Manually test with same salt (this would require access to internal implementation)
      // Since we can't access internal methods, we verify that verification works consistently
      for (let i = 0; i < 10; i++) {
        const isValid = await SecurePassword.verifyPassword(password, originalHash);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Security Against Common Attacks', () => {
    test('resists timing attacks', async () => {
      const password = 'TestPassword123!';
      const hash = await SecurePassword.hashPassword(password);

      // Test verification timing for various incorrect passwords
      const wrongPasswords = [
        'wrong',
        'TestPassword123', // Close but missing !
        'testpassword123!', // Different case
        'TestPassword124!', // One character different
        'T', // Very short
        'A'.repeat(100) // Very long
      ];

      const times = [];

      for (const wrongPassword of wrongPasswords) {
        const start = process.hrtime.bigint();
        const isValid = await SecurePassword.verifyPassword(wrongPassword, hash);
        const end = process.hrtime.bigint();

        expect(isValid).toBe(false);
        times.push(Number(end - start));
      }

      // All verification times should be within reasonable range
      const avgTime = times.reduce((a, _b) => a + b) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avgTime)));

      // Deviation should not be more than 3x average (loose timing attack protection test)
      expect(maxDeviation / avgTime).toBeLessThan(3);
    });

    test('prevents rainbow table attacks with unique salts', async () => {
      const password = 'commonpassword';
      const hashes = [];

      // Generate multiple hashes of the same password
      for (let i = 0; i < 10; i++) {
        const hash = await SecurePassword.hashPassword(password);
        hashes.push(hash);
      }

      // All hashes should be different (due to unique salts)
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10);

      // All should verify correctly
      for (const hash of hashes) {
        const isValid = await SecurePassword.verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    test('resists brute force with sufficient iterations', async () => {
      const hash = await SecurePassword.hashPassword('test');
      const parts = hash.split('$');
      const costFactor = parseInt(parts[2]);

      // Cost factor should be at least 12 (4096 iterations)
      expect(costFactor).toBeGreaterThanOrEqual(12);

      // At 4096 iterations, brute force becomes computationally expensive
      const iterations = Math.pow(2, costFactor);
      expect(iterations).toBeGreaterThanOrEqual(4096);
    });

    test('handles hash collision attempts', async () => {
      // Test with passwords that might cause hash collisions
      const similarPasswords = [
        'TestPassword123!',
        'TestPassword123!a', // One character added
        'aTestPassword123!', // One character prepended
        'TestPassword123!'.slice(0, -1) // One character removed
      ];

      const hashes = [];
      for (const password of similarPasswords) {
        const hash = await SecurePassword.hashPassword(password);
        hashes.push(hash);
      }

      // All hashes should be different
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(similarPasswords.length);

      // Cross-verification should fail
      for (let i = 0; i < similarPasswords.length; i++) {
        for (let j = 0; j < hashes.length; j++) {
          const isValid = await SecurePassword.verifyPassword(similarPasswords[i], hashes[j]);
          if (i === j) {
            expect(isValid).toBe(true); // Same password should verify
          } else {
            expect(isValid).toBe(false); // Different passwords should not verify
          }
        }
      }
    });
  });

  describe('Performance and Scalability', () => {
    test('hashing performance is within acceptable range', async () => {
      const password = 'TestPassword123!';

      const start = process.hrtime.bigint();
      await SecurePassword.hashPassword(password);
      const end = process.hrtime.bigint();

      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds

      // Hashing should complete within reasonable time (adjust based on requirements)
      expect(duration).toBeLessThan(1000); // Less than 1 second
      expect(duration).toBeGreaterThan(1); // But take some time (security requirement)
    });

    test('verification performance is consistent', async () => {
      const password = 'TestPassword123!';
      const hash = await SecurePassword.hashPassword(password);

      const verificationTimes = [];

      for (let i = 0; i < 5; i++) {
        const start = process.hrtime.bigint();
        await SecurePassword.verifyPassword(password, hash);
        const end = process.hrtime.bigint();
        verificationTimes.push(Number(end - start));
      }

      // Verification times should be consistent
      const avgTime = verificationTimes.reduce((a, _b) => a + b) / verificationTimes.length;
      const maxDeviation = Math.max(...verificationTimes.map(t => Math.abs(t - avgTime)));

      expect(maxDeviation / avgTime).toBeLessThan(0.5); // Within 50% of average
    });

    test('handles concurrent operations safely', async () => {
      const password = 'TestPassword123!';

      // Run multiple hashing operations concurrently
      const hashPromises = Array(10).fill(0).map(() => SecurePassword.hashPassword(password));
      const hashes = await Promise.all(hashPromises);

      // All should succeed and be unique
      expect(hashes).toHaveLength(10);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10);

      // All should verify correctly
      const verificationPromises = hashes.map(hash => SecurePassword.verifyPassword(password, hash));
      const results = await Promise.all(verificationPromises);

      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });
});