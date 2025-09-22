// Backend Jest Setup
import '@testing-library/jest-dom';
import { _TextEncoder, TextDecoder } from 'util';
import nodeCrypto from 'crypto';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Cloudflare environment
const mockEnv = {
  DB: {
    prepare: jest.fn().mockReturnValue({
      bind: jest.fn().mockReturnThis(),
      first: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
    }),
    exec: jest.fn(),
    batch: jest.fn(),
  },
  KV: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  },
  R2: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  },
  // Environment variables
  JWT_SECRET: 'test-jwt-secret-for-testing-only',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-for-testing-only',
  ENCRYPTION_KEY: 'dGVzdC1lbmNyeXB0aW9uLWtleS1mb3ItdGVzdGluZw==',
  STRIPE_SECRET_KEY: 'sk_test_mock',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
};

// Make env available globally for tests
(global as unknown).env = mockEnv;

// Mock fetch for Node environment
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
});

// Mock crypto with proper Node.js crypto implementation

const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random()),
  subtle: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),

    async sign(algorithm: unknown, key: unknown, data: BufferSource): Promise<ArrayBuffer> {
      const hmac = nodeCrypto.createHmac('sha256', 'test-secret-key');
      hmac.update(data as Buffer);
      return hmac.digest().buffer;
    },

    async verify(algorithm: unknown, key: unknown, signature: BufferSource, data: BufferSource): Promise<boolean> {
      const hmac = nodeCrypto.createHmac('sha256', 'test-secret-key');
      hmac.update(data as Buffer);
      const expected = hmac.digest();
      return nodeCrypto.timingSafeEqual(expected, Buffer.from(signature as ArrayBuffer));
    },

    async digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
      const hash = nodeCrypto.createHash(algorithm.toLowerCase().replace('-', ''));
      hash.update(data as Buffer);
      return hash.digest().buffer;
    },

    generateKey: jest.fn(),

    async importKey(
      format: string,
      keyData: unknown,
      algorithm: unknown,
      extractable: boolean,
      keyUsages: string[]
    ): Promise<CryptoKey> {
      return {
        type: 'secret',
        algorithm: { name: algorithm.name, length: 256 },
        extractable,
        usages: keyUsages
      } as CryptoKey;
    },

    exportKey: jest.fn(),

    async deriveBits(algorithm: unknown, baseKey: unknown, length: number): Promise<ArrayBuffer> {
      return nodeCrypto.pbkdf2Sync(
        algorithm.password,
        algorithm.salt,
        algorithm.iterations,
        length / 8,
        'sha256'
      ).buffer;
    },

    deriveKey: jest.fn(),
    wrapKey: jest.fn(),
    unwrapKey: jest.fn(),
  },

  getRandomValues: jest.fn((arr: unknown) => {
    const randomBytes = nodeCrypto.randomBytes(arr.length);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = randomBytes[i];
    }
    return arr;
  }),
};

// Mock Request and Response for Cloudflare Workers
global.Request = class MockRequest {
  url: string;
  method: string;
  headers: unknown;
  body: unknown;

  constructor(input: string | Request, init?: unknown) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers);
    this.body = init?.body;
  }

  async json() { return JSON.parse(this.body || '{}'); }
  async text() { return this.body || ''; }
  clone() { return new MockRequest(this.url, { method: this.method, headers: this.headers, body: this.body }); }
} as unknown;

global.Response = class MockResponse {
  status: number;
  statusText: string;
  headers: unknown;
  body: unknown;
  ok: boolean;

  constructor(body?: unknown, init?: unknown) {
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.body = body;
    this.headers = new Headers(init?.headers);
  }

  async json() { return typeof this.body === 'string' ? JSON.parse(this.body) : this.body; }
  async text() { return typeof this.body === 'string' ? this.body : JSON.stringify(this.body); }
  clone() { return new MockResponse(this.body, { status: this.status, headers: this.headers }); }

  static json(data: unknown, init?: unknown) {
    return new MockResponse(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  }
} as unknown;

global.Headers = class MockHeaders extends Map {
  constructor(init?: unknown) {
    super();
    if (init) {
      if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value as string));
      }
    }
  }
  append(name: string, value: string) { this.set(name, (this.get(name) || '') + ', ' + value); }
  delete(name: string) { super.delete(name); }
  get(name: string) { return super.get(name) || null; }
  has(name: string) { return super.has(name); }
  set(name: string, value: string) { super.set(name, value); }
} as unknown;

// Mock TextEncoder/TextDecoder for Node
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as unknown;

// Assign crypto to global object
(global as unknown).crypto = mockCrypto;
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});