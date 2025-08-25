/**
 * Basic SDK tests setup
 */

// Test environment setup
process.env.NODE_ENV = 'test';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Extended timeout for network operations
jest.setTimeout(30000);
