/**
 * Debug script to inspect root services XML
 */

import { AuthManager, AuthConfig } from '../src/auth';
import { parseXml } from '../src/utils/XmlParser';
import * as fs from 'fs';

async function main() {
  const authConfig: AuthConfig = {
    baseUrl: 'https://jazz.net/sandbox01-qm',
    jtsUrl: 'https://jazz.net/sandbox01-jts',
    username: 'studera',
    password: 'Modus1odus123##',
  };

  const authManager = new AuthManager(authConfig);
  
  try {
    await authManager.authenticate();
    console.log('✓ Authenticated\n');

    const rootServicesUrl = `${authConfig.baseUrl}/rootservices`;
    console.log(`Fetching: ${rootServicesUrl}\n`);
    
    const xml = await authManager.executeRequest<string>({
      method: 'GET',
      url: rootServicesUrl,
      headers: { 'Accept': 'application/xml' },
    });

    console.log('=== Raw XML ===');
    console.log(xml);
    console.log('\n=== Parsed Object ===');
    const parsed = parseXml(xml);
    console.log(JSON.stringify(parsed, null, 2));

    // Save to file for inspection
    fs.writeFileSync('rootservices.xml', xml);
    fs.writeFileSync('rootservices.json', JSON.stringify(parsed, null, 2));
    console.log('\n✓ Saved to rootservices.xml and rootservices.json');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await authManager.clearAuth();
  }
}

main();

// Made with Bob
