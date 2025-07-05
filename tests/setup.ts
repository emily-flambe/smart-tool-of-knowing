import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock external services
jest.mock('../src/services/linear.service');
jest.mock('../src/services/github.service');

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Clean up after tests
afterAll(async () => {
  // Close database connections, stop servers, etc.
});