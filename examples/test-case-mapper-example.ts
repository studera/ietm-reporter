/**
 * Example: Using TestCaseMapper
 *
 * This example demonstrates how to use the TestCaseMapper to:
 * - Extract test case IDs from Playwright tests
 * - Validate test cases against IETM
 * - Generate mapping reports
 */

import { TestCaseMapper } from '../src/mapper/TestCaseMapper';
import { IETMClient } from '../src/client/IETMClient';
import type { TestCase } from '@playwright/test/reporter';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock test cases for demonstration
function createMockTest(
  title: string,
  annotations: Array<{ type: string; description?: string }> = []
): TestCase {
  return {
    title,
    annotations,
    location: { file: 'example.spec.ts', line: 1, column: 0 },
    parent: {} as any,
    ok: () => true,
    outcome: () => 'expected',
    titlePath: () => [title],
  } as TestCase;
}

async function main() {
  console.log('=== Test Case Mapper Example ===\n');

  // Example 1: Basic mapping without IETM validation
  console.log('Example 1: Basic Mapping (No Validation)');
  console.log('------------------------------------------');
  
  const basicMapper = new TestCaseMapper(undefined, {
    validateAgainstIETM: false,
  });

  const tests = [
    createMockTest('Login Test', [
      { type: 'ietm-test-case', description: '2218' },
    ]),
    createMockTest('[TC-7117] Invalid Credentials Test'),
    createMockTest('Unmapped Test'),
  ];

  const basicMappings = await basicMapper.mapTests(tests);
  console.log('\nMapping Results:');
  basicMappings.forEach((mapping, index) => {
    console.log(`  ${index + 1}. ${mapping.test.title}`);
    console.log(`     Test Case ID: ${mapping.testCaseId || 'None'}`);
    console.log(`     Error: ${mapping.error || 'None'}`);
  });

  // Example 2: Mapping with IETM validation
  console.log('\n\nExample 2: Mapping with IETM Validation');
  console.log('------------------------------------------');

  try {
    // Create IETM client from environment variables
    const client = new IETMClient({
      qmServerUrl: process.env.IETM_BASE_URL || 'https://jazz.net/sandbox01-qm',
      jtsServerUrl: process.env.IETM_JTS_URL || 'https://jazz.net/sandbox01-jts',
      username: process.env.IETM_USERNAME || '',
      password: process.env.IETM_PASSWORD || '',
      projectName: process.env.IETM_PROJECT_NAME || 'studera Project (Quality Management)',
    });

    // Initialize client
    await client.initialize();

    // Create mapper with validation
    const validatingMapper = new TestCaseMapper(client, {
      validateAgainstIETM: true,
      failOnNonExistent: false, // Don't throw errors, just report
    });

    const validatedMappings = await validatingMapper.mapTests(tests);
    
    console.log('\nValidated Mapping Results:');
    validatedMappings.forEach((mapping, index) => {
      console.log(`  ${index + 1}. ${mapping.test.title}`);
      console.log(`     Test Case ID: ${mapping.testCaseId || 'None'}`);
      console.log(`     Exists in IETM: ${mapping.exists}`);
      console.log(`     URL: ${mapping.testCaseUrl || 'N/A'}`);
      console.log(`     Error: ${mapping.error || 'None'}`);
    });

    // Get statistics
    const stats = validatingMapper.getMappingStats(validatedMappings);
    console.log('\nMapping Statistics:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Mapped: ${stats.mapped}`);
    console.log(`  Unmapped: ${stats.unmapped}`);
    console.log(`  Validated: ${stats.validated}`);
    console.log(`  Invalid: ${stats.invalid}`);

    // Generate report
    console.log('\n\nMapping Report:');
    console.log('------------------------------------------');
    const report = validatingMapper.generateReport(validatedMappings);
    console.log(report);

  } catch (error) {
    console.error('Error with IETM validation:', error);
    console.log('\nNote: Make sure IETM credentials are configured in .env file');
  }

  // Example 3: Custom extractor
  console.log('\n\nExample 3: Custom Test Case ID Extractor');
  console.log('------------------------------------------');

  const customMapper = new TestCaseMapper(undefined, {
    customExtractor: (test): string | null => {
      // Extract from custom tag format: @TC:123
      const match = test.title.match(/@TC:(\d+)/);
      return match && match[1] ? match[1] : null;
    },
  });

  const customTests = [
    createMockTest('@TC:1001 Custom Format Test'),
    createMockTest('Regular Test'),
  ];

  const customMappings = await customMapper.mapTests(customTests);
  console.log('\nCustom Extractor Results:');
  customMappings.forEach((mapping, index) => {
    console.log(`  ${index + 1}. ${mapping.test.title}`);
    console.log(`     Test Case ID: ${mapping.testCaseId || 'None'}`);
  });

  // Example 4: Strict validation (fail on errors)
  console.log('\n\nExample 4: Strict Validation');
  console.log('------------------------------------------');

  const strictMapper = new TestCaseMapper(undefined, {
    failOnUnmapped: true,
    failOnNonExistent: true,
  });

  const strictTests = [
    createMockTest('Test without mapping'),
  ];

  try {
    await strictMapper.mapTests(strictTests);
  } catch (error) {
    console.log('Expected error caught:');
    console.log(`  ${error instanceof Error ? error.message : error}`);
  }

  // Example 5: Alternative annotation types
  console.log('\n\nExample 5: Alternative Annotation Types');
  console.log('------------------------------------------');

  const altMapper = new TestCaseMapper(undefined, {
    alternativeAnnotationTypes: ['tc-id', 'test-id', 'jira-id'],
  });

  const altTests = [
    createMockTest('Test 1', [{ type: 'tc-id', description: '5001' }]),
    createMockTest('Test 2', [{ type: 'test-id', description: '5002' }]),
    createMockTest('Test 3', [{ type: 'jira-id', description: 'PROJ-123' }]),
  ];

  const altMappings = await altMapper.mapTests(altTests);
  console.log('\nAlternative Annotation Results:');
  altMappings.forEach((mapping, index) => {
    console.log(`  ${index + 1}. ${mapping.test.title}`);
    console.log(`     Test Case ID: ${mapping.testCaseId || 'None'}`);
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