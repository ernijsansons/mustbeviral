// Jest setup file
// LOG: TEST-SETUP-1 - Jest test setup

import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';

// Mock Cloudflare D1 database
global.mockD1Database = {
  prepare: jest.fn().mockReturnThis(),
  bind: jest.fn().mockReturnThis(),
  first: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
};

console.log('LOG: TEST-SETUP-2 - Jest setup completed');