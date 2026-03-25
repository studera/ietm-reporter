/**
 * Example: Service Discovery with IETM
 * 
 * This example demonstrates how to discover IETM service URLs
 * using the OSLC service discovery pattern.
 */

import { AuthManager, AuthConfig } from '../src/auth';
import { ServiceDiscovery, ServiceDiscoveryConfig } from '../src/client/ServiceDiscovery';

async function main() {
  console.log('=== IETM Service Discovery Example ===\n');

  // Step 1: Configure authentication
  const authConfig: AuthConfig = {
    baseUrl: process.env.IETM_BASE_URL || 'https://jazz.net/sandbox01-qm',
    jtsUrl: process.env.IETM_JTS_URL || 'https://jazz.net/sandbox01-jts',
    username: process.env.IETM_USERNAME || '',
    password: process.env.IETM_PASSWORD || '',
  };

  // Validate credentials
  if (!authConfig.username || !authConfig.password) {
    console.error('❌ Error: Missing credentials in .env file');
    process.exit(1);
  }

  console.log('1. Creating AuthManager...');
  const authManager = new AuthManager(authConfig);

  try {
    // Step 2: Authenticate
    console.log('2. Authenticating...');
    await authManager.authenticate();
    console.log('✓ Authentication successful\n');

    // Step 3: Configure service discovery
    const discoveryConfig: ServiceDiscoveryConfig = {
      baseUrl: authConfig.baseUrl,
      projectName: process.env.IETM_PROJECT_NAME || 'studera Project (Quality Management)',
    };

    console.log('3. Creating ServiceDiscovery...');
    const serviceDiscovery = new ServiceDiscovery(discoveryConfig, authManager);
    console.log('✓ ServiceDiscovery created\n');

    // Step 4: Discover services
    console.log('4. Discovering services...\n');
    const services = await serviceDiscovery.discover();

    // Step 5: Display discovered services
    console.log('\n=== Discovered Services ===\n');
    console.log('Root Services URL:');
    console.log(`  ${services.rootServicesUrl}\n`);
    
    console.log('Catalog URL:');
    console.log(`  ${services.catalogUrl}\n`);
    
    console.log('Services URL:');
    console.log(`  ${services.servicesUrl}\n`);
    
    console.log('Context ID:');
    console.log(`  ${services.contextId}\n`);
    
    console.log('Base Path:');
    console.log(`  ${services.basePath}\n`);
    
    console.log('Query Capabilities:');
    services.queryUrls.forEach((url, type) => {
      console.log(`  ${type}:`);
      console.log(`    ${url}`);
    });

    // Step 6: Test helper methods
    console.log('\n=== Testing Helper Methods ===\n');
    
    const testCaseQueryUrl = serviceDiscovery.getQueryUrl('TestCase');
    console.log('Test Case Query URL:');
    console.log(`  ${testCaseQueryUrl}\n`);
    
    const terQueryUrl = serviceDiscovery.getQueryUrl('TestcaseExecutionRecord');
    console.log('Test Execution Record Query URL:');
    console.log(`  ${terQueryUrl}\n`);
    
    // Build example resource URLs
    const testCaseUrl = serviceDiscovery.buildResourceUrl('testcase', '2218');
    console.log('Example Test Case URL (ID: 2218):');
    console.log(`  ${testCaseUrl}\n`);
    
    const terUrl = serviceDiscovery.buildResourceUrl('executionworkitem', '12345');
    console.log('Example Execution Work Item URL (ID: 12345):');
    console.log(`  ${terUrl}\n`);

    console.log('=== Service Discovery Example Completed Successfully ===');

  } catch (error) {
    console.error('\n❌ Error:', error);
    
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    process.exit(1);
  } finally {
    // Clean up
    await authManager.clearAuth();
    console.log('\n✓ Authentication cleared');
  }
}

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };

// Made with Bob
