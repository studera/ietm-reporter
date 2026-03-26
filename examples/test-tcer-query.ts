/**
 * Test TCER Query Example
 * 
 * This example tests querying TCERs (Test Case Execution Records) from IETM
 * to find the correct TCER for a given test case and test plan combination.
 * 
 * Expected results:
 * - Test Plan 987 + Test Case 2218 → TCER 1829
 * - Test Plan 987 + Test Case 7117 → TCER 2781
 */

import { IETMClient } from '../src/client/IETMClient';
import { loadConfig } from '../src/config/ConfigManager';

async function testTCERQuery() {
  console.log('='.repeat(80));
  console.log('TCER Query Test');
  console.log('='.repeat(80));

  // Load configuration
  const config = loadConfig('config/ietm.config.json');
  
  // Create client
  const client = new IETMClient({
    qmServerUrl: config.server.baseUrl,
    jtsServerUrl: config.server.jtsUrl || config.server.baseUrl.replace('-qm', '-jts'),
    username: 'username' in config.auth ? config.auth.username : '',
    password: 'password' in config.auth ? config.auth.password : '',
    projectName: config.server.projectName || '',
    contextId: config.server.contextId,
  });

  try {
    // Initialize client
    console.log('\n1. Initializing IETM Client...');
    await client.initialize();
    console.log('✓ Client initialized\n');

    // Test Case 1: Test Plan 987 + Test Case 2218 → Expected TCER 1829
    console.log('='.repeat(80));
    console.log('Test 1: Find TCER for Test Plan 987 + Test Case 2218');
    console.log('Expected: TCER 1829');
    console.log('='.repeat(80));
    
    try {
      const tcer1 = await client.findOrCreateTCER('2218', '987');
      console.log(`✓ Result: TCER ${tcer1}`);
      console.log(`✓ Match: ${tcer1 === '1829' ? 'YES' : 'NO (expected 1829)'}\n`);
    } catch (error) {
      console.error('✗ Error:', error);
    }

    // Test Case 2: Test Plan 987 + Test Case 7117 → Expected TCER 2781
    console.log('='.repeat(80));
    console.log('Test 2: Find TCER for Test Plan 987 + Test Case 7117');
    console.log('Expected: TCER 2781');
    console.log('='.repeat(80));
    
    try {
      const tcer2 = await client.findOrCreateTCER('7117', '987');
      console.log(`✓ Result: TCER ${tcer2}`);
      console.log(`✓ Match: ${tcer2 === '2781' ? 'YES' : 'NO (expected 2781)'}\n`);
    } catch (error) {
      console.error('✗ Error:', error);
    }

    console.log('='.repeat(80));
    console.log('TCER Query Test Complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testTCERQuery()
  .then(() => {
    console.log('\n✓ All tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  });

// Made with Bob
