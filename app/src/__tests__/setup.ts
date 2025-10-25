/**
 * Jest Test Setup
 *
 * Global test configuration and mocks
 */

// Mock environment variables
process.env.BYTEPLUS_ACCESS_KEY = 'test-access-key';
process.env.BYTEPLUS_SECRET_KEY = 'test-secret-key';
process.env.BYTEPLUS_ENDPOINT = 'https://api.byteplus.com';
process.env.BYTEPLUS_REGION = 'us-east-1';

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep warn and error for debugging
};
