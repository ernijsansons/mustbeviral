// Comprehensive unit tests for AuthService
// Tests all authentication methods, validation, and edge cases

import { AuthService, AuthUser, LoginCredentials, SignupData } from '../../../src/lib/auth';

// Mock bcrypt for password operations
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jose for JWT operations
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn(),
  })),
  jwtVerify: jest.fn(),
}));

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

describe('AuthService', () => {
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
  const mockSignJWT = SignJWT as jest.MockedClass<typeof SignJWT>;
  const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

  const validUser: AuthUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    role: 'creator',
    onboarding_completed: true,
    ai_preference_level: 3,
  };

  const mockSecret = 'test-jwt-secret-key-for-testing-purposes';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the static properties for each test
    (AuthService as any).jwtSecret = undefined;
    (AuthService as any).isInitializing = false;
    (AuthService as any).initPromise = undefined;
    
    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initJwtSecret', () => {
    it('should initialize JWT secret successfully', async () => {
      await AuthService.initJwtSecret(mockSecret);
      
      // Verify secret is set by calling a method that requires it
      expect(() => (AuthService as any).getJwtSecret()).not.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      await AuthService.initJwtSecret(mockSecret);
      const firstSecret = (AuthService as any).getJwtSecret();
      
      await AuthService.initJwtSecret('different-secret');
      const secondSecret = (AuthService as any).getJwtSecret();
      
      expect(firstSecret).toBe(secondSecret);
    });

    it('should handle concurrent initialization properly', async () => {
      const promises = [
        AuthService.initJwtSecret(mockSecret),
        AuthService.initJwtSecret(mockSecret),
        AuthService.initJwtSecret(mockSecret),
      ];
      
      await Promise.all(promises);
      
      expect(() => (AuthService as any).getJwtSecret()).not.toThrow();
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashed-password';
      
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      
      const result = await AuthService.hashPassword(password);
      
      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should throw error when hashing fails', async () => {
      const password = 'TestPassword123!';
      const error = new Error('Bcrypt error');
      
      mockBcrypt.hash.mockRejectedValue(error);
      
      await expect(AuthService.hashPassword(password)).rejects.toThrow('Failed to hash password');
    });

    it('should handle empty password', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed-empty');
      
      const result = await AuthService.hashPassword('');
      expect(result).toBe('hashed-empty');
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully when valid', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashed-password';
      
      mockBcrypt.compare.mockResolvedValue(true);
      
      const result = await AuthService.verifyPassword(password, hashedPassword);
      
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should verify password successfully when invalid', async () => {
      const password = 'WrongPassword';
      const hashedPassword = 'hashed-password';
      
      mockBcrypt.compare.mockResolvedValue(false);
      
      const result = await AuthService.verifyPassword(password, hashedPassword);
      
      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should throw error when verification fails', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashed-password';
      const error = new Error('Bcrypt verification error');
      
      mockBcrypt.compare.mockRejectedValue(error);
      
      await expect(AuthService.verifyPassword(password, hashedPassword)).rejects.toThrow('Failed to verify password');
    });
  });

  describe('generateToken', () => {
    beforeEach(async () => {
      await AuthService.initJwtSecret(mockSecret);
    });

    it('should generate JWT token successfully', async () => {
      const expectedToken = 'generated-jwt-token';
      const mockSign = jest.fn().mockResolvedValue(expectedToken);
      
      mockSignJWT.mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: mockSign,
      } as any));
      
      const result = await AuthService.generateToken(validUser);
      
      expect(result).toBe(expectedToken);
      expect(mockSignJWT).toHaveBeenCalled();
      expect(mockSign).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('should throw error when JWT secret not initialized', async () => {
      (AuthService as any).jwtSecret = undefined;
      
      await expect(AuthService.generateToken(validUser)).rejects.toThrow('JWT secret not initialized. Call AuthService.initJwtSecret() first.');
    });

    it('should throw error when JWT signing fails', async () => {
      const error = new Error('JWT signing error');
      const mockSign = jest.fn().mockRejectedValue(error);
      
      mockSignJWT.mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: mockSign,
      } as any));
      
      await expect(AuthService.generateToken(validUser)).rejects.toThrow('Failed to generate token');
    });

    it('should include all user properties in token payload', async () => {
      const mockSign = jest.fn().mockResolvedValue('token');
      let capturedPayload: any;
      
      mockSignJWT.mockImplementation((payload) => {
        capturedPayload = payload;
        return {
          setProtectedHeader: jest.fn().mockReturnThis(),
          setIssuedAt: jest.fn().mockReturnThis(),
          setExpirationTime: jest.fn().mockReturnThis(),
          sign: mockSign,
        } as any;
      });
      
      await AuthService.generateToken(validUser);
      
      expect(capturedPayload).toEqual({
        id: validUser.id,
        email: validUser.email,
        username: validUser.username,
        role: validUser.role,
      });
    });
  });

  describe('verifyToken', () => {
    beforeEach(async () => {
      await AuthService.initJwtSecret(mockSecret);
    });

    it('should verify valid token successfully', async () => {
      const token = 'valid-jwt-token';
      const payload = {
        id: validUser.id,
        email: validUser.email,
        username: validUser.username,
        role: validUser.role,
        onboarding_completed: validUser.onboarding_completed,
        ai_preference_level: validUser.ai_preference_level,
      };
      
      mockJwtVerify.mockResolvedValue({ payload } as any);
      
      const result = await AuthService.verifyToken(token);
      
      expect(result).toEqual(validUser);
      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(Uint8Array));
    });

    it('should return null for invalid token string', async () => {
      const result1 = await AuthService.verifyToken('');
      const result2 = await AuthService.verifyToken(null as any);
      const result3 = await AuthService.verifyToken(undefined as any);
      const result4 = await AuthService.verifyToken(123 as any);
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
      expect(result4).toBeNull();
    });

    it('should return null when JWT verification fails', async () => {
      const token = 'invalid-jwt-token';
      
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'));
      
      const result = await AuthService.verifyToken(token);
      
      expect(result).toBeNull();
    });

    it('should return null for invalid payload structure', async () => {
      const token = 'valid-jwt-token';
      const invalidPayload = {
        id: 'user-123',
        // missing required fields
      };
      
      mockJwtVerify.mockResolvedValue({ payload: invalidPayload } as any);
      
      const result = await AuthService.verifyToken(token);
      
      expect(result).toBeNull();
    });

    it('should handle payload with missing optional fields', async () => {
      const token = 'valid-jwt-token';
      const minimalPayload = {
        id: validUser.id,
        email: validUser.email,
        username: validUser.username,
        role: validUser.role,
      };
      
      mockJwtVerify.mockResolvedValue({ payload: minimalPayload } as any);
      
      const result = await AuthService.verifyToken(token);
      
      expect(result).toEqual({
        ...minimalPayload,
        onboarding_completed: undefined,
        ai_preference_level: undefined,
      });
    });

    it('should validate role enum values', async () => {
      const token = 'valid-jwt-token';
      const invalidRolePayload = {
        id: validUser.id,
        email: validUser.email,
        username: validUser.username,
        role: 'invalid-role',
      };
      
      mockJwtVerify.mockResolvedValue({ payload: invalidRolePayload } as any);
      
      const result = await AuthService.verifyToken(token);
      
      expect(result).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@example-domain.com',
        'a@b.co',
      ];
      
      validEmails.forEach(email => {
        expect(AuthService.validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user@@domain.com',
        'user@domain',
        'user name@domain.com',
        'user@domain..com',
        '.user@domain.com',
        'user.@domain.com',
      ];
      
      invalidEmails.forEach(email => {
        expect(AuthService.validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'MyStrongP@ssw0rd!',
        'C0mpl3x&Secure#2023',
        'Anoth3rStr0ng!Pass',
        'LongPasswordWith123!',
      ];
      
      strongPasswords.forEach(password => {
        const result = AuthService.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.strength).toBe('strong');
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should validate medium strength passwords', () => {
      const mediumPasswords = [
        'MyPassword123',  // Missing special char
        'mypassword123!', // Missing uppercase
        'MYPASSWORD123!', // Missing lowercase
      ];
      
      mediumPasswords.forEach(password => {
        const result = AuthService.validatePassword(password);
        expect(result.strength).toBe('medium');
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate weak passwords', () => {
      const weakPasswords = [
        'short',
        '12345678',
        'password',
        'PASSWORD',
      ];
      
      weakPasswords.forEach(password => {
        const result = AuthService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.strength).toBe('weak');
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject non-string passwords', () => {
      const nonStringPasswords = [null, undefined, 123, {}, []];
      
      nonStringPasswords.forEach(password => {
        const result = AuthService.validatePassword(password as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be a string');
      });
    });

    it('should detect common patterns', () => {
      const commonPatternPasswords = [
        'Password123!',
        'MyPassword123456!',
        'StrongPassword!!!',
        'Aaaaaa123!',
      ];
      
      commonPatternPasswords.forEach(password => {
        const result = AuthService.validatePassword(password);
        const hasCommonPatternError = result.errors.some(error => 
          error.includes('common patterns') || error.includes('repeated characters')
        );
        expect(hasCommonPatternError).toBe(true);
      });
    });

    it('should allow long passwords without special characters', () => {
      const longPassword = 'ThisIsAVeryLongPasswordWithoutSpecialChars123';
      const result = AuthService.validatePassword(longPassword);
      
      expect(['medium', 'strong']).toContain(result.strength);
    });

    it('should require minimum length', () => {
      const shortPassword = '1234567';
      const result = AuthService.validatePassword(shortPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letters', () => {
      const noUppercase = 'lowercase123!';
      const result = AuthService.validatePassword(noUppercase);
      
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letters', () => {
      const noLowercase = 'UPPERCASE123!';
      const result = AuthService.validatePassword(noLowercase);
      
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require numbers', () => {
      const noNumbers = 'NoNumbersHere!';
      const result = AuthService.validatePassword(noNumbers);
      
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      const validUsernames = [
        'testuser',
        'user_123',
        'User123',
        'test_user_name',
        'username123456789012345678',
      ];
      
      validUsernames.forEach(username => {
        const result = AuthService.validateUsername(username);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject too short usernames', () => {
      const shortUsernames = ['', 'a', 'ab'];
      
      shortUsernames.forEach(username => {
        const result = AuthService.validateUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Username must be at least 3 characters long');
      });
    });

    it('should reject too long usernames', () => {
      const longUsername = 'a'.repeat(31);
      const result = AuthService.validateUsername(longUsername);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username must be less than 30 characters');
    });

    it('should reject usernames with invalid characters', () => {
      const invalidUsernames = [
        'user-name',
        'user name',
        'user@name',
        'user.name',
        'user#name',
        'user!',
      ];
      
      invalidUsernames.forEach(username => {
        const result = AuthService.validateUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Username can only contain letters, numbers, and underscores');
      });
    });

    it('should handle edge case lengths', () => {
      const exactMinLength = 'abc'; // 3 chars
      const exactMaxLength = 'a'.repeat(30); // 30 chars
      
      expect(AuthService.validateUsername(exactMinLength).isValid).toBe(true);
      expect(AuthService.validateUsername(exactMaxLength).isValid).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should throw error when getting JWT secret before initialization', () => {
      expect(() => (AuthService as any).getJwtSecret()).toThrow('JWT secret not initialized');
    });

    it('should handle concurrent token generation', async () => {
      await AuthService.initJwtSecret(mockSecret);
      
      const mockSign = jest.fn().mockResolvedValue('token');
      mockSignJWT.mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: mockSign,
      } as any));
      
      const promises = [
        AuthService.generateToken(validUser),
        AuthService.generateToken({...validUser, id: 'user-456'}),
        AuthService.generateToken({...validUser, id: 'user-789'}),
      ];
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(mockSign).toHaveBeenCalledTimes(3);
    });

    it('should handle malformed JWT payloads gracefully', async () => {
      await AuthService.initJwtSecret(mockSecret);
      
      const malformedPayloads = [
        null,
        undefined,
        'string',
        123,
        [],
        { id: null },
        { email: 123 },
        { username: null },
        { role: 'invalid' },
      ];
      
      for (const payload of malformedPayloads) {
        mockJwtVerify.mockResolvedValue({ payload } as any);
        const result = await AuthService.verifyToken('token');
        expect(result).toBeNull();
      }
    });
  });

  describe('type safety and validation', () => {
    it('should validate AuthUser interface properties', () => {
      const validUsers: AuthUser[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          role: 'creator',
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          username: 'user2',
          role: 'influencer',
        },
        {
          id: 'user-3',
          email: 'user3@example.com',
          username: 'user3',
          role: 'admin',
        },
      ];

      validUsers.forEach(user => {
        expect((AuthService as any).isValidAuthUser(user)).toBe(true);
      });
    });

    it('should reject invalid AuthUser objects', () => {
      const invalidUsers = [
        null,
        undefined,
        {},
        { id: 'user-1' },
        { id: 'user-1', email: 'test@example.com' },
        { id: 'user-1', email: 'test@example.com', username: 'test' },
        { id: 'user-1', email: 'test@example.com', username: 'test', role: 'invalid' },
        { id: null, email: 'test@example.com', username: 'test', role: 'creator' },
        { id: 'user-1', email: null, username: 'test', role: 'creator' },
        { id: 'user-1', email: 'test@example.com', username: null, role: 'creator' },
      ];

      invalidUsers.forEach(user => {
        expect((AuthService as any).isValidAuthUser(user)).toBe(false);
      });
    });
  });
});