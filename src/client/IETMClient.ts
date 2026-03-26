/**
 * IETM API Client
 * 
 * Main client for interacting with IBM Engineering Test Management (IETM) server.
 * Provides high-level methods for test case retrieval, execution result posting,
 * and attachment handling.
 */

import { AuthManager } from '../auth/AuthManager';
import { ServiceDiscovery, ServiceDiscoveryConfig, DiscoveredServices } from './ServiceDiscovery';
import { parseXml, buildXml, findFirstNodeByTag, getTextContent, getHref } from '../utils/XmlParser';
import FormData from 'form-data';

/**
 * Configuration for IETM Client
 */
export interface IETMClientConfig {
  /**
   * Base URL of IETM QM server
   */
  qmServerUrl: string;

  /**
   * Base URL of IETM JTS server
   */
  jtsServerUrl: string;

  /**
   * Username for authentication
   */
  username: string;

  /**
   * Password for authentication
   */
  password: string;

  /**
   * Project name in IETM
   */
  projectName: string;

  /**
   * Optional: Pre-configured context ID (skips discovery)
   */
  contextId?: string;
}

/**
 * Test Case representation
 */
export interface TestCase {
  /**
   * Internal ID (numeric or URN)
   */
  id: string;

  /**
   * Test case title
   */
  title: string;

  /**
   * Test case description
   */
  description?: string;

  /**
   * Web ID for browser access
   */
  webId: string;

  /**
   * Full resource URL
   */
  resourceUrl: string;

  /**
   * Test case state (e.g., "Approved", "Draft")
   */
  state?: string;

  /**
   * Owner
   */
  owner?: string;
}

/**
 * Test Execution Record representation
 */
export interface TestExecutionRecord {
  /**
   * Execution record ID
   */
  id: string;

  /**
   * Associated test case ID
   */
  testCaseId: string;

  /**
   * Test plan ID
   */
  testPlanId?: string;

  /**
   * Resource URL
   */
  resourceUrl: string;

  /**
   * State (e.g., "In Progress", "Complete")
   */
  state?: string;
}

/**
 * Execution Result to create
 */
export interface ExecutionResult {
  /**
   * Test case ID or URN
   */
  testCaseId: string;

  /**
   * Test execution record ID (optional, will be created if not provided)
   */
  executionRecordId?: string;

  /**
   * Test result verdict
   */
  verdict: 'passed' | 'failed' | 'blocked' | 'inconclusive' | 'error' | 'incomplete';

  /**
   * Start time (ISO 8601 format)
   */
  startTime: string;

  /**
   * End time (ISO 8601 format)
   */
  endTime: string;

  /**
   * Duration in milliseconds
   */
  duration?: number;

  /**
   * Test result details/notes
   */
  details?: string;

  /**
   * Machine/environment where test was executed
   */
  machine?: string;

  /**
   * Build information
   */
  build?: string;
}

/**
 * Attachment information
 */
export interface Attachment {
  /**
   * File name
   */
  name: string;

  /**
   * File content as Buffer
   */
  content: Buffer;

  /**
   * MIME content type
   */
  contentType: string;

  /**
   * Optional description
   */
  description?: string;
}

/**
 * IETM API Client
 * 
 * Main client for interacting with IETM server.
 */
export class IETMClient {
  private config: IETMClientConfig;
  private authManager: AuthManager;
  private serviceDiscovery: ServiceDiscovery;
  private discoveredServices?: DiscoveredServices;
  private initialized: boolean = false;

  constructor(config: IETMClientConfig) {
    this.config = config;

    // Create AuthManager
    this.authManager = new AuthManager({
      baseUrl: config.qmServerUrl,
      jtsUrl: config.jtsServerUrl,
      username: config.username,
      password: config.password,
    });

    // Create ServiceDiscovery
    const discoveryConfig: ServiceDiscoveryConfig = {
      baseUrl: config.qmServerUrl,
      projectName: config.projectName,
      contextId: config.contextId,
    };
    this.serviceDiscovery = new ServiceDiscovery(discoveryConfig, this.authManager);
  }

  /**
   * Initialize the client
   * Authenticates and discovers services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing IETM Client...');

    // Authenticate
    console.log('1. Authenticating...');
    await this.authManager.authenticate();
    console.log('✓ Authentication successful');

    // Discover services
    console.log('2. Discovering services...');
    this.discoveredServices = await this.serviceDiscovery.discover();
    console.log('✓ Service discovery complete');

    this.initialized = true;
    console.log('✓ IETM Client initialized');
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('IETMClient not initialized. Call initialize() first.');
    }
  }

  /**
   * Get test case by ID
   * 
   * @param testCaseId Test case ID (numeric or URN)
   * @returns Test case details
   */
  async getTestCase(testCaseId: string): Promise<TestCase> {
    this.ensureInitialized();

    // Build test case URL
    const testCaseUrl = this.serviceDiscovery.buildTestCaseUrl(testCaseId);
    
    console.log(`Fetching test case: ${testCaseUrl}`);

    // Fetch test case XML
    const xml = await this.authManager.executeRequest<string>({
      method: 'GET',
      url: testCaseUrl,
      headers: {
        'Accept': 'application/rdf+xml',
        'OSLC-Core-Version': '2.0',
      },
    });

    // Parse XML
    const parsed = parseXml(xml);
    
    // Extract test case details
    // Structure: rdf:RDF -> rqm:TestCase
    const testCaseNode = findFirstNodeByTag(parsed, 'rqm:TestCase') || 
                         findFirstNodeByTag(parsed, 'ns2:TestCase');
    
    if (!testCaseNode) {
      throw new Error(`Failed to parse test case XML for ID: ${testCaseId}`);
    }

    // Extract fields
    const title = getTextContent(findFirstNodeByTag(testCaseNode, 'dc:title') || 
                                 findFirstNodeByTag(testCaseNode, 'dcterms:title') || '');
    
    const description = getTextContent(findFirstNodeByTag(testCaseNode, 'dc:description') || 
                                       findFirstNodeByTag(testCaseNode, 'dcterms:description') || '');
    
    const webId = testCaseNode['@_rdf:about'] || testCaseNode['@_about'] || '';
    
    const state = getTextContent(findFirstNodeByTag(testCaseNode, 'rqm:state') || '');
    
    const ownerNode = findFirstNodeByTag(testCaseNode, 'dc:creator') || 
                      findFirstNodeByTag(testCaseNode, 'dcterms:creator');
    const owner = ownerNode ? getHref(ownerNode) : undefined;

    return {
      id: testCaseId,
      title: title || 'Untitled Test Case',
      description,
      webId,
      resourceUrl: testCaseUrl,
      state,
      owner,
    };
  }

  /**
   * Get test execution records for a test case
   *
   * @param testCaseId Test case ID
   * @returns Array of test execution records
   */
  async getTestExecutionRecords(testCaseId: string): Promise<TestExecutionRecord[]> {
    this.ensureInitialized();

    // Build query URL for execution records
    const queryUrl = this.discoveredServices!.queryUrls.get('TestExecutionRecordQuery');
    if (!queryUrl) {
      throw new Error('TestExecutionRecordQuery capability not found');
    }

    // Build OSLC query to filter by test case
    const testCaseUrl = this.serviceDiscovery.buildTestCaseUrl(testCaseId);
    const oslcQuery = `oslc.where=rqm:testcase="${testCaseUrl}"&oslc.select=*`;
    const fullUrl = `${queryUrl}?${oslcQuery}`;

    console.log(`Querying execution records: ${fullUrl}`);

    // Execute query
    const xml = await this.authManager.executeRequest<string>({
      method: 'GET',
      url: fullUrl,
      headers: {
        'Accept': 'application/rdf+xml',
        'OSLC-Core-Version': '2.0',
      },
    });

    // Parse results
    const parsed = parseXml(xml);
    const records: TestExecutionRecord[] = [];

    // Find all execution record nodes
    const recordNodes = findFirstNodeByTag(parsed, 'rqm:TestcaseExecutionRecord') ||
                        findFirstNodeByTag(parsed, 'ns2:TestcaseExecutionRecord') || [];
    
    const nodeArray = Array.isArray(recordNodes) ? recordNodes : [recordNodes];

    for (const node of nodeArray) {
      if (!node) continue;

      const id = node['@_rdf:about'] || node['@_about'] || '';
      const state = getTextContent(findFirstNodeByTag(node, 'rqm:state') || '');
      const testPlanNode = findFirstNodeByTag(node, 'rqm:testplan');
      const testPlanId = testPlanNode ? getHref(testPlanNode) : undefined;

      records.push({
        id: id.split('/').pop() || id,
        testCaseId,
        testPlanId,
        resourceUrl: id,
        state,
      });
    }

    return records;
  }

  /**
   * Find or create TCER (Test Case Execution Record) for a test case and test plan
   *
   * @param testCaseId Test case ID
   * @param testPlanId Test plan ID
   * @returns TCER ID
   */
  async findOrCreateTCER(testCaseId: string, testPlanId: string): Promise<string> {
    this.ensureInitialized();

    // Query TCERs from feed API with pagination support
    const basePath = this.discoveredServices!.basePath;
    const testCaseUrl = this.serviceDiscovery.buildTestCaseUrl(testCaseId);
    const testPlanUrl = this.serviceDiscovery.buildTestPlanUrl(testPlanId);

    try {
      // Start with first page
      let feedUrl = `${basePath}/executionworkitem?fields=feed/entry/content/executionworkitem/(*|testcase[@href]|testplan[@href])&abbreviate=false`;
      let pageNum = 1;
      
      // Paginate through all pages
      while (feedUrl) {
        const xml = await this.authManager.executeRequest<string>({
          method: 'GET',
          url: feedUrl,
          headers: {
            'Accept': 'application/xml',
          },
        });

        // Parse feed and find TCER matching both test case and test plan
        const parsed = parseXml(xml);
        const entries = findFirstNodeByTag(parsed, 'entry') || [];
        const entryArray = Array.isArray(entries) ? entries : [entries];

        // Search for matching TCER in this page
        for (const entry of entryArray) {
          if (!entry) continue;

          const content = findFirstNodeByTag(entry, 'content');
          const executionWorkItem = findFirstNodeByTag(content, 'executionworkitem');
          
          if (executionWorkItem) {
            const testCaseNode = findFirstNodeByTag(executionWorkItem, 'testcase');
            const testPlanNode = findFirstNodeByTag(executionWorkItem, 'testplan');
            
            const tcHref = testCaseNode ? (testCaseNode['@_href'] || '') : '';
            const tpHref = testPlanNode ? (testPlanNode['@_href'] || '') : '';

            // Check if both test case and test plan match
            if (tcHref.includes(testCaseId) && tpHref.includes(testPlanId)) {
              const idNode = findFirstNodeByTag(entry, 'id');
              const idText = getTextContent(idNode || '');
              const tcerId = idText.split(':').pop() || '';
              return tcerId;
            }
          }
        }

        // Look for next page link
        const feed = findFirstNodeByTag(parsed, 'feed');
        const links = findFirstNodeByTag(feed, 'link') || [];
        const linkArray = Array.isArray(links) ? links : [links];
        
        // Find link with rel="next"
        feedUrl = '';
        for (const link of linkArray) {
          if (link && link['@_rel'] === 'next') {
            feedUrl = link['@_href'] || '';
            break;
          }
        }
        
        if (feedUrl) {
          pageNum++;
        }
      }

      // No matching TCER found after searching all pages, create a new one
      return await this.createTCER(testCaseId, testPlanId);

    } catch (error) {
      // Try to create a new TCER
      return await this.createTCER(testCaseId, testPlanId);
    }
  }

  /**
   * Create a new TCER (Test Case Execution Record)
   *
   * @param testCaseId Test case ID
   * @param testPlanId Test plan ID
   * @returns Created TCER ID
   */
  async createTCER(testCaseId: string, testPlanId: string): Promise<string> {
    this.ensureInitialized();

    const basePath = this.discoveredServices!.basePath;
    const testCaseUrl = this.serviceDiscovery.buildTestCaseUrl(testCaseId);
    const testPlanUrl = this.serviceDiscovery.buildTestPlanUrl(testPlanId);

    // Build TCER XML
    const tcerXml = `<?xml version="1.0" encoding="UTF-8"?>
<ns2:executionworkitem xmlns:ns2="http://jazz.net/xmlns/alm/qm/v0.1/" xmlns:ns1="http://schema.ibm.com/vega/2008/" xmlns:ns3="http://purl.org/dc/elements/1.1/" xmlns:ns4="http://jazz.net/xmlns/prod/jazz/process/0.6/" xmlns:ns5="http://jazz.net/xmlns/alm/v0.1/" xmlns:ns6="http://purl.org/dc/terms/" xmlns:ns7="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:ns8="http://jazz.net/xmlns/alm/qm/v0.1/executionworkitem/v0.1" xmlns:ns9="http://jazz.net/xmlns/alm/qm/v0.1/catalog/v0.1" xmlns:ns10="http://open-services.net/ns/core#" xmlns:ns11="http://open-services.net/ns/qm#" xmlns:ns12="http://jazz.net/xmlns/prod/jazz/rqm/process/1.0/" xmlns:ns13="http://www.w3.org/2000/01/rdf-schema#" xmlns:ns14="http://jazz.net/ns/qm/rqm#">
    <ns2:testcase href="${testCaseUrl}"/>
    <ns2:testplan href="${testPlanUrl}"/>
</ns2:executionworkitem>`;

    const createUrl = `${basePath}/executionworkitem`;

    try {
      // POST to create TCER
      const response = await this.authManager.executeRequest<string>({
        method: 'POST',
        url: createUrl,
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml',
        },
        data: tcerXml,
      });

      // Parse response to get created TCER ID
      const parsed = parseXml(response);
      
      const executionWorkItem = findFirstNodeByTag(parsed, 'ns2:executionworkitem') ||
                                 findFirstNodeByTag(parsed, 'executionworkitem');
      
      if (!executionWorkItem) {
        throw new Error('Failed to parse TCER creation response');
      }
      
      // Try to get resource URL from attributes first
      let resourceUrl = executionWorkItem['@_ns7:about'] || executionWorkItem['@_rdf:about'] || executionWorkItem['@_ns1:about'] || '';
      
      // If not in attributes, try ns4:identifier element
      if (!resourceUrl) {
        const identifierNode = findFirstNodeByTag(executionWorkItem, 'ns4:identifier') ||
                               findFirstNodeByTag(executionWorkItem, 'identifier') ||
                               findFirstNodeByTag(executionWorkItem, 'dc:identifier');
        resourceUrl = getTextContent(identifierNode || '');
      }
      
      // Extract TCER ID from URL
      // Format 1: urn:com.ibm.rqm:executionworkitem:1829 -> extract "1829"
      // Format 2: //jazz.net/.../executionworkitem/slug__9F0HACkXEfGG4t7UU5gGkg -> extract "slug__9F0HACkXEfGG4t7UU5gGkg"
      let tcerId = '';
      
      if (resourceUrl.includes('/executionworkitem/')) {
        // Format 2: Extract from URL path
        tcerId = resourceUrl.split('/executionworkitem/').pop() || '';
      } else if (resourceUrl.startsWith('urn:')) {
        // Format 1: Extract from URN (last part after colon)
        tcerId = resourceUrl.split(':').pop() || '';
      } else {
        // Fallback: try last part after colon
        tcerId = resourceUrl.split(':').pop() || '';
      }

      if (!tcerId) {
        throw new Error(`Failed to extract TCER ID from response: ${resourceUrl}`);
      }

      return tcerId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create execution result
   * 
   * @param result Execution result details
   * @returns Created execution result ID
   */
  async createExecutionResult(result: ExecutionResult): Promise<string> {
    this.ensureInitialized();

    // Build execution result XML
    const xml = this.buildExecutionResultXml(result);

    // Get base path for posting
    const basePath = this.discoveredServices!.basePath;
    const executionResultUrl = `${basePath}/executionresult`;

    console.log(`Creating execution result at: ${executionResultUrl}`);

    // Post execution result
    const response = await this.authManager.executeRequest<string>({
      method: 'POST',
      url: executionResultUrl,
      headers: {
        'Content-Type': 'application/rdf+xml',
        'Accept': 'application/rdf+xml',
        'OSLC-Core-Version': '2.0',
      },
      data: xml,
    });

    // Extract created resource URL from response
    const parsed = parseXml(response);
    const resultNode = findFirstNodeByTag(parsed, 'rqm:ExecutionResult') ||
                       findFirstNodeByTag(parsed, 'ns2:ExecutionResult');
    
    if (!resultNode) {
      throw new Error('Failed to parse execution result response');
    }

    const resourceUrl = resultNode['@_rdf:about'] || resultNode['@_about'] || '';
    const resultId = resourceUrl.split('/').pop() || resourceUrl;

    console.log(`✓ Execution result created: ${resultId}`);
    return resultId;
  }

  /**
   * Upload attachment to execution result
   * 
   * @param resultId Execution result ID
   * @param attachment Attachment details
   * @returns Attachment URL
   */
  async uploadAttachment(resultId: string, attachment: Attachment): Promise<string> {
    this.ensureInitialized();

    // Build attachment URL
    const basePath = this.discoveredServices!.basePath;
    const attachmentUrl = `${basePath}/executionresult/${resultId}/attachment`;

    console.log(`Uploading attachment to: ${attachmentUrl}`);

    // Create form data
    const formData = new FormData();
    formData.append('file', attachment.content, {
      filename: attachment.name,
      contentType: attachment.contentType,
    });

    if (attachment.description) {
      formData.append('description', attachment.description);
    }

    // Upload attachment
    const response = await this.authManager.executeRequest<string>({
      method: 'POST',
      url: attachmentUrl,
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/rdf+xml',
      },
      data: formData,
    });

    // Extract attachment URL from response
    const parsed = parseXml(response);
    const attachmentNode = findFirstNodeByTag(parsed, 'rqm:Attachment') ||
                           findFirstNodeByTag(parsed, 'ns2:Attachment');
    
    if (!attachmentNode) {
      throw new Error('Failed to parse attachment response');
    }

    const attachmentResourceUrl = attachmentNode['@_rdf:about'] || attachmentNode['@_about'] || '';
    
    console.log(`✓ Attachment uploaded: ${attachmentResourceUrl}`);
    return attachmentResourceUrl;
  }

  /**
   * Build execution result XML
   * 
   * @param result Execution result details
   * @returns XML string
   */
  private buildExecutionResultXml(result: ExecutionResult): string {
    const contextId = this.serviceDiscovery.getContextId();
    const testCaseUrl = this.serviceDiscovery.buildTestCaseUrl(result.testCaseId);
    
    // Map verdict to IETM state
    const stateMap: Record<string, string> = {
      'passed': 'com.ibm.rqm.execution.common.state.passed',
      'failed': 'com.ibm.rqm.execution.common.state.failed',
      'blocked': 'com.ibm.rqm.execution.common.state.blocked',
      'inconclusive': 'com.ibm.rqm.execution.common.state.inconclusive',
      'error': 'com.ibm.rqm.execution.common.state.error',
      'incomplete': 'com.ibm.rqm.execution.common.state.incomplete',
    };

    const state = stateMap[result.verdict] || stateMap['inconclusive'];

    // Build XML object (using any to allow dynamic properties)
    const xmlObj: any = {
      'rdf:RDF': {
        '@_xmlns:rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        '@_xmlns:rqm': 'http://jazz.net/xmlns/prod/jazz/rqm/qm/1.0/',
        '@_xmlns:dcterms': 'http://purl.org/dc/terms/',
        'rqm:ExecutionResult': {
          'dcterms:title': result.details || `Execution Result for ${result.testCaseId}`,
          'dcterms:description': result.details || '',
          'rqm:state': {
            '@_rdf:resource': state,
          },
          'rqm:testcase': {
            '@_rdf:resource': testCaseUrl,
          },
          'rqm:starttime': result.startTime,
          'rqm:endtime': result.endTime,
        },
      },
    };

    // Add execution record if provided
    if (result.executionRecordId) {
      const executionRecordUrl = this.serviceDiscovery.buildExecutionWorkItemUrl(result.executionRecordId);
      xmlObj['rdf:RDF']['rqm:ExecutionResult']['rqm:executionworkitem'] = {
        '@_rdf:resource': executionRecordUrl,
      };
    }

    // Add machine if provided
    if (result.machine) {
      xmlObj['rdf:RDF']['rqm:ExecutionResult']['rqm:machine'] = result.machine;
    }

    // Add build if provided
    if (result.build) {
      xmlObj['rdf:RDF']['rqm:ExecutionResult']['rqm:build'] = result.build;
    }

    // Build XML string
    return buildXml(xmlObj);
  }

  /**
   * Get discovered services
   * 
   * @returns Discovered services or undefined if not initialized
   */
  getDiscoveredServices(): DiscoveredServices | undefined {
    return this.discoveredServices;
  }

  /**
   * Get context ID
   * 
   * @returns Context ID
   */
  getContextId(): string {
    this.ensureInitialized();
    return this.serviceDiscovery.getContextId();
  }

  /**
   * Clear authentication state
   */
  async clearAuth(): Promise<void> {
    await this.authManager.clearAuth();
    this.initialized = false;
    this.discoveredServices = undefined;
  }
}

// Made with Bob
