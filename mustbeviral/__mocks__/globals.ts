// Mock global browser APIs for testing

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

// Mock location
const locationMock = {
  href: 'http://localhost:3000',
  hostname: 'localhost',
  pathname: '/',
  search: '',
  hash: '',
  reload: jest.fn(),
  assign: jest.fn(),
  replace: jest.fn(),
};

// Mock navigator
const navigatorMock = {
  userAgent: 'Jest Test Environment',
  language: 'en-US',
  languages: ['en-US'],
  platform: 'Jest',
  cookieEnabled: true,
};

// Mock window methods
const windowMock = {
  open: jest.fn(),
  location: locationMock,
  navigator: navigatorMock,
  localStorage: localStorageMock,
  alert: jest.fn(),
  confirm: jest.fn(),
  prompt: jest.fn(),
  setTimeout: jest.fn((_cb) => cb()),
  clearTimeout: jest.fn(),
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  innerWidth: 1024,
  innerHeight: 768,
};

// Setup globals before tests
beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  Object.defineProperty(window, 'location', {
    value: locationMock,
    writable: true,
  });

  Object.defineProperty(window, 'navigator', {
    value: navigatorMock,
    writable: true,
  });

  Object.assign(window, windowMock);

  // Clear all mocks
  jest.clearAllMocks();
});

export { _localStorageMock,
  locationMock,
  navigatorMock,
  windowMock,
};