export default {
  // Performance optimizations
  maxWorkers: '50%', // Use half of available CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Use different environments for different test types
  projects: [
    {
      // Unit tests for backend/worker code
      displayName: 'backend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/__tests__/unit/lib/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/unit/middleware/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/worker/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/lib/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/core/**/*.test.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.backend.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!(jose|@langchain|langchain|@tanstack|wouter)/)'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '\\./env$': '<rootDir>/__mocks__/env.ts',
        '\\.\\.(/.*)?/lib/env$': '<rootDir>/__mocks__/env.ts',
        '\\.\\.(/.*)?/env$': '<rootDir>/__mocks__/env.ts'
      }
    },
    {
      // Frontend/React component tests
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/__tests__/unit/components/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/components/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/pages/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/hooks/**/*.test.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.frontend.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!(jose|@langchain|langchain|@tanstack|wouter|lucide-react)/)'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '\\.\/env$': '<rootDir>/__mocks__/env.ts',
        '\\.\\.\/lib\/env$': '<rootDir>/__mocks__/env.ts',
        '\\.\\.\/\\.\\.\/lib\/env$': '<rootDir>/__mocks__/env.ts',
        '\\.\\.\/\\.\\.\/\\.\\.\/lib\/env$': '<rootDir>/__mocks__/env.ts',
        '\\.\\.\/lib\/logging\/productionLogger$': '<rootDir>/__mocks__/productionLogger.ts',
        '\\.\\.\/\\.\\.\/lib\/logging\/productionLogger$': '<rootDir>/__mocks__/productionLogger.ts',
        '\\.\\.\/\\.\\.\/\\.\\.\/lib\/logging\/productionLogger$': '<rootDir>/__mocks__/productionLogger.ts',
        '\\.\\.\/lib\/monitoring\/logger$': '<rootDir>/__mocks__/monitoringLogger.ts',
        '\\.\\.\/\\.\\.\/lib\/monitoring\/logger$': '<rootDir>/__mocks__/monitoringLogger.ts',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
      }
    },
    {
      // API Integration tests
      displayName: 'integration',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.backend.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!(jose|@langchain|langchain|@tanstack|wouter)/)'
      ]
    }
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^../lib/env$': '<rootDir>/__mocks__/env.ts',
    '^../../lib/env$': '<rootDir>/__mocks__/env.ts',
    '^../../../lib/env$': '<rootDir>/__mocks__/env.ts',
    '^../../../../lib/env$': '<rootDir>/__mocks__/env.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },

  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'auto'
        }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        ['@babel/preset-typescript', {
          allowDeclareFields: true,
          isTSX: true,
          allExtensions: true
        }]
      ]
    }]
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],

  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/index.tsx',
    '!src/vite-env.d.ts',
    '!src/env.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  coverageThreshold: {
    global: {
      branches: 30,  // Start realistic and gradually increase
      functions: 35,
      lines: 40,
      statements: 40
    },
    // Higher standards for critical paths
    './src/lib/auth.ts': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    },
    './src/hooks/useAuth.tsx': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/lib/api.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Performance optimizations
  testTimeout: 10000, // Default timeout
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true, // Reset mocks between tests for isolation

  // Faster test runs
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/',
    '/coverage/'
  ],

  globals: {
    'ts-jest': {
      useESM: true,
      isolatedModules: true
    }
  },

  // Test execution order optimization
  testSequencer: '@jest/test-sequencer'
};