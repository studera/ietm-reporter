# IETM Reporter Example

This example demonstrates how to use the IETM Playwright Reporter to automatically send test results to IBM Engineering Test Management.

## Features Demonstrated

- ✅ Test case mapping using annotations
- ✅ Test case mapping using title patterns
- ✅ Automatic screenshot capture on failure
- ✅ Video recording on failure
- ✅ Test step tracking
- ✅ Custom hooks for test lifecycle events
- ✅ Batch result uploading

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure IETM connection:**
   
   Copy the example config and update with your IETM server details:
   ```bash
   cp ../../config/ietm.config.example.json ../../config/ietm.config.json
   ```

3. **Set environment variables:**
   ```bash
   export IETM_USERNAME="your-username"
   export IETM_PASSWORD="your-password"
   ```

## Running Tests

Run all tests with the IETM reporter:
```bash
npx playwright test
```

Run specific test file:
```bash
npx playwright test tests/login.spec.ts
```

Run with specific browser:
```bash
npx playwright test --project=chromium
```

## Test Case Mapping

There are two ways to map Playwright tests to IETM test cases:

### Method 1: Using Annotations (Recommended)

```typescript
test('Positive Login Test', async ({ page }) => {
  test.info().annotations.push({
    type: 'ietm-test-case',
    description: '2218', // IETM test case ID
  });
  
  // Test code...
});
```

### Method 2: Using Title Pattern

```typescript
test('[TC-2218] Positive Login Test', async ({ page }) => {
  // Test code...
});
```

## Example Tests

The example includes two real test cases for https://www.saucedemo.com/:

**Test Case 2218: Positive Login Test**
- Navigate to https://www.saucedemo.com/
- Fill username with 'standard_user'
- Fill password with 'secret_sauce'
- Click Login button
- Verify products page is visible

**Test Case 7117: Login - should show error with invalid credentials**
- Navigate to https://www.saucedemo.com/
- Fill username with 'standard_user'
- Fill password with 'wrong_sauce'
- Click Login button
- Verify error message is displayed

## Test Steps

Use Playwright's `test.step()` to create detailed step-by-step results:

```typescript
test('login test', async ({ page }) => {
  await test.step('Navigate to login page', async () => {
    await page.goto('/login');
  });
  
  await test.step('Enter credentials', async () => {
    await page.fill('#username', 'user');
    await page.fill('#password', 'pass');
  });
  
  await test.step('Submit form', async () => {
    await page.click('button[type="submit"]');
  });
});
```

## Reporter Configuration

The reporter can be configured in `playwright.config.ts`:

```typescript
['../../dist/src/reporter/IETMReporter.js', {
  // Path to IETM configuration
  configPath: '../../config/ietm.config.json',
  
  // Enable/disable reporter
  enabled: true,
  
  // Output directory
  outputDir: 'ietm-results',
  
  // Upload options
  uploadScreenshots: true,
  uploadVideos: true,
  uploadTraces: false,
  
  // Batch size
  batchSize: 10,
  
  // Custom test case ID extractor
  testCaseIdExtractor: (test) => {
    // Custom logic to extract test case ID
    return null;
  },
  
  // Lifecycle hooks
  hooks: {
    onTestStart: async (test) => {
      // Called when test starts
    },
    onTestEnd: async (test, result) => {
      // Called when test ends
    },
    onRunEnd: async (results) => {
      // Called when all tests complete
    },
  },
}]
```

## Output

The reporter generates:

1. **JSON Results File:** `ietm-results/ietm-results.json`
   - Contains all test results with metadata
   - Includes artifact paths
   - Test case mappings

2. **Execution Result XML:** `ietm-results/execution-result-{testCaseId}.xml`
   - OSLC-compliant XML for each mapped test
   - Ready for IETM upload

3. **Console Output:**
   - Test progress
   - Upload status
   - Summary statistics

## Example Output

```
[IETM Reporter] Starting test run with 4 tests
[IETM Reporter] Configuration loaded
[IETM Reporter] IETM client initialized
[IETM Reporter] Test started: successful login with valid credentials (IETM ID: 2218)
[IETM Reporter] Test ended: successful login with valid credentials - passed (1234ms)
[IETM Reporter] Test started: login fails with invalid credentials (IETM ID: 2219)
[IETM Reporter] Test ended: login fails with invalid credentials - passed (567ms)
[IETM Reporter] Test run finished with status: passed
[IETM Reporter] Duration: 2500ms
[IETM Reporter] Total tests: 4
[IETM Reporter] Results by status: { passed: 3, failed: 1 }
[IETM Reporter] Results saved to ietm-results/ietm-results.json
[IETM Reporter] Uploading 3 results to IETM...
[IETM Reporter] ✓ Uploaded result for test case 2218
[IETM Reporter] ✓ Uploaded result for test case 2219
[IETM Reporter] ✓ Uploaded result for test case 2220
[IETM Reporter] Upload complete: 3 succeeded, 0 failed
[IETM Reporter] Reporting complete
```

## Troubleshooting

### Tests not being uploaded

- Check that tests have IETM test case IDs (via annotation or title)
- Verify IETM configuration is correct
- Check console output for errors

### Authentication failures

- Verify username and password in environment variables
- Check IETM server URL is correct
- Ensure user has permissions to create execution results

### Missing artifacts

- Enable screenshot/video capture in Playwright config
- Check `use.screenshot` and `use.video` settings
- Verify artifacts are being created in test-results directory

## See Also

- [Playwright Reporter API](https://playwright.dev/docs/test-reporters)
- [IETM API Documentation](../../docs/java-implementation-analysis.md)
- [Authentication Setup](../../docs/authentication-setup.md)

// Made with Bob