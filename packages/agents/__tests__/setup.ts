/**
 * Jest setup file
 */

// Mock logger to reduce noise in tests
jest.mock('../src/mocks/voltagent-logger', () => ({
  createLogger: (name: string) => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  }),
}));

// Mock file system operations for cleaner tests
jest.mock('node:fs/promises');
jest.mock('node:path');

// Set test environment variables
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);