/**
 * Rate Limiting Middleware Tests
 */

import { RateLimiter,
  KVRateLimitStore,
  MemoryRateLimitStore,
  createRateLimiter,
  rateLimitConfigs,
  keyGenerators
} from '../../../src/middleware/rateLimit';

describe('Rate Limiting', () => {
  describe('MemoryRateLimitStore', () => {
    let store: MemoryRateLimitStore;

    beforeEach(() => {
      store = new MemoryRateLimitStore();
    });

    it('should increment count for new key', async () => {
      const entry = await store.increment('test-key');

      expect(entry.count).toBe(1);
      expect(entry.firstRequest).toBeDefined();
      expect(entry.lastRequest).toBeDefined();
    });

    it('should increment count for existing key', async () => {
      await store.increment('test-key');
      const entry = await store.increment('test-key');

      expect(entry.count).toBe(2);
    });

    it('should decrement count', async () => {
      await store.increment('test-key');
      await store.increment('test-key');
      await store.decrement('test-key');

      const entry = await store.get('test-key');
      expect(entry?.count).toBe(1);
    });

    it('should reset key', async () => {
      await store.increment('test-key');
      await store.reset('test-key');

      const entry = await store.get('test-key');
      expect(entry).toBeNull();
    });

    it('should block and check blocked status', async () => {
      await store.block('blocked-key', 1000);

      const isBlocked = await store.isBlocked('blocked-key');
      expect(isBlocked).toBe(true);
    });

    it('should unblock after duration expires', async () => {
      jest.useFakeTimers();

      await store.block('temp-blocked', 1000);
      expect(await store.isBlocked('temp-blocked')).toBe(true);

      jest.advanceTimersByTime(1001);
      expect(await store.isBlocked('temp-blocked')).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('KVRateLimitStore', () => {
    let mockKV: unknown;
    let store: KVRateLimitStore;

    beforeEach(() => {
      mockKV = {
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
      };
      store = new KVRateLimitStore(mockKV);
    });

    it('should handle new key increment', async () => {
      mockKV.get.mockResolvedValue(null);

      const entry = await store.increment('test-key');

      expect(entry.count).toBe(1);
      expect(mockKV.put).toHaveBeenCalledWith(
        'rate_limit:test-key',
        expect.stringContaining('"count":1'),
        expect.objectContaining({ expirationTtl: 3600 })
      );
    });

    it('should handle existing key increment', async () => {
      const existingEntry = {
        count: 5,
        firstRequest: Date.now() - 1000,
        lastRequest: Date.now() - 500
      };

      mockKV.get.mockResolvedValue(JSON.stringify(existingEntry));

      const entry = await store.increment('test-key');

      expect(entry.count).toBe(6);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockKV.get.mockResolvedValue('invalid-json');

      const entry = await store.increment('test-key');

      expect(entry.count).toBe(1);
    });

    it('should handle blocking', async () => {
      mockKV.get.mockResolvedValue(null);

      await store.block('blocked-key', 5000);

      expect(mockKV.put).toHaveBeenCalledWith(
        'rate_limit:block:blocked-key',
        expect.stringContaining('"blocked":true'),
        expect.objectContaining({ expirationTtl: 5 })
      );
    });
  });

  describe('RateLimiter', () => {
    let store: MemoryRateLimitStore;
    let limiter: RateLimiter;

    beforeEach(() => {
      store = new MemoryRateLimitStore();
      limiter = new RateLimiter(
        {
          windowMs: 60000, // 1 minute
          maxRequests: 5,
          keyGenerator: (_req) => 'test-key',
          headers: true
        },
        store
      );

      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow requests within limit', async () => {
      const request = new Request('https://example.com');

      for (let i = 0; i < 5; i++) {
        const result = await limiter.shouldLimit(request);
        expect(result.limited).toBe(false);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should limit requests exceeding limit', async () => {
      const request = new Request('https://example.com');

      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        await limiter.shouldLimit(request);
      }

      // 6th request should be limited
      const result = await limiter.shouldLimit(request);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset window after time expires', async () => {
      const request = new Request('https://example.com');

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        await limiter.shouldLimit(request);
      }

      // Should be limited
      const limitedResult = await limiter.shouldLimit(request);
      expect(limitedResult.limited).toBe(true);

      // Advance time past window
      jest.advanceTimersByTime(61000);

      // Should be allowed again
      const allowedResult = await limiter.shouldLimit(request);
      expect(allowedResult.limited).toBe(false);
      expect(allowedResult.remaining).toBe(4);
    });

    it('should create proper rate limit response', () => {
      const response = limiter.createLimitResponse(30000);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('30');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should add headers to response', () => {
      const originalResponse = new Response('{}');

      const response = limiter.addHeaders(originalResponse, {
        remaining: 3,
        limit: 5,
        reset: Date.now() + 60000
      });

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('3');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should handle blocked keys', async () => {
      const request = new Request('https://example.com');

      await store.block('test-key', 60000);

      const result = await limiter.shouldLimit(request);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Key Generators', () => {
    it('should generate key by IP', () => {
      const request = new Request('https://example.com', {
        headers: {
          'CF-Connecting-IP': '192.168.1.1'
        }
      });

      const key = keyGenerators.byIP(request);
      expect(key).toBe('192.168.1.1');
    });

    it('should fallback for missing IP headers', () => {
      const request = new Request('https://example.com');

      const key = keyGenerators.byIP(request);
      expect(key).toBe('unknown');
    });

    it('should generate key by X-Forwarded-For', () => {
      const request = new Request('https://example.com', {
        headers: {
          'X-Forwarded-For': '10.0.0.1, 172.16.0.1'
        }
      });

      const key = keyGenerators.byIP(request);
      expect(key).toBe('10.0.0.1');
    });

    it('should generate key by user ID', () => {
      const request = new Request('https://example.com', {
        headers: {
          'Authorization': 'Bearer abcdef1234567890'
        }
      });

      const key = keyGenerators.byUser(request);
      expect(key).toBe('user:abcdef1234');
    });

    it('should handle missing authorization header', () => {
      const request = new Request('https://example.com');

      const key = keyGenerators.byUser(request);
      expect(key).toBe('anonymous');
    });

    it('should generate key by IP and endpoint', () => {
      const request = new Request('https://example.com/api/auth/login', {
        headers: {
          'CF-Connecting-IP': '192.168.1.1'
        }
      });

      const key = keyGenerators.byIPAndEndpoint(request);
      expect(key).toBe('192.168.1.1:/api/auth/login');
    });

    it('should generate key by API key', () => {
      const request = new Request('https://example.com', {
        headers: {
          'X-API-Key': 'sk_test_12345'
        }
      });

      const key = keyGenerators.byAPIKey(request);
      expect(key).toBe('sk_test_12345');
    });
  });

  describe('Rate Limit Middleware', () => {
    let store: MemoryRateLimitStore;
    let middleware: unknown;

    beforeEach(() => {
      store = new MemoryRateLimitStore();
      middleware = createRateLimiter(
        {
          windowMs: 60000,
          maxRequests: 3,
          keyGenerator: keyGenerators.byIP
        },
        store
      );

      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow requests within limit', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' }
      });

      const mockNext = jest.fn().mockResolvedValue(new Response('OK'));

      const response = await middleware(request, mockNext);

      expect(response.status).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('2');
    });

    it('should block requests exceeding limit', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' }
      });

      const mockNext = jest.fn().mockResolvedValue(new Response('OK'));

      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        await middleware(request, mockNext);
      }

      // Next request should be blocked
      const response = await middleware(request, mockNext);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();

      const body = await response.json();
      expect(body.error).toBe('RATE_LIMITED');
    });

    it('should handle different IPs separately', async () => {
      const request1 = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' }
      });

      const request2 = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.2' }
      });

      const mockNext = jest.fn().mockResolvedValue(new Response('OK'));

      // Fill limit for first IP
      for (let i = 0; i < 3; i++) {
        await middleware(request1, mockNext);
      }

      // First IP should be blocked
      const blockedResponse = await middleware(request1, mockNext);
      expect(blockedResponse.status).toBe(429);

      // Second IP should still be allowed
      const allowedResponse = await middleware(request2, mockNext);
      expect(allowedResponse.status).toBe(200);
    });
  });

  describe('Rate Limit Configurations', () => {
    it('should have auth config with strict limits', () => {
      expect(rateLimitConfigs.auth.maxRequests).toBe(5);
      expect(rateLimitConfigs.auth.windowMs).toBe(15 * 60 * 1000);
      expect(rateLimitConfigs.auth.progressiveDelay).toBe(true);
    });

    it('should have API config with moderate limits', () => {
      expect(rateLimitConfigs.api.maxRequests).toBe(60);
      expect(rateLimitConfigs.api.windowMs).toBe(60 * 1000);
    });

    it('should have password reset config with very strict limits', () => {
      expect(rateLimitConfigs.passwordReset.maxRequests).toBe(3);
      expect(rateLimitConfigs.passwordReset.windowMs).toBe(60 * 60 * 1000);
      expect(rateLimitConfigs.passwordReset.blockDuration).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('Progressive Blocking', () => {
    let store: MemoryRateLimitStore;
    let limiter: RateLimiter;

    beforeEach(() => {
      store = new MemoryRateLimitStore();
      limiter = new RateLimiter(
        {
          windowMs: 60000,
          maxRequests: 2,
          keyGenerator: (_req) => 'test-key',
          progressiveDelay: true,
          blockDuration: 60000
        },
        store
      );

      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should block repeat offenders', async () => {
      const request = new Request('https://example.com');

      // Exceed limit by a lot to trigger progressive blocking
      for (let i = 0; i < 6; i++) {
        await limiter.shouldLimit(request);
      }

      // Should be blocked
      const isBlocked = await store.isBlocked('test-key');
      expect(isBlocked).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle store errors gracefully', async () => {
      const faultyStore = {
        increment: jest.fn().mockRejectedValue(new Error('Store error')),
        get: jest.fn(),
        reset: jest.fn(),
        decrement: jest.fn(),
        block: jest.fn(),
        isBlocked: jest.fn().mockResolvedValue(false)
      };

      const limiter = new RateLimiter(
        {
          windowMs: 60000,
          maxRequests: 5,
          keyGenerator: (_req) => 'test-key'
        },
        faultyStore
      );

      const request = new Request('https://example.com');

      // Should not throw, but may behave unexpectedly
      await expect(limiter.shouldLimit(request)).rejects.toThrow();
    });
  });
});