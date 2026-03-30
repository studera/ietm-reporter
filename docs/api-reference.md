# API Reference

## Overview

This document provides a comprehensive reference for the IETM Playwright Client API.

## Table of Contents

- [IETMClient](#ietmclient)
- [IETMReporter](#ietmreporter)
- [AttachmentHandler](#attachmenthandler)
- [ConfigManager](#configmanager)
- [ServiceDiscovery](#servicediscovery)
- [Type Definitions](#type-definitions)

---

## IETMClient

Main client for interacting with IETM API.

### Constructor

```typescript
new IETMClient(config: IETMClientConfig)
```

**Parameters:**
- `config.qmServerUrl` (string, required): IETM QM server URL
- `config.jtsServerUrl` (string, required): IETM JTS server URL
- `config.username` (string, required): IETM username
- `config.password` (string, required): IETM password
- `config.projectName` (string, required): Project name for service discovery
- `config.contextId` (string, optional): Pre-configured context ID (skips discovery)

**Example:**
```typescript
const client = new IETMClient({
  qmServerUrl: 'https://jazz.net/sandbox01-qm',
  jtsServerUrl: 'https://jazz.net/sandbox01-jts',
  username: process.env.IETM_USERNAME,
  password: process.env.IETM_PASSWORD,
  projectName: 'My Project'
});
```

### Methods

#### initialize()

Initialize the client and discover services.

```typescript
async initialize(): Promise<void>
```

**Throws:** `IETMError` if initialization fails

**Example:**
```typescript
await client.initialize();
```

#### getTestCase()

Retrieve a test case by ID.

```typescript
async getTestCase(testCaseId: string): Promise<TestCase>
```

**Parameters:**
- `testCaseId` (string): Test case ID

**Returns:** `TestCase` object

**Example:**
```typescript
const testCase = await client.getTestCase('2218');
```

#### createExecutionResult()

Create a new execution result in IETM using the POST-GET-PUT workflow.

```typescript
async createExecutionResult(result: ExecutionResultInput): Promise<string>
```

**Parameters:**
- `result` (ExecutionResultInput): Execution result data

**Returns:** Execution result ID

**Example:**
```typescript
const resultId = await client.createExecutionResult({
  testCaseId: '2218',
  verdict: 'passed',
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  details: 'Test passed successfully'
});
```

---

## IETMReporter

Playwright reporter for IETM integration.

### Configuration

Add to `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['./dist/src/reporter/IETMReporter.js', {
      configPath: './ietm.config.json',
      enabled: true
    }]
  ]
});
```

### Options

```typescript
interface IETMReporterOptions {
  configPath?: string;         // Path to IETM config file (default: 'config/ietm.config.json')
  enabled?: boolean;           // Enable/disable reporter (default: true)
  outputDir?: string;          // Directory for local result artifacts (default: 'ietm-results')
  uploadScreenshots?: boolean; // Include screenshot info in output (default: true)
  uploadVideos?: boolean;      // Include video info in output (default: true)
  uploadTraces?: boolean;      // Include trace info in output (default: true)
  batchSize?: number;          // Number of results to upload concurrently (default: 10)
  testCaseIdExtractor?: (test: TestCase) => string | null; // Custom extractor function
  hooks?: {
    onTestStart?: (test: TestCase, result: TestResult) => Promise<void>;
    onTestEnd?: (test: TestCase, result: TestResult) => Promise<void>;
    onRunEnd?: (result: FullResult) => Promise<void>;
  };
}
```

### Methods

The reporter automatically handles:
- Test result collection
- Execution result creation
- Test output embedding
- Error handling and logging

---

## AttachmentHandler

Handles test output embedding in execution results.

### Constructor

```typescript
new AttachmentHandler(client: IETMClient)
```

### Methods

#### uploadTestOutput()

Embed test output in execution result.

```typescript
async uploadTestOutput(
  testOutput: string,
  testName: string,
  executionResultId: string
): Promise<string | null>
```

**Parameters:**
- `testOutput` (string): Formatted test output
- `testName` (string): Test name
- `executionResultId` (string): Execution result URN

**Returns:** Attachment URL or null if failed

**Example:**
```typescript
const handler = new AttachmentHandler(client);
const url = await handler.uploadTestOutput(
  'Test output...',
  'Login Test',
  'urn:com.ibm.rqm:executionresult:2895'
);
```

---

## ConfigManager

Provides standalone functions for loading and validating IETM configuration. Supports JSON and YAML files, environment variable substitution (`${VAR}`), and deep-merges with environment variables.

### loadConfig()

Load configuration from file and environment variables.

```typescript
function loadConfig(configPath?: string): IETMConfig
```

**Parameters:**
- `configPath` (string, optional): Path to config file (default: searches common locations)

**Returns:** Merged `IETMConfig` object (synchronous)

**Example:**
```typescript
import { loadConfig } from 'ietm-playwright-client';

const config = loadConfig('./config/ietm.config.json');
```

### validateConfig()

Validate configuration completeness.

```typescript
function validateConfig(config: IETMConfig): void
```

**Throws:** `ValidationError` if required fields are missing or invalid

---

## ServiceDiscovery

Discovers IETM service URLs using the OSLC root services pattern.

### Constructor

```typescript
new ServiceDiscovery(config: ServiceDiscoveryConfig, authManager: AuthManager)
```

**Parameters:**
- `config` (ServiceDiscoveryConfig): Discovery configuration including `qmServerUrl`, `jtsServerUrl`, `projectName`, and optional `contextId`
- `authManager` (AuthManager): Authenticated request manager

### Methods

#### discover()

Discover all IETM service URLs.

```typescript
async discover(): Promise<DiscoveredServices>
```

**Returns:** `DiscoveredServices` object containing `contextId`, `queryUrls`, `basePath`, and related URLs

**Example:**
```typescript
const discovery = new ServiceDiscovery(config, authManager);
const services = await discovery.discover();
console.log(services.contextId);
```

---

## Type Definitions

### IETMClientConfig

```typescript
interface IETMClientConfig {
  qmServerUrl: string;      // IETM QM server URL
  jtsServerUrl: string;     // IETM JTS server URL
  username: string;
  password: string;
  projectName: string;
  contextId?: string;       // Optional: pre-configured context ID, skips discovery
}
```

### ExecutionResultInput

```typescript
interface ExecutionResultInput {
  testCaseId: string;
  executionRecordId?: string;
  verdict: 'passed' | 'failed' | 'blocked' | 'inconclusive' | 'error' | 'incomplete';
  startTime: string;        // ISO 8601 format
  endTime: string;          // ISO 8601 format
  duration?: number;
  details?: string;
  machine?: string;
  build?: string;
}
```

### TestCase

```typescript
interface TestCase {
  id: string;
  title: string;
  description?: string;
  webId: string;
  resourceUrl: string;
  state?: string;
  owner?: string;
}
```

### DiscoveredServices

```typescript
interface DiscoveredServices {
  rootServicesUrl: string;
  catalogUrl: string;
  servicesUrl: string;
  contextId: string;
  queryUrls: Map<string, string>;
  basePath: string;
}
```

### IETMConfig

```typescript
interface IETMConfig {
  server: {
    baseUrl: string;
    jtsUrl?: string;
    projectId?: string;
    projectName?: string;
    contextId?: string;
    autoDiscoverIds?: boolean;
  };
  auth: {
    type: 'basic';
    username: string;
    password: string;
  };
  testPlan?: {
    id: string;
    name?: string;
  };
  mapping?: {
    strategy: 'id' | 'title' | 'tag';
    annotationType?: string;
    mappings?: Record<string, string>;
  };
  retry?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
  logging?: {
    level?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    file?: string;
    console?: boolean;
  };
}
```

---

## Error Handling

### Error Types

#### IETMError

Base error class for all IETM-related errors. Includes structured context, troubleshooting hints, and retry information.

```typescript
class IETMError extends Error {
  readonly code: string;
  readonly isRetryable: boolean;
  getDetailedMessage(): string
  canRetry(): boolean
  getStatusCode(): number | undefined
  isClientError(): boolean
  isServerError(): boolean
}
```

#### AuthenticationError

Authentication-specific errors. Use static factories:

```typescript
class AuthenticationError extends IETMError {
  static invalidCredentials(): AuthenticationError
  static sessionExpired(): AuthenticationError
  static missingCredentials(): AuthenticationError
  static forbidden(resource: string): AuthenticationError
  static accountLocked(): AuthenticationError
}
```

#### ValidationError

Configuration or input validation errors.

```typescript
class ValidationError extends IETMError {
  readonly field?: string;
  readonly value?: unknown;
  readonly constraint?: string;
  static missingField(field: string): ValidationError
  static invalidValue(field: string, value: unknown): ValidationError
  static invalidFormat(field: string): ValidationError
}
```

#### NetworkError

Network and HTTP errors. Use static factories:

```typescript
class NetworkError extends IETMError {
  static timeout(url: string, ms: number): NetworkError
  static connectionRefused(url: string): NetworkError
  static dnsFailure(hostname: string): NetworkError
  static sslError(url: string): NetworkError
  static rateLimited(url: string): NetworkError
}
```

### Error Handling Example

```typescript
try {
  await client.initialize();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Best Practices

### 1. Configuration Management

```typescript
// ✅ Good: Use environment variables
const client = new IETMClient({
  qmServerUrl: process.env.IETM_BASE_URL!,
  jtsServerUrl: process.env.IETM_JTS_URL!,
  username: process.env.IETM_USERNAME!,
  password: process.env.IETM_PASSWORD!,
  projectName: process.env.IETM_PROJECT_NAME!
});

// ❌ Bad: Hardcode credentials
const client = new IETMClient({
  qmServerUrl: 'https://jazz.net/sandbox01-qm',
  jtsServerUrl: 'https://jazz.net/sandbox01-jts',
  username: 'myuser',
  password: 'mypassword',
  projectName: 'My Project'
});
```

### 2. Client Lifecycle

```typescript
// ✅ Good: Reuse client instance
const client = new IETMClient(config);
await client.initialize();

await client.getTestCase('123');
await client.getTestCase('456');
await client.createExecutionResult(result);

// ❌ Bad: Create multiple instances
const client1 = new IETMClient(config);
await client1.initialize();
const client2 = new IETMClient(config);
await client2.initialize();
```

### 3. Error Handling

```typescript
// ✅ Good: Handle specific errors
try {
  await client.createExecutionResult(result);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid result data:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network issue:', error.message);
    // Maybe retry
  } else {
    throw error; // Re-throw unexpected errors
  }
}
```

### 4. Timeout Configuration

```typescript
// ✅ Good: Set appropriate timeout
const client = new IETMClient({
  ...config,
  timeout: 30000 // 30 seconds
});

// ⚠️ Consider: Longer timeout for slow networks
const client = new IETMClient({
  ...config,
  timeout: 60000 // 60 seconds
});
```

---

## Examples

### Complete Integration Example

```typescript
import { IETMClient } from 'ietm-playwright-client';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // 1. Create client
  const client = new IETMClient({
    baseUrl: process.env.IETM_BASE_URL!,
    username: process.env.IETM_USERNAME!,
    password: process.env.IETM_PASSWORD!,
    projectName: 'My Project'
  });

  try {
    // 2. Initialize
    console.log('Initializing client...');
    await client.initialize();
    console.log('✓ Client initialized');

    // 3. Get test case
    console.log('Fetching test case...');
    const testCase = await client.getTestCase('2218');
    console.log('✓ Test case:', testCase.title);

    // 4. Create execution result
    console.log('Creating execution result...');
    const resultId = await client.createExecutionResult({
      testCaseId: '2218',
      state: 'passed',
      startTime: new Date(Date.now() - 5000),
      endTime: new Date(),
      testOutput: 'Test completed successfully'
    });
    console.log('✓ Execution result created:', resultId);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
```

---

## Version Information

- **API Version:** 1.0.0
- **Last Updated:** 2026-03-30
- **Compatibility:** IETM 7.x+

## Support

For issues and questions:
- Check [Troubleshooting Guide](./troubleshooting.md)
- Review [Examples](../examples/README.md)
- See [Implementation Plan](./IETM-Playwright-Implementation-Plan.md)