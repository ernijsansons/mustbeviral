module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.ts'
  ],
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/mustbeviral/**'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest']
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  testTimeout: 10000,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  maxWorkers: '50%'
};