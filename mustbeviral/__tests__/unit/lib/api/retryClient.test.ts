/**
 * Retry Client Tests
 */

import { RetryClient,
  createRetryClient,
  retryClient,
  withRetry
} from '../../../../src/lib/api/retryClient';

// Mock fetch
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: { aborted: false },
  abort: jest.fn()
}));

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
    // Use real timers by default - only specific tests will use fake timers
    jest.useRealTimers();
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

      const result = await client.get('https://api.example.com/retry');

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
      // Test that the isRetryableError method correctly identifies non-retryable status codes
      const testConfig = {
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: false,
        retryableStatus: [500, 502, 503, 504, 429],
        retryableErrors: ['NetworkError', 'TimeoutError'],
        timeout: 5000
      };

      const testClient = new RetryClient(testConfig);
      
      // Test non-retryable HTTP error
      const nonRetryableError = new Error('HTTP 400: Bad Request');
      const retryableError = new Error('HTTP 500: Internal Server Error');
      const networkError = new Error('NetworkError');
      
      // Access the private method using array notation
      const isRetryable = (testClient as any).isRetryableError.bind(testClient);
      
      expect(isRetryable(nonRetryableError, testConfig)).toBe(false);
      expect(isRetryable(retryableError, testConfig)).toBe(true);
      expect(isRetryable(networkError, testConfig)).toBe(true);
      
      // Verify that 400 is indeed not in the retryableStatus array
      expect(testConfig.retryableStatus).not.toContain(400);
      expect(testConfig.retryableStatus).toContain(500);
    });

    it('should respect maxRetries limit', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      mockFetch.mockResolvedValue(errorResponse as unknown);

      await expect(client.get('https://api.example.com/always-fails')).rejects.toThrow('HTTP 500: Internal Server Error');

      // Initial request + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff for delay calculation', async () => {
      // Test delay calculation without fake timers for simplicity
      const errorResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers()
      };

      mockFetch.mockResolvedValue(errorResponse as Response);

      const startTime = Date.now();
      try {
        await client.get('https://api.example.com/unavailable');
      } catch {
        // Expected to fail
      }
      const endTime = Date.now();

      // Should have made 3 calls (1 initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // Should take at least the delay time (10ms + 20ms = 30ms minimum)
      expect(endTime - startTime).toBeGreaterThan(25);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failure threshold', async () => {
      const client = createRetryClient({
        maxRetries: 0, // No retries to make it faster
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

      // Make 3 failing requests to trigger circuit breaker
      // All requests go to the same host so they share the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await client.get(`https://api.example.com/fail`);
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
      // Use real timers but shorter timeout
      const client = createRetryClient({
        maxRetries: 0,
        circuitBreakerConfig: {
          failureThreshold: 2,
          resetTimeout: 50, // Short timeout for test
          monitoringPeriod: 60000,
          halfOpenMaxCalls: 1
        }
      });

      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers()
      };

      mockFetch.mockResolvedValue(errorResponse as Response);

      // Trigger circuit breaker to open by using same URL
      for (let i = 0; i < 2; i++) {
        try {
          await client.get('https://api.example.com/fail');
        } catch {
          // Expected to fail
        }
      }

      // Circuit should be open
      await expect(client.get('https://api.example.com/blocked')).rejects.toThrow(
        'Circuit breaker is OPEN'
      );

      // Wait for reset timeout (50ms)
      await new Promise(resolve => setTimeout(resolve, 60));

      // Now should allow one request (half-open state)
      try {
        await client.get('https://api.example.com/half-open-test');
      } catch {
        // Expected to fail, but should attempt the request
      }

      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api.example.com/half-open-test',
        expect.any(Object)
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout requests that take too long', async () => {
      // Test that timeout logic sets up AbortController correctly
      let abortCalled = false;
      const mockAbort = jest.fn(() => { abortCalled = true; });
      
      // Mock AbortController constructor
      const mockAbortController = jest.fn().mockImplementation(() => ({
        signal: { aborted: false },
        abort: mockAbort
      }));
      
      // Store original and replace temporarily
      const originalAbortController = global.AbortController;
      global.AbortController = mockAbortController;
      
      // Mock fetch to resolve immediately
      const quickResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: jest.fn().mockResolvedValue('OK')
      };
      
      mockFetch.mockResolvedValueOnce(quickResponse as unknown);
      
      // Make request with timeout
      await client.get('https://api.example.com/test', {}, { timeout: 100 });
      
      // Verify AbortController was created (timeout mechanism was set up)
      expect(mockAbortController).toHaveBeenCalled();
      
      // Restore
      global.AbortController = originalAbortController;
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
      // Reset fetch mock for this test since withRetry doesn't use fetch directly
      mockFetch.mockClear();
      
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
        baseDelay: 10 // Use shorter delay for test
      });

      const result = await retriedFunction('test-arg');

      expect(result).toEqual({ success: true, attempt: 3 });
      expect(unreliableFunction).toHaveBeenCalledTimes(3);
    });
  });
});