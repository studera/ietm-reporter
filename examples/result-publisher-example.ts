/**
 * Result Publisher Example
 * Demonstrates how to use ResultPublisher to upload test results to IETM
 */

import { IETMClient } from '../src/client/IETMClient';
import { ResultPublisher } from '../src/publisher/ResultPublisher';
import { ExecutionResult, ExecutionState } from '../src/models/ExecutionResult';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize IETM client
  const client = new IETMClient({
    qmServerUrl: process.env.IETM_BASE_URL || 'https://jazz.net/sandbox01-qm',
    jtsServerUrl: process.env.IETM_JTS_URL || 'https://jazz.net/jts',
    username: process.env.IETM_USERNAME || '',
    password: process.env.IETM_PASSWORD || '',
    projectName: process.env.IETM_PROJECT || 'Test Project',
  });

  try {
    // Note: Authentication is handled automatically by IETMClient
    console.log('Initializing IETM client...');

    // Example 1: Basic Publishing
    console.log('=== Example 1: Basic Publishing ===');
    await basicPublishing(client);

    // Example 2: Batch Publishing
    console.log('\n=== Example 2: Batch Publishing ===');
    await batchPublishing(client);

    // Example 3: Publishing with Attachments
    console.log('\n=== Example 3: Publishing with Attachments ===');
    await publishingWithAttachments(client);

    // Example 4: Publishing with Progress Tracking
    console.log('\n=== Example 4: Publishing with Progress Tracking ===');
    await publishingWithProgress(client);

    // Example 5: Publishing with Duplicate Prevention
    console.log('\n=== Example 5: Publishing with Duplicate Prevention ===');
    await publishingWithDuplicatePrevention(client);

    // Example 6: Publishing with Custom Execution Record IDs
    console.log('\n=== Example 6: Publishing with Custom Execution Record IDs ===');
    await publishingWithCustomIds(client);

    // Example 7: Error Handling
    console.log('\n=== Example 7: Error Handling ===');
    await errorHandling(client);

    // Example 8: Statistics
    console.log('\n=== Example 8: Statistics ===');
    await statistics(client);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function basicPublishing(client: IETMClient) {
  const publisher = new ResultPublisher(client);

  const results = [
    {
      executionResult: createExecutionResult('Test 1', ExecutionState.PASSED),
      testCaseId: '1',
    },
  ];

  const summary = await publisher.publishResults(results);
  console.log(`Published ${summary.succeeded}/${summary.total} results in ${summary.duration}ms`);
}

async function batchPublishing(client: IETMClient) {
  const publisher = new ResultPublisher(client, {
    batchSize: 5, // Process 5 results at a time
  });

  // Create 15 test results
  const results = Array.from({ length: 15 }, (_, i) => ({
    executionResult: createExecutionResult(`Test ${i + 1}`, ExecutionState.PASSED),
    testCaseId: String(i + 1),
  }));

  const summary = await publisher.publishResults(results);
  console.log(`Published ${summary.succeeded}/${summary.total} results in ${summary.duration}ms`);
  console.log(`Processed in ${Math.ceil(results.length / 5)} batches`);
}

async function publishingWithAttachments(client: IETMClient) {
  const publisher = new ResultPublisher(client, {
    uploadAttachments: true,
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB
  });

  const results = [
    {
      executionResult: createExecutionResult('Test with attachments', ExecutionState.FAILED),
      testCaseId: '1',
      attachments: {
        screenshots: ['screenshot1.png', 'screenshot2.png'],
        videos: ['test-recording.mp4'],
        traces: ['trace.zip'],
      },
    },
  ];

  const summary = await publisher.publishResults(results);
  console.log(`Published ${summary.succeeded}/${summary.total} results`);
  if (summary.results[0]?.attachmentUrls) {
    console.log(`Uploaded ${summary.results[0].attachmentUrls.length} attachments`);
  }
}

async function publishingWithProgress(client: IETMClient) {
  const publisher = new ResultPublisher(client, {
    batchSize: 3,
    onProgress: (progress) => {
      console.log(
        `Progress: ${progress.completed}/${progress.total} ` +
          `(Batch ${progress.currentBatch}/${progress.totalBatches}) - ${progress.operation}`
      );
    },
  });

  const results = Array.from({ length: 10 }, (_, i) => ({
    executionResult: createExecutionResult(`Test ${i + 1}`, ExecutionState.PASSED),
    testCaseId: String(i + 1),
  }));

  const summary = await publisher.publishResults(results);
  console.log(`\nCompleted: ${summary.succeeded} succeeded, ${summary.failed} failed`);
}

async function publishingWithDuplicatePrevention(client: IETMClient) {
  const publisher = new ResultPublisher(client, {
    preventDuplicates: true,
  });

  const result = {
    executionResult: createExecutionResult('Test 1', ExecutionState.PASSED),
    testCaseId: '1',
  };

  // Publish once
  console.log('Publishing result first time...');
  const summary1 = await publisher.publishResults([result]);
  console.log(`First publish: ${summary1.succeeded} succeeded`);

  // Try to publish again - should be skipped
  console.log('\nPublishing same result again...');
  const summary2 = await publisher.publishResults([result]);
  console.log(`Second publish: ${summary2.succeeded} succeeded (duplicate skipped)`);

  // Clear cache and publish again
  console.log('\nClearing cache and publishing again...');
  publisher.clearCache();
  const summary3 = await publisher.publishResults([result]);
  console.log(`Third publish: ${summary3.succeeded} succeeded (cache cleared)`);
}

async function publishingWithCustomIds(client: IETMClient) {
  const publisher = new ResultPublisher(client, {
    executionRecordIdGenerator: (testCaseId) => {
      // Custom format: EXEC-{testCaseId}-{timestamp}
      return `EXEC-${testCaseId}-${Date.now()}`;
    },
  });

  const results = [
    {
      executionResult: createExecutionResult('Test 1', ExecutionState.PASSED),
      testCaseId: '1',
    },
  ];

  const summary = await publisher.publishResults(results);
  console.log(`Published with custom execution record ID`);
  console.log(`Execution record: ${summary.results[0]?.executionRecordId}`);
}

async function errorHandling(client: IETMClient) {
  const publisher = new ResultPublisher(client, {
    continueOnError: true, // Continue even if some results fail
  });

  const results = [
    {
      executionResult: createExecutionResult('Valid test', ExecutionState.PASSED),
      testCaseId: '1',
    },
    {
      // Invalid result - missing required fields
      executionResult: {} as ExecutionResult,
      testCaseId: '2',
    },
    {
      executionResult: createExecutionResult('Another valid test', ExecutionState.PASSED),
      testCaseId: '3',
    },
  ];

  const summary = await publisher.publishResults(results);
  console.log(`Published ${summary.succeeded}/${summary.total} results`);
  console.log(`Failed: ${summary.failed}`);

  if (summary.errors.length > 0) {
    console.log('\nErrors:');
    summary.errors.forEach((error) => {
      console.log(`- ${error}`);
    });
  }
}

async function statistics(client: IETMClient) {
  const publisher = new ResultPublisher(client);

  const results = Array.from({ length: 10 }, (_, i) => ({
    executionResult: createExecutionResult(
      `Test ${i + 1}`,
      i < 8 ? ExecutionState.PASSED : ExecutionState.FAILED
    ),
    testCaseId: String(i + 1),
  }));

  const summary = await publisher.publishResults(results);
  const stats = publisher.getStatistics(summary);

  console.log('Statistics:');
  console.log(`- Total: ${summary.total}`);
  console.log(`- Succeeded: ${summary.succeeded}`);
  console.log(`- Failed: ${summary.failed}`);
  console.log(`- Success Rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`- Failure Rate: ${stats.failureRate.toFixed(1)}%`);
  console.log(`- Average Time: ${stats.averageTimePerResult.toFixed(0)}ms per result`);
}

// Helper function to create execution results
function createExecutionResult(title: string, state: ExecutionState): ExecutionResult {
  const now = new Date();
  const startTime = new Date(now.getTime() - 5000); // 5 seconds ago

  return {
    title,
    creator: 'test-user',
    owner: 'test-user',
    state,
    startTime: startTime.toISOString(),
    endTime: now.toISOString(),
    tester: 'test-user',
    testCase: { href: 'https://example.com/testcase/1' },
    executionWorkItem: { href: 'https://example.com/exec/1' },
    stepResults:
      state === ExecutionState.FAILED
        ? [
            {
              stepIndex: 1,
              startTime: startTime.toISOString(),
              endTime: new Date(startTime.getTime() + 2000).toISOString(),
              result: ExecutionState.PASSED,
              description: 'Step 1',
              tester: 'test-user',
            },
            {
              stepIndex: 2,
              startTime: new Date(startTime.getTime() + 2000).toISOString(),
              endTime: now.toISOString(),
              result: ExecutionState.FAILED,
              description: 'Step 2 - Assertion failed: Expected true but got false',
              tester: 'test-user',
            },
          ]
        : undefined,
    properties:
      state === ExecutionState.FAILED
        ? [
            {
              propertyName: 'error',
              propertyValue: 'Test failed: Assertion error\n  at test.spec.ts:42:5',
            },
          ]
        : undefined,
  };
}

// Run the examples
main().catch(console.error);

// Made with Bob