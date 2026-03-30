# Configuration Guide

## Overview

This guide covers all configuration options for the IETM Playwright Client.

## Table of Contents

- [Configuration Methods](#configuration-methods)
- [Environment Variables](#environment-variables)
- [Configuration File](#configuration-file)
- [Reporter Configuration](#reporter-configuration)
- [Advanced Options](#advanced-options)
- [Examples](#examples)

---

## Configuration Methods

The IETM Playwright Client supports multiple configuration methods:

1. **Environment Variables** (`.env` file) - Recommended for credentials
2. **Configuration File** (`ietm.config.json`) - Recommended for project settings
3. **Programmatic Configuration** - For advanced use cases

### Priority Order

When multiple configuration sources are present:

```
Environment Variables > Configuration File > Default Values
```

---

## Environment Variables

### Required Variables

```bash
# IETM Server URLs
IETM_BASE_URL=https://jazz.net/sandbox01-qm
IETM_JTS_URL=https://jazz.net/sandbox01-jts

# Authentication (REQUIRED)
IETM_USERNAME=your_username
IETM_PASSWORD=your_password

# Project Configuration
IETM_PROJECT_NAME=Your Project Name
```

### Optional Variables

```bash
# Test Plan
IETM_TEST_PLAN_ID=987
IETM_TEST_PLAN_NAME=IT1-System Test

# Retry settings
IETM_RETRY_DELAY=1000
IETM_MAX_RETRIES=3

# Debug
DEBUG=ietm:*
```

### Creating .env File

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env  # or use your preferred editor
```

### Security Best Practices

✅ **DO:**
- Store credentials only in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables in CI/CD
- Rotate passwords regularly

❌ **DON'T:**
- Commit `.env` to version control
- Hardcode credentials in code
- Share `.env` file with others
- Use production credentials in development

---

## Configuration File

### Location

Default: `./ietm.config.json`

Custom location:
```typescript
// playwright.config.ts
reporter: [
  ['./dist/src/reporter/IETMReporter.js', {
    configPath: './custom/path/ietm.config.json'
  }]
]
```

### Complete Configuration Schema

```json
{
  "$schema": "./ietm.config.schema.json",
  "server": {
    "baseUrl": "https://jazz.net/sandbox01-qm",
    "jtsUrl": "https://jazz.net/sandbox01-jts",
    "projectName": "Your Project Name",
    "autoDiscoverIds": true
  },
  "auth": {
    "type": "basic",
    "username": "${IETM_USERNAME}",
    "password": "${IETM_PASSWORD}"
  },
  "testPlan": {
    "id": "987",
    "name": "IT1-System Test"
  },
  "mapping": {
    "strategy": "tag",
    "annotationType": "ietm-test-case"
  },
  "retry": {
    "maxRetries": 3,
    "retryDelay": 1000,
    "backoffMultiplier": 2
  }
}
```

### Configuration Sections

#### Server Configuration

```json
{
  "server": {
    "baseUrl": "https://jazz.net/sandbox01-qm",
    "jtsUrl": "https://jazz.net/sandbox01-jts",
    "projectName": "Your Project Name",
    "autoDiscoverIds": true
  }
}
```

**Options:**
- `baseUrl` (string, required): IETM QM server URL
- `jtsUrl` (string, optional): JTS server URL (for authentication)
- `projectId` (string, optional): Project ID (alternative to `projectName`)
- `projectName` (string, optional): IETM project name
- `contextId` (string, optional): Pre-configured context ID (skips service discovery)
- `autoDiscoverIds` (boolean, default: false): Auto-discover project IDs

#### Authentication Configuration

```json
{
  "auth": {
    "type": "basic",
    "username": "${IETM_USERNAME}",
    "password": "${IETM_PASSWORD}"
  }
}
```

**Options:**
- `type` (string, required): Authentication type (only "basic" supported)
- `username` (string, required): IETM username (use env var placeholder)
- `password` (string, required): IETM password (use env var placeholder)

**Environment Variable Placeholders:**
```json
{
  "username": "${IETM_USERNAME}",
  "password": "${IETM_PASSWORD}"
}
```

#### Test Plan Configuration

```json
{
  "testPlan": {
    "id": "987",
    "name": "IT1-System Test"
  }
}
```

**Options:**
- `id` (string, required): Test plan ID
- `name` (string, optional): Test plan name (for documentation)

#### Test Case Mapping

```json
{
  "mapping": {
    "strategy": "tag",
    "annotationType": "ietm-test-case"
  }
}
```

**Options:**
- `strategy` (string): Mapping strategy — `"id"`, `"title"`, or `"tag"`
- `annotationType` (string, default: `"ietm-test-case"`): Playwright annotation type used to identify the IETM test case ID
- `mappings` (object, optional): Explicit mapping of Playwright test IDs to IETM test case IDs

**Mapping Strategies:**

1. **Tag Strategy** (Recommended) — reads an `annotation` on the test:
   ```typescript
   test('Login test', {
     annotation: { type: 'ietm-test-case', description: '2218' }
   }, async ({ page }) => {
     // test code
   });
   ```

2. **Title Strategy** — extracts the test case ID from the test title using the pattern `[TC-<id>]`:
   ```typescript
   test('[TC-2218] Login with valid credentials', async ({ page }) => {
     // test code
   });
   ```

3. **ID Strategy** — uses a static `mappings` lookup keyed by test title:
   ```json
   {
     "mapping": {
       "strategy": "id",
       "mappings": {
         "Login with valid credentials": "2218"
       }
     }
   }
   ```

#### Retry Configuration

```json
{
  "retry": {
    "maxRetries": 3,
    "retryDelay": 1000,
    "backoffMultiplier": 2
  }
}
```

**Options:**
- `maxRetries` (number, default: 3): Maximum retry attempts
- `retryDelay` (number, default: 1000): Initial retry delay in ms
- `backoffMultiplier` (number, default: 2): Exponential backoff multiplier

**Retry Delays:**
- Attempt 1: 1000ms (1s)
- Attempt 2: 2000ms (2s)
- Attempt 3: 4000ms (4s)

---

## Reporter Configuration

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  reporter: [
    ['list'],  // Console output
    ['./dist/src/reporter/IETMReporter.js', {
      configPath: './ietm.config.json',
      enabled: true
    }]
  ],
  
  // Other Playwright settings
  testDir: './tests',
  timeout: 30000,
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  }
});
```

### Reporter Options

Reporter options are passed directly in `playwright.config.ts`, **not** in the `ietm.config.json` file:

```typescript
interface IETMReporterOptions {
  configPath?: string;         // Path to IETM config file (default: 'config/ietm.config.json')
  enabled?: boolean;           // Enable/disable reporter (default: true)
  outputDir?: string;          // Directory for local result artifacts (default: 'ietm-results')
  uploadScreenshots?: boolean; // Include screenshot info in output (default: true)
  uploadVideos?: boolean;      // Include video info in output (default: true)
  uploadTraces?: boolean;      // Include trace info in output (default: true)
  batchSize?: number;          // Concurrent upload batch size (default: 10)
  testCaseIdExtractor?: (test: TestCase) => string | null; // Custom ID extractor
  hooks?: {
    onTestStart?: (test: TestCase, result: TestResult) => Promise<void>;
    onTestEnd?: (test: TestCase, result: TestResult) => Promise<void>;
    onRunEnd?: (result: FullResult) => Promise<void>;
  };
}
```

### Conditional Reporter

Enable reporter only in CI:

```typescript
export default defineConfig({
  reporter: [
    ['list'],
    ['./dist/src/reporter/IETMReporter.js', {
      enabled: process.env.CI === 'true'
    }]
  ]
});
```

---

## Advanced Options

### Programmatic Configuration

Use `loadConfig` and pass the result to `IETMClient` or `IETMReporter`:

```typescript
import { IETMClient, loadConfig } from 'ietm-playwright-client';

const config = loadConfig('./config/ietm.config.json');

const client = new IETMClient({
  qmServerUrl: config.server.baseUrl,
  jtsServerUrl: config.server.jtsUrl!,
  username: config.auth.username,
  password: config.auth.password,
  projectName: config.server.projectName!
});

await client.initialize();
```

Retry behaviour is controlled via `ietm.config.json` under the `retry` section, not via constructor parameters.

---

## Examples

### Minimal Configuration

**.env:**
```bash
IETM_BASE_URL=https://jazz.net/sandbox01-qm
IETM_USERNAME=myuser
IETM_PASSWORD=mypassword
IETM_PROJECT_NAME=My Project
```

**ietm.config.json:**
```json
{
  "server": {
    "baseUrl": "${IETM_BASE_URL}",
    "projectName": "${IETM_PROJECT_NAME}"
  },
  "auth": {
    "type": "basic",
    "username": "${IETM_USERNAME}",
    "password": "${IETM_PASSWORD}"
  }
}
```

### Complete Configuration

**.env:**
```bash
IETM_BASE_URL=https://jazz.net/sandbox01-qm
IETM_JTS_URL=https://jazz.net/sandbox01-jts
IETM_USERNAME=myuser
IETM_PASSWORD=mypassword
IETM_PROJECT_NAME=My Project
IETM_TEST_PLAN_ID=987
```

**ietm.config.json:**
```json
{
  "$schema": "./ietm.config.schema.json",
  "server": {
    "baseUrl": "${IETM_BASE_URL}",
    "jtsUrl": "${IETM_JTS_URL}",
    "projectName": "${IETM_PROJECT_NAME}",
    "autoDiscoverIds": true
  },
  "auth": {
    "type": "basic",
    "username": "${IETM_USERNAME}",
    "password": "${IETM_PASSWORD}"
  },
  "testPlan": {
    "id": "${IETM_TEST_PLAN_ID}",
    "name": "IT1-System Test"
  },
  "mapping": {
    "strategy": "tag",
    "annotationType": "ietm-test-case"
  },
  "retry": {
    "maxRetries": 3,
    "retryDelay": 1000,
    "backoffMultiplier": 2
  }
}
```

### CI/CD Configuration

**GitHub Actions:**
```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: Run tests
        env:
          IETM_BASE_URL: ${{ secrets.IETM_BASE_URL }}
          IETM_USERNAME: ${{ secrets.IETM_USERNAME }}
          IETM_PASSWORD: ${{ secrets.IETM_PASSWORD }}
          IETM_PROJECT_NAME: ${{ secrets.IETM_PROJECT_NAME }}
          CI: true
        run: npx playwright test
```

**GitLab CI:**
```yaml
# .gitlab-ci.yml
test:
  script:
    - npx playwright test
  variables:
    IETM_BASE_URL: $IETM_BASE_URL
    IETM_USERNAME: $IETM_USERNAME
    IETM_PASSWORD: $IETM_PASSWORD
    IETM_PROJECT_NAME: $IETM_PROJECT_NAME
    CI: "true"
```

---

## Validation

### Validate Configuration

```typescript
import { loadConfig, validateConfig } from 'ietm-playwright-client';

const config = loadConfig('./config/ietm.config.json');

// Throws ValidationError if required fields are missing
validateConfig(config);
```

### Check Required Fields

```typescript
const requiredFields = [
  'server.baseUrl',
  'server.projectName',
  'auth.username',
  'auth.password'
];

for (const field of requiredFields) {
  if (!getNestedValue(config, field)) {
    throw new Error(`Missing required field: ${field}`);
  }
}
```

---

## Troubleshooting

### Configuration Not Loading

1. Check file exists: `ls -la ietm.config.json`
2. Validate JSON syntax: `cat ietm.config.json | jq .`
3. Check file permissions
4. Verify path in reporter config

### Environment Variables Not Working

1. Check `.env` file exists
2. Verify dotenv is loaded: `dotenv.config()`
3. Check variable names match
4. Verify no typos in placeholders

### Invalid Configuration

1. Use JSON validator
2. Check schema file exists
3. Verify all required fields present
4. Check data types match schema

---

## Best Practices

### 1. Use Environment Variables for Secrets

```json
{
  "auth": {
    "username": "${IETM_USERNAME}",
    "password": "${IETM_PASSWORD}"
  }
}
```

### 2. Separate Configs for Environments

```
config/
  ietm.config.dev.json
  ietm.config.staging.json
  ietm.config.prod.json
```

### 3. Document Custom Settings

```json
{
  "server": {
    "timeout": 60000  // Increased for slow network
  }
}
```

### 4. Version Control

- ✅ Commit: `ietm.config.example.json`
- ✅ Commit: `ietm.config.schema.json`
- ❌ Don't commit: `ietm.config.json` (if contains secrets)
- ❌ Don't commit: `.env`

---

## Related Documentation

- [Installation Guide](./installation.md)
- [Authentication Setup](./authentication-setup.md)
- [API Reference](./api-reference.md)
- [Troubleshooting](./troubleshooting.md)

---

**Last Updated:** 2026-03-30
**Version:** 1.0.0