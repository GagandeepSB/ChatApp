const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  globalTeardown: './tests/e2e/global-teardown.js',
  webServer: [
    {
      command: 'node index.js',
      port: 8747,
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm start',
      cwd: 'c:/PSU CS/CS 314/Project/frontend-project',
      port: 3000,
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
})
