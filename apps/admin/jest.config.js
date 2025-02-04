module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', 'setup.[jt]s'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    "^.+\\.(css|less|scss)$": "identity-obj-proxy"
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/app/api/__tests__/setup.ts',
    '@testing-library/jest-dom'
  ],
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
}; 