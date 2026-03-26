# Integration Tests for IETM Playwright Client

This directory contains integration tests that verify the end-to-end functionality of the IETM Playwright Client against a real IETM sandbox server.

## ⚠️ Important Warnings

**These tests make real API calls to the IETM sandbox server!**

- **Account Lockout Risk:** Multiple failed authentication attempts can lock your account
- **Real Data:** Tests create actual execution results in IETM
- **Rate Limiting:** Excessive requests may trigger rate limiting
- **Credentials Required:** Tests require valid IETM credentials in `.env` file

## Test Configuration

### Environment Setup

Ensure your `.env` file contains valid credentials:

```env
IETM_BASE_URL=https://jazz.net/sandbox01-qm
IETM_JTS_URL=https://jazz.net/sandbox01-jts
IETM_USERNAME=your_username
IETM_PASSWORD=your_password
IETM_PROJECT_NAME=studera Project (Quality Management)
IETM_TEST_PLAN_ID=987
```

### Test Cases

The integration tests use two test cases from IETM:

- **Test Case 2218:** Positive Login Test
- **Test Case 7117:** Login with Invalid Credentials

These test cases must exist in your IETM project before running the tests.

## Running Integration Tests

### Prerequisites

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Verify credentials:**
   ```bash
   # Test authentication only
   node examples/test-auth-only.ts
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

### Run All Integration Tests

```bash
# Run all integration tests
npx playwright test --config=tests/integration/playwright.config.ts
```

### Run Specific Tests

```bash
# Run only login tests
npx playwright test --config=tests/integration/playwright.config.ts tests/integration/specs/login.spec.ts

# Run only end-to-end workflow test
npx playwright test --config=tests/integration/playwright.config.ts tests/integration/specs/end-to-end.spec.ts
```

### Run with UI Mode

```bash
# Interactive mode with UI
npx playwright test --config=tests/integration/playwright.config.ts --ui
```

### Run with Debug Mode

```bash
# Debug mode with inspector
npx playwright test --config=tests/integration/playwright.config.ts --debug
```

## Test Structure

### 1. Login Tests (`login.spec.ts`)

Tests the actual Playwright test execution with IETM reporter:

- **Test 1:** Positive login test (maps to IETM test case 2218)
  - Navigates to saucedemo.com
  - Logs in with valid credentials
  - Verifies successful login
  
- **Test 2:** Invalid credentials test (maps to IETM test case 7117)
  - Navigates to saucedemo.com
  - Attempts login with invalid credentials
  - Verifies error message is displayed

**Expected Outcome:** Both tests execute and results are published to IETM

### 2. End-to-End Test (`end-to-end.spec.ts`)

Verifies the complete workflow:

- **Test 1:** Full workflow verification
  - Runs Playwright tests with IETM reporter
  - Verifies results file is created
  - Checks test case mappings (2218 and 7117)
  - Validates publication status
  
- **Test 2:** Server connectivity check
  - Tests connection to IETM server
  - Verifies server is reachable

**Expected Outcome:** Complete workflow executes successfully and results are published

## Test Results

### Results Location

Test results are stored in multiple locations:

1. **Playwright HTML Report:**
   ```
   test-results/html/index.html
   ```

2. **IETM Results JSON:**
   ```
   examples/basic-example/ietm-results/ietm-results.json
   ```

3. **IETM Execution Results XML:**
   ```
   examples/basic-example/ietm-results/execution-results/
   ```

### Viewing Results

```bash
# Open Playwright HTML report
npx playwright show-report test-results/html

# View IETM results JSON
cat examples/basic-example/ietm-results/ietm-results.json | jq
```

## Verifying Results in IETM

After running the tests, verify in IETM web interface:

1. **Navigate to IETM:**
   ```
   https://jazz.net/sandbox01-qm
   ```

2. **Open your project:**
   - studera Project (Quality Management)

3. **Check Test Execution Records:**
   - Go to "Test Execution" section
   - Look for new execution records linked to test cases 2218 and 7117

4. **Verify Execution Results:**
   - Open the execution records
   - Check that execution results are attached
   - Verify test steps and status

## Troubleshooting

### Authentication Failures

**Problem:** Tests fail with authentication errors

**Solutions:**
1. Verify credentials in `.env` file
2. Check if account is locked (wait 15 minutes)
3. Verify JTS URL is correct
4. Test authentication separately:
   ```bash
   node examples/test-auth-only.ts
   ```

### Service Discovery Failures

**Problem:** Cannot find project or services

**Solutions:**
1. Verify project name matches exactly (case-sensitive)
2. Check if project exists in IETM
3. Verify base URL is correct
4. Test service discovery:
   ```bash
   node examples/service-discovery-example.ts
   ```

### Test Case Not Found

**Problem:** Test cases 2218 or 7117 not found

**Solutions:**
1. Verify test cases exist in IETM project
2. Check test case IDs are correct
3. Ensure test cases are in the correct test plan (987)

### Results Not Published

**Problem:** Tests run but results don't appear in IETM

**Solutions:**
1. Check IETM reporter configuration in `playwright.config.ts`
2. Verify `enabled: true` in reporter options
3. Check logs for publication errors
4. Verify network connectivity to IETM server

### Rate Limiting

**Problem:** Requests are being rate-limited

**Solutions:**
1. Reduce test frequency
2. Increase delays between requests
3. Use single worker: `workers: 1`
4. Wait before retrying

## Safety Guidelines

### Preventing Account Lockout

1. **Limit Test Runs:**
   - Don't run integration tests repeatedly
   - Wait at least 5 minutes between runs

2. **Use Single Worker:**
   - Configuration already set to `workers: 1`
   - Prevents concurrent authentication attempts

3. **Monitor Failed Attempts:**
   - Stop testing after 2-3 authentication failures
   - Wait 15 minutes before retrying

4. **Test Authentication First:**
   - Always test auth separately before full test run
   - Use `examples/test-auth-only.ts`

### Best Practices

1. **Run During Development:**
   - Use unit tests for rapid development
   - Run integration tests only for verification

2. **CI/CD Integration:**
   - Run integration tests on schedule (e.g., nightly)
   - Not on every commit

3. **Separate Environments:**
   - Use sandbox for integration tests
   - Never run against production

4. **Clean Up:**
   - Execution results accumulate in IETM
   - Periodically clean up test data

## Configuration Options

### Playwright Config (`playwright.config.ts`)

```typescript
{
  workers: 1,              // Single worker to prevent concurrent auth
  retries: 0,              // No retries for integration tests
  timeout: 60000,          // 60 seconds per test
  fullyParallel: false,    // Run sequentially
}
```

### IETM Reporter Options

```typescript
{
  configPath: '../../config/ietm.config.json',
  enabled: true,           // Enable result publishing
  uploadAttachments: true, // Upload screenshots/videos
  batchSize: 2,           // Batch size for publishing
}
```

## Expected Test Duration

- **Login Tests:** ~30-45 seconds
  - Test execution: 10-15 seconds
  - Result publishing: 20-30 seconds

- **End-to-End Test:** ~60-90 seconds
  - Includes running login tests
  - Plus verification steps

**Total:** ~2-3 minutes for complete integration test suite

## Success Criteria

Integration tests are successful when:

1. ✅ All Playwright tests execute (pass or fail as expected)
2. ✅ IETM reporter publishes results without errors
3. ✅ Results file is created with correct structure
4. ✅ Test cases 2218 and 7117 are mapped correctly
5. ✅ Execution results appear in IETM web interface
6. ✅ No authentication errors or account lockouts

## Support

For issues or questions:

1. Check the main [README.md](../../README.md)
2. Review [authentication setup](../../docs/authentication-setup.md)
3. See [preventing account lockouts](../../docs/preventing-account-lockouts.md)
4. Check example scripts in `examples/` directory

---

**Made with Bob** 🤖