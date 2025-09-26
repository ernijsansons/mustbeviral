/**
 * ErrorHandler Test Suite
 * Tests for comprehensive error handling system
 */

import { _ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  RateLimitError,
  BaseApplicationError
} from '../../../src/lib/errors/errorHandler';

// Mock dependencies
jest.mock('../../../src/lib/audit/securityLogger');
jest.mock('../../../src/lib/crypto/encryption');
jest.mock('../../../src/config/environment');

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError(
        'Username must be at least 3 characters',
        { field: 'username', value: 'ab' }
      );

      expect(error).toBeInstanceOf(BaseApplicationError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.userMessage).toBe('Invalid input provided');
      expect(error.category).toBe('VALIDATION');
      expect(error.severity).toBe('LOW');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'username', value: 'ab' });
      expect(error.retryable).toBe(false);
    });

    it('should have required properties inherited from BaseApplicationError', () => {
      const error = new ValidationError('Test message');

      expect(error.id).toBeDefined();
      expect(error.timestamp).toBeDefined();
      expect(typeof error.id).toBe('string');
      expect(typeof error.timestamp).toBe('string');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with correct properties', () => {
      const error = new AuthenticationError(
        'Token has expired',
        { tokenType: 'access', expiredAt: '2023-01-01T00:00:00Z' }
      );

      expect(error).toBeInstanceOf(BaseApplicationError);
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.userMessage).toBe('Authentication failed');
      expect(error.category).toBe('AUTHENTICATION');
      expect(error.severity).toBe('MEDIUM');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
    });

    it('should mark as sensitive by default', () => {
      const error = new AuthenticationError('Test message');
      expect(error.sensitive).toBe(true);
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with correct properties', () => {
      const error = new AuthorizationError(
        'User lacks required permissions',
        { requiredRole: 'admin', userRole: 'user' }
      );

      expect(error).toBeInstanceOf(BaseApplicationError);
      expect(error.code).toBe('AUTHZ_ERROR');
      expect(error.category).toBe('AUTHORIZATION');
      expect(error.severity).toBe('MEDIUM');
      expect(error.statusCode).toBe(403);
      expect(error.retryable).toBe(false);
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with correct properties', () => {
      const error = new DatabaseError(
        'Unable to connect to database',
        { host: 'localhost', port: 5432 }
      );

      expect(error).toBeInstanceOf(BaseApplicationError);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.category).toBe('DATABASE');
      expect(error.severity).toBe('HIGH');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
      expect(error.sensitive).toBe(false);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with correct properties', () => {
      const error = new RateLimitError(
        'Too many requests',
        { limit: 100, window: '1h', resetAt: '2023-01-01T01:00:00Z' }
      );

      expect(error).toBeInstanceOf(BaseApplicationError);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.category).toBe('SYSTEM');
      expect(error.severity).toBe('MEDIUM');
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
    });
  });

  describe('BaseApplicationError', () => {
    it('should generate unique IDs for different errors', () => {
      const error1 = new ValidationError('Message 1');
      const error2 = new ValidationError('Message 2');

      expect(error1.id).not.toBe(error2.id);
    });

    it('should preserve correlation ID when provided', () => {
      const correlationId = 'test-correlation-123';
      const error = new ValidationError('Message', {}, correlationId);

      expect(error.correlationId).toBe(correlationId);
    });

    it('should handle error serialization', () => {
      const error = new ValidationError(
        'Test message',
        { field: 'test' }
      );

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.code).toBe('VALIDATION_ERROR');
      expect(parsed.userMessage).toBe('Invalid input provided');
      expect(parsed.category).toBe('VALIDATION');
      expect(parsed.details).toEqual({ field: 'test' });
    });

    it('should handle error context setting', () => {
      const error = new ValidationError('Message');
      const userId = 'user-123';
      const sessionId = 'session-456';

      error.userId = userId;
      error.sessionId = sessionId;

      expect(error.userId).toBe(userId);
      expect(error.sessionId).toBe(sessionId);
    });

    it('should have proper toString representation', () => {
      const error = new ValidationError('Invalid username');
      const errorString = error.toString();

      expect(errorString).toContain('ValidationError');
      expect(errorString).toContain('Invalid username');
    });
  });

  describe('Error Categories and Severity', () => {
    it('should have correct validation error defaults', () => {
      const error = new ValidationError('Message');
      expect(error.category).toBe('VALIDATION');
      expect(error.severity).toBe('LOW');
      expect(error.statusCode).toBe(400);
    });

    it('should have correct authentication error defaults', () => {
      const error = new AuthenticationError('Message');
      expect(error.category).toBe('AUTHENTICATION');
      expect(error.severity).toBe('MEDIUM');
      expect(error.statusCode).toBe(401);
    });

    it('should have correct authorization error defaults', () => {
      const error = new AuthorizationError('Message');
      expect(error.category).toBe('AUTHORIZATION');
      expect(error.severity).toBe('MEDIUM');
      expect(error.statusCode).toBe(403);
    });

    it('should have correct database error defaults', () => {
      const error = new DatabaseError('Message');
      expect(error.category).toBe('DATABASE');
      expect(error.severity).toBe('HIGH');
      expect(error.statusCode).toBe(500);
    });

    it('should have correct rate limit error defaults', () => {
      const error = new RateLimitError('Message');
      expect(error.category).toBe('SYSTEM');
      expect(error.severity).toBe('MEDIUM');
      expect(error.statusCode).toBe(429);
    });
  });

  describe('Error Utility Methods', () => {
    it('should support error chaining', () => {
      const originalError = new Error('Original error');
      const wrappedError = new ValidationError('Wrapped error');

      // Simulate error chaining by setting cause
      (wrappedError as unknown).cause = originalError;

      expect((wrappedError as unknown).cause).toBe(originalError);
    });

    it('should handle error metadata properly', () => {
      const metadata = {
        requestId: 'req-123',
        endpoint: '/api/users',
        method: 'POST',
        userAgent: 'Mozilla/5.0'
      };

      const error = new ValidationError('Invalid request data', metadata);

      expect(error.details).toEqual(metadata);
      expect(error.details.requestId).toBe('req-123');
      expect(error.details.endpoint).toBe('/api/users');
    });
  });
});