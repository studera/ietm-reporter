/**
 * Example: Basic Authentication with IETM
 * 
 * This example demonstrates how to use the AuthManager to authenticate
 * with an IETM server using Basic Authentication and form-based login.
 */

import { AuthManager, AuthConfig } from '../src/auth';

async function main() {
  // Configuration
  const config: AuthConfig = {
    baseUrl: 'https://jazz.net/sandbox01-qm',
    jtsUrl: 'https://jazz.net/sandbox01-jts',
    username: 'studera',
    password: 'Modus1odus123##',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
  };

  console.log('=== IETM Authentication Example ===\n');

  // Create AuthManager instance
  const authManager = new AuthManager(config);
  console.log('✓ AuthManager created');

  try {
    // Authenticate
    console.log('\n1. Authenticating with IETM server...');
    await authManager.authenticate();
    console.log('✓ Authentication successful');

    // Check auth state
    const authState = authManager.getAuthState();
    console.log('\n2. Authentication State:');
    console.log(`   - Authenticated: ${authState.isAuthenticated}`);
    console.log(`   - Last Auth: ${authState.lastAuthTime?.toISOString()}`);
    console.log(`   - Auth Attempts: ${authState.authAttempts}`);

    // Make a test request to root services
    console.log('\n3. Making test request to root services...');
    const rootServicesUrl = `${config.baseUrl}/rootservices`;
    const response = await authManager.executeRequest({
      method: 'GET',
      url: rootServicesUrl,
      headers: {
        'Accept': 'application/xml',
      },
    });

    console.log('✓ Request successful');
    console.log(`   Response length: ${response.length} characters`);
    console.log(`   Response preview: ${response.substring(0, 200)}...`);

    // Test automatic re-authentication on 401
    console.log('\n4. Testing automatic re-authentication...');
    console.log('   (Making another request - should use existing session)');
    
    const catalogUrl = `${config.baseUrl}/oslc_qm/catalog`;
    const catalogResponse = await authManager.executeRequest({
      method: 'GET',
      url: catalogUrl,
      headers: {
        'Accept': 'application/xml',
      },
    });

    console.log('✓ Second request successful');
    console.log(`   Response length: ${catalogResponse.length} characters`);

    // Display cookie information
    console.log('\n5. Session Cookies:');
    const cookieJar = authManager.getCookieJar();
    const cookies = await cookieJar.getCookies(config.jtsUrl);
    console.log(`   Found ${cookies.length} cookies`);
    cookies.forEach((cookie: any, index: number) => {
      console.log(`   ${index + 1}. ${cookie.key} = ${cookie.value.substring(0, 20)}...`);
    });

    console.log('\n=== Example completed successfully ===');

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
