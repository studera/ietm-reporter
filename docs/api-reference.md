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
- `config.baseUrl` (string, required): IETM QM server URL
- `config.username` (string, required): IETM username
- `config.password` (string, required): IETM password
- `config.projectName` (string, optional): Project name for auto-discovery
- `config.timeout` (number, optional): Request timeout in ms (default: 30000)

**Example:**
```typescript
const client = new IETMClient({
  baseUrl: 'https://jazz.net/sandbox01-qm',
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

Create a new execution result in IETM.

```typescript
async createExecutionResult(result: ExecutionResultData): Promise<string>
```

**Parameters:**
- `result` (ExecutionResultData): Execution result data

**Returns:** Execution result ID

**Example:**
```typescript
const resultId = await client.createExecutionResult({
  testCaseId: '2218',
  state: 'passed',
  startTime: new Date(),
  endTime: new Date(),
  testOutput: 'Test passed successfully'
});
```

#### updateExecutionResult()

Update an existing execution result.

```typescript
async updateExecutionResult(
  resultId: string,
  updates: Partial<ExecutionResultData>
): Promise<void>
```

**Parameters:**
- `resultId` (string): Execution result ID
- `updates` (Partial<ExecutionResultData>): Fields to update

**Example:**
```typescript
await client.updateExecutionResult('2895', {
  state: 'failed',
  endTime: new Date()
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
  configPath?: string;        // Path to config file (default: './ietm.config.json')
  enabled?: boolean;          // Enable/disable reporter (default: true)
  uploadScreenshots?: boolean; // Include screenshot info (default: true)
  uploadVideos?: boolean;     // Include video info (default: true)
  uploadTraces?: boolean;     // Include trace info (default: true)
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

#### buildTestOutput()

Build formatted test output string.

```typescript
buildTestOutput(result: TestResult): string
```

**Parameters:**
- `result` (TestResult): Playwright test result

**Returns:** Formatted test output string

---

## ConfigManager

Manages IETM configuration.

### Constructor

```typescript
new ConfigManager(configPath?: string)
```

### Methods

#### loadConfig()

Load configuration from file and environment.

```typescript
async loadConfig(): Promise<IETMConfig>
```

**Returns:** Merged configuration object

**Example:**
```typescript
const configManager = new ConfigManager('./ietm.config.json');
const config = await configManager.loadConfig();
```

#### validateConfig()

Validate configuration completeness.

```typescript
validateConfig(config: IETMConfig): void
```

**Throws:** `ValidationError` if config is invalid

---

## ServiceDiscovery

Discovers IETM service URLs using OSLC pattern.

### Constructor

```typescript
new ServiceDiscovery(authManager: AuthManager, baseUrl: string)
```

### Methods

#### discoverServices()

Discover all IETM service URLs.

```typescript
async discoverServices(projectName: string): Promise<ServiceURLs>
```

**Parameters:**
- `projectName` (string): IETM project name

**Returns:** Object containing discovered service URLs

**Example:**
```typescript
const discovery = new ServiceDiscovery(authManager, baseUrl);
const services = await discovery.discoverServices('My Project');
console.log(services.testCaseQuery);
```

---

## Type Definitions

### IETMClientConfig

```typescript
interface IETMClientConfig {
  baseUrl: string;
  username: string;
  password: string;
  projectName?: string;
  timeout?: number;
}
```

### ExecutionResultData

```typescript
interface ExecutionResultData {
  testCaseId: string;
  state: 'passed' | 'failed' | 'incomplete' | 'blocked';
  startTime: Date;
  endTime: Date;
  testOutput?: string;
  duration?: number;
  errorMessage?: string;
  stackTrace?: string;
}
```

### TestCase

```typescript
interface TestCase {
  id: string;
  title: string;
  description?: string;
  webId: string;
  href: string;
}
```

### ServiceURLs

```typescript
interface ServiceURLs {
  catalogUrl: string;
  contextId: string;
  servicesUrl: string;
  testCaseQuery: string;
  testResultQuery: string;
  executionWorkItemQuery: string;
  basePath: string;
}
```

### IETMConfig

```typescript
interface IETMConfig {
  server: {
    baseUrl: string;
    jtsUrl?: string;
    projectName: string;
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
    strategy: 'id' | 'title' | 'annotation';
    annotationType?: string;
  };
}
```

---

## Error Handling

### Error Types

#### IETMError

Base error class for IETM-related errors.

```typescript
class IETMError extends Error {
  constructor(message: string, cause?: Error)
}
```

#### AuthenticationError

Authentication-specific errors.

```typescript
class AuthenticationError extends IETMError {
  constructor(message: string, cause?: Error)
}
```

#### ValidationError

Configuration validation errors.

```typescript
class ValidationError extends IETMError {
  constructor(message: string, cause?: Error)
}
```

#### NetworkError

Network and HTTP errors.

```typescript
class NetworkError extends IETMError {
  constructor(message: string, statusCode?: number, cause?: Error)
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
const config = {
  baseUrl: process.env.IETM_BASE_URL,
  username: process.env.IETM_USERNAME,
  password: process.env.IETM_PASSWORD
};

// ❌ Bad: Hardcode credentials
const config = {
  username: 'myuser',
  password: 'mypassword'
};
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
- See [Implementation Plan](../IETM-Playwright-Implementation-Plan.md)