import { IETMClient, IETMClientConfig } from '../src/client/IETMClient';
import { loadConfig } from '../src/config/ConfigManager';

async function verifyAttachments() {
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
    
    // Check the latest execution results with attachments
    const resultIds = ['2886', '2887', '2888'];
    
    for (const resultId of resultIds) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Checking Execution Result ${resultId}`);
      console.log('='.repeat(60));
      
      const clientAny = client as any;
      const services = clientAny.discoveredServices;
      const resultUrl = `${services.basePath}/executionresult/urn:com.ibm.rqm:executionresult:${resultId}`;
      
      console.log(`Fetching: ${resultUrl}`);
      
      const resultXml = await clientAny.authManager.executeRequest({
        method: 'GET',
        url: resultUrl,
        headers: { 
          'Accept': 'application/xml',
          'Content-Type': undefined
        }
      });
      
      // Extract attachment information
      const attachmentMatches = resultXml.match(/<ns2:attachment[^>]*>[\s\S]*?<\/ns2:attachment>/g) || [];
      
      console.log(`\nAttachments found: ${attachmentMatches.length}`);
      
      if (attachmentMatches.length > 0) {
        attachmentMatches.forEach((attachment: string, index: number) => {
          console.log(`\n  Attachment ${index + 1}:`);
          
          // Extract attachment details
          const nameMatch = attachment.match(/<ns2:name>([^<]+)<\/ns2:name>/);
          const sizeMatch = attachment.match(/<ns2:size>([^<]+)<\/ns2:size>/);
          const typeMatch = attachment.match(/<ns2:type>([^<]+)<\/ns2:type>/);
          const hrefMatch = attachment.match(/href="([^"]+)"/);
          
          if (nameMatch) console.log(`    Name: ${nameMatch[1]}`);
          if (sizeMatch) console.log(`    Size: ${sizeMatch[1]} bytes`);
          if (typeMatch) console.log(`    Type: ${typeMatch[1]}`);
          if (hrefMatch) console.log(`    URL: ${hrefMatch[1]}`);
        });
      } else {
        console.log('  ⚠️  No attachments found in this execution result');
      }
      
      // Extract state and title for context
      const stateMatch = resultXml.match(/<ns6:state>([^<]+)<\/ns6:state>/) ||
                         resultXml.match(/<ns2:state>([^<]+)<\/ns2:state>/);
      const titleMatch = resultXml.match(/<ns4:title>([^<]+)<\/ns4:title>/) ||
                         resultXml.match(/<ns3:title>([^<]+)<\/ns3:title>/);
      
      console.log(`\nExecution Result Details:`);
      console.log(`  Title: ${titleMatch ? titleMatch[1] : 'N/A'}`);
      console.log(`  State: ${stateMatch ? stateMatch[1] : 'N/A'}`);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('Verification Complete');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyAttachments();

// Made with Bob