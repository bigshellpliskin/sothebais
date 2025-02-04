import { jest } from '@jest/globals';

// Increase the default timeout for all tests
jest.setTimeout(10000);

// Mock the logger to prevent console noise during tests
jest.mock('./src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
})); 