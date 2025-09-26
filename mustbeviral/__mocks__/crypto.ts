/**
 * Mock crypto API for testing
 */

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9));

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID
  },
  writable: true
});

export { mockRandomUUID };