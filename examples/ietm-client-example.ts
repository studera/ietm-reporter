/**
 * IETM Client Example
 * 
 * Demonstrates how to use the IETMClient to interact with IETM server.
 */

import { IETMClient, IETMClientConfig, ExecutionResultInput } from '../src/client/IETMClient';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('=== IETM Client Example ===\n');

  // Configuration
  const config: IETMClientConfig = {
    qmServerUrl: process.env.IETM_QM_SERVER_URL || 'https://jazz.net/sandbox01-qm',
    jtsServerUrl: process.env.IETM_JTS_SERVER_URL || 'https://jazz.net/sandbox01-jts',
    username: process.env.IETM_USERNAME || '',
    password: process.env.IETM_PASSWORD || '',
    projectName: process.env.IETM_PROJECT_NAME || 'studera Project (Quality Management)',
  };

  // Create client
  console.log('1. Creating IETM Client...');
  const client = new IETMClient(config);
  console.log('✓ Client created\n');

  try {
    // Initialize (authenticate + discover services)
    console.log('2. Initializing client...');
    await client.initialize();
    console.log('✓ Client initialized\n');

    // Get context ID
    const contextId = client.getContextId();
    console.log(`Context ID: ${contextId}\n`);

    // Example 1: Get a test case
    console.log('=== Example 1: Get Test Case ===');
    const testCaseId = '2218'; // Replace with your test case ID
    console.log(`Fetching test case ${testCaseId}...`);
    
    try {
      const testCase = await client.getTestCase(testCaseId);
      console.log('✓ Test case retrieved:');
      console.log(`  ID: ${testCase.id}`);
      console.log(`  Title: ${testCase.title}`);
      console.log(`  Description: ${testCase.description || 'N/A'}`);
      console.log(`  State: ${testCase.state || 'N/A'}`);
      console.log(`  Resource URL: ${testCase.resourceUrl}`);
      console.log(`  Web ID: ${testCase.webId}\n`);
    } catch (error: any) {
      console.log(`✗ Failed to get test case: ${error.message}\n`);
    }

    // Example 2: Get test execution records
    console.log('=== Example 2: Get Test Execution Records ===');
    console.log(`Fetching execution records for test case ${testCaseId}...`);
    
    try {
      const records = await client.getTestExecutionRecords(testCaseId);
      console.log(`✓ Found ${records.length} execution record(s):`);
      records.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}`);
        console.log(`     State: ${record.state || 'N/A'}`);
        console.log(`     Test Plan: ${record.testPlanId || 'N/A'}`);
      });
      console.log();
    } catch (error: any) {
      console.log(`✗ Failed to get execution records: ${error.message}\n`);
    }

    // Example 3: Create execution result
    console.log('=== Example 3: Create Execution Result ===');
    
    const executionResult: ExecutionResultInput = {
      testCaseId: testCaseId,
      verdict: 'passed',
      startTime: new Date(Date.now() - 5000).toISOString(),
      endTime: new Date().toISOString(),
      duration: 5000,
      details: 'Test executed successfully via Playwright',
      machine: 'playwright-runner',
      build: 'v1.0.0',
    };

    console.log('Creating execution result...');
    console.log(`  Test Case: ${executionResult.testCaseId}`);
    console.log(`  Verdict: ${executionResult.verdict}`);
    console.log(`  Duration: ${executionResult.duration}ms`);
    
    try {
      const resultId = await client.createExecutionResult(executionResult);
      console.log(`✓ Execution result created: ${resultId}\n`);

      // Example 4: Upload attachment (optional)
      console.log('=== Example 4: Upload Attachment ===');
      
      const attachment = {
        name: 'test-log.txt',
        content: Buffer.from('Test execution log\nAll tests passed successfully!'),
        contentType: 'text/plain',
        description: 'Test execution log',
      };

      console.log(`Uploading attachment: ${attachment.name}...`);
      
      try {
        const attachmentUrl = await client.uploadAttachment(resultId, attachment);
        console.log(`✓ Attachment uploaded: ${attachmentUrl}\n`);
      } catch (error: any) {
        console.log(`✗ Failed to upload attachment: ${error.message}\n`);
      }
    } catch (error: any) {
      console.log(`✗ Failed to create execution result: ${error.message}\n`);
    }

    // Display discovered services
    console.log('=== Discovered Services ===');
    const services = client.getDiscoveredServices();
    if (services) {
      console.log(`Root Services: ${services.rootServicesUrl}`);
      console.log(`Catalog: ${services.catalogUrl}`);
      console.log(`Services: ${services.servicesUrl}`);
      console.log(`Base Path: ${services.basePath}`);
      console.log(`\nQuery Capabilities (${services.queryUrls.size}):`);
      services.queryUrls.forEach((url, name) => {
        console.log(`  - ${name}`);
      });
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // Clean up
    console.log('\n=== Cleaning Up ===');
    await client.clearAuth();
    console.log('✓ Authentication cleared');
  }

  console.log('\n=== IETM Client Example Completed ===');
}

// Run the example
main().catch(console.error);

// Made with Bob
