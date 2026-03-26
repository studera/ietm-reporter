/**
 * Test Case Mapper
 * Maps Playwright tests to IETM test cases and validates their existence
 */

import type { TestCase } from '@playwright/test/reporter';
import { IETMClient } from '../client/IETMClient';

export interface TestCaseMapping {
  /** Playwright test case */
  test: TestCase;
  /** IETM test case ID */
  testCaseId: string;
  /** Whether the test case exists in IETM */
  exists: boolean;
  /** IETM test case URL if exists */
  testCaseUrl?: string;
  /** Error message if validation failed */
  error?: string;
}

export interface TestCaseMappingOptions {
  /** Annotation type to look for (default: 'ietm-test-case') */
  annotationType?: string;
  /** Alternative annotation types to check */
  alternativeAnnotationTypes?: string[];
  /** Pattern to extract test case ID from title */
  titlePattern?: RegExp;
  /** Whether to validate test cases against IETM */
  validateAgainstIETM?: boolean;
  /** Whether to fail on unmapped tests */
  failOnUnmapped?: boolean;
  /** Whether to fail on non-existent test cases */
  failOnNonExistent?: boolean;
  /** Custom test case ID extractor */
  customExtractor?: (test: TestCase) => string | null;
}

export class TestCaseMapper {
  private client?: IETMClient;
  private options: Required<TestCaseMappingOptions>;
  private validationCache: Map<string, boolean> = new Map();
  private testCaseUrlCache: Map<string, string> = new Map();

  constructor(client?: IETMClient, options: TestCaseMappingOptions = {}) {
    this.client = client;
    this.options = {
      annotationType: options.annotationType || 'ietm-test-case',
      alternativeAnnotationTypes: options.alternativeAnnotationTypes || ['test-case-id', 'tc-id'],
      titlePattern: options.titlePattern || /\[TC-(\d+)\]/i,
      validateAgainstIETM: options.validateAgainstIETM !== false,
      failOnUnmapped: options.failOnUnmapped || false,
      failOnNonExistent: options.failOnNonExistent || false,
      customExtractor: options.customExtractor || (() => null),
    };
  }

  /**
   * Extract test case ID from a Playwright test
   */
  extractTestCaseId(test: TestCase): string | null {
    // Try custom extractor first
    if (this.options.customExtractor) {
      const customId = this.options.customExtractor(test);
      if (customId) return customId;
    }

    // Look for primary annotation type
    const primaryAnnotation = test.annotations.find(
      (a) => a.type === this.options.annotationType
    );
    
    if (primaryAnnotation?.description) {
      return primaryAnnotation.description.trim();
    }

    // Look for alternative annotation types
    for (const altType of this.options.alternativeAnnotationTypes) {
      const altAnnotation = test.annotations.find((a) => a.type === altType);
      if (altAnnotation?.description) {
        return altAnnotation.description.trim();
      }
    }

    // Try to extract from test title using pattern
    const match = test.title.match(this.options.titlePattern);
    if (match && match[1]) {
      return match[1].trim();
    }

    return null;
  }

  /**
   * Map a single test to an IETM test case
   */
  async mapTest(test: TestCase): Promise<TestCaseMapping> {
    const testCaseId = this.extractTestCaseId(test);

    if (!testCaseId) {
      const mapping: TestCaseMapping = {
        test,
        testCaseId: '',
        exists: false,
        error: 'No test case ID found in annotations or title',
      };

      if (this.options.failOnUnmapped) {
        throw new Error(
          `Test "${test.title}" at ${test.location.file}:${test.location.line} has no IETM test case mapping. ` +
          `Add annotation: test.info().annotations.push({ type: '${this.options.annotationType}', description: 'TEST_CASE_ID' })`
        );
      }

      return mapping;
    }

    // Validate against IETM if enabled and client is available
    if (this.options.validateAgainstIETM && this.client) {
      const exists = await this.validateTestCase(testCaseId);
      const testCaseUrl = this.testCaseUrlCache.get(testCaseId);

      const mapping: TestCaseMapping = {
        test,
        testCaseId,
        exists,
        testCaseUrl,
      };

      if (!exists) {
        mapping.error = `Test case ${testCaseId} does not exist in IETM`;
        
        if (this.options.failOnNonExistent) {
          throw new Error(
            `Test "${test.title}" at ${test.location.file}:${test.location.line} ` +
            `references non-existent IETM test case: ${testCaseId}`
          );
        }
      }

      return mapping;
    }

    // No validation, assume it exists
    return {
      test,
      testCaseId,
      exists: true,
    };
  }

  /**
   * Map multiple tests to IETM test cases
   */
  async mapTests(tests: TestCase[]): Promise<TestCaseMapping[]> {
    const mappings: TestCaseMapping[] = [];
    const errors: string[] = [];

    for (const test of tests) {
      try {
        const mapping = await this.mapTest(test);
        mappings.push(mapping);

        if (mapping.error) {
          errors.push(`${test.title}: ${mapping.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${test.title}: ${errorMsg}`);
        
        // Re-throw if we're failing on errors
        if (this.options.failOnUnmapped || this.options.failOnNonExistent) {
          throw error;
        }
      }
    }

    // Log summary
    const mapped = mappings.filter((m) => m.testCaseId).length;
    const validated = mappings.filter((m) => m.exists).length;
    const unmapped = mappings.filter((m) => !m.testCaseId).length;
    const invalid = mappings.filter((m) => m.testCaseId && !m.exists).length;

    console.log('[TestCaseMapper] Mapping Summary:');
    console.log(`  Total tests: ${tests.length}`);
    console.log(`  Mapped: ${mapped}`);
    console.log(`  Unmapped: ${unmapped}`);
    if (this.options.validateAgainstIETM) {
      console.log(`  Validated: ${validated}`);
      console.log(`  Invalid: ${invalid}`);
    }

    if (errors.length > 0) {
      console.warn('[TestCaseMapper] Mapping errors:');
      errors.forEach((err) => console.warn(`  - ${err}`));
    }

    return mappings;
  }

  /**
   * Validate that a test case exists in IETM
   */
  async validateTestCase(testCaseId: string): Promise<boolean> {
    if (!this.client) {
      console.warn('[TestCaseMapper] No IETM client available for validation');
      return true; // Assume valid if we can't validate
    }

    // Check cache first
    if (this.validationCache.has(testCaseId)) {
      return this.validationCache.get(testCaseId)!;
    }

    try {
      // Try to get the test case from IETM
      const testCase = await this.client.getTestCase(testCaseId);
      
      if (testCase) {
        this.validationCache.set(testCaseId, true);
        
        // Cache the resource URL if available
        if (testCase.resourceUrl) {
          this.testCaseUrlCache.set(testCaseId, testCase.resourceUrl);
        }
        
        return true;
      }
      
      this.validationCache.set(testCaseId, false);
      return false;
    } catch (error) {
      console.error(`[TestCaseMapper] Error validating test case ${testCaseId}:`, error);
      this.validationCache.set(testCaseId, false);
      return false;
    }
  }

  /**
   * Get mapping statistics
   */
  getMappingStats(mappings: TestCaseMapping[]): {
    total: number;
    mapped: number;
    unmapped: number;
    validated: number;
    invalid: number;
  } {
    return {
      total: mappings.length,
      mapped: mappings.filter((m) => m.testCaseId).length,
      unmapped: mappings.filter((m) => !m.testCaseId).length,
      validated: mappings.filter((m) => m.exists).length,
      invalid: mappings.filter((m) => m.testCaseId && !m.exists).length,
    };
  }

  /**
   * Get all unmapped tests
   */
  getUnmappedTests(mappings: TestCaseMapping[]): TestCase[] {
    return mappings
      .filter((m) => !m.testCaseId)
      .map((m) => m.test);
  }

  /**
   * Get all invalid test case mappings
   */
  getInvalidMappings(mappings: TestCaseMapping[]): TestCaseMapping[] {
    return mappings.filter((m) => m.testCaseId && !m.exists);
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.testCaseUrlCache.clear();
  }

  /**
   * Generate a mapping report
   */
  generateReport(mappings: TestCaseMapping[]): string {
    const stats = this.getMappingStats(mappings);
    const unmapped = this.getUnmappedTests(mappings);
    const invalid = this.getInvalidMappings(mappings);

    let report = '# Test Case Mapping Report\n\n';
    report += `## Summary\n`;
    report += `- Total tests: ${stats.total}\n`;
    report += `- Mapped: ${stats.mapped}\n`;
    report += `- Unmapped: ${stats.unmapped}\n`;
    
    if (this.options.validateAgainstIETM) {
      report += `- Validated: ${stats.validated}\n`;
      report += `- Invalid: ${stats.invalid}\n`;
    }
    
    report += '\n';

    if (unmapped.length > 0) {
      report += `## Unmapped Tests (${unmapped.length})\n\n`;
      unmapped.forEach((test) => {
        report += `- **${test.title}**\n`;
        report += `  - File: ${test.location.file}:${test.location.line}\n`;
        report += `  - Fix: Add annotation \`test.info().annotations.push({ type: '${this.options.annotationType}', description: 'TEST_CASE_ID' })\`\n\n`;
      });
    }

    if (invalid.length > 0) {
      report += `## Invalid Mappings (${invalid.length})\n\n`;
      invalid.forEach((mapping) => {
        report += `- **${mapping.test.title}**\n`;
        report += `  - File: ${mapping.test.location.file}:${mapping.test.location.line}\n`;
        report += `  - Test Case ID: ${mapping.testCaseId}\n`;
        report += `  - Error: ${mapping.error}\n\n`;
      });
    }

    return report;
  }
}

// Made with Bob