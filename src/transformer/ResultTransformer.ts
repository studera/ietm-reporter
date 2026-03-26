/**
 * Result Transformer
 * Converts Playwright test results to IETM ExecutionResult format
 */

import type { TestCase, TestResult, TestStep, TestError } from '@playwright/test/reporter';
import {
  ExecutionResult,
  ExecutionState,
  StepResult,
  StepType,
  mapPlaywrightStatusToState,
  formatDateToISO,
  createResourceLink,
} from '../models/ExecutionResult';

export interface TransformOptions {
  /** Base URL for IETM server */
  baseUrl: string;

  /** Project area/context ID */
  contextId?: string;

  /** Default tester username */
  tester: string;

  /** Machine/environment name */
  machine?: string;

  /** Include test hierarchy in title */
  includeHierarchy?: boolean;

  /** Include retry information */
  includeRetryInfo?: boolean;

  /** Maximum error message length */
  maxErrorLength?: number;

  /** Include stack traces in errors */
  includeStackTraces?: boolean;

  /** Custom error formatter */
  errorFormatter?: (error: TestError) => string;

  /** Custom step title formatter */
  stepTitleFormatter?: (step: TestStep, index: number) => string;
}

export interface TransformResult {
  /** Transformed execution result */
  executionResult: ExecutionResult;

  /** Original Playwright test */
  test: TestCase;

  /** Original Playwright result */
  result: TestResult;

  /** Warnings during transformation */
  warnings: string[];
}

export class ResultTransformer {
  private options: Required<TransformOptions>;

  constructor(options: TransformOptions) {
    this.options = {
      baseUrl: options.baseUrl,
      contextId: options.contextId || '',
      tester: options.tester,
      machine: options.machine || this.getDefaultMachine(),
      includeHierarchy: options.includeHierarchy !== false,
      includeRetryInfo: options.includeRetryInfo !== false,
      maxErrorLength: options.maxErrorLength || 5000,
      includeStackTraces: options.includeStackTraces !== false,
      errorFormatter: options.errorFormatter || this.defaultErrorFormatter.bind(this),
      stepTitleFormatter: options.stepTitleFormatter || this.defaultStepTitleFormatter.bind(this),
    };
  }

  /**
   * Transform a Playwright test result to IETM ExecutionResult
   */
  transform(
    test: TestCase,
    result: TestResult,
    testCaseId: string,
    executionRecordId: string
  ): TransformResult {
    const warnings: string[] = [];

    // Calculate times
    const startTime = new Date(result.startTime);
    const endTime = new Date(result.startTime.getTime() + result.duration);

    // Build title with hierarchy if enabled
    const title = this.buildTitle(test, result);

    // Map status to IETM state
    const state = this.mapStatus(result.status, result.retry);

    // Build test case and execution record URLs
    const testCaseUrl = this.buildTestCaseUrl(testCaseId);
    const executionRecordUrl = this.buildExecutionRecordUrl(executionRecordId);

    // Create base execution result
    const executionResult: ExecutionResult = {
      title,
      creator: this.options.tester,
      owner: this.options.tester,
      state,
      machine: this.options.machine,
      iterations: '1',
      startTime: formatDateToISO(startTime),
      endTime: formatDateToISO(endTime),
      weight: '100',
      tester: this.options.tester,
      testCase: createResourceLink(testCaseUrl),
      executionWorkItem: createResourceLink(executionRecordUrl),
      adapterId: 'playwright-ietm-client',
    };

    // Add step results
    if (result.steps && result.steps.length > 0) {
      executionResult.stepResults = this.transformSteps(result.steps, warnings);
    }

    // Add error information for failed tests
    if (result.error) {
      this.addErrorStep(executionResult, result.error, startTime, endTime);
    }

    // Add retry information if applicable
    if (this.options.includeRetryInfo && result.retry > 0) {
      this.addRetryInfo(executionResult, result.retry);
    }

    return {
      executionResult,
      test,
      result,
      warnings,
    };
  }

  /**
   * Transform multiple test results
   */
  transformBatch(
    results: Array<{
      test: TestCase;
      result: TestResult;
      testCaseId: string;
      executionRecordId: string;
    }>
  ): TransformResult[] {
    return results.map((item) =>
      this.transform(item.test, item.result, item.testCaseId, item.executionRecordId)
    );
  }

  /**
   * Build title with optional hierarchy
   */
  private buildTitle(test: TestCase, result: TestResult): string {
    let title = test.title;

    if (this.options.includeHierarchy) {
      const hierarchy = test.titlePath();
      if (hierarchy.length > 1) {
        // Join all parts except the last one (which is the test title itself)
        const path = hierarchy.slice(0, -1).join(' > ');
        title = `${path} > ${title}`;
      }
    }

    // Add retry suffix if applicable
    if (this.options.includeRetryInfo && result.retry > 0) {
      title += ` (Retry ${result.retry})`;
    }

    return title;
  }

  /**
   * Map Playwright status to IETM state, considering retries
   */
  private mapStatus(status: string, retry: number): ExecutionState {
    // If this is a retry and it passed, it was flaky
    if (status === 'passed' && retry > 0) {
      // Still mark as passed, but we could add a property to indicate flakiness
      return ExecutionState.PASSED;
    }

    return mapPlaywrightStatusToState(status);
  }

  /**
   * Transform Playwright steps to IETM step results
   */
  private transformSteps(steps: TestStep[], warnings: string[]): StepResult[] {
    const stepResults: StepResult[] = [];

    steps.forEach((step, index) => {
      try {
        const stepStart = new Date(step.startTime);
        const stepEnd = new Date(step.startTime.getTime() + step.duration);
        const stepState = step.error ? ExecutionState.FAILED : ExecutionState.PASSED;

        const stepResult: StepResult = {
          stepIndex: index + 1,
          startTime: formatDateToISO(stepStart),
          endTime: formatDateToISO(stepEnd),
          result: stepState,
          description: this.options.stepTitleFormatter(step, index),
          stepType: this.determineStepType(step),
          tester: this.options.tester,
        };

        // Add error information if step failed
        if (step.error) {
          stepResult.actualResult = this.options.errorFormatter(step.error);
        }

        stepResults.push(stepResult);
      } catch (error) {
        warnings.push(`Failed to transform step ${index + 1}: ${error}`);
      }
    });

    return stepResults;
  }

  /**
   * Add error step for failed tests
   */
  private addErrorStep(
    executionResult: ExecutionResult,
    error: TestError,
    startTime: Date,
    endTime: Date
  ): void {
    if (!executionResult.stepResults) {
      executionResult.stepResults = [];
    }

    const errorStep: StepResult = {
      stepIndex: executionResult.stepResults.length + 1,
      startTime: formatDateToISO(startTime),
      endTime: formatDateToISO(endTime),
      result: ExecutionState.FAILED,
      description: 'Test Failure',
      stepType: StepType.EXECUTION,
      tester: this.options.tester,
      actualResult: this.options.errorFormatter(error),
    };

    executionResult.stepResults.push(errorStep);
  }

  /**
   * Add retry information as properties
   */
  private addRetryInfo(executionResult: ExecutionResult, retryCount: number): void {
    if (!executionResult.properties) {
      executionResult.properties = [];
    }

    executionResult.properties.push({
      propertyName: 'retry_count',
      propertyValue: retryCount.toString(),
    });

    executionResult.properties.push({
      propertyName: 'flaky',
      propertyValue: (retryCount > 0 && executionResult.state === ExecutionState.PASSED).toString(),
    });
  }

  /**
   * Default error formatter
   */
  private defaultErrorFormatter(error: TestError): string {
    let formatted = error.message || 'Unknown error';

    // Truncate if too long
    if (formatted.length > this.options.maxErrorLength) {
      formatted = formatted.substring(0, this.options.maxErrorLength) + '... (truncated)';
    }

    // Add stack trace if enabled
    if (this.options.includeStackTraces && error.stack) {
      let stack = error.stack;
      
      // Truncate stack if combined length is too long
      const remainingLength = this.options.maxErrorLength - formatted.length - 20;
      if (stack.length > remainingLength) {
        stack = stack.substring(0, remainingLength) + '... (truncated)';
      }

      formatted += '\n\nStack trace:\n' + stack;
    }

    return formatted;
  }

  /**
   * Default step title formatter
   */
  private defaultStepTitleFormatter(step: TestStep, index: number): string {
    return step.title || `Step ${index + 1}`;
  }

  /**
   * Determine step type based on step title
   */
  private determineStepType(step: TestStep): string {
    const title = step.title.toLowerCase();

    if (title.includes('before') || title.includes('setup')) {
      return StepType.SETUP;
    }

    if (title.includes('after') || title.includes('teardown') || title.includes('cleanup')) {
      return StepType.TEARDOWN;
    }

    return StepType.EXECUTION;
  }

  /**
   * Build test case URL
   */
  private buildTestCaseUrl(testCaseId: string): string {
    const contextPart = this.options.contextId ? `/${this.options.contextId}` : '';
    return `${this.options.baseUrl}/service${contextPart}/com.ibm.rqm.planning.VersionedTestCase/${testCaseId}`;
  }

  /**
   * Build execution record URL
   */
  private buildExecutionRecordUrl(executionRecordId: string): string {
    const contextPart = this.options.contextId ? `/${this.options.contextId}` : '';
    return `${this.options.baseUrl}/service${contextPart}/com.ibm.rqm.execution.ExecutionWorkItem/${executionRecordId}`;
  }

  /**
   * Get default machine name
   */
  private getDefaultMachine(): string {
    return process.env.HOSTNAME || process.env.COMPUTERNAME || 'unknown';
  }

  /**
   * Get transformation statistics
   */
  getStatistics(results: TransformResult[]): {
    total: number;
    passed: number;
    failed: number;
    incomplete: number;
    error: number;
    flaky: number;
    withWarnings: number;
  } {
    return {
      total: results.length,
      passed: results.filter((r) => r.executionResult.state === ExecutionState.PASSED).length,
      failed: results.filter((r) => r.executionResult.state === ExecutionState.FAILED).length,
      incomplete: results.filter((r) => r.executionResult.state === ExecutionState.INCOMPLETE).length,
      error: results.filter((r) => r.executionResult.state === ExecutionState.ERROR).length,
      flaky: results.filter((r) => 
        r.result.retry > 0 && r.executionResult.state === ExecutionState.PASSED
      ).length,
      withWarnings: results.filter((r) => r.warnings.length > 0).length,
    };
  }
}

// Made with Bob