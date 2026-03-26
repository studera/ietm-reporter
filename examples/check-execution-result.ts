import { IETMClient, IETMClientConfig } from '../src/client/IETMClient';
import { loadConfig } from '../src/config/ConfigManager';

async function checkExecutionResult() {
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
    
    // Check execution result 2879 (latest test)
    const resultId = '2879';
    const clientAny = client as any;
    const services = clientAny.discoveredServices;
    const resultUrl = `${services.basePath}/executionresult/urn:com.ibm.rqm:executionresult:${resultId}`;
    
    console.log(`\nFetching execution result ${resultId}...`);
    console.log(`URL: ${resultUrl}`);
    
    const resultXml = await clientAny.authManager.executeRequest({
      method: 'GET',
      url: resultUrl,
      headers: { 
        'Accept': 'application/xml',
        'Content-Type': undefined
      }
    });
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync(`execution-result-${resultId}-from-ietm.xml`, resultXml);
    console.log(`\n✓ Saved to execution-result-${resultId}-from-ietm.xml`);
    
    // Extract key fields (try multiple namespace prefixes)
    console.log('\n=== Execution Result Analysis ===');
    
    const stateMatch = resultXml.match(/<ns6:state>([^<]+)<\/ns6:state>/) ||
                       resultXml.match(/<ns2:state>([^<]+)<\/ns2:state>/);
    console.log('State (ns6:state or ns2:state):', stateMatch ? stateMatch[1] : 'NOT FOUND');
    
    const startTimeMatch = resultXml.match(/<ns16:starttime>([^<]+)<\/ns16:starttime>/) ||
                           resultXml.match(/<ns2:starttime>([^<]+)<\/ns2:starttime>/);
    console.log('Start Time:', startTimeMatch ? startTimeMatch[1] : 'NOT FOUND');
    
    const endTimeMatch = resultXml.match(/<ns16:endtime>([^<]+)<\/ns16:endtime>/) ||
                         resultXml.match(/<ns2:endtime>([^<]+)<\/ns2:endtime>/);
    console.log('End Time:', endTimeMatch ? endTimeMatch[1] : 'NOT FOUND');
    
    const titleMatch = resultXml.match(/<ns4:title>([^<]+)<\/ns4:title>/) ||
                       resultXml.match(/<ns3:title>([^<]+)<\/ns3:title>/);
    console.log('Title:', titleMatch ? titleMatch[1] : 'NOT FOUND');
    
    const stateLabelMatch = resultXml.match(/<ns2:stateLabel>([^<]+)<\/ns2:stateLabel>/);
    console.log('State Label:', stateLabelMatch ? stateLabelMatch[1] : 'NOT FOUND');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkExecutionResult();

// Made with Bob