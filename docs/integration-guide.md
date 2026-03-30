# Integration Guide for New Testing Projects

## Overview

This guide explains how to integrate the IETM Playwright Client into your new or existing Playwright testing project.

**Last Updated:** 2026-03-30

---

## Table of Contents

- [Integration Methods](#integration-methods)
- [Method 1: npm Link (Development)](#method-1-npm-link-development)
- [Method 2: Git Submodule](#method-2-git-submodule)
- [Method 3: Direct Copy](#method-3-direct-copy)
- [Method 4: npm Package (Future)](#method-4-npm-package-future)
- [Step-by-Step Setup](#step-by-step-setup)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

---

## Integration Methods

### Comparison

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| npm link | Development/Testing | Easy updates, live changes | Local only |
| Git Submodule | Team projects | Version control, shared updates | Git complexity |
| Direct Copy | Simple projects | No dependencies | Manual updates |
| npm Package | Production | Standard workflow | Requires publishing |

---

## Method 1: npm Link (Development)

**Best for:** Development, testing, and local experimentation

### Setup

1. **Build the IETM adapter:**
   ```bash
   cd /path/to/ietm-playwright-client
   npm install
   npm run build
   npm link
   ```

2. **Link in your test project:**
   ```bash
   cd /path/to/your-test-project
   npm link ietm-playwright-client
   ```

3. **Verify the link:**
   ```bash
   npm list ietm-playwright-client
   # Should show: ietm-playwright-client@1.0.0 -> ./../ietm-playwright-client
   ```

### Usage

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['ietm-playwright-client/dist/src/reporter/IETMReporter.js', {
      configPath: './ietm.config.json'
    }]
  ]
});
```

### Updating

When you make changes to the adapter:
```bash
cd /path/to/ietm-playwright-client
npm run build
# Changes automatically available in linked projects
```

### Unlinking

```bash
cd /path/to/your-test-project
npm unlink ietm-playwright-client

cd /path/to/ietm-playwright-client
npm unlink
```

---

## Method 2: Git Submodule

**Best for:** Team projects with shared repository access

### Setup

1. **Add as submodule:**
   ```bash
   cd /path/to/your-test-project
   git submodule add https://github.com/your-org/ietm-playwright-client.git lib/ietm-adapter
   git submodule update --init --recursive
   ```

2. **Build the adapter:**
   ```bash
   cd lib/ietm-adapter
   npm install
   npm run build
   cd ../..
   ```

3. **Add to package.json:**
   ```json
   {
     "scripts": {
       "postinstall": "cd lib/ietm-adapter && npm install && npm run build"
     }
   }
   ```

### Usage

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['./lib/ietm-adapter/dist/src/reporter/IETMReporter.js', {
      configPath: './ietm.config.json'
    }]
  ]
});
```

### Updating

```bash
cd lib/ietm-adapter
git pull origin main
npm install
npm run build
cd ../..
git add lib/ietm-adapter
git commit -m "Update IETM adapter"
```

### Team Setup

Team members clone with submodules:
```bash
git clone --recurse-submodules https://github.com/your-org/your-test-project.git
# Or if already cloned:
git submodule update --init --recursive
```

---

## Method 3: Direct Copy

**Best for:** Simple projects, quick setup, no version control needed

### Setup

1. **Copy the adapter:**
   ```bash
   cd /path/to/your-test-project
   mkdir -p lib
   cp -r /path/to/ietm-playwright-client lib/ietm-adapter
   ```

2. **Build the adapter:**
   ```bash
   cd lib/ietm-adapter
   npm install
   npm run build
   cd ../..
   ```

3. **Add to .gitignore (optional):**
   ```gitignore
   lib/ietm-adapter/node_modules/
   lib/ietm-adapter/dist/
   ```

### Usage

Same as Git Submodule method.

### Updating

Manually copy new version and rebuild:
```bash
rm -rf lib/ietm-adapter
cp -r /path/to/ietm-playwright-client lib/ietm-adapter
cd lib/ietm-adapter
npm install
npm run build
```

---

## Method 4: npm Package (Future)

**Best for:** Production use when adapter is published to npm

### Setup (Future)

```bash
npm install ietm-playwright-client
```

### Usage (Future)

```typescript
import { IETMReporter } from 'ietm-playwright-client';

export default defineConfig({
  reporter: [
    ['list'],
    [IETMReporter, { configPath: './ietm.config.json' }]
  ]
});
```

---

## Step-by-Step Setup

### 1. Create Test Project Structure

```bash
mkdir my-test-project
cd my-test-project
npm init -y
npm install -D @playwright/test
npx playwright install
```

### 2. Integrate IETM Adapter

Choose one of the methods above (npm link recommended for development).

### 3. Create Configuration Files

**Create `.env`:**
```bash
cp /path/to/ietm-playwright-client/.env.example .env
# Edit .env with your credentials
```

**Create `ietm.config.json`:**
```json
{
  "$schema": "./node_modules/ietm-playwright-client/config/ietm.config.schema.json",
  "server": {
    "baseUrl": "${IETM_BASE_URL}",
    "projectName": "${IETM_PROJECT_NAME}"
  },
  "auth": {
    "type": "basic",
    "username": "${IETM_USERNAME}",
    "password": "${IETM_PASSWORD}"
  },
  "testPlan": {
    "id": "${IETM_TEST_PLAN_ID}"
  },
  "mapping": {
    "strategy": "annotation",
    "annotationType": "ietm-test-case"
  }
}
```

### 4. Configure Playwright

**Create `playwright.config.ts`:**
```typescript
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  
  reporter: [
    ['list'],
    ['ietm-playwright-client/dist/src/reporter/IETMReporter.js', {
      configPath: './ietm.config.json',
      enabled: true
    }]
  ],
  
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  }
});
```

### 5. Write Your First Test

**Create `tests/example.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test';

test('Example test', {
  annotation: { 
    type: 'ietm-test-case', 
    description: '2218'  // Your IETM test case ID
  }
}, async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
```

### 6. Run Tests

```bash
npx playwright test
```

---

## Project Structure

### Recommended Structure

```
my-test-project/
├── .env                          # Credentials (gitignored)
├── .env.example                  # Template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies
├── playwright.config.ts          # Playwright config
├── ietm.config.json             # IETM config
├── lib/                          # Libraries
│   └── ietm-adapter/            # IETM adapter (if using submodule/copy)
├── tests/                        # Test files
│   ├── login.spec.ts
│   ├── checkout.spec.ts
│   └── ...
├── test-results/                 # Playwright results
└── ietm-results/                 # IETM results (generated)
```

### .gitignore

```gitignore
# Dependencies
node_modules/

# Environment
.env

# Test Results
test-results/
playwright-report/
ietm-results/

# Build
dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# IETM Adapter (if using direct copy)
lib/ietm-adapter/node_modules/
lib/ietm-adapter/dist/
```

---

## Configuration

### Environment Variables

**Required:**
```bash
IETM_BASE_URL=https://jazz.net/sandbox01-qm
IETM_USERNAME=your_username
IETM_PASSWORD=your_password
IETM_PROJECT_NAME=Your Project Name
IETM_TEST_PLAN_ID=987
```

**Optional:**
```bash
IETM_JTS_URL=https://jazz.net/sandbox01-jts
IETM_TIMEOUT=30000
DEBUG=ietm:*
```

### Configuration File

See [configuration.md](./configuration.md) for complete options.

---

## Writing Tests

### Test Case Mapping

**Using Annotations (Recommended):**
```typescript
test('Login with valid credentials', {
  annotation: { type: 'ietm-test-case', description: '2218' }
}, async ({ page }) => {
  // test code
});
```

**Using Test ID:**
```typescript
test('2218', async ({ page }) => {
  // test code - uses test ID as IETM test case ID
});
```

### Test Organization

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com/login');
  });

  test('Valid credentials', {
    annotation: { type: 'ietm-test-case', description: '2218' }
  }, async ({ page }) => {
    await page.fill('#username', 'user@example.com');
    await page.fill('#password', 'password');
    await page.click('#login-button');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('Invalid credentials', {
    annotation: { type: 'ietm-test-case', description: '2219' }
  }, async ({ page }) => {
    await page.fill('#username', 'invalid@example.com');
    await page.fill('#password', 'wrong');
    await page.click('#login-button');
    await expect(page.locator('.error')).toBeVisible();
  });
});
```

---

## Running Tests

### Local Development

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/login.spec.ts

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Disable IETM reporter for local testing
IETM_REPORTER_ENABLED=false npx playwright test
```

### CI/CD

```bash
# Run with IETM reporting enabled
CI=true npx playwright test
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Playwright Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive  # If using git submodule
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run tests
        env:
          IETM_BASE_URL: ${{ secrets.IETM_BASE_URL }}
          IETM_USERNAME: ${{ secrets.IETM_USERNAME }}
          IETM_PASSWORD: ${{ secrets.IETM_PASSWORD }}
          IETM_PROJECT_NAME: ${{ secrets.IETM_PROJECT_NAME }}
          IETM_TEST_PLAN_ID: ${{ secrets.IETM_TEST_PLAN_ID }}
          CI: true
        run: npx playwright test
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
test:
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  script:
    - npm ci
    - npx playwright test
  variables:
    IETM_BASE_URL: $IETM_BASE_URL
    IETM_USERNAME: $IETM_USERNAME
    IETM_PASSWORD: $IETM_PASSWORD
    IETM_PROJECT_NAME: $IETM_PROJECT_NAME
    IETM_TEST_PLAN_ID: $IETM_TEST_PLAN_ID
    CI: "true"
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
```

---

## Best Practices

### 1. Environment Management

```typescript
// Use different configs for different environments
const config = process.env.CI 
  ? './ietm.config.prod.json'
  : './ietm.config.dev.json';
```

### 2. Conditional Reporting

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['list'],
    ...(process.env.CI === 'true' ? [[
      'ietm-playwright-client/dist/src/reporter/IETMReporter.js',
      { configPath: './ietm.config.json' }
    ]] : [])
  ]
});
```

### 3. Test Case Management

- Use consistent test case IDs
- Document test case mappings
- Keep test cases in sync with IETM

### 4. Error Handling

```typescript
test('Example with error handling', async ({ page }) => {
  try {
    await page.goto('https://example.com');
    // test steps
  } catch (error) {
    console.error('Test failed:', error);
    throw error; // Re-throw to mark test as failed
  }
});
```

### 5. Credentials Security

- Never commit `.env` file
- Use CI/CD secrets
- Rotate passwords regularly
- Use separate accounts for CI/CD

---

## Troubleshooting

### Common Issues

1. **Reporter not found:**
   ```bash
   # Rebuild the adapter
   cd lib/ietm-adapter
   npm run build
   ```

2. **Authentication fails:**
   - Check `.env` file exists
   - Verify credentials are correct
   - Ensure dotenv is loaded in playwright.config.ts

3. **No results in IETM:**
   - Verify test case IDs are correct
   - Check reporter is enabled
   - Review console output for errors

See [troubleshooting.md](./troubleshooting.md) for more help.

---

## Next Steps

1. ✅ Choose integration method
2. ✅ Set up project structure
3. ✅ Configure IETM connection
4. ✅ Write tests with IETM annotations
5. ✅ Run tests locally
6. ✅ Set up CI/CD integration
7. ✅ Monitor results in IETM

---

## Related Documentation

- [Installation Guide](./installation.md)
- [Configuration Guide](./configuration.md)
- [API Reference](./api-reference.md)
- [Troubleshooting](./troubleshooting.md)
- [Examples](../examples/README.md)

---

**Last Updated:** 2026-03-30  
**Version:** 1.0.0