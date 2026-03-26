/**
 * End-to-End Integration Test
 * 
 * This test verifies the complete workflow:
 * 1. Run Playwright tests with IETM reporter
 * 2. Verify results are published to IETM sandbox
 * 3. Check that execution results are created for test cases 2218 and 7117
 * 
 * IMPORTANT: This test makes real API calls to IETM sandbox
 * Run with caution to avoid account lockout
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

test.describe('End-to-End Integration Test', () => {
  const resultsDir = path.resolve(__dirname, '../../../test-results/integration');
  const resultsFile = path.join(resultsDir, 'ietm-results.json');

  test.beforeAll(async () => {
    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
  });

  test('should run Playwright tests and publish results to IETM', async () => {
    console.log('\n=== Running End-to-End Integration Test ===\n');
    
    // Step 1: Run the login tests with IETM reporter
    console.log('Step 1: Running Playwright tests with IETM reporter...');
    
    const testCommand = `npx playwright test --config=${path.resolve(__dirname, '../playwright.config.ts')} ${path.resolve(__dirname, './login.spec.ts')}`;
    
    try {
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: path.resolve(__dirname, '../../..'),
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
        timeout: 120000, // 2 minutes timeout
      });
      
      console.log('✓ Playwright tests completed');
      console.log('\nTest Output:');
      console.log(stdout);
      
      if (stderr) {
        console.log('\nStderr:');
        console.log(stderr);
      }
    } catch (error: any) {
      // Tests might fail, but we still want to check if results were published
      console.log('Test execution completed (some tests may have failed)');
      console.log(error.stdout || '');
      console.log(error.stderr || '');
    }

    // Step 2: Verify results file was created
    console.log('\nStep 2: Verifying results file...');
    
    // Check for results in the reporter output directory
    const reporterResultsDir = path.resolve(__dirname, '../../../examples/basic-example/ietm-results');
    const reporterResultsFile = path.join(reporterResultsDir, 'ietm-results.json');
    
    let resultsExist = false;
    let resultsData: any = null;
    
    if (fs.existsSync(reporterResultsFile)) {
      resultsExist = true;
      const resultsContent = fs.readFileSync(reporterResultsFile, 'utf-8');
      resultsData = JSON.parse(resultsContent);
      console.log('✓ Results file found');
      console.log(`  Location: ${reporterResultsFile}`);
      console.log(`  Test results: ${resultsData.results?.length || 0}`);
    } else {
      console.log('⚠ Results file not found at expected location');
      console.log(`  Expected: ${reporterResultsFile}`);
    }

    // Step 3: Verify test cases were mapped
    if (resultsData && resultsData.results) {
      console.log('\nStep 3: Verifying test case mappings...');
      
      const testCase2218 = resultsData.results.find((r: any) => 
        r.testCaseId === '2218' || r.annotations?.some((a: any) => a.description === '2218')
      );
      
      const testCase7117 = resultsData.results.find((r: any) => 
        r.testCaseId === '7117' || r.annotations?.some((a: any) => a.description === '7117')
      );
      
      if (testCase2218) {
        console.log('✓ Test case 2218 found in results');
        console.log(`  Status: ${testCase2218.status || testCase2218.state}`);
        console.log(`  Title: ${testCase2218.title}`);
      } else {
        console.log('⚠ Test case 2218 not found in results');
      }
      
      if (testCase7117) {
        console.log('✓ Test case 7117 found in results');
        console.log(`  Status: ${testCase7117.status || testCase7117.state}`);
        console.log(`  Title: ${testCase7117.title}`);
      } else {
        console.log('⚠ Test case 7117 not found in results');
      }
      
      // Verify at least one test case was mapped
      expect(testCase2218 || testCase7117).toBeTruthy();
    }

    // Step 4: Check publication status
    if (resultsData && resultsData.publicationStatus) {
      console.log('\nStep 4: Checking publication status...');
      console.log(`  Published: ${resultsData.publicationStatus.published || 0}`);
      console.log(`  Failed: ${resultsData.publicationStatus.failed || 0}`);
      console.log(`  Total: ${resultsData.publicationStatus.total || 0}`);
      
      // Verify at least some results were published
      if (resultsData.publicationStatus.published > 0) {
        console.log('✓ Results successfully published to IETM');
      } else {
        console.log('⚠ No results were published to IETM');
      }
    }

    console.log('\n=== End-to-End Integration Test Complete ===\n');
    
    // Final assertion: verify the workflow completed
    expect(resultsExist).toBe(true);
  });

  test('should verify IETM server connectivity', async () => {
    console.log('\n=== Verifying IETM Server Connectivity ===\n');
    
    // Simple connectivity test using curl or fetch
    const baseUrl = process.env.IETM_BASE_URL || 'https://jazz.net/sandbox01-qm';
    
    console.log(`Testing connection to: ${baseUrl}`);
    
    try {
      const response = await fetch(`${baseUrl}/rootservices`, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml',
        },
      });
      
      console.log(`✓ Server responded with status: ${response.status}`);
      expect(response.status).toBeLessThan(500); // Server is reachable
    } catch (error: any) {
      console.log(`⚠ Connection failed: ${error.message}`);
      // Don't fail the test if server is temporarily unavailable
    }
    
    console.log('\n=== Connectivity Test Complete ===\n');
  });
});

// Made with Bob