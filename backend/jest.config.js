module.exports = {
  testEnvironment: 'node',
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
  testRegex: 'tests/(unit|integration|system)/.*\\.test\\.js$',
  coverageThreshold: { global: { lines: 80, functions: 60 } },
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'socket/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    'constants/**/*.js',
    '!**/*.test.js'
  ],
  coverageReporters: ['text', 'text-summary', 'lcov'],
  testTimeout: 30000
}
