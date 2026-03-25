/**
 * Test Execution Record (TER) Model
 * Represents an IETM test execution work item
 */

export interface TestExecutionRecord {
  /** Execution record identifier */
  identifier: string;

  /** Execution record web ID (internal ID) */
  webId: string;

  /** Execution record title */
  title: string;

  /** Execution record description */
  description?: string;

  /** Execution record state */
  state?: string;

  /** Execution record owner */
  owner?: string;

  /** Execution record creator */
  creator?: string;

  /** Creation date */
  created?: string;

  /** Last modified date */
  modified?: string;

  /** Related test case */
  testCase: ResourceLink;

  /** Related test plan */
  testPlan?: ResourceLink;

  /** Related test suite */
  testSuite?: ResourceLink;

  /** Related iteration */
  iteration?: ResourceLink;

  /** Related test phase */
  testPhase?: ResourceLink;

  /** Execution variables */
  variables?: ExecutionVariable[];

  /** Execution weight */
  weight?: number;

  /** Execution order */
  executionOrder?: number;

  /** Custom attributes */
  customAttributes?: Record<string, string>;
}

export interface ExecutionVariable {
  /** Variable name */
  name: string;

  /** Variable value */
  value?: string;

  /** Variable type */
  type?: string;
}

import { ResourceLink } from './ExecutionResult';

export type { ResourceLink };

/**
 * Test Execution Record Query Result
 * Represents the result from OSLC query
 */
export interface TestExecutionRecordQueryResult {
  /** Total count of results */
  totalCount: number;

  /** Test execution records */
  executionRecords: TestExecutionRecord[];

  /** Next page URL (if paginated) */
  nextPage?: string;
}

/**
 * Helper function to extract execution record ID from URL
 */
export function extractExecutionRecordId(url: string): string | null {
  const match = url.match(/executionworkitem[:/](?:urn:com\.ibm\.rqm:executionworkitem:)?(\d+)/i);
  return match?.[1] ?? null;
}

/**
 * Helper function to build execution work item URL
 */
export function buildExecutionWorkItemUrl(
  baseUrl: string,
  contextId: string,
  executionRecordId: string
): string {
  return `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/executionworkitem/urn:com.ibm.rqm:executionworkitem:${executionRecordId}`;
}

/**
 * Helper function to validate test execution record
 */
export function isValidTestExecutionRecord(
  record: Partial<TestExecutionRecord>
): record is TestExecutionRecord {
  return !!(
    record.identifier &&
    record.webId &&
    record.title &&
    record.testCase
  );
}

/**
 * Helper function to filter execution records by test plan
 */
export function filterByTestPlan(
  records: TestExecutionRecord[],
  testPlanId: string
): TestExecutionRecord[] {
  return records.filter(record => {
    if (!record.testPlan) return false;
    const id = extractTestPlanId(record.testPlan.href);
    return id === testPlanId;
  });
}

/**
 * Helper function to filter execution records by iteration
 */
export function filterByIteration(
  records: TestExecutionRecord[],
  iterationId: string
): TestExecutionRecord[] {
  return records.filter(record => {
    if (!record.iteration) return false;
    const id = extractIterationId(record.iteration.href);
    return id === iterationId;
  });
}

/**
 * Helper function to extract test plan ID from URL
 */
function extractTestPlanId(url: string): string | null {
  const match = url.match(/testplan[:/](?:urn:com\.ibm\.rqm:testplan:)?(\d+)/i);
  return match?.[1] ?? null;
}

/**
 * Helper function to extract iteration ID from URL
 */
function extractIterationId(url: string): string | null {
  const match = url.match(/iteration[:/](?:urn:com\.ibm\.rqm:iteration:)?(\d+)/i);
  return match?.[1] ?? null;
}

// Made with Bob