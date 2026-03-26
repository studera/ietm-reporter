import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration with IETM reporter
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter configuration */
  reporter: [
    // Built-in reporters
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    
    // IETM Reporter
    ['../../dist/src/reporter/IETMReporter.js', {
      // Path to IETM configuration file
      configPath: '../../config/ietm.config.json',
      
      // Enable/disable reporter (disabled for demo to avoid IETM connection)
      enabled: false,
      
      // Output directory for artifacts and results
      outputDir: 'ietm-results',
      
      // Upload options
      uploadScreenshots: true,
      uploadVideos: true,
      uploadTraces: false,
      
      // Batch size for uploading results
      batchSize: 10,
      
      // Custom test case ID extractor (optional)
      testCaseIdExtractor: (test: any) => {
        // Look for annotation
        const annotation = test.annotations.find(
          (a: any) => a.type === 'ietm-test-case' || a.type === 'test-case-id'
        );
        if (annotation?.description) {
          return annotation.description;
        }
        
        // Extract from title [TC-123]
        const match = test.title.match(/\[TC-(\d+)\]/i);
        return match?.[1] || null;
      },
      
      // Custom hooks (optional)
      hooks: {
        onTestStart: async (test: any) => {
          console.log(`Starting test: ${test.title}`);
        },
        onTestEnd: async (test: any, result: any) => {
          console.log(`Finished test: ${test.title} - ${result.status}`);
        },
        onRunEnd: async (results: any) => {
          console.log(`Total tests completed: ${results.length}`);
        },
      },
    }],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'https://example.com',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Maximum time each action can take */
    actionTimeout: 10000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

// Made with Bob