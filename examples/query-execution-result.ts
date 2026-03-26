import { IETMClient, IETMClientConfig } from '../src/client/IETMClient';
import { loadConfig } from '../src/config/ConfigManager';

async function queryExecutionResult() {
  try {
    console.log('Loading configuration...');
    const config = loadConfig();
    
    console.log('Initializing IETM Client...');
    const clientConfig: IETMClientConfig = {
      qmServerUrl: config.server.baseUrl,
      jtsServerUrl: config.server.jtsUrl || config.server.baseUrl.replace('-qm', '-jts'),
      username: config.auth.type === 'basic' ? config.auth.username : '',
      password: config.auth.type === 'basic' ? config.auth.password : '',
      projectName: config.server.projectName || '',
      contextId: config.server.contextId
    };
    const client = new IETMClient(clientConfig);
    await client.initialize();
    
    console.log('\nQuerying execution results using OSLC feed...');
    // Access private authManager using any type
    const clientAny = client as any;
    const services = clientAny.discoveredServices;
    console.log('Query capabilities:', Object.keys(services.queryCapabilities || {}));
    const queryUrl = services.queryCapabilities?.['TestResultQuery'] ||
                     'https://jazz.net/sandbox01-qm/oslc_qm/contexts/_8_TkcFwFEfCGYIoRgUkqqw/resources/com.ibm.rqm.execution.ExecutionResult';
    console.log('Using query URL:', queryUrl);
    
    // Query for recent execution results
    const response = await clientAny.authManager.executeRequest({
      method: 'GET',
      url: queryUrl,
      headers: { 'Accept': 'application/atom+xml' }
    });
    
    // Save to file for analysis
    const fs = require('fs');
    fs.writeFileSync('execution-results-feed.xml', response);
    console.log('\n✓ Feed saved to execution-results-feed.xml');
    
    // Extract first few entries
    const entries = response.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    console.log(`\nFound ${entries.length} execution results in feed`);
    
    if (entries.length > 0) {
      console.log('\n=== First Entry Analysis ===');
      const firstEntry = entries[0];
      
      // Extract ID
      const idMatch = firstEntry.match(/<id>([^<]+)<\/id>/);
      console.log('Entry ID:', idMatch ? idMatch[1] : 'NOT FOUND');
      
      // Extract title
      const titleMatch = firstEntry.match(/<title[^>]*>([^<]+)<\/title>/);
      console.log('Title:', titleMatch ? titleMatch[1] : 'NOT FOUND');
      
      // Extract content link
      const contentMatch = firstEntry.match(/<content[^>]*src="([^"]+)"/);
      if (contentMatch) {
        console.log('Content URL:', contentMatch[1]);
        
        // Fetch the actual execution result
        console.log('\n=== Fetching Execution Result Details ===');
        const resultXml = await clientAny.authManager.executeRequest({
          method: 'GET',
          url: contentMatch[1],
          headers: { 'Accept': 'application/xml' }
        });
        
        fs.writeFileSync('execution-result-detail.xml', resultXml);
        console.log('✓ Result saved to execution-result-detail.xml');
        
        // Extract state elements
        const stateMatch = resultXml.match(/<ns2:state>([^<]+)<\/ns2:state>/);
        const currentStateMatch = resultXml.match(/<ns2:currentstate>([^<]+)<\/ns2:currentstate>/);
        
        console.log('\n=== State Analysis ===');
        console.log('Verdict State (ns2:state):', stateMatch ? stateMatch[1] : 'NOT FOUND');
        console.log('Workflow State (ns2:currentstate):', currentStateMatch ? currentStateMatch[1] : 'NOT FOUND');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

queryExecutionResult();

// Made with Bob
