/**
 * Execution Result Model
 * Represents an IETM test execution result
 */

export interface ExecutionResult {
  /** Title of the execution result */
  title: string;

  /** Username of the creator */
  creator: string;

  /** Username of the owner */
  owner: string;

  /** Execution state/verdict */
  state: ExecutionState;

  /** Machine name where test was executed */
  machine?: string;

  /** Number of iterations (usually "1") */
  iterations?: string;

  /** Start time in ISO 8601 UTC format */
  startTime: string;

  /** End time in ISO 8601 UTC format */
  endTime: string;

  /** Test weight (usually "100") */
  weight?: string;

  /** Username of the tester */
  tester: string;

  /** Link to test script (optional) */
  testScript?: ResourceLink;

  /** Link to test case (required) */
  testCase: ResourceLink;

  /** Link to test execution record/work item (required) */
  executionWorkItem: ResourceLink;

  /** Test case variables */
  variables?: Variable[];

  /** Adapter ID for automated tests */
  adapterId?: string;

  /** Array of step results */
  stepResults?: StepResult[];

  /** Additional properties */
  properties?: Property[];
}

export interface StepResult {
  /** Step index/number */
  stepIndex: number;

  /** Start time in ISO 8601 UTC format */
  startTime: string;

  /** End time in ISO 8601 UTC format */
  endTime: string;

  /** Step result state */
  result: ExecutionState;

  /** Step description */
  description?: string;

  /** Step type */
  stepType?: string;

  /** Username of the tester */
  tester: string;

  /** Link to step attachment (optional) */
  stepAttachment?: ResourceLink;

  /** Step properties (e.g., line number) */
  properties?: Property[];

  /** Actual result text */
  actualResult?: string;

  /** Expected result text */
  expectedResult?: string;
}

export interface ResourceLink {
  /** Resource URL/href */
  href: string;

  /** Resource title (optional) */
  title?: string;
}

export interface Variable {
  /** Variable name */
  name: string;

  /** Variable value */
  value: string;
}

export interface Property {
  /** Property name */
  propertyName: string;

  /** Property value */
  propertyValue: string;
}

/**
 * IETM Execution States
 * Maps to com.ibm.rqm.execution.common.state.*
 */
export enum ExecutionState {
  PASSED = 'com.ibm.rqm.execution.common.state.passed',
  FAILED = 'com.ibm.rqm.execution.common.state.failed',
  INCOMPLETE = 'com.ibm.rqm.execution.common.state.incomplete',
  INCONCLUSIVE = 'com.ibm.rqm.execution.common.state.inconclusive',
  BLOCKED = 'com.ibm.rqm.execution.common.state.blocked',
  DEFERRED = 'com.ibm.rqm.execution.common.state.deferred',
  ERROR = 'com.ibm.rqm.execution.common.state.error',
  IN_PROGRESS = 'com.ibm.rqm.execution.common.state.inprogress',
  PAUSED = 'com.ibm.rqm.execution.common.state.paused',
  PERM_FAILED = 'com.ibm.rqm.execution.common.state.perm_failed',
  PART_BLOCKED = 'com.ibm.rqm.execution.common.state.part_blocked',
}

/**
 * Step Types
 */
export enum StepType {
  EXECUTION = 'com.ibm.rqm.execution.common.elementtype.execution',
  SETUP = 'com.ibm.rqm.execution.common.elementtype.setup',
  TEARDOWN = 'com.ibm.rqm.execution.common.elementtype.teardown',
}

/**
 * Helper function to map Playwright test status to IETM execution state
 */
export function mapPlaywrightStatusToState(status: string): ExecutionState {
  switch (status.toLowerCase()) {
    case 'passed':
      return ExecutionState.PASSED;
    case 'failed':
      return ExecutionState.FAILED;
    case 'skipped':
      return ExecutionState.INCOMPLETE;
    case 'timedout':
      return ExecutionState.ERROR;
    default:
      return ExecutionState.INCONCLUSIVE;
  }
}

/**
 * Helper function to format date to ISO 8601 UTC format
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Helper function to create a resource link
 */
export function createResourceLink(href: string, title?: string): ResourceLink {
  return { href, title };
}

// Made with Bob