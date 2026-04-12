// tests/setup.js
import dotenv from 'dotenv';
dotenv.config({ path: '../../back-end/server/.env' });

// If we are in the test environment, switch to the test database
if (process.env.NODE_ENV === 'test') {
  process.env.DB_NAME = process.env.DB_TEST_NAME;
}
