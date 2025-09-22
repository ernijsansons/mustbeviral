/**
 * Retry Client Tests
 */

import { _RetryClient,
  createRetryClient,
  retryClient,
  withRetry
} from '../../../../src/lib/api/retryClient';

// Mock fetch
global.fetch = jest.fn();

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint8Array(16))
  }
});

describe('RetryClient', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let client: RetryClient;

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();

    client = createRetryClient({
      maxRetries: 2,
      baseDelay: 10, // Shorter delays for faster tests
      maxDelay: 100,
      backoffMultiplier: 2,
      jitter: false, // Disable jitter for predictable tests
      timeout: 1000
    });

    // Only use fake timers for specific tests that need them
    jest.clearAllTimers();
  });

  afterEach(() => {
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
  });

  describe('Successful Requests', () => {
    it('should make successful request without retries', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as unknown);

      const result = await client.get('https://api.example.com/data');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle text responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Not JSON')),
        text: jest.fn().mockResolvedValue('Plain text response'),
        headers: new Headers({ 'content-type': 'text/plain' })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as unknown);

      const result = await client.get('https://api.example.com/text');

      expect(result).toBe('Plain text response');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable HTTP status codes', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      const successResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      };

      mockFetch
        .mockResolvedValueOnce(errorResponse as unknown)
        .mockResolvedValueOnce(successResponse as unknown);

      const promise = client.get('https://api.example.com/retry');

      // Advance timers to trigger retry
      jest.advanceTimersByTime(100);
      await Promise.resolve(); // Allow promises to resolve

      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('Failed to fetch');
      const successResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      };

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse as unknown);

      const result = await client.get('https://api.example.com/network-error');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable status codes', async () => {
      const clientError = {
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      };

      mockFetch.mockResolvedValueOnce(clientError as unknown);

      await expect(client.get('https://api.example.com/bad-request')).rejects.toThrow(
        'HTTP 400: Bad Request'
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries limit', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      mockFetch.mockResolvedValue(errorResponse as unknown);

      const promise = client.get('https://api.example.com/always-fails');

      // Advance timers for all retry attempts
      for (let i = 0; i <= 2; i++) {
        jest.advanceTimersByTime(100 * Math.pow(2, i));
        await Promise.resolve();
      }

      await expect(promise).rejects.toThrow('HTTP 500: Internal Server Error');

      // Initial request + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff for delay calculation', async () => {
      const errorResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      };

      mockFetch.mockResolvedValue(errorResponse as unknown);

      const promise = client.get('https://api.example.com/unavailable');

      // First retry should be after 100ms
      jest.advanceTimersByTime(99);
      await Promise.resolve();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second retry should be after 200ms (100 * 2)
      jest.advanceTimersByTime(199);
      await Promise.resolve();
      expect(mockFetch).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(mockFetch).toHaveBeenCalledTimes(3);

      await expect(promise).rejects.toThrow();
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failure threshold', async () => {
      const client = createRetryClient({
        maxRetries: 1,
        baseDelay: 10,
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: 60000,
          monitoringPeriod: 60000,
          halfOpenMaxCalls: 1
        }
      });

      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      mockFetch.mockResolvedValue(errorResponse as unknown);

      // Make multiple failing requests to trigger circuit breaker
      for (let i = 0; i < 4; i++) {
        try {
          await client.get(`https://api.example.com/fail-${i}`);
        } catch {
          // Expected to fail
        }
      }

      // Circuit should now be open
      await expect(client.get('https://api.example.com/should-be-blocked')).rejects.toThrow(
        'Circuit breaker is OPEN'
      );
    });

    it('should transition to half-open after reset timeout', async () => {
      const client = createRetryClient({
        maxRetries: 0,
        circuitBreakerConfig: {
          failureThreshold: 2,
          resetTimeout: 1000,
          monitoringPeriod: 60000,
          halfOpenMaxCalls: 1
        }
      });

      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      mockFetch.mockResolvedValue(errorResponse as unknown);

      // Trigger circuit breaker to open
      for (let i = 0; i < 3; i++) {
        try {
          await client.get(`https://api.example.com/fail-${i}`);
        } catch {
          // Expected to fail
        }
      }

      // Circuit should be open
      await expect(client.get('https://api.example.com/blocked')).rejects.toThrow(
        'Circuit breaker is OPEN'
      );

      // Advance time past reset timeout
      jest.advanceTimersByTime(1001);

      // Now should allow one request (half-open state)
      try {
        await client.get('https://api.example.com/half-open-test');
      } catch {
        // Expected to fail, but should attempt the request
      }

      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api.example.com/half-open-test',
        expect.unknown(Object)
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout requests that take too long', async () => {
      const slowPromise = new Promise((_resolve) => {
        setTimeout(() => resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'slow' })
        }), 10000);
      });

      mockFetch.mockReturnValueOnce(slowPromise as unknown);

      const promise = client.get('https://api.example.com/slow', {}, { timeout: 1000 });

      jest.advanceTimersByTime(1001);

      await expect(promise).rejects.toThrow('TimeoutError');
    });
  });

  describe('HTTP Methods', () => {
    it('should handle POST requests with data', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({ id: 1, created: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as unknown);

      const postData = { name: 'Test', email: 'test@example.com' };
      const result = await client.post('https://api.example.com/users', postData);

      expect(result).toEqual({ id: 1, created: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(postData)
        })
      );
    });

    it('should handle PUT requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ updated: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as unknown);

      const updateData = { name: 'Updated Name' };
      const result = await client.put('https://api.example.com/users/1', updateData);

      expect(result).toEqual({ updated: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );
    });

    it('should handle DELETE requests', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue(''),
        headers: new Headers()
      };

      mockFetch.mockResolvedValueOnce(mockResponse as unknown);

      const result = await client.delete('https://api.example.com/users/1');

      expect(result).toBe('');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track request metrics', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as unknown);

      await client.get('https://api.example.com/metrics-test');

      const metrics = client.getMetrics();

      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successRate).toBe(100);
      expect(metrics.averageAttempts).toBe(1);
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });

    it('should track failed requests in metrics', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      mockFetch.mockResolvedValue(errorResponse as unknown);

      try {
        await client.get('https://api.example.com/metrics-fail');
      } catch {
        // Expected to fail
      }

      const metrics = client.getMetrics();

      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successRate).toBe(0);
      expect(metrics.recentFailures.length).toBe(1);
    });

    it('should reset circuit breakers', () => {
      client.resetCircuitBreakers();

      const metrics = client.getMetrics();
      expect(Object.keys(metrics.circuitBreakerStates)).toHaveLength(0);
    });

    it('should clear metrics', () => {
      client.clearMetrics();

      const metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.recentFailures).toHaveLength(0);
    });
  });

  describe('Global Retry Client', () => {
    it('should provide a global retry client instance', () => {
      expect(retryClient).toBeInstanceOf(RetryClient);
    });

    it('should work with global retry client', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ global: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as unknown);

      const result = await retryClient.get('https://api.example.com/global');

      expect(result).toEqual({ global: true });
    });
  });

  describe('withRetry Decorator', () => {
    it('should wrap function with retry logic', async () => {
      let attemptCount = 0;

      const unreliableFunction = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, attempt: attemptCount };
      });

      const retriedFunction = withRetry(unreliableFunction, {
        maxRetries: 3,
        baseDelay: 100
      });

      const promise = retriedFunction('test-arg');

      // Advance timers for retries
      jest.advanceTimersByTime(1000);

      const result = await promise;

      expect(result).toEqual({ success: true, attempt: 3 });
      expect(unreliableFunction).toHaveBeenCalledTimes(3);
    });
  });
});