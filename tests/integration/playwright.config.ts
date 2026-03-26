import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { config as loadDotenv } from 'dotenv';

// Load .env file from project root
loadDotenv({ path: path.resolve(__dirname, '../../.env') });

/**
 * Integration test Playwright configuration
 * Tests the full end-to-end workflow with real IETM server
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: false, // Run sequentially to avoid account lockout
  forbidOnly: true,
  retries: 0, // No retries for integration tests
  workers: 1, // Single worker to prevent concurrent auth requests
  timeout: 60000, // 60 seconds per test
  
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }],
    // IETM Reporter - publishes to real sandbox server
    [path.resolve(__dirname, '../../dist/src/reporter/IETMReporter.js'), {
      configPath: path.resolve(__dirname, '../../config/ietm.config.json'),
      enabled: true,
      uploadAttachments: true,
      batchSize: 2,
    }],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

// Made with Bob