/**
 * Jest Configuration
 * Configures Jest for testing Node.js backend and React frontend
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx',
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.jsx',
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/__tests__/**/*.js',
    '**/__tests__/**/*.jsx',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'backend/src/**/*.{ts,tsx,js,jsx}',
    'frontend/src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/src/$1',
    '^@frontend/(.*)$': '<rootDir>/frontend/src/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'json', 'lcov'],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Module paths
  modulePaths: ['<rootDir>/backend/src', '<rootDir>/frontend/src'],

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
