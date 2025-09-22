// Test Environment Setup for Cloudflare Workers
// Provides mocks and utilities for testing

import { CloudflareEnv } from '../../src/lib/cloudflare';

// Mock D1 Database
export class MockD1Database {
  private mockData: Map<string, unknown> = new Map();
  private shouldFail = false;

  prepare(query: string) {
    return {
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (this.shouldFail) {
            throw new Error('Database error');
          }
          // Simulate different query responses
          if (query.includes('SELECT 1')) {
            return { result: 1 };
          }
          if (query.includes('SELECT * FROM users WHERE email')) {
            return this.mockData.get('user');
          }
          if (query.includes('INSERT INTO users')) {
            const newUser = {
              id: 'user_' + Date.now(),
              email: params[0],
              username: params[1],
              password_hash: params[2],
              role: params[3],
              profile_data: params[4],
              ai_preference_level: params[5],
              onboarding_completed: params[6],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            this.mockData.set('user', newUser);
            return newUser;
          }
          return null;
        },
        all: async () => {
          if (this.shouldFail) {
            throw new Error('Database error');
          }
          return { results: Array.from(this.mockData.values()) };
        },
        run: async () => {
          if (this.shouldFail) {
            throw new Error('Database error');
          }
          return {
            success: true,
            meta: {
              changes: 1,
              last_row_id: 1,
              duration: 1
            }
          };
        }
      }),
      first: async () => {
        if (this.shouldFail) {
          throw new Error('Database error');
        }
        if (query.includes('SELECT 1')) {
          return { result: 1 };
        }
        return null;
      },
      all: async () => {
        if (this.shouldFail) {
          throw new Error('Database error');
        }
        return { results: [] };
      },
      run: async () => {
        if (this.shouldFail) {
          throw new Error('Database error');
        }
        return {
          success: true,
          meta: {
            changes: 0,
            last_row_id: 0,
            duration: 0
          }
        };
      }
    };
  }

  batch(statements: unknown[]) {
    return Promise.resolve([]);
  }

  exec(query: string) {
    return Promise.resolve({ count: 0, duration: 0 });
  }

  dump() {
    return Promise.resolve(new ArrayBuffer(0));
  }

  setMockData(key: string, value: unknown) {
    this.mockData.set(key, value);
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  clearMocks() {
    this.mockData.clear();
    this.shouldFail = false;
  }
}

// Mock KV Namespace
export class MockKVNamespace {
  private store: Map<string, unknown> = new Map();

  async get(key: string, options?: unknown) {
    const value = this.store.get(key);
    if (!value) return null;

    if (options?.type === 'json') {
      return JSON.parse(value);
    }
    return value;
  }

  async put(key: string, value: unknown, options?: unknown) {
    const storedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    this.store.set(key, storedValue);
  }

  async delete(key: string) {
    this.store.delete(key);
  }

  async list(options?: unknown) {
    const keys = Array.from(this.store.keys());
    return {
      keys: keys.map(name => ({ name })),
      complete: true,
      cursor: ''
    };
  }

  clear() {
    this.store.clear();
  }
}

// Mock R2 Bucket
export class MockR2Bucket {
  private objects: Map<string, unknown> = new Map();

  async get(key: string) {
    return this.objects.get(key) || null;
  }

  async put(key: string, value: unknown, options?: unknown) {
    this.objects.set(key, { _key,
      value,
      size: value.length || 0,
      uploaded: new Date(),
      httpMetadata: options?.httpMetadata || {},
      customMetadata: options?.customMetadata || {}
    });
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async list(options?: unknown) {
    const objects = Array.from(this.objects.values());
    return { _objects,
      truncated: false
    };
  }

  clear() {
    this.objects.clear();
  }
}

// Create mock Cloudflare environment
export function createMockCloudflareEnv(): CloudflareEnv {
  return {
    DB: new MockD1Database() as unknown,
    TRENDS_CACHE: new MockKVNamespace() as unknown,
    ASSETS_STORAGE: new MockR2Bucket() as unknown,
    JWT_SECRET: 'test_jwt_secret_key_for_testing_only',
    STRIPE_SECRET_KEY: 'sk_test_mock_key',
    ENVIRONMENT: 'test',
    LOG_LEVEL: 'DEBUG',
    ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173'
  };
}

// Mock fetch for API tests
export function createMockFetch() {
  return jest.fn((url: string, options?: unknown) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => 'OK',
      headers: new Headers()
    });
  });
}

// Test utilities
export const testUtils = {
  generateTestUser: (overrides?: Partial<unknown>) => ({
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPassword123!',
    role: 'creator',
    ...overrides
  }),

  generateTestContent: (userId: string, overrides?: Partial<unknown>) => ({
    user_id: userId,
    title: 'Test Content',
    body: 'This is test content',
    status: 'draft',
    type: 'blog_post',
    generated_by_ai: 0,
    ethics_check_status: 'pending',
    metadata: '{}',
    ...overrides
  }),

  async waitForAsync(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Jest environment setup
export function setupTestEnvironment() {
  // Mock console to reduce noise
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  // Mock crypto for IDs
  global.crypto = {
    randomUUID: () => 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  } as unknown;

  // Mock fetch globally
  global.fetch = createMockFetch() as unknown;

  // Return cleanup function
  return () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  };
}