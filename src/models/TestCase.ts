/**
 * Test Case Model
 * Represents an IETM test case
 */

export interface TestCase {
  /** Test case identifier */
  identifier: string;

  /** Test case web ID (internal ID) */
  webId: string;

  /** Test case title */
  title: string;

  /** Test case description */
  description?: string;

  /** Test case state */
  state?: string;

  /** Test case owner */
  owner?: string;

  /** Test case creator */
  creator?: string;

  /** Creation date */
  created?: string;

  /** Last modified date */
  modified?: string;

  /** Test case category */
  category?: Category[];

  /** Test case weight */
  weight?: number;

  /** Test script reference */
  testScript?: ResourceLink;

  /** Test case variables */
  variables?: TestCaseVariable[];

  /** Test case steps */
  steps?: TestStep[];

  /** Related test plans */
  testPlans?: ResourceLink[];

  /** Related test suites */
  testSuites?: ResourceLink[];

  /** Custom attributes */
  customAttributes?: Record<string, string>;
}

export interface TestStep {
  /** Step index */
  index: number;

  /** Step title/name */
  title?: string;

  /** Step description */
  description: string;

  /** Expected result */
  expectedResult: string;

  /** Step type */
  type?: string;

  /** Step weight */
  weight?: number;
}

export interface TestCaseVariable {
  /** Variable name */
  name: string;

  /** Variable value */
  value?: string;

  /** Variable type */
  type?: string;

  /** Variable description */
  description?: string;
}

export interface Category {
  /** Category term */
  term: string;

  /** Category value */
  value: string;
}

import { ResourceLink } from './ExecutionResult';

export type { ResourceLink };

/**
 * Test Case Query Result
 * Represents the result from OSLC query
 */
export interface TestCaseQueryResult {
  /** Total count of results */
  totalCount: number;

  /** Test cases */
  testCases: TestCase[];

  /** Next page URL (if paginated) */
  nextPage?: string;
}

/**
 * Helper function to extract test case ID from URL
 */
export function extractTestCaseId(url: string): string | null {
  const match = url.match(/testcase[:/](?:urn:com\.ibm\.rqm:testcase:)?(\d+)/i);
  return match?.[1] ?? null;
}

/**
 * Helper function to build test case URL
 */
export function buildTestCaseUrl(baseUrl: string, contextId: string, testCaseId: string): string {
  return `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/testcase/urn:com.ibm.rqm:testcase:${testCaseId}`;
}

/**
 * Helper function to validate test case
 */
export function isValidTestCase(testCase: Partial<TestCase>): testCase is TestCase {
  return !!(
    testCase.identifier &&
    testCase.webId &&
    testCase.title
  );
}

// Made with Bob