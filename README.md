# IETM Playwright Client

IBM Engineering Test Management (IETM) client for reporting Playwright test results.

## Overview

This package provides seamless integration between Playwright test automation and IBM Engineering Test Management (formerly Rational Quality Manager). It automatically reports test execution results, including screenshots and videos, to your IETM server.

## 🚧 Development Status

**This is a development project** - You are building this package from scratch. It is not yet published to npm.

## Features

- ✅ Automatic test result reporting to IETM
- ✅ Basic Authentication (simplified, no form-based login needed)
- ✅ Test execution output embedded in Result Details section
- ✅ Screenshot and video artifact tracking
- ✅ Flexible test case mapping strategies
- ✅ Configurable retry logic with exponential backoff
- ✅ Comprehensive logging
- ✅ TypeScript support
- ✅ POST-GET-PUT workflow for execution result state updates
- ✅ 91.37% test coverage
- ✅ End-to-end integration tested

## Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Playwright >= 1.40.0
- IBM Engineering Test Management 7.x or later
- IETM user account with appropriate permissions

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

This installs all required dependencies:
- `@playwright/test` - Playwright testing framework
- `axios` - HTTP client for API calls
- `dotenv` - Environment variable management
- `winston` - Logging framework
- And more...

### 2. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 3. Run Tests

```bash
npm test
```

### 4. Lint and Format

```bash
# Check code style
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your IETM server details:

```env
# IETM Server Configuration
IETM_BASE_URL=https://jazz.net/sandbox01-qm
IETM_JTS_URL=https://jazz.net/sandbox01-jts
IETM_PROJECT_NAME=Your Project Name

# Basic Authentication
IETM_USERNAME=your_username
IETM_PASSWORD=your_password

# Test Plan Configuration
IETM_TEST_PLAN_ID=987
```

See [Authentication Setup Guide](./docs/authentication-setup.md) for detailed configuration instructions.

### Configuration File

Alternatively, create `ietm.config.json`:

```json
{
  "server": {
    "baseUrl": "https://jazz.net/sandbox01-qm",
    "jtsUrl": "https://jazz.net/sandbox01-jts",
    "projectName": "Your Project Name",
    "autoDiscoverIds": true
  },
  "auth": {
    "type": "basic",
    "username": "your_username",
    "password": "your_password"
  },
  "testPlan": {
    "id": "987",
    "name": "IT1-System Test"
  },
  "mapping": {
    "strategy": "id",
    "annotationType": "ietm-test-case"
  }
}
```

## Usage (After Implementation)

### Configure Playwright

Add the IETM reporter to your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['./dist/reporter/IETMReporter.js', {
      configPath: './ietm.config.json'
    }]
  ],
  // ... other config
});
```

### Map Test Cases

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

### Run Tests

```bash
npx playwright test
```

Results will be automatically reported to IETM!

## Project Structure

```
ietm-reporter/
├── src/                    # Source code
│   ├── client/            # IETM API client
│   ├── config/            # Configuration management
│   ├── reporter/          # Playwright reporter
│   ├── types/             # TypeScript types
│   └── index.ts           # Main entry point
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── config/                 # Configuration examples
├── docs/                   # Documentation
├── examples/               # Example projects
├── dist/                   # Compiled output (generated)
└── package.json           # Dependencies and scripts
```

## Implementation Progress

Follow the implementation plan in [docs/IETM-Playwright-Implementation-Plan.md](./docs/IETM-Playwright-Implementation-Plan.md):

- [x] Phase 1: Project Setup & Architecture ✅ COMPLETE
- [x] Phase 2: IETM API Client Implementation ✅ COMPLETE
- [x] Phase 3: Playwright Integration ✅ COMPLETE
- [x] Phase 4: Result Reporting & Synchronization ✅ COMPLETE
- [ ] Phase 5: Configuration & CLI ⏭️ DEFERRED (Optional)
- [x] Phase 6: Error Handling & Resilience ✅ COMPLETE
- [x] Phase 7: Testing & Validation ✅ COMPLETE
- [ ] Phase 8: Documentation & Examples 🔄 IN PROGRESS
- [ ] Phase 9: Advanced Features (Optional)

**Current Status:** Core functionality complete and production-ready! Integration tests passing with execution results successfully created in IETM (IDs: 2895, 2896).

## Documentation

- [Installation Guide](./docs/installation.md) - Setup and installation
- [Authentication Setup](./docs/authentication-setup.md) - Authentication configuration
- [Java Implementation Analysis](./docs/java-implementation-analysis.md) - Analysis of IBM's Java client
- [Implementation Plan](./docs/IETM-Playwright-Implementation-Plan.md) - Detailed implementation prompts
- [Project Structure](./docs/PROJECT_STRUCTURE.md) - Complete project layout
- [Configuration Guide](./docs/configuration.md) - Configuration options
- [API Reference](./docs/api-reference.md) - API documentation
- [Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

## Examples

See the [examples](./examples) directory for working examples:
- `basic-example/` - Basic Playwright test with IETM reporting
- More examples coming soon...

## Development Scripts

```bash
# Build
npm run build              # Compile TypeScript
npm run build:watch        # Watch mode

# Testing
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report

# Code Quality
npm run lint               # Check code style
npm run lint:fix           # Fix linting issues
npm run format             # Format code
npm run format:check       # Check formatting

# Cleanup
npm run clean              # Remove dist directory
```

## Using This Package in Other Projects

### Option 1: Local Link (Development)

```bash
# In this project directory
npm link

# In your test project
npm link ietm-playwright-client
```

### Option 2: Install from File Path

```bash
# In your test project
npm install ../path/to/ietm-playwright-client
```

### Option 3: Publish to npm (Future)

Once ready for production:

```bash
# In this project directory
npm publish

# Then in other projects
npm install ietm-playwright-client
```

## Requirements

- Node.js >= 16.0.0
- npm >= 8.0.0
- Playwright >= 1.40.0
- IBM Engineering Test Management 7.x or later

## Technology Stack

- **Language**: TypeScript
- **Testing Framework**: Playwright
- **HTTP Client**: Axios
- **Authentication**: Basic Authentication (simplified)
- **XML Processing**: fast-xml-parser
- **Logging**: Winston
- **Testing**: Jest (91.37% coverage)
- **API Standard**: OSLC (Open Services for Lifecycle Collaboration)

## Contributing

This is a development project. To contribute:

1. Make changes in the `src/` directory
2. Write tests in the `tests/` directory
3. Run `npm run build` to compile
4. Run `npm test` to verify
5. Run `npm run lint` to check code style
6. Update documentation as needed

## License

MIT

## Support

For issues and questions:
- Check the [Implementation Plan](./docs/IETM-Playwright-Implementation-Plan.md)
- Review [Project Structure](./docs/PROJECT_STRUCTURE.md)
- See [Installation Guide](./docs/installation.md)
- See [Troubleshooting Guide](./docs/troubleshooting.md)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history (TODO).

---

**Note**: This is an active development project. The package is not yet published to npm. Follow the development setup instructions above to get started.