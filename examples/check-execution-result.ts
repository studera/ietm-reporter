/**
 * Check Execution Result XML
 * Fetches and displays the XML structure of an execution result
 */

import { IETMClient } from '../src/client/IETMClient';
import { loadConfig } from '../src/config/ConfigManager';

async function checkExecutionResult() {
  const executionResultId = process.argv[2] || '2894';
  
  console.log('='.repeat(80));
  console.log(`Checking Execution Result: ${executionResultId}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // Load configuration
    console.log('1. Loading configuration...');
    const config = loadConfig('config/ietm.config.json');
    console.log('   ✓ Configuration loaded');
    console.log('');

    // Initialize IETM client
    console.log('2. Initializing IETM client...');
    let username = '';
    let password = '';
    if (config.auth.type === 'basic') {
      username = config.auth.username;
      password = config.auth.password;
    }
    
    const clientConfig = {
      qmServerUrl: config.server.baseUrl,
      jtsServerUrl: config.server.jtsUrl || config.server.baseUrl.replace('/qm', '/jts'),
      username,
      password,
      projectName: config.server.projectName || config.server.projectId || '',
      projectArea: config.server.projectId || config.server.projectName || '',
    };
    const client = new IETMClient(clientConfig);
    await client.initialize();
    console.log('   ✓ Client initialized');
    console.log('');

    // Get execution result XML
    console.log('3. Fetching execution result XML...');
    const clientAny = client as any;
    const discoveredServices = clientAny.discoveredServices;
    const authManager = clientAny.authManager;
    const axiosInstance = (authManager as any).axiosInstance;

    // Construct execution result URL with full URN format
    const fullExecutionResultId = executionResultId.startsWith('urn:')
      ? executionResultId
      : `urn:com.ibm.rqm:executionresult:${executionResultId}`;
    
    const executionResultUrl = `${discoveredServices.basePath}/executionresult/${fullExecutionResultId}`;
    console.log(`   URL: ${executionResultUrl}`);
    console.log('');

    const response = await axiosInstance.request({
      method: 'GET',
      url: executionResultUrl,
      headers: {
        'Accept': 'application/xml',
        'OSLC-Core-Version': '2.0',
      },
    });

    console.log('4. Execution Result XML:');
    console.log('='.repeat(80));
    console.log(response.data);
    console.log('='.repeat(80));
    console.log('');

    // Parse and show structure
    const { XMLParser } = require('fast-xml-parser');
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(response.data);
    
    console.log('5. Parsed Structure:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(parsed, null, 2));
    console.log('='.repeat(80));

  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('ERROR: Failed to check execution result');
    console.error('='.repeat(80));
    console.error(error);
    process.exit(1);
  }
}

// Run the check
checkExecutionResult().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Made with Bob
