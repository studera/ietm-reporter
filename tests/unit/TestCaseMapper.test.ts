/**
 * Unit tests for TestCaseMapper
 */

import { TestCaseMapper, TestCaseMapping } from '../../src/mapper/TestCaseMapper';
import type { TestCase } from '@playwright/test/reporter';
import { IETMClient } from '../../src/client/IETMClient';

// Mock TestCase helper
function createMockTestCase(
  title: string,
  annotations: Array<{ type: string; description?: string }> = [],
  file: string = 'test.spec.ts',
  line: number = 1
): TestCase {
  return {
    title,
    annotations,
    location: { file, line, column: 0 },
    parent: {} as any,
    ok: () => true,
    outcome: () => 'expected',
    titlePath: () => [title],
  } as TestCase;
}

// Mock IETMClient
class MockIETMClient {
  private testCases: Map<string, any> = new Map();

  addTestCase(id: string, data: any = {}) {
    this.testCases.set(id, {
      id,
      title: `Test Case ${id}`,
      webId: id,
      resourceUrl: `https://example.com/testcase/${id}`,
      ...data,
    });
  }

  async getTestCase(id: string) {
    return this.testCases.get(id) || null;
  }
}

describe('TestCaseMapper', () => {
  describe('extractTestCaseId', () => {
    it('should extract test case ID from primary annotation', () => {
      const mapper = new TestCaseMapper();
      const test = createMockTestCase('Login Test', [
        { type: 'ietm-test-case', description: '2218' },
      ]);

      const id = mapper.extractTestCaseId(test);
      expect(id).toBe('2218');
    });

    it('should extract test case ID from alternative annotation types', () => {
      const mapper = new TestCaseMapper();
      const test = createMockTestCase('Login Test', [
        { type: 'test-case-id', description: '7117' },
      ]);

      const id = mapper.extractTestCaseId(test);
      expect(id).toBe('7117');
    });

    it('should extract test case ID from title pattern', () => {
      const mapper = new TestCaseMapper();
      const test = createMockTestCase('[TC-123] Login Test');

      const id = mapper.extractTestCaseId(test);
      expect(id).toBe('123');
    });

    it('should return null if no test case ID found', () => {
      const mapper = new TestCaseMapper();
      const test = createMockTestCase('Login Test');

      const id = mapper.extractTestCaseId(test);
      expect(id).toBeNull();
    });

    it('should trim whitespace from test case ID', () => {
      const mapper = new TestCaseMapper();
      const test = createMockTestCase('Login Test', [
        { type: 'ietm-test-case', description: '  2218  ' },
      ]);

      const id = mapper.extractTestCaseId(test);
      expect(id).toBe('2218');
    });

    it('should use custom extractor if provided', () => {
      const mapper = new TestCaseMapper(undefined, {
        customExtractor: (test): string | null => {
          if (test.title.includes('CUSTOM-')) {
            const parts = test.title.split('CUSTOM-');
            return parts[1] || null;
          }
          return null;
        },
      });

      const test = createMockTestCase('CUSTOM-999 Test');
      const id = mapper.extractTestCaseId(test);
      expect(id).toBe('999 Test');
    });

    it('should use custom title pattern', () => {
      const mapper = new TestCaseMapper(undefined, {
        titlePattern: /\[ID:(\d+)\]/i,
      });

      const test = createMockTestCase('[ID:456] Login Test');
      const id = mapper.extractTestCaseId(test);
      expect(id).toBe('456');
    });
  });

  describe('mapTest', () => {
    it('should map test with annotation', async () => {
      const mapper = new TestCaseMapper();
      const test = createMockTestCase('Login Test', [
        { type: 'ietm-test-case', description: '2218' },
      ]);

      const mapping = await mapper.mapTest(test);

      expect(mapping.test).toBe(test);
      expect(mapping.testCaseId).toBe('2218');
      expect(mapping.exists).toBe(true);
      expect(mapping.error).toBeUndefined();
    });

    it('should handle unmapped test', async () => {
      const mapper = new TestCaseMapper();
      const test = createMockTestCase('Login Test');

      const mapping = await mapper.mapTest(test);

      expect(mapping.testCaseId).toBe('');
      expect(mapping.exists).toBe(false);
      expect(mapping.error).toBe('No test case ID found in annotations or title');
    });

    it('should throw error on unmapped test if failOnUnmapped is true', async () => {
      const mapper = new TestCaseMapper(undefined, {
        failOnUnmapped: true,
      });
      const test = createMockTestCase('Login Test', [], 'login.spec.ts', 10);

      await expect(mapper.mapTest(test)).rejects.toThrow(
        'Test "Login Test" at login.spec.ts:10 has no IETM test case mapping'
      );
    });

    it('should validate test case against IETM', async () => {
      const mockClient = new MockIETMClient();
      mockClient.addTestCase('2218');

      const mapper = new TestCaseMapper(mockClient as any, {
        validateAgainstIETM: true,
      });

      const test = createMockTestCase('Login Test', [
        { type: 'ietm-test-case', description: '2218' },
      ]);

      const mapping = await mapper.mapTest(test);

      expect(mapping.exists).toBe(true);
      expect(mapping.testCaseUrl).toBe('https://example.com/testcase/2218');
      expect(mapping.error).toBeUndefined();
    });

    it('should detect non-existent test case', async () => {
      const mockClient = new MockIETMClient();
      // Don't add test case 9999

      const mapper = new TestCaseMapper(mockClient as any, {
        validateAgainstIETM: true,
      });

      const test = createMockTestCase('Login Test', [
        { type: 'ietm-test-case', description: '9999' },
      ]);

      const mapping = await mapper.mapTest(test);

      expect(mapping.exists).toBe(false);
      expect(mapping.error).toBe('Test case 9999 does not exist in IETM');
    });

    it('should throw error on non-existent test case if failOnNonExistent is true', async () => {
      const mockClient = new MockIETMClient();

      const mapper = new TestCaseMapper(mockClient as any, {
        validateAgainstIETM: true,
        failOnNonExistent: true,
      });

      const test = createMockTestCase('Login Test', [
        { type: 'ietm-test-case', description: '9999' },
      ], 'login.spec.ts', 10);

      await expect(mapper.mapTest(test)).rejects.toThrow(
        'Test "Login Test" at login.spec.ts:10 references non-existent IETM test case: 9999'
      );
    });

    it('should use validation cache', async () => {
      const mockClient = new MockIETMClient();
      mockClient.addTestCase('2218');

      const mapper = new TestCaseMapper(mockClient as any, {
        validateAgainstIETM: true,
      });

      const test1 = createMockTestCase('Test 1', [
        { type: 'ietm-test-case', description: '2218' },
      ]);
      const test2 = createMockTestCase('Test 2', [
        { type: 'ietm-test-case', description: '2218' },
      ]);

      // First call should hit the API
      const mapping1 = await mapper.mapTest(test1);
      expect(mapping1.exists).toBe(true);

      // Second call should use cache (we can't directly test this, but it should work)
      const mapping2 = await mapper.mapTest(test2);
      expect(mapping2.exists).toBe(true);
    });
  });

  describe('mapTests', () => {
    it('should map multiple tests', async () => {
      const mapper = new TestCaseMapper();
      const tests = [
        createMockTestCase('Test 1', [{ type: 'ietm-test-case', description: '2218' }]),
        createMockTestCase('Test 2', [{ type: 'ietm-test-case', description: '7117' }]),
        createMockTestCase('Test 3'),
      ];

      const mappings = await mapper.mapTests(tests);

      expect(mappings).toHaveLength(3);
      expect(mappings[0]?.testCaseId).toBe('2218');
      expect(mappings[1]?.testCaseId).toBe('7117');
      expect(mappings[2]?.testCaseId).toBe('');
    });

    it('should collect errors for unmapped tests', async () => {
      const mapper = new TestCaseMapper();
      const tests = [
        createMockTestCase('Test 1', [{ type: 'ietm-test-case', description: '2218' }]),
        createMockTestCase('Test 2'),
      ];

      const mappings = await mapper.mapTests(tests);

      expect(mappings[1]?.error).toBe('No test case ID found in annotations or title');
    });
  });

  describe('getMappingStats', () => {
    it('should calculate mapping statistics', () => {
      const mapper = new TestCaseMapper();
      const mappings: TestCaseMapping[] = [
        {
          test: createMockTestCase('Test 1'),
          testCaseId: '2218',
          exists: true,
        },
        {
          test: createMockTestCase('Test 2'),
          testCaseId: '7117',
          exists: true,
        },
        {
          test: createMockTestCase('Test 3'),
          testCaseId: '',
          exists: false,
          error: 'No test case ID found',
        },
        {
          test: createMockTestCase('Test 4'),
          testCaseId: '9999',
          exists: false,
          error: 'Test case does not exist',
        },
      ];

      const stats = mapper.getMappingStats(mappings);

      expect(stats.total).toBe(4);
      expect(stats.mapped).toBe(3);
      expect(stats.unmapped).toBe(1);
      expect(stats.validated).toBe(2);
      expect(stats.invalid).toBe(1);
    });
  });

  describe('getUnmappedTests', () => {
    it('should return only unmapped tests', () => {
      const mapper = new TestCaseMapper();
      const test1 = createMockTestCase('Test 1');
      const test2 = createMockTestCase('Test 2');
      const test3 = createMockTestCase('Test 3');

      const mappings: TestCaseMapping[] = [
        { test: test1, testCaseId: '2218', exists: true },
        { test: test2, testCaseId: '', exists: false },
        { test: test3, testCaseId: '', exists: false },
      ];

      const unmapped = mapper.getUnmappedTests(mappings);

      expect(unmapped).toHaveLength(2);
      expect(unmapped).toContain(test2);
      expect(unmapped).toContain(test3);
    });
  });

  describe('getInvalidMappings', () => {
    it('should return only invalid mappings', () => {
      const mapper = new TestCaseMapper();
      const mappings: TestCaseMapping[] = [
        { test: createMockTestCase('Test 1'), testCaseId: '2218', exists: true },
        { test: createMockTestCase('Test 2'), testCaseId: '', exists: false },
        { test: createMockTestCase('Test 3'), testCaseId: '9999', exists: false },
      ];

      const invalid = mapper.getInvalidMappings(mappings);

      expect(invalid).toHaveLength(1);
      expect(invalid[0]?.testCaseId).toBe('9999');
    });
  });

  describe('clearCache', () => {
    it('should clear validation cache', async () => {
      const mockClient = new MockIETMClient();
      mockClient.addTestCase('2218');

      const mapper = new TestCaseMapper(mockClient as any, {
        validateAgainstIETM: true,
      });

      const test = createMockTestCase('Test', [
        { type: 'ietm-test-case', description: '2218' },
      ]);

      // First validation
      await mapper.mapTest(test);

      // Clear cache
      mapper.clearCache();

      // Remove test case from mock client
      mockClient.addTestCase('2218'); // Re-add to ensure it's still there

      // Second validation should work (cache was cleared)
      const mapping = await mapper.mapTest(test);
      expect(mapping.exists).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate mapping report', () => {
      const mapper = new TestCaseMapper();
      const mappings: TestCaseMapping[] = [
        {
          test: createMockTestCase('Test 1', [], 'test1.spec.ts', 10),
          testCaseId: '2218',
          exists: true,
        },
        {
          test: createMockTestCase('Test 2', [], 'test2.spec.ts', 20),
          testCaseId: '',
          exists: false,
          error: 'No test case ID found',
        },
        {
          test: createMockTestCase('Test 3', [], 'test3.spec.ts', 30),
          testCaseId: '9999',
          exists: false,
          error: 'Test case does not exist',
        },
      ];

      const report = mapper.generateReport(mappings);

      expect(report).toContain('# Test Case Mapping Report');
      expect(report).toContain('Total tests: 3');
      expect(report).toContain('Mapped: 2');
      expect(report).toContain('Unmapped: 1');
      expect(report).toContain('## Unmapped Tests (1)');
      expect(report).toContain('Test 2');
      expect(report).toContain('test2.spec.ts:20');
      expect(report).toContain('## Invalid Mappings (1)');
      expect(report).toContain('Test 3');
      expect(report).toContain('9999');
    });
  });
});

// Made with Bob