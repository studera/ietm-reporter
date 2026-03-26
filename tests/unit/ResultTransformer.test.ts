/**
 * Unit tests for ResultTransformer
 */

import { ResultTransformer } from '../../src/transformer/ResultTransformer';
import { ExecutionState } from '../../src/models/ExecutionResult';
import type { TestCase, TestResult, TestStep, TestError } from '@playwright/test/reporter';

// Mock TestCase helper
function createMockTestCase(
  title: string,
  titlePath: string[] = [title],
  file: string = 'test.spec.ts',
  line: number = 1
): TestCase {
  return {
    title,
    annotations: [],
    location: { file, line, column: 0 },
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

// Mock TestResult helper
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
    startTime: new Date('2024-01-01T10:00:00.000Z'),
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

// Mock TestStep helper
function createMockTestStep(
  title: string,
  duration: number = 100,
  error?: TestError
): TestStep {
  return {
    title,
    category: 'test.step',
    duration,
    startTime: new Date('2024-01-01T10:00:00.000Z'),
    error,
    steps: [],
    titlePath: () => [title],
    annotations: [],
    attachments: [],
  } as TestStep;
}

// Mock TestError helper
function createMockError(message: string, stack?: string): TestError {
  return {
    message,
    stack,
    value: message,
  } as TestError;
}

describe('ResultTransformer', () => {
  const baseOptions = {
    baseUrl: 'https://example.com/qm',
    contextId: 'test-context',
    tester: 'test-user',
    machine: 'test-machine',
  };

  describe('transform', () => {
    it('should transform a passed test result', () => {
      const transformer = new ResultTransformer(baseOptions);
      const test = createMockTestCase('Login Test');
      const result = createMockTestResult('passed', 1000);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.title).toBe('Login Test');
      expect(transformed.executionResult.state).toBe(ExecutionState.PASSED);
      expect(transformed.executionResult.tester).toBe('test-user');
      expect(transformed.executionResult.machine).toBe('test-machine');
      expect(transformed.executionResult.testCase.href).toContain('2218');
      expect(transformed.executionResult.executionWorkItem.href).toContain('exec-001');
      expect(transformed.warnings).toHaveLength(0);
    });

    it('should transform a failed test result', () => {
      const transformer = new ResultTransformer(baseOptions);
      const test = createMockTestCase('Login Test');
      const error = createMockError('Expected true, got false');
      const result = createMockTestResult('failed', 1000, 0, error);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.state).toBe(ExecutionState.FAILED);
      expect(transformed.executionResult.stepResults).toBeDefined();
      expect(transformed.executionResult.stepResults?.length).toBeGreaterThan(0);
      
      const errorStep = transformed.executionResult.stepResults?.find(
        (s) => s.description === 'Test Failure'
      );
      expect(errorStep).toBeDefined();
      expect(errorStep?.actualResult).toContain('Expected true, got false');
    });

    it('should transform a skipped test result', () => {
      const transformer = new ResultTransformer(baseOptions);
      const test = createMockTestCase('Login Test');
      const result = createMockTestResult('skipped', 0);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.state).toBe(ExecutionState.INCOMPLETE);
    });

    it('should transform a timed out test result', () => {
      const transformer = new ResultTransformer(baseOptions);
      const test = createMockTestCase('Login Test');
      const result = createMockTestResult('timedOut', 30000);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.state).toBe(ExecutionState.ERROR);
    });

    it('should include test hierarchy in title', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        includeHierarchy: true,
      });
      const test = createMockTestCase('Login Test', ['Login Suite', 'Positive Tests', 'Login Test']);
      const result = createMockTestResult('passed', 1000);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.title).toBe('Login Suite > Positive Tests > Login Test');
    });

    it('should not include hierarchy when disabled', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        includeHierarchy: false,
      });
      const test = createMockTestCase('Login Test', ['Login Suite', 'Positive Tests', 'Login Test']);
      const result = createMockTestResult('passed', 1000);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.title).toBe('Login Test');
    });

    it('should handle retry information', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        includeRetryInfo: true,
      });
      const test = createMockTestCase('Flaky Test');
      const result = createMockTestResult('passed', 1000, 2);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.title).toContain('(Retry 2)');
      expect(transformed.executionResult.properties).toBeDefined();
      
      const retryProp = transformed.executionResult.properties?.find(
        (p) => p.propertyName === 'retry_count'
      );
      expect(retryProp?.propertyValue).toBe('2');

      const flakyProp = transformed.executionResult.properties?.find(
        (p) => p.propertyName === 'flaky'
      );
      expect(flakyProp?.propertyValue).toBe('true');
    });

    it('should transform test steps', () => {
      const transformer = new ResultTransformer(baseOptions);
      const test = createMockTestCase('Login Test');
      const steps = [
        createMockTestStep('Navigate to login page', 100),
        createMockTestStep('Enter credentials', 200),
        createMockTestStep('Click login button', 150),
      ];
      const result = createMockTestResult('passed', 450, 0, undefined, steps);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.stepResults).toHaveLength(3);
      expect(transformed.executionResult.stepResults?.[0]?.description).toBe('Navigate to login page');
      expect(transformed.executionResult.stepResults?.[1]?.description).toBe('Enter credentials');
      expect(transformed.executionResult.stepResults?.[2]?.description).toBe('Click login button');
      
      transformed.executionResult.stepResults?.forEach((step) => {
        expect(step.result).toBe(ExecutionState.PASSED);
        expect(step.tester).toBe('test-user');
      });
    });

    it('should handle failed steps', () => {
      const transformer = new ResultTransformer(baseOptions);
      const test = createMockTestCase('Login Test');
      const error = createMockError('Element not found');
      const steps = [
        createMockTestStep('Navigate to login page', 100),
        createMockTestStep('Enter credentials', 200, error),
      ];
      const result = createMockTestResult('failed', 300, 0, error, steps);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.stepResults).toBeDefined();
      const failedStep = transformed.executionResult.stepResults?.find(
        (s) => s.description === 'Enter credentials'
      );
      expect(failedStep?.result).toBe(ExecutionState.FAILED);
      expect(failedStep?.actualResult).toContain('Element not found');
    });

    it('should format error messages with stack traces', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        includeStackTraces: true,
      });
      const test = createMockTestCase('Login Test');
      const error = createMockError(
        'Assertion failed',
        'at Test.fn (test.spec.ts:10:5)\nat runTest (runner.ts:100:10)'
      );
      const result = createMockTestResult('failed', 1000, 0, error);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      const errorStep = transformed.executionResult.stepResults?.find(
        (s) => s.description === 'Test Failure'
      );
      expect(errorStep?.actualResult).toContain('Assertion failed');
      expect(errorStep?.actualResult).toContain('Stack trace:');
      expect(errorStep?.actualResult).toContain('test.spec.ts:10:5');
    });

    it('should not include stack traces when disabled', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        includeStackTraces: false,
      });
      const test = createMockTestCase('Login Test');
      const error = createMockError(
        'Assertion failed',
        'at Test.fn (test.spec.ts:10:5)'
      );
      const result = createMockTestResult('failed', 1000, 0, error);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      const errorStep = transformed.executionResult.stepResults?.find(
        (s) => s.description === 'Test Failure'
      );
      expect(errorStep?.actualResult).toContain('Assertion failed');
      expect(errorStep?.actualResult).not.toContain('Stack trace:');
    });

    it('should truncate long error messages', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        maxErrorLength: 100,
      });
      const test = createMockTestCase('Login Test');
      const longMessage = 'A'.repeat(200);
      const error = createMockError(longMessage);
      const result = createMockTestResult('failed', 1000, 0, error);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      const errorStep = transformed.executionResult.stepResults?.find(
        (s) => s.description === 'Test Failure'
      );
      expect(errorStep?.actualResult?.length).toBeLessThanOrEqual(120); // 100 + "... (truncated)"
      expect(errorStep?.actualResult).toContain('(truncated)');
    });

    it('should use custom error formatter', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        errorFormatter: (error) => `CUSTOM: ${error.message}`,
      });
      const test = createMockTestCase('Login Test');
      const error = createMockError('Test failed');
      const result = createMockTestResult('failed', 1000, 0, error);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      const errorStep = transformed.executionResult.stepResults?.find(
        (s) => s.description === 'Test Failure'
      );
      expect(errorStep?.actualResult).toBe('CUSTOM: Test failed');
    });

    it('should use custom step title formatter', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        stepTitleFormatter: (step, index) => `[${index + 1}] ${step.title.toUpperCase()}`,
      });
      const test = createMockTestCase('Login Test');
      const steps = [createMockTestStep('navigate to page', 100)];
      const result = createMockTestResult('passed', 100, 0, undefined, steps);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.stepResults?.[0]?.description).toBe('[1] NAVIGATE TO PAGE');
    });

    it('should calculate correct start and end times', () => {
      const transformer = new ResultTransformer(baseOptions);
      const test = createMockTestCase('Login Test');
      const result = createMockTestResult('passed', 5000);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      const startTime = new Date(transformed.executionResult.startTime);
      const endTime = new Date(transformed.executionResult.endTime);
      const duration = endTime.getTime() - startTime.getTime();

      expect(duration).toBe(5000);
    });
  });

  describe('transformBatch', () => {
    it('should transform multiple results', () => {
      const transformer = new ResultTransformer(baseOptions);
      const results = [
        {
          test: createMockTestCase('Test 1'),
          result: createMockTestResult('passed', 1000),
          testCaseId: '2218',
          executionRecordId: 'exec-001',
        },
        {
          test: createMockTestCase('Test 2'),
          result: createMockTestResult('failed', 2000, 0, createMockError('Failed')),
          testCaseId: '7117',
          executionRecordId: 'exec-002',
        },
      ];

      const transformed = transformer.transformBatch(results);

      expect(transformed).toHaveLength(2);
      expect(transformed[0]?.executionResult.state).toBe(ExecutionState.PASSED);
      expect(transformed[1]?.executionResult.state).toBe(ExecutionState.FAILED);
    });
  });

  describe('getStatistics', () => {
    it('should calculate transformation statistics', () => {
      const transformer = new ResultTransformer(baseOptions);
      const results = [
        {
          test: createMockTestCase('Test 1'),
          result: createMockTestResult('passed', 1000),
          testCaseId: '1',
          executionRecordId: 'exec-001',
        },
        {
          test: createMockTestCase('Test 2'),
          result: createMockTestResult('failed', 1000, 0, createMockError('Failed')),
          testCaseId: '2',
          executionRecordId: 'exec-002',
        },
        {
          test: createMockTestCase('Test 3'),
          result: createMockTestResult('skipped', 0),
          testCaseId: '3',
          executionRecordId: 'exec-003',
        },
        {
          test: createMockTestCase('Test 4'),
          result: createMockTestResult('passed', 1000, 2), // Flaky test
          testCaseId: '4',
          executionRecordId: 'exec-004',
        },
      ];

      const transformed = transformer.transformBatch(results);
      const stats = transformer.getStatistics(transformed);

      expect(stats.total).toBe(4);
      expect(stats.passed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.incomplete).toBe(1);
      expect(stats.flaky).toBe(1);
    });
  });

  describe('URL building', () => {
    it('should build correct test case URL with context', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        contextId: 'my-context',
      });
      const test = createMockTestCase('Test');
      const result = createMockTestResult('passed', 1000);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.testCase.href).toBe(
        'https://example.com/qm/service/my-context/com.ibm.rqm.planning.VersionedTestCase/2218'
      );
    });

    it('should build correct execution record URL with context', () => {
      const transformer = new ResultTransformer({
        ...baseOptions,
        contextId: 'my-context',
      });
      const test = createMockTestCase('Test');
      const result = createMockTestResult('passed', 1000);

      const transformed = transformer.transform(test, result, '2218', 'exec-001');

      expect(transformed.executionResult.executionWorkItem.href).toBe(
        'https://example.com/qm/service/my-context/com.ibm.rqm.execution.ExecutionWorkItem/exec-001'
      );
    });
  });
});

// Made with Bob