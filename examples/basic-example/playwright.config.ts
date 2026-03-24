import { defineConfig, devices } from '@playwright/test';

/**
 * Basic Playwright configuration with IETM reporter
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['list'],
    ['html'],
    // IETM Reporter configuration
    ['../../dist/reporter/IETMReporter.js', {
      configPath: './ietm.config.json',
      enabled: true,
    }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

// Made with Bob
