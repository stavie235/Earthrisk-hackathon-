module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  setupFiles: ['./tests/setup.js'],
  globalTeardown: './tests/teardown.js',
};
