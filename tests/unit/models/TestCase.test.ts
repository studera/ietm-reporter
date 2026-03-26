/**
 * Unit tests for TestCase model
 */

import {
  TestCase,
  TestStep,
  TestCaseVariable,
  Category,
  TestCaseQueryResult,
  extractTestCaseId,
  buildTestCaseUrl,
  isValidTestCase,
} from '../../../src/models/TestCase';

describe('TestCase Model', () => {
  describe('extractTestCaseId()', () => {
    it('should extract ID from standard testcase URL', () => {
      const url = 'https://example.com/testcase/123';
      expect(extractTestCaseId(url)).toBe('123');
    });

    it('should extract ID from URN format', () => {
      const url = 'https://example.com/testcase/urn:com.ibm.rqm:testcase:456';
      expect(extractTestCaseId(url)).toBe('456');
    });

    it('should extract ID with colon separator', () => {
      const url = 'https://example.com/testcase:789';
      expect(extractTestCaseId(url)).toBe('789');
    });

    it('should be case-insensitive', () => {
      const url = 'https://example.com/TestCase/123';
      expect(extractTestCaseId(url)).toBe('123');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid/path';
      expect(extractTestCaseId(url)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractTestCaseId('')).toBeNull();
    });
  });

  describe('buildTestCaseUrl()', () => {
    it('should build correct test case URL', () => {
      const url = buildTestCaseUrl('https://example.com/qm', 'project123', '456');
      expect(url).toBe(
        'https://example.com/qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/project123/testcase/urn:com.ibm.rqm:testcase:456'
      );
    });

    it('should handle baseUrl without trailing slash', () => {
      const url = buildTestCaseUrl('https://example.com/qm', 'project123', '456');
      expect(url).toContain('/qm/service/');
    });

    it('should handle numeric test case ID', () => {
      const url = buildTestCaseUrl('https://example.com/qm', 'project123', '123');
      expect(url).toContain(':testcase:123');
    });
  });

  describe('isValidTestCase()', () => {
    it('should return true for valid test case', () => {
      const testCase: TestCase = {
        identifier: 'TC-001',
        webId: '123',
        title: 'Test Case Title',
      };

      expect(isValidTestCase(testCase)).toBe(true);
    });

    it('should return false if identifier is missing', () => {
      const testCase = {
        webId: '123',
        title: 'Test Case Title',
      };

      expect(isValidTestCase(testCase)).toBe(false);
    });

    it('should return false if webId is missing', () => {
      const testCase = {
        identifier: 'TC-001',
        title: 'Test Case Title',
      };

      expect(isValidTestCase(testCase)).toBe(false);
    });

    it('should return false if title is missing', () => {
      const testCase = {
        identifier: 'TC-001',
        webId: '123',
      };

      expect(isValidTestCase(testCase)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isValidTestCase({})).toBe(false);
    });

    it('should return true even with optional fields missing', () => {
      const testCase: TestCase = {
        identifier: 'TC-001',
        webId: '123',
        title: 'Test Case Title',
        // Optional fields omitted
      };

      expect(isValidTestCase(testCase)).toBe(true);
    });
  });

  describe('TestCase interface', () => {
    it('should accept minimal valid test case', () => {
      const testCase: TestCase = {
        identifier: 'TC-001',
        webId: '123',
        title: 'Login Test',
      };

      expect(testCase.identifier).toBe('TC-001');
      expect(testCase.webId).toBe('123');
      expect(testCase.title).toBe('Login Test');
    });

    it('should accept test case with all fields', () => {
      const testCase: TestCase = {
        identifier: 'TC-001',
        webId: '123',
        title: 'Login Test',
        description: 'Test user login functionality',
        state: 'Approved',
        owner: 'testuser',
        creator: 'testuser',
        created: '2024-01-01T00:00:00Z',
        modified: '2024-01-15T00:00:00Z',
        weight: 100,
        category: [{ term: 'type', value: 'functional' }],
        testScript: { href: 'https://example.com/script/1' },
        variables: [{ name: 'username', value: 'testuser' }],
        steps: [
          {
            index: 1,
            description: 'Open login page',
            expectedResult: 'Login page displayed',
          },
        ],
        testPlans: [{ href: 'https://example.com/testplan/1' }],
        testSuites: [{ href: 'https://example.com/testsuite/1' }],
        customAttributes: { priority: 'high' },
      };

      expect(testCase.description).toBe('Test user login functionality');
      expect(testCase.state).toBe('Approved');
      expect(testCase.weight).toBe(100);
      expect(testCase.category).toHaveLength(1);
      expect(testCase.steps).toHaveLength(1);
    });
  });

  describe('TestStep interface', () => {
    it('should accept valid test step', () => {
      const step: TestStep = {
        index: 1,
        description: 'Click login button',
        expectedResult: 'User is logged in',
      };

      expect(step.index).toBe(1);
      expect(step.description).toBe('Click login button');
      expect(step.expectedResult).toBe('User is logged in');
    });

    it('should accept test step with optional fields', () => {
      const step: TestStep = {
        index: 1,
        title: 'Login Step',
        description: 'Click login button',
        expectedResult: 'User is logged in',
        type: 'execution',
        weight: 50,
      };

      expect(step.title).toBe('Login Step');
      expect(step.type).toBe('execution');
      expect(step.weight).toBe(50);
    });
  });

  describe('TestCaseVariable interface', () => {
    it('should accept variable with name only', () => {
      const variable: TestCaseVariable = {
        name: 'username',
      };

      expect(variable.name).toBe('username');
      expect(variable.value).toBeUndefined();
    });

    it('should accept variable with all fields', () => {
      const variable: TestCaseVariable = {
        name: 'username',
        value: 'testuser',
        type: 'string',
        description: 'Test username',
      };

      expect(variable.name).toBe('username');
      expect(variable.value).toBe('testuser');
      expect(variable.type).toBe('string');
      expect(variable.description).toBe('Test username');
    });
  });

  describe('Category interface', () => {
    it('should accept valid category', () => {
      const category: Category = {
        term: 'type',
        value: 'functional',
      };

      expect(category.term).toBe('type');
      expect(category.value).toBe('functional');
    });
  });

  describe('TestCaseQueryResult interface', () => {
    it('should accept query result with test cases', () => {
      const result: TestCaseQueryResult = {
        totalCount: 2,
        testCases: [
          {
            identifier: 'TC-001',
            webId: '123',
            title: 'Test 1',
          },
          {
            identifier: 'TC-002',
            webId: '124',
            title: 'Test 2',
          },
        ],
      };

      expect(result.totalCount).toBe(2);
      expect(result.testCases).toHaveLength(2);
      expect(result.nextPage).toBeUndefined();
    });

    it('should accept query result with pagination', () => {
      const result: TestCaseQueryResult = {
        totalCount: 100,
        testCases: [
          {
            identifier: 'TC-001',
            webId: '123',
            title: 'Test 1',
          },
        ],
        nextPage: 'https://example.com/query?page=2',
      };

      expect(result.totalCount).toBe(100);
      expect(result.testCases).toHaveLength(1);
      expect(result.nextPage).toBe('https://example.com/query?page=2');
    });

    it('should accept empty result', () => {
      const result: TestCaseQueryResult = {
        totalCount: 0,
        testCases: [],
      };

      expect(result.totalCount).toBe(0);
      expect(result.testCases).toHaveLength(0);
    });
  });
});

// Made with Bob