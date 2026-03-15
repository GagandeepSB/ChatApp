module.exports = {
  testEnvironment: 'node',
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
  testRegex: 'tests/(unit|integration)/.*\\.test\\.js$',
  coverageThreshold: { global: { lines: 80, functions: 80 } },
  testTimeout: 30000
}
