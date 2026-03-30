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

# Timeouts (milliseconds)
IETM_TIMEOUT=30000
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
    "autoDiscoverIds": true,
    "timeout": 30000
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
    "strategy": "annotation",
    "annotationType": "ietm-test-case",
    "defaultTestCaseId": null
  },
  "reporter": {
    "enabled": true,
    "uploadScreenshots": true,
    "uploadVideos": true,
    "uploadTraces": true,
    "verbose": false
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
    "autoDiscoverIds": true,
    "timeout": 30000
  }
}
```

**Options:**
- `baseUrl` (string, required): IETM QM server URL
- `jtsUrl` (string, optional): JTS server URL (for authentication)
- `projectName` (string, required): IETM project name
- `autoDiscoverIds` (boolean, default: true): Auto-discover project IDs
- `timeout` (number, default: 30000): Request timeout in milliseconds

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
    "strategy": "annotation",
    "annotationType": "ietm-test-case",
    "defaultTestCaseId": null
  }
}
```

**Options:**
- `strategy` (string): Mapping strategy
  - `"annotation"`: Use test annotations (recommended)
  - `"id"`: Use test ID
  - `"title"`: Use test title
- `annotationType` (string, default: "ietm-test-case"): Annotation type to look for
- `defaultTestCaseId` (string, optional): Default test case ID if mapping fails

**Mapping Strategies:**

1. **Annotation Strategy** (Recommended):
   ```typescript
   test('Login test', {
     annotation: { type: 'ietm-test-case', description: '2218' }
   }, async ({ page }) => {
     // test code
   });
   ```

2. **ID Strategy**:
   ```typescript
   test('2218', async ({ page }) => {
     // test code - uses test ID as test case ID
   });
   ```

3. **Title Strategy**:
   ```typescript
   test('Login with valid credentials', async ({ page }) => {
     // test code - matches IETM test case by title
   });
   ```

#### Reporter Configuration

```json
{
  "reporter": {
    "enabled": true,
    "uploadScreenshots": true,
    "uploadVideos": true,
    "uploadTraces": true,
    "verbose": false
  }
}
```

**Options:**
- `enabled` (boolean, default: true): Enable/disable reporter
- `uploadScreenshots` (boolean, default: true): Include screenshot info in output
- `uploadVideos` (boolean, default: true): Include video info in output
- `uploadTraces` (boolean, default: true): Include trace info in output
- `verbose` (boolean, default: false): Enable verbose logging

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

```typescript
interface IETMReporterOptions {
  configPath?: string;        // Path to config file
  enabled?: boolean;          // Enable/disable reporter
  uploadScreenshots?: boolean; // Include screenshot info
  uploadVideos?: boolean;     // Include video info
  uploadTraces?: boolean;     // Include trace info
  verbose?: boolean;          // Verbose logging
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

### Custom Timeout

```typescript
const client = new IETMClient({
  baseUrl: process.env.IETM_BASE_URL!,
  username: process.env.IETM_USERNAME!,
  password: process.env.IETM_PASSWORD!,
  timeout: 60000  // 60 seconds
});
```

### Custom Retry Logic

```typescript
const client = new IETMClient({
  ...config,
  maxRetries: 5,
  retryDelay: 2000,
  backoffMultiplier: 1.5
});
```

### Programmatic Configuration

```typescript
import { IETMClient } from 'ietm-playwright-client';

const client = new IETMClient({
  baseUrl: 'https://jazz.net/sandbox01-qm',
  username: process.env.IETM_USERNAME!,
  password: process.env.IETM_PASSWORD!,
  projectName: 'My Project',
  timeout: 30000
});

await client.initialize();
```

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
    "autoDiscoverIds": true,
    "timeout": 30000
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
    "strategy": "annotation",
    "annotationType": "ietm-test-case"
  },
  "reporter": {
    "enabled": true,
    "uploadScreenshots": true,
    "uploadVideos": true,
    "uploadTraces": true,
    "verbose": false
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
import { ConfigManager } from 'ietm-playwright-client';

const configManager = new ConfigManager('./ietm.config.json');
const config = await configManager.loadConfig();

// Throws ValidationError if invalid
configManager.validateConfig(config);
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