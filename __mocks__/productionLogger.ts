// Mock for production logger to prevent test failures

export const logger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  timer: jest.fn(() => jest.fn()),
  audit: jest.fn(),
  security: jest.fn(),
  business: jest.fn(),
  api: jest.fn(),
  database: jest.fn(),
  ai: jest.fn()
};

export const productionLogger = {
  getInstance: jest.fn(() => ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    startTimer: jest.fn(() => jest.fn()),
    audit: jest.fn(),
    security: jest.fn(),
    business: jest.fn(),
    api: jest.fn(),
    database: jest.fn(),
    ai: jest.fn()
  }))
};

export const secureConsole = {
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  time: jest.fn(() => ({ timeEnd: jest.fn() })),
  timeEnd: jest.fn()
};