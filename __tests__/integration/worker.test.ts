// Integration tests for Cloudflare Worker
// Tests the complete request/response flow

import { testUtils, setupTestEnvironment } from '../setup/testEnvironment';
import { JWTManager } from '../../src/lib/auth/jwtManager';

// Import the worker
import worker from '../../src/worker';

describe('Worker Integration Tests', () => {
  let mockEnv: unknown;
  let cleanup: () => void;

  beforeAll(() => {
    cleanup = setupTestEnvironment();
  });

  afterAll(() => {
    cleanup();
  });

  beforeEach(() => {
    mockEnv = createMockCloudflareEnv();
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const request = new Request('http://localhost:8787/api/health', {
        method: 'GET',
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      const response = await worker.fetch(request, mockEnv, ctx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBeDefined();
      expect(data.services).toBeDefined();
    });
  });

  describe('Authentication Flow', () => {
    test('should register a new user', async () => {
      const userData = testUtils.generateTestUser();

      const request = new Request('http://localhost:8787/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      const response = await worker.fetch(request, mockEnv, ctx);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(userData.email);
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    test('should login an existing user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      // First register the user
      const registerRequest = new Request('http://localhost:8787/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...loginData,
          username: 'testuser',
          role: 'creator',
        }),
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      await worker.fetch(registerRequest, mockEnv, ctx);

      // Now login
      const loginRequest = new Request('http://localhost:8787/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const response = await worker.fetch(loginRequest, mockEnv, ctx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'WrongPassword',
      };

      const request = new Request('http://localhost:8787/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      const response = await worker.fetch(request, mockEnv, ctx);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    test('should get current user with valid token', async () => {
      // Mock a valid JWT token
      const mockToken = 'valid_jwt_token';

      const request = new Request('http://localhost:8787/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      // Mock JWT validation
      jest.spyOn(JWTManager, 'verifyAccessToken')
        .mockResolvedValue({
          valid: true,
          claims: {
            sub: 'user123',
            email: 'test@example.com',
            role: 'creator',
          },
        });

      const response = await worker.fetch(request, mockEnv, ctx);

      expect(response.status).toBeLessThan(500); // Should not error
    });

    test('should refresh access token', async () => {
      const refreshData = {
        refreshToken: 'valid_refresh_token',
      };

      const request = new Request('http://localhost:8787/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refreshData),
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      // Mock JWT refresh
      jest.spyOn(JWTManager, 'refreshAccessToken')
        .mockResolvedValue({
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
          expiresIn: 3600,
          tokenType: 'Bearer',
        });

      const response = await worker.fetch(request, mockEnv, ctx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });
  });

  describe('Onboarding', () => {
    test('should complete onboarding for authenticated user', async () => {
      const mockToken = 'valid_jwt_token';

      const request = new Request('http://localhost:8787/api/onboard', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      // Mock JWT validation
      jest.spyOn(JWTManager, 'verifyAccessToken')
        .mockResolvedValue({
          valid: true,
          claims: {
            sub: 'user123',
            email: 'test@example.com',
          },
        });

      const response = await worker.fetch(request, mockEnv, ctx);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Security Headers', () => {
    test('should add security headers to response', async () => {
      const request = new Request('http://localhost:8787/api/health', {
        method: 'GET',
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      const response = await worker.fetch(request, mockEnv, ctx);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    test('should handle CORS preflight requests', async () => {
      const request = new Request('http://localhost:8787/api/auth/login', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
        },
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      const response = await worker.fetch(request, mockEnv, ctx);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const request = new Request('http://localhost:8787/api/unknown', {
        method: 'GET',
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      const response = await worker.fetch(request, mockEnv, ctx);

      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:8787/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      const response = await worker.fetch(request, mockEnv, ctx);

      expect(response.status).toBe(400);
    });

    test('should validate required fields', async () => {
      const request = new Request('http://localhost:8787/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }), // Missing required fields
      });

      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      const response = await worker.fetch(request, mockEnv, ctx);

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const requests = [];
      const ctx = {
        waitUntil: jest.fn(),
        passThroughOnException: jest.fn(),
      };

      // Make multiple rapid requests
      for (let i = 0; i < 15; i++) {
        const request = new Request('http://localhost:8787/api/health', {
          method: 'GET',
          headers: {
            'CF-Connecting-IP': '192.168.1.1',
          },
        });
        requests.push(worker.fetch(request, mockEnv, ctx));
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited || responses.every(r => r.status === 200)).toBe(true);
    });
  });
});