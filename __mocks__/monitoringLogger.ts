// Mock for monitoring logger

export const log = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  audit: jest.fn(),
  security: jest.fn(),
  startTimer: jest.fn(() => jest.fn())
};

export const logger = {
  getInstance: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    startTimer: jest.fn(() => jest.fn()),
    audit: jest.fn(),
    security: jest.fn(),
    configure: jest.fn(),
    setContext: jest.fn(),
    clearContext: jest.fn(),
    getRecentLogs: jest.fn(() => [])
  }))
};