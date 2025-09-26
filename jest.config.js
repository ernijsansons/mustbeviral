module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.spec.js", 
    "**/__tests__/**/*.spec.ts"
  ],
  
  // File extensions
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
  
  // Transform configuration for TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/mustbeviral/src/$1',
    '^~/(.*)$': '<rootDir>/mustbeviral/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/mustbeviral/__tests__/setup/jest.setup.ts'
  ],
  
  // Ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    "**/*.{js,ts}",
    "!**/node_modules/**",
    "!**/dist/**", 
    "!**/build/**",
    "!**/*.config.js",
    "!**/*.config.ts",
    "!**/coverage/**"
  ],
  
  // Coverage reporting
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test environment options
  testTimeout: 30000,
  
  // Global setup
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};