# Advanced Example - IETM Playwright Client

## Overview

This advanced example demonstrates:
- Multiple test suites with different test cases
- Error handling and recovery
- Test fixtures and hooks
- Page Object Model pattern
- Data-driven testing
- Parallel execution
- Custom test utilities

## Prerequisites

1. **Build the IETM adapter:**
   ```bash
   cd ../..
   npm install
   npm run build
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your IETM credentials
   ```

## Project Structure

```
advanced-example/
├── .env                    # Environment variables
├── .env.example           # Template
├── playwright.config.ts   # Playwright configuration
├── ietm.config.json      # IETM configuration
├── README.md             # This file
├── tests/                # Test files
│   ├── auth.spec.ts     # Authentication tests
│   ├── checkout.spec.ts # Checkout flow tests
│   ├── search.spec.ts   # Search functionality tests
│   └── error-handling.spec.ts # Error scenarios
├── fixtures/             # Test fixtures
│   └── test-data.ts     # Test data
├── pages/                # Page Object Models
│   ├── LoginPage.ts
│   ├── ProductPage.ts
│   └── CheckoutPage.ts
└── utils/                # Utility functions
    └── helpers.ts
```

## Running Tests

### All Tests
```bash
npx playwright test
```

### Specific Suite
```bash
npx playwright test tests/auth.spec.ts
```

### With UI
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

### Parallel Execution
```bash
npx playwright test --workers=4
```

## Test Features

### 1. Authentication Tests
- Login with valid credentials
- Login with invalid credentials
- Password reset flow
- Session management

### 2. Checkout Tests
- Add items to cart
- Apply discount codes
- Complete purchase
- Payment validation

### 3. Search Tests
- Basic search
- Advanced filters
- Sort results
- No results handling

### 4. Error Handling
- Network errors
- Timeout scenarios
- Invalid data
- Recovery strategies

## IETM Integration

All tests are mapped to IETM test cases using annotations:

```typescript
test('Login with valid credentials', {
  annotation: { type: 'ietm-test-case', description: '2218' }
}, async ({ page }) => {
  // test code
});
```

## Test Results

Results are automatically reported to IETM after each test run:
- Test execution status (passed/failed)
- Test duration
- Error messages and stack traces
- Browser information
- Screenshots (on failure)

## Configuration

### Environment Variables

See `.env.example` for required variables.

### IETM Configuration

Edit `ietm.config.json` to customize:
- Server URLs
- Project settings
- Test plan mapping
- Reporter options

## Best Practices Demonstrated

1. **Page Object Model**: Separates page logic from tests
2. **Test Fixtures**: Reusable test data and setup
3. **Error Handling**: Graceful failure recovery
4. **Parallel Execution**: Faster test runs
5. **Clear Naming**: Descriptive test names
6. **Proper Assertions**: Meaningful test validations

## Troubleshooting

### Tests Not Reporting to IETM

1. Check `.env` file exists with correct credentials
2. Verify `ietm.config.json` is properly configured
3. Ensure IETM adapter is built (`npm run build` in root)
4. Check console output for error messages

### Authentication Failures

1. Verify IETM credentials in `.env`
2. Check IETM server is accessible
3. Ensure account is not locked

### Test Failures

1. Review error messages in console
2. Check screenshots in `test-results/`
3. Review IETM execution results
4. Enable debug mode for detailed logs

## Next Steps

1. Customize tests for your application
2. Add more test cases
3. Implement additional page objects
4. Configure CI/CD integration
5. Monitor results in IETM

## Related Documentation

- [Integration Guide](../../docs/integration-guide.md)
- [Configuration Guide](../../docs/configuration.md)
- [API Reference](../../docs/api-reference.md)
- [Troubleshooting](../../docs/troubleshooting.md)