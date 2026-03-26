/**
 * Simple Authentication Test
 * Tests IETM authentication without running full examples
 */

import { AuthManager } from '../src/auth/AuthManager';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAuth() {
  console.log('=== IETM Authentication Test ===\n');

  const username = process.env.IETM_USERNAME;
  const password = process.env.IETM_PASSWORD;
  const jtsUrl = process.env.IETM_JTS_URL;
  const baseUrl = process.env.IETM_BASE_URL;

  console.log('Configuration:');
  console.log(`  JTS URL: ${jtsUrl}`);
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password ? '***' + password.slice(-4) : 'NOT SET'}`);
  console.log();

  if (!username || !password || !jtsUrl || !baseUrl) {
    console.error('❌ Missing required environment variables!');
    console.error('Please check your .env file.');
    process.exit(1);
  }

  try {
    console.log('Creating AuthManager...');
    const authManager = new AuthManager({
      jtsUrl,
      baseUrl,
      username,
      password,
    });

    console.log('Attempting authentication...');
    console.log('(This may take a few seconds)\n');

    await authManager.authenticate();

    console.log('✅ Authentication successful!');
    console.log('\nAuth state:', authManager.getAuthState());

  } catch (error) {
    console.error('❌ Authentication failed!');
    console.error('Error:', error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.error('\n⚠️  This might indicate:');
      console.error('  - Invalid credentials');
      console.error('  - Account locked');
      console.error('  - Server authentication issue');
    }
    
    process.exit(1);
  }
}

// Run the test
testAuth().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

// Made with Bob