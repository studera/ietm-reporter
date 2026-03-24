# IETM Playwright Client

IBM Engineering Test Management (IETM) client for reporting Playwright test results.

## Overview

This package provides seamless integration between Playwright test automation and IBM Engineering Test Management (formerly Rational Quality Manager). It automatically reports test execution results, including screenshots and videos, to your IETM server.

## Features

- ✅ Automatic test result reporting to IETM
- ✅ OAuth 1.0a authentication
- ✅ Screenshot and video attachment upload
- ✅ Flexible test case mapping strategies
- ✅ Configurable retry logic
- ✅ Comprehensive logging
- ✅ TypeScript support

## Installation

```bash
npm install ietm-playwright-client
```

## Quick Start

### 1. Configuration

Create a configuration file `ietm.config.json`:

```json
{
  "server": {
    "baseUrl": "https://your-ietm-server.com/qm",
    "projectId": "_your_project_id",
    "contextId": "_your_context_id"
  },
  "auth": {
    "consumerKey": "your_consumer_key",
    "consumerSecret": "your_consumer_secret",
    "accessToken": "your_access_token",
    "accessTokenSecret": "your_access_token_secret"
  },
  "testPlan": {
    "id": "987"
  }
}
```

### 2. Configure Playwright

Add the IETM reporter to your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['ietm-playwright-client/reporter', {
      configPath: './ietm.config.json'
    }]
  ],
  // ... other config
});
```

### 3. Map Test Cases

Use annotations to map Playwright tests to IETM test cases:

```typescript
import { test, expect } from '@playwright/test';

test('Login with valid credentials', {
  annotation: { type: 'ietm-test-case', description: '2218' }
}, async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('#username', 'user@example.com');
  await page.fill('#password', 'password');
  await page.click('#login-button');
  await expect(page).toHaveURL(/dashboard/);
});
```

### 4. Run Tests

```bash
npx playwright test
```

Results will be automatically reported to IETM!

## Configuration Options

See [Configuration Guide](./docs/configuration.md) for detailed configuration options.

## Documentation

- [Installation Guide](./docs/installation.md)
- [Configuration Guide](./docs/configuration.md)
- [Test Case Mapping](./docs/mapping.md)
- [API Reference](./docs/api-reference.md)
- [Troubleshooting](./docs/troubleshooting.md)

## Examples

See the [examples](./examples) directory for complete working examples.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Requirements

- Node.js >= 16.0.0
- Playwright >= 1.40.0
- IBM Engineering Test Management 7.x or later

## License

MIT

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-org/ietm-playwright-client/issues)
- Documentation: [Read the docs](./docs)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.