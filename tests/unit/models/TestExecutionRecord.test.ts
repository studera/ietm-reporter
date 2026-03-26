/**
 * Unit tests for TestExecutionRecord model
 */

import {
  TestExecutionRecord,
  ExecutionVariable,
  TestExecutionRecordQueryResult,
  extractExecutionRecordId,
  buildExecutionWorkItemUrl,
  isValidTestExecutionRecord,
  filterByTestPlan,
  filterByIteration,
} from '../../../src/models/TestExecutionRecord';

describe('TestExecutionRecord Model', () => {
  describe('extractExecutionRecordId()', () => {
    it('should extract ID from standard executionworkitem URL', () => {
      const url = 'https://example.com/executionworkitem/123';
      expect(extractExecutionRecordId(url)).toBe('123');
    });

    it('should extract ID from URN format', () => {
      const url =
        'https://example.com/executionworkitem/urn:com.ibm.rqm:executionworkitem:456';
      expect(extractExecutionRecordId(url)).toBe('456');
    });

    it('should extract ID with colon separator', () => {
      const url = 'https://example.com/executionworkitem:789';
      expect(extractExecutionRecordId(url)).toBe('789');
    });

    it('should be case-insensitive', () => {
      const url = 'https://example.com/ExecutionWorkItem/123';
      expect(extractExecutionRecordId(url)).toBe('123');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid/path';
      expect(extractExecutionRecordId(url)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractExecutionRecordId('')).toBeNull();
    });
  });

  describe('buildExecutionWorkItemUrl()', () => {
    it('should build correct execution work item URL', () => {
      const url = buildExecutionWorkItemUrl(
        'https://example.com/qm',
        'project123',
        '456'
      );
      expect(url).toBe(
        'https://example.com/qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/project123/executionworkitem/urn:com.ibm.rqm:executionworkitem:456'
      );
    });

    it('should handle baseUrl without trailing slash', () => {
      const url = buildExecutionWorkItemUrl(
        'https://example.com/qm',
        'project123',
        '456'
      );
      expect(url).toContain('/qm/service/');
    });

    it('should handle numeric execution record ID', () => {
      const url = buildExecutionWorkItemUrl(
        'https://example.com/qm',
        'project123',
        '123'
      );
      expect(url).toContain(':executionworkitem:123');
    });
  });

  describe('isValidTestExecutionRecord()', () => {
    it('should return true for valid execution record', () => {
      const record: TestExecutionRecord = {
        identifier: 'ER-001',
        webId: '123',
        title: 'Test Execution',
        testCase: { href: 'https://example.com/testcase/1' },
      };

      expect(isValidTestExecutionRecord(record)).toBe(true);
    });

    it('should return false if identifier is missing', () => {
      const record = {
        webId: '123',
        title: 'Test Execution',
        testCase: { href: 'https://example.com/testcase/1' },
      };

      expect(isValidTestExecutionRecord(record)).toBe(false);
    });

    it('should return false if webId is missing', () => {
      const record = {
        identifier: 'ER-001',
        title: 'Test Execution',
        testCase: { href: 'https://example.com/testcase/1' },
      };

      expect(isValidTestExecutionRecord(record)).toBe(false);
    });

    it('should return false if title is missing', () => {
      const record = {
        identifier: 'ER-001',
        webId: '123',
        testCase: { href: 'https://example.com/testcase/1' },
      };

      expect(isValidTestExecutionRecord(record)).toBe(false);
    });

    it('should return false if testCase is missing', () => {
      const record = {
        identifier: 'ER-001',
        webId: '123',
        title: 'Test Execution',
      };

      expect(isValidTestExecutionRecord(record)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isValidTestExecutionRecord({})).toBe(false);
    });
  });

  describe('filterByTestPlan()', () => {
    const records: TestExecutionRecord[] = [
      {
        identifier: 'ER-001',
        webId: '1',
        title: 'Execution 1',
        testCase: { href: 'https://example.com/testcase/1' },
        testPlan: { href: 'https://example.com/testplan/100' },
      },
      {
        identifier: 'ER-002',
        webId: '2',
        title: 'Execution 2',
        testCase: { href: 'https://example.com/testcase/2' },
        testPlan: { href: 'https://example.com/testplan/200' },
      },
      {
        identifier: 'ER-003',
        webId: '3',
        title: 'Execution 3',
        testCase: { href: 'https://example.com/testcase/3' },
        // No test plan
      },
    ];

    it('should filter records by test plan ID', () => {
      const filtered = filterByTestPlan(records, '100');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.identifier).toBe('ER-001');
    });

    it('should return empty array if no matches', () => {
      const filtered = filterByTestPlan(records, '999');
      expect(filtered).toHaveLength(0);
    });

    it('should handle records without test plan', () => {
      const filtered = filterByTestPlan(records, '100');
      expect(filtered).toHaveLength(1);
      expect(filtered.some((r) => r.identifier === 'ER-003')).toBe(false);
    });

    it('should return empty array for empty input', () => {
      const filtered = filterByTestPlan([], '100');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('filterByIteration()', () => {
    const records: TestExecutionRecord[] = [
      {
        identifier: 'ER-001',
        webId: '1',
        title: 'Execution 1',
        testCase: { href: 'https://example.com/testcase/1' },
        iteration: { href: 'https://example.com/iteration/100' },
      },
      {
        identifier: 'ER-002',
        webId: '2',
        title: 'Execution 2',
        testCase: { href: 'https://example.com/testcase/2' },
        iteration: { href: 'https://example.com/iteration/200' },
      },
      {
        identifier: 'ER-003',
        webId: '3',
        title: 'Execution 3',
        testCase: { href: 'https://example.com/testcase/3' },
        // No iteration
      },
    ];

    it('should filter records by iteration ID', () => {
      const filtered = filterByIteration(records, '100');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.identifier).toBe('ER-001');
    });

    it('should return empty array if no matches', () => {
      const filtered = filterByIteration(records, '999');
      expect(filtered).toHaveLength(0);
    });

    it('should handle records without iteration', () => {
      const filtered = filterByIteration(records, '100');
      expect(filtered).toHaveLength(1);
      expect(filtered.some((r) => r.identifier === 'ER-003')).toBe(false);
    });

    it('should return empty array for empty input', () => {
      const filtered = filterByIteration([], 'sprint1');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('TestExecutionRecord interface', () => {
    it('should accept minimal valid execution record', () => {
      const record: TestExecutionRecord = {
        identifier: 'ER-001',
        webId: '123',
        title: 'Test Execution',
        testCase: { href: 'https://example.com/testcase/1' },
      };

      expect(record.identifier).toBe('ER-001');
      expect(record.webId).toBe('123');
      expect(record.title).toBe('Test Execution');
      expect(record.testCase.href).toBe('https://example.com/testcase/1');
    });

    it('should accept execution record with all fields', () => {
      const record: TestExecutionRecord = {
        identifier: 'ER-001',
        webId: '123',
        title: 'Test Execution',
        description: 'Execute login test',
        state: 'In Progress',
        testCase: { href: 'https://example.com/testcase/1' },
        testPlan: { href: 'https://example.com/testplan/1' },
        testSuite: { href: 'https://example.com/testsuite/1' },
        iteration: { href: 'https://example.com/iteration/sprint1' },
        owner: 'testuser',
        creator: 'testuser',
        created: '2024-01-01T00:00:00Z',
        modified: '2024-01-15T00:00:00Z',
        weight: 100,
        variables: [{ name: 'username', value: 'testuser' }],
        customAttributes: { priority: 'high' },
      };

      expect(record.description).toBe('Execute login test');
      expect(record.state).toBe('In Progress');
      expect(record.weight).toBe(100);
      expect(record.testPlan).toBeDefined();
      expect(record.iteration).toBeDefined();
      expect(record.variables).toHaveLength(1);
    });
  });

  describe('ExecutionVariable interface', () => {
    it('should accept variable with name only', () => {
      const variable: ExecutionVariable = {
        name: 'username',
      };

      expect(variable.name).toBe('username');
      expect(variable.value).toBeUndefined();
    });

    it('should accept variable with all fields', () => {
      const variable: ExecutionVariable = {
        name: 'username',
        value: 'testuser',
        type: 'string',
      };

      expect(variable.name).toBe('username');
      expect(variable.value).toBe('testuser');
      expect(variable.type).toBe('string');
    });
  });

  describe('TestExecutionRecordQueryResult interface', () => {
    it('should accept query result with execution records', () => {
      const result: TestExecutionRecordQueryResult = {
        totalCount: 2,
        executionRecords: [
          {
            identifier: 'ER-001',
            webId: '123',
            title: 'Execution 1',
            testCase: { href: 'https://example.com/testcase/1' },
          },
          {
            identifier: 'ER-002',
            webId: '124',
            title: 'Execution 2',
            testCase: { href: 'https://example.com/testcase/2' },
          },
        ],
      };

      expect(result.totalCount).toBe(2);
      expect(result.executionRecords).toHaveLength(2);
      expect(result.nextPage).toBeUndefined();
    });

    it('should accept query result with pagination', () => {
      const result: TestExecutionRecordQueryResult = {
        totalCount: 100,
        executionRecords: [
          {
            identifier: 'ER-001',
            webId: '123',
            title: 'Execution 1',
            testCase: { href: 'https://example.com/testcase/1' },
          },
        ],
        nextPage: 'https://example.com/query?page=2',
      };

      expect(result.totalCount).toBe(100);
      expect(result.executionRecords).toHaveLength(1);
      expect(result.nextPage).toBe('https://example.com/query?page=2');
    });

    it('should accept empty result', () => {
      const result: TestExecutionRecordQueryResult = {
        totalCount: 0,
        executionRecords: [],
      };

      expect(result.totalCount).toBe(0);
      expect(result.executionRecords).toHaveLength(0);
    });
  });
});

// Made with Bob