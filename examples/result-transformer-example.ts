/**
 * Example: Using ResultTransformer
 * 
 * This example demonstrates how to use the ResultTransformer to:
 * - Convert Playwright test results to IETM ExecutionResult format
 * - Handle different test statuses and retries
 * - Customize transformation options
 * - Generate transformation statistics
 */

import { ResultTransformer } from '../src/transformer/ResultTransformer';
import { ExecutionState } from '../src/models/ExecutionResult';
import type { TestCase, TestResult, TestStep, TestError } from '@playwright/test/reporter';

// Mock helpers for demonstration
function createMockTestCase(title: string, titlePath: string[] = [title]): TestCase {
  return {
    title,
    annotations: [],
    location: { file: 'example.spec.ts', line: 1, column: 0 },
    parent: {} as any,
    ok: () => true,
    outcome: () => 'expected',
    titlePath: () => titlePath,
    expectedStatus: 'passed',
    id: 'test-id',
    repeatEachIndex: 0,
    results: [],
    retries: 0,
    tags: [],
    timeout: 30000,
    type: 'test',
  } as TestCase;
}

function createMockTestResult(
  status: 'passed' | 'failed' | 'skipped' | 'timedOut',
  duration: number = 1000,
  retry: number = 0,
  error?: TestError,
  steps: TestStep[] = []
): TestResult {
  return {
    status,
    duration,
    retry,
    startTime: new Date(),
    error,
    errors: error ? [error] : [],
    steps,
    attachments: [],
    stdout: [],
    stderr: [],
    workerIndex: 0,
    parallelIndex: 0,
    annotations: [],
  } as TestResult;
}

function createMockTestStep(title: string, duration: number = 100, error?: TestError): TestStep {
  return {
    title,
    category: 'test.step',
    duration,
    startTime: new Date(),
    error,
    steps: [],
    titlePath: () => [title],
    annotations: [],
    attachments: [],
  } as TestStep;
}

async function main() {
  console.log('=== Result Transformer Example ===\n');

  // Example 1: Basic transformation
  console.log('Example 1: Basic Transformation');
  console.log('----------------------------------');

  const transformer = new ResultTransformer({
    baseUrl: 'https://jazz.net/sandbox01-qm',
    contextId: 'studera-project',
    tester: 'test-user@example.com',
    machine: 'CI-Server-01',
  });

  const test1 = createMockTestCase('Login with valid credentials');
  const result1 = createMockTestResult('passed', 2500);

  const transformed1 = transformer.transform(test1, result1, '2218', 'exec-001');

  console.log('Transformed Result:');
  console.log(`  Title: ${transformed1.executionResult.title}`);
  console.log(`  State: ${transformed1.executionResult.state}`);
  console.log(`  Duration: ${result1.duration}ms`);
  console.log(`  Start: ${transformed1.executionResult.startTime}`);
  console.log(`  End: ${transformed1.executionResult.endTime}`);
  console.log(`  Test Case URL: ${transformed1.executionResult.testCase.href}`);
  console.log(`  Warnings: ${transformed1.warnings.length}`);

  // Example 2: Failed test with error
  console.log('\n\nExample 2: Failed Test with Error');
  console.log('----------------------------------');

  const test2 = createMockTestCase('Login with invalid credentials');
  const error: TestError = {
    message: 'Expected element to be visible, but it was not found',
    stack: 'at Test.fn (login.spec.ts:25:10)\nat runTest (runner.ts:100:5)',
    value: 'Error',
  };
  const result2 = createMockTestResult('failed', 1500, 0, error);

  const transformed2 = transformer.transform(test2, result2, '7117', 'exec-002');

  console.log('Transformed Failed Result:');
  console.log(`  Title: ${transformed2.executionResult.title}`);
  console.log(`  State: ${transformed2.executionResult.state}`);
  console.log(`  Step Results: ${transformed2.executionResult.stepResults?.length || 0}`);
  
  const errorStep = transformed2.executionResult.stepResults?.find(
    (s) => s.description === 'Test Failure'
  );
  if (errorStep) {
    console.log(`  Error Step:`);
    console.log(`    Description: ${errorStep.description}`);
    console.log(`    Result: ${errorStep.result}`);
    console.log(`    Actual Result: ${errorStep.actualResult?.substring(0, 100)}...`);
  }

  // Example 3: Test with steps
  console.log('\n\nExample 3: Test with Steps');
  console.log('----------------------------------');

  const test3 = createMockTestCase('Complete checkout process');
  const steps = [
    createMockTestStep('Navigate to product page', 200),
    createMockTestStep('Add product to cart', 150),
    createMockTestStep('Proceed to checkout', 180),
    createMockTestStep('Enter shipping information', 250),
    createMockTestStep('Complete payment', 300),
  ];
  const result3 = createMockTestResult('passed', 1080, 0, undefined, steps);

  const transformed3 = transformer.transform(test3, result3, '3001', 'exec-003');

  console.log('Transformed Result with Steps:');
  console.log(`  Title: ${transformed3.executionResult.title}`);
  console.log(`  Total Steps: ${transformed3.executionResult.stepResults?.length || 0}`);
  
  transformed3.executionResult.stepResults?.forEach((step, index) => {
    console.log(`  Step ${index + 1}: ${step.description} - ${step.result}`);
  });

  // Example 4: Flaky test (passed after retry)
  console.log('\n\nExample 4: Flaky Test (Retry)');
  console.log('----------------------------------');

  const test4 = createMockTestCase('Flaky API test');
  const result4 = createMockTestResult('passed', 1200, 2); // Passed on retry 2

  const transformed4 = transformer.transform(test4, result4, '4001', 'exec-004');

  console.log('Transformed Flaky Test:');
  console.log(`  Title: ${transformed4.executionResult.title}`);
  console.log(`  State: ${transformed4.executionResult.state}`);
  console.log(`  Retry Count: ${result4.retry}`);
  
  const retryProp = transformed4.executionResult.properties?.find(
    (p) => p.propertyName === 'retry_count'
  );
  const flakyProp = transformed4.executionResult.properties?.find(
    (p) => p.propertyName === 'flaky'
  );
  console.log(`  Properties:`);
  console.log(`    retry_count: ${retryProp?.propertyValue}`);
  console.log(`    flaky: ${flakyProp?.propertyValue}`);

  // Example 5: Test with hierarchy
  console.log('\n\nExample 5: Test with Hierarchy');
  console.log('----------------------------------');

  const hierarchyTransformer = new ResultTransformer({
    baseUrl: 'https://jazz.net/sandbox01-qm',
    contextId: 'studera-project',
    tester: 'test-user@example.com',
    includeHierarchy: true,
  });

  const test5 = createMockTestCase(
    'should display error message',
    ['Authentication', 'Login', 'Negative Tests', 'should display error message']
  );
  const result5 = createMockTestResult('passed', 800);

  const transformed5 = hierarchyTransformer.transform(test5, result5, '5001', 'exec-005');

  console.log('Transformed Result with Hierarchy:');
  console.log(`  Title: ${transformed5.executionResult.title}`);

  // Example 6: Batch transformation
  console.log('\n\nExample 6: Batch Transformation');
  console.log('----------------------------------');

  const batchResults = [
    {
      test: createMockTestCase('Test 1'),
      result: createMockTestResult('passed', 1000),
      testCaseId: '1001',
      executionRecordId: 'exec-101',
    },
    {
      test: createMockTestCase('Test 2'),
      result: createMockTestResult('failed', 1500, 0, error),
      testCaseId: '1002',
      executionRecordId: 'exec-102',
    },
    {
      test: createMockTestCase('Test 3'),
      result: createMockTestResult('skipped', 0),
      testCaseId: '1003',
      executionRecordId: 'exec-103',
    },
    {
      test: createMockTestCase('Test 4'),
      result: createMockTestResult('passed', 1200, 1), // Flaky
      testCaseId: '1004',
      executionRecordId: 'exec-104',
    },
  ];

  const transformedBatch = transformer.transformBatch(batchResults);

  console.log(`Transformed ${transformedBatch.length} results`);
  
  const stats = transformer.getStatistics(transformedBatch);
  console.log('\nTransformation Statistics:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Passed: ${stats.passed}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Incomplete: ${stats.incomplete}`);
  console.log(`  Error: ${stats.error}`);
  console.log(`  Flaky: ${stats.flaky}`);
  console.log(`  With Warnings: ${stats.withWarnings}`);

  // Example 7: Custom formatters
  console.log('\n\nExample 7: Custom Formatters');
  console.log('----------------------------------');

  const customTransformer = new ResultTransformer({
    baseUrl: 'https://jazz.net/sandbox01-qm',
    contextId: 'studera-project',
    tester: 'test-user@example.com',
    errorFormatter: (error) => {
      return `[CUSTOM ERROR] ${error.message}\n\nThis error was formatted by a custom formatter.`;
    },
    stepTitleFormatter: (step, index) => {
      return `[Step ${index + 1}] ${step.title.toUpperCase()}`;
    },
  });

  const test7 = createMockTestCase('Custom formatting test');
  const customSteps = [createMockTestStep('navigate to page', 100)];
  const result7 = createMockTestResult('failed', 1000, 0, error, customSteps);

  const transformed7 = customTransformer.transform(test7, result7, '7001', 'exec-007');

  console.log('Custom Formatted Result:');
  console.log(`  Step Title: ${transformed7.executionResult.stepResults?.[0]?.description}`);
  
  const customErrorStep = transformed7.executionResult.stepResults?.find(
    (s) => s.description === 'Test Failure'
  );
  console.log(`  Error Format: ${customErrorStep?.actualResult?.substring(0, 80)}...`);

  // Example 8: Different test statuses
  console.log('\n\nExample 8: Different Test Statuses');
  console.log('----------------------------------');

  const statuses: Array<'passed' | 'failed' | 'skipped' | 'timedOut'> = [
    'passed',
    'failed',
    'skipped',
    'timedOut',
  ];

  statuses.forEach((status) => {
    const test = createMockTestCase(`Test with ${status} status`);
    const result = createMockTestResult(
      status,
      1000,
      0,
      status === 'failed' || status === 'timedOut' ? error : undefined
    );
    const transformed = transformer.transform(test, result, '8001', 'exec-008');

    console.log(`  ${status.toUpperCase()}: ${transformed.executionResult.state}`);
  });

  console.log('\n=== Example Complete ===');
}

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

// Made with Bob