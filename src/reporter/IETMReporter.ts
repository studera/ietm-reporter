/**
 * IETM Playwright Reporter
 * Custom Playwright reporter for sending results to IETM
 */

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
  TestError,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { IETMClient } from '../client/IETMClient';
import { loadConfig } from '../config/ConfigManager';
import {
  ExecutionResult,
  ExecutionState,
  StepResult,
  mapPlaywrightStatusToState,
  formatDateToISO,
  createResourceLink,
} from '../models/ExecutionResult';
import { ExecutionResultBuilder } from '../builders/ExecutionResultBuilder';
import { AttachmentHandler } from '../attachments/AttachmentHandler';

export interface IETMReporterOptions {
  /** Path to IETM configuration file */
  configPath?: string;
  
  /** Enable/disable reporter */
  enabled?: boolean;
  
  /** Output directory for artifacts */
  outputDir?: string;
  
  /** Upload screenshots on failure */
  uploadScreenshots?: boolean;
  
  /** Upload videos */
  uploadVideos?: boolean;
  
  /** Upload trace files */
  uploadTraces?: boolean;
  
  /** Batch size for result uploads */
  batchSize?: number;
  
  /** Custom test case ID extractor */
  testCaseIdExtractor?: (test: TestCase) => string | null;
  
  /** Custom hooks */
  hooks?: {
    onTestStart?: (test: TestCase) => void | Promise<void>;
    onTestEnd?: (test: TestCase, result: TestResult) => void | Promise<void>;
    onRunEnd?: (results: CollectedTestResult[]) => void | Promise<void>;
  };
}

export interface CollectedTestResult {
  test: TestCase;
  result: TestResult;
  testCaseId?: string;
  executionResult?: ExecutionResult;
  artifacts: {
    screenshots: string[];
    videos: string[];
    traces: string[];
  };
}

export class IETMReporter implements Reporter {
  private options: Required<IETMReporterOptions>;
  private client?: IETMClient;
  private clientInitialized: Promise<void> | null = null;
  private results: CollectedTestResult[] = [];
  private startTime?: Date;
  private config?: any;

  constructor(options: IETMReporterOptions = {}) {
    this.options = {
      configPath: options.configPath || 'config/ietm.config.json',
      enabled: options.enabled !== false,
      outputDir: options.outputDir || 'ietm-results',
      uploadScreenshots: options.uploadScreenshots !== false,
      uploadVideos: options.uploadVideos !== false,
      uploadTraces: options.uploadTraces !== false,
      batchSize: options.batchSize || 10,
      testCaseIdExtractor: options.testCaseIdExtractor || this.defaultTestCaseIdExtractor,
      hooks: options.hooks || {},
    };
  }

  /**
   * Called once before running tests
   */
  async onBegin(config: FullConfig, suite: Suite): Promise<void> {
    console.log('\n========================================');
    console.log('[IETM Reporter] Starting IETM Reporter');
    console.log('[IETM Reporter] Enabled:', this.options.enabled);
    console.log('[IETM Reporter] Config path:', this.options.configPath);
    console.log('========================================\n');
    
    if (!this.options.enabled) return;

    this.startTime = new Date();
    
    // Load IETM configuration
    try {
      if (fs.existsSync(this.options.configPath)) {
        console.log('[IETM Reporter] Loading configuration from:', this.options.configPath);
        this.config = loadConfig(this.options.configPath);
        console.log('[IETM Reporter] Configuration loaded successfully');
      } else {
        console.warn('[IETM Reporter] Configuration file not found:', this.options.configPath);
      }
    } catch (error) {
      console.error('[IETM Reporter] Failed to load configuration:', error);
    }

    // Create output directory
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Initialize IETM client if config is available
    if (this.config) {
      // Store the initialization promise so we can await it later
      this.clientInitialized = (async () => {
        try {
          // Map IETMConfig to IETMClientConfig
          const clientConfig = {
            qmServerUrl: this.config.server.baseUrl,
            jtsServerUrl: this.config.server.jtsUrl || this.config.server.baseUrl.replace('-qm', '-jts'),
            username: 'username' in this.config.auth ? this.config.auth.username : '',
            password: 'password' in this.config.auth ? this.config.auth.password : '',
            projectName: this.config.server.projectName || '',
            contextId: this.config.server.contextId,
          };
          
          this.client = new IETMClient(clientConfig);
          await this.client.initialize();
        } catch (error) {
          console.error('[IETM Reporter] Failed to initialize IETM client:', error);
          // Don't throw - allow tests to continue
        }
      })();
    }
  }

  /**
   * Wait for client initialization to complete
   */
  private async ensureClientInitialized(): Promise<void> {
    if (this.clientInitialized) {
      await this.clientInitialized;
    }
  }

  /**
   * Called when a test starts
   */
  async onTestBegin(test: TestCase, result: TestResult): Promise<void> {
    if (!this.options.enabled) return;

    // Note: Don't extract test case ID here - annotations are added during test execution
    // via test.info().annotations.push(), so they won't be available yet
    console.log(`[IETM Reporter] Test started: ${test.title}`);

    // Call custom hook
    if (this.options.hooks.onTestStart) {
      try {
        await this.options.hooks.onTestStart(test);
      } catch (error) {
        console.error('[IETM Reporter] Error in onTestStart hook:', error);
      }
    }
  }

  /**
   * Called when a test ends
   */
  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    if (!this.options.enabled) return;

    const testCaseId = this.options.testCaseIdExtractor(test);
    
    // Just collect test result data - don't build execution results yet
    const collectedResult: CollectedTestResult = {
      test,
      result,
      testCaseId: testCaseId || undefined,
      artifacts: {
        screenshots: this.collectScreenshots(result),
        videos: this.collectVideos(result),
        traces: this.collectTraces(result),
      },
    };

    this.results.push(collectedResult);

    // Call custom hook
    if (this.options.hooks.onTestEnd) {
      try {
        await this.options.hooks.onTestEnd(test, result);
      } catch (error) {
        console.error('[IETM Reporter] Error in onTestEnd hook:', error);
      }
    }
  }

  /**
   * Called after all tests have finished
   */
  async onEnd(result: FullResult): Promise<void> {
    if (!this.options.enabled) return;

    // Wait for client initialization to complete
    await this.ensureClientInitialized();

    const endTime = new Date();
    const duration = this.startTime ? endTime.getTime() - this.startTime.getTime() : 0;

    // Wait for client initialization to complete
    await this.ensureClientInitialized();

    // Now build execution results for tests with IETM mappings
    for (const collectedResult of this.results) {
      if (collectedResult.testCaseId && !collectedResult.executionResult) {
        try {
          collectedResult.executionResult = await this.buildExecutionResult(
            collectedResult.test,
            collectedResult.result,
            collectedResult.testCaseId,
            collectedResult.artifacts
          );
        } catch (error) {
          console.error(
            `[IETM Reporter] Failed to build execution result for ${collectedResult.test.title}:`,
            error
          );
        }
      }
    }

    // Save results to file
    await this.saveResultsToFile();

    // Upload results to IETM
    if (this.client) {
      await this.uploadResultsToIETM();
    }

    // Call custom hook
    if (this.options.hooks.onRunEnd) {
      try {
        await this.options.hooks.onRunEnd(this.results);
      } catch (error) {
        console.error('[IETM Reporter] Error in onRunEnd hook:', error);
      }
    }

    console.log('[IETM Reporter] Reporting complete');
  }

  /**
   * Default test case ID extractor from annotations
   */
  private defaultTestCaseIdExtractor(test: TestCase): string | null {
    // Look for annotation with type 'ietm-test-case'
    const annotation = test.annotations.find(
      (a) => a.type === 'ietm-test-case' || a.type === 'test-case-id'
    );
    
    if (annotation && annotation.description) {
      return annotation.description;
    }

    // Try to extract from test title (e.g., "[TC-123] Test title")
    const match = test.title.match(/\[TC-(\d+)\]/i);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  }

  /**
   * Collect screenshot paths from test result
   */
  private collectScreenshots(result: TestResult): string[] {
    if (!this.options.uploadScreenshots) return [];

    return result.attachments
      .filter((a) => a.name === 'screenshot' && a.path)
      .map((a) => a.path!)
      .filter((p) => fs.existsSync(p));
  }

  /**
   * Collect video paths from test result
   */
  private collectVideos(result: TestResult): string[] {
    if (!this.options.uploadVideos) return [];

    return result.attachments
      .filter((a) => a.name === 'video' && a.path)
      .map((a) => a.path!)
      .filter((p) => fs.existsSync(p));
  }

  /**
   * Collect trace paths from test result
   */
  private collectTraces(result: TestResult): string[] {
    if (!this.options.uploadTraces) return [];

    return result.attachments
      .filter((a) => a.name === 'trace' && a.path)
      .map((a) => a.path!)
      .filter((p) => fs.existsSync(p));
  }

  /**
   * Build execution result from Playwright test result
   */
  private async buildExecutionResult(
    test: TestCase,
    result: TestResult,
    testCaseId: string,
    artifacts: CollectedTestResult['artifacts']
  ): Promise<ExecutionResult> {
    const state = mapPlaywrightStatusToState(result.status);
    const startTime = new Date(result.startTime);
    const endTime = new Date(result.startTime.getTime() + result.duration);

    // Get username from config or environment
    const username = this.config?.auth?.username || process.env.IETM_USERNAME || 'playwright';

    // Build test case URL
    const contextId = this.client?.getContextId() || '';
    const baseUrl = this.config?.server?.baseUrl || '';
    const testCaseUrl = `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/testcase/urn:com.ibm.rqm:testcase:${testCaseId}`;

    // Get test plan ID from test annotations (preferred) or fall back to config
    let testPlanId = test.annotations.find(a => a.type === 'ietm-test-plan')?.description;
    if (!testPlanId) {
      testPlanId = this.config?.testPlan?.id;
    }
    if (!testPlanId) {
      throw new Error('Test plan ID not found. Please add ietm-test-plan annotation to the test or set testPlan.id in ietm.config.json');
    }

    // Find or create TCER (Test Case Execution Record) for this test case and test plan
    let tcerId: string;
    try {
      console.log(`[IETM Reporter] Finding/creating TCER for test case ${testCaseId} and test plan ${testPlanId}`);
      tcerId = await this.client!.findOrCreateTCER(testCaseId, testPlanId);
      console.log(`[IETM Reporter] ✓ Using TCER ${tcerId} for test case ${testCaseId} and test plan ${testPlanId}`);
    } catch (error) {
      console.error(`[IETM Reporter] Failed to find or create TCER for test case ${testCaseId}:`, error);
      throw new Error(`Cannot create execution result without TCER: ${error}`);
    }

    // Build execution work item URL
    // tcerId can be:
    // 1. Full URN: "urn:com.ibm.rqm:executionworkitem:1829" - use as-is
    // 2. Numeric ID: "1829" - add URN prefix
    // 3. Slug: "slug__9F0HACkXEfGG4t7UU5gGkg" - use as-is without URN prefix
    let executionWorkItemUrl: string;
    if (tcerId.startsWith('urn:')) {
      // Already a full URN
      executionWorkItemUrl = `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/executionworkitem/${tcerId}`;
    } else if (tcerId.startsWith('slug_')) {
      // Slug format - use directly without URN prefix
      executionWorkItemUrl = `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/executionworkitem/${tcerId}`;
    } else {
      // Numeric ID - add URN prefix
      executionWorkItemUrl = `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/executionworkitem/urn:com.ibm.rqm:executionworkitem:${tcerId}`;
    }

    const executionResult: ExecutionResult = {
      title: `${test.title} - ${result.status}`,
      creator: username,
      owner: username,
      state,
      machine: process.env.HOSTNAME || 'localhost',
      startTime: formatDateToISO(startTime),
      endTime: formatDateToISO(endTime),
      tester: username,
      testCase: createResourceLink(testCaseUrl),
      executionWorkItem: createResourceLink(executionWorkItemUrl),
      adapterId: 'playwright-ietm-reporter',
    };

    // Add step results if test has steps
    if (result.steps && result.steps.length > 0) {
      executionResult.stepResults = result.steps.map((step, index) => {
        const stepStart = new Date(step.startTime);
        const stepEnd = new Date(step.startTime.getTime() + step.duration);
        const stepState = step.error ? ExecutionState.FAILED : ExecutionState.PASSED;

        const stepResult: StepResult = {
          stepIndex: index + 1,
          startTime: formatDateToISO(stepStart),
          endTime: formatDateToISO(stepEnd),
          result: stepState,
          description: step.title,
          tester: username,
        };

        // Add error information if step failed
        if (step.error) {
          stepResult.actualResult = this.formatError(step.error);
        }

        return stepResult;
      });
    }

    // Add error information for failed tests
    if (result.error) {
      if (!executionResult.stepResults) {
        executionResult.stepResults = [];
      }
      
      executionResult.stepResults.push({
        stepIndex: executionResult.stepResults.length + 1,
        startTime: executionResult.startTime,
        endTime: executionResult.endTime,
        result: ExecutionState.FAILED,
        description: 'Test Failure',
        tester: username,
        actualResult: this.formatError(result.error),
      });
    }

    return executionResult;
  }

  /**
   * Format error for display
   */
  private formatError(error: TestError): string {
    let formatted = error.message || 'Unknown error';
    
    if (error.stack) {
      formatted += '\n\nStack trace:\n' + error.stack;
    }

    return formatted;
  }

  /**
   * Save results to JSON file
   */
  private async saveResultsToFile(): Promise<void> {
    const outputPath = path.join(this.options.outputDir, 'ietm-results.json');
    
    const data = {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      results: this.results.map((r) => ({
        title: r.test.title,
        file: r.test.location.file,
        line: r.test.location.line,
        status: r.result.status,
        duration: r.result.duration,
        testCaseId: r.testCaseId,
        artifacts: r.artifacts,
        error: r.result.error ? {
          message: r.result.error.message,
          stack: r.result.error.stack,
        } : undefined,
      })),
    };

    try {
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`[IETM Reporter] Results saved to ${outputPath}`);
    } catch (error) {
      console.error('[IETM Reporter] Failed to save results:', error);
    }
  }

  /**
   * Upload results to IETM
   */
  private async uploadResultsToIETM(): Promise<void> {
    if (!this.client) {
      console.log('[IETM Reporter] No IETM client available');
      return;
    }

    // Filter results that have test case IDs and execution results
    const resultsToUpload = this.results.filter(
      (r) => r.testCaseId && r.executionResult
    );

    if (resultsToUpload.length === 0) {
      console.log('[IETM Reporter] No results to upload (no test case mappings)');
      return;
    }

    console.log(`[IETM Reporter] Uploading ${resultsToUpload.length} results to IETM...`);

    let successCount = 0;
    let failureCount = 0;

    // Upload in batches
    for (let i = 0; i < resultsToUpload.length; i += this.options.batchSize) {
      const batch = resultsToUpload.slice(i, i + this.options.batchSize);
      
      console.log(
        `[IETM Reporter] Uploading batch ${Math.floor(i / this.options.batchSize) + 1}/${Math.ceil(resultsToUpload.length / this.options.batchSize)}`
      );

      for (const result of batch) {
        try {
          // Build XML using ExecutionResultBuilder (proper IETM format)
          const builder = new ExecutionResultBuilder(result.executionResult!);
          const xml = builder.build();

          // Save XML to file for debugging
          const xmlPath = path.join(
            this.options.outputDir,
            `execution-result-${result.testCaseId}.xml`
          );
          fs.writeFileSync(xmlPath, xml);

          // Upload XML directly to IETM
          const executionResultId = await this.uploadExecutionResultXml(
            result.testCaseId!,
            xml
          );

          console.log(
            `[IETM Reporter] ✓ Uploaded result for test case ${result.testCaseId} - IETM Execution Result ID: ${executionResultId}`
          );

          // Upload attachments if any exist
          await this.uploadAttachments(executionResultId, result);

          successCount++;
        } catch (error) {
          console.error(
            `[IETM Reporter] ✗ Failed to upload result for test case ${result.testCaseId}:`,
            error
          );
          failureCount++;
        }
      }
    }

    console.log(
      `[IETM Reporter] Upload complete: ${successCount} succeeded, ${failureCount} failed`
    );
  }

  /**
   * Upload execution result XML directly to IETM
   * Uses POST-GET-PUT pattern to ensure state is set correctly
   */
  private async uploadExecutionResultXml(testCaseId: string, xml: string): Promise<string> {
    if (!this.client) {
      throw new Error('IETM client not initialized');
    }

    // Get the discovered services to build the URL
    const services = this.client.getDiscoveredServices();
    if (!services) {
      throw new Error('Services not discovered');
    }

    const executionResultUrl = `${services.basePath}/executionresult`;
    
    console.log(`Creating execution result at: ${executionResultUrl}`);

    // STEP 1: POST to create execution result
    // Note: IETM ignores the state on POST and sets it to "inprogress" by default
    const response = await (this.client as any).authManager.executeRequest({
      method: 'POST',
      url: executionResultUrl,
      headers: {
        'Content-Type': 'application/rdf+xml',
        'Accept': 'application/rdf+xml',
        'OSLC-Core-Version': '2.0',
      },
      data: xml,
    }) as string;

    // Extract created resource ID from response
    const { parseXml, findFirstNodeByTag, getTextContent, buildXml } = require('../utils/XmlParser');
    
    try {
      const parsed = parseXml(response);
      
      // IETM returns an Atom feed with resultId - try multiple possible node names
      const resultIdNode = findFirstNodeByTag(parsed, 'ns2:resultId') ||
                           findFirstNodeByTag(parsed, 'resultId') ||
                           findFirstNodeByTag(parsed, 'rqm:resultId') ||
                           findFirstNodeByTag(parsed, 'qm:resultId');
      
      if (!resultIdNode) {
        console.error('[IETM Reporter] Could not find resultId in response. Response structure:', JSON.stringify(parsed, null, 2).substring(0, 1000));
        throw new Error('Failed to extract execution result ID from response');
      }

      // Extract the text content of the resultId node
      const resultId = getTextContent(resultIdNode);
      
      if (!resultId) {
        console.error('[IETM Reporter] resultId node found but has no text content:', resultIdNode);
        throw new Error('Failed to extract execution result ID - node has no text content');
      }
      const resultUrl = `${services.basePath}/executionresult/urn:com.ibm.rqm:executionresult:${resultId}`;
      
      console.log(`[IETM Reporter] ✓ Execution result created with ID: ${resultId}`);

      // STEP 2: GET the created execution result back from IETM
      console.log(`[IETM Reporter] Fetching created execution result to update state...`);
      const createdXml = await (this.client as any).authManager.executeRequest({
        method: 'GET',
        url: resultUrl,
        headers: {
          'Accept': 'application/xml',
          'Content-Type': undefined, // Remove default Content-Type for GET request
          'OSLC-Core-Version': '2.0',
        },
      }) as string;

      // STEP 3: Modify the XML to set the correct state
      const createdParsed = parseXml(createdXml);
      const createdResultNode = findFirstNodeByTag(createdParsed, 'ns2:executionresult') ||
                                findFirstNodeByTag(createdParsed, 'executionresult');
      
      if (!createdResultNode) {
        console.warn('[IETM Reporter] Could not find execution result node in GET response, skipping state update');
        return resultId;
      }

      // Helper function to set text content on a node (handles both string and object nodes)
      const setTextContent = (parentNode: any, tagName: string, value: string) => {
        const node = parentNode[tagName];
        if (typeof node === 'string') {
          // Node is a simple string, replace it
          parentNode[tagName] = value;
        } else if (node && typeof node === 'object') {
          // Node is an object with #text property
          node['#text'] = value;
        }
      };
      
      // Extract the desired state and endtime from the original XML we sent
      const originalParsed = parseXml(xml);
      const originalResultNode = findFirstNodeByTag(originalParsed, 'ns2:executionresult') ||
                                 findFirstNodeByTag(originalParsed, 'executionresult');
      const originalStateNode = findFirstNodeByTag(originalResultNode, 'ns2:state') ||
                                findFirstNodeByTag(originalResultNode, 'state');
      const originalEndtimeNode = findFirstNodeByTag(originalResultNode, 'ns2:endtime') ||
                                  findFirstNodeByTag(originalResultNode, 'endtime');
      
      if (originalStateNode) {
        const desiredState = getTextContent(originalStateNode);
        
        // Update the state in the retrieved XML (try multiple namespace prefixes)
        if (createdResultNode['ns6:state']) {
          setTextContent(createdResultNode, 'ns6:state', desiredState);
        } else if (createdResultNode['ns2:state']) {
          setTextContent(createdResultNode, 'ns2:state', desiredState);
        } else if (createdResultNode['state']) {
          setTextContent(createdResultNode, 'state', desiredState);
        }
        
        // Update endtime if we have it in original
        if (originalEndtimeNode) {
          const desiredEndtime = getTextContent(originalEndtimeNode);
          if (createdResultNode['ns16:endtime']) {
            setTextContent(createdResultNode, 'ns16:endtime', desiredEndtime);
          } else if (createdResultNode['ns2:endtime']) {
            setTextContent(createdResultNode, 'ns2:endtime', desiredEndtime);
          } else if (createdResultNode['endtime']) {
            setTextContent(createdResultNode, 'endtime', desiredEndtime);
          }
        }
        
        // STEP 4: PUT the modified XML back to update the execution result
        const updatedXml = buildXml(createdParsed);
        
        console.log(`[IETM Reporter] Updating execution result state to: ${desiredState}`);
        await (this.client as any).authManager.executeRequest({
          method: 'PUT',
          url: resultUrl,
          headers: {
            'Content-Type': 'application/rdf+xml',
            'Accept': 'application/rdf+xml',
            'OSLC-Core-Version': '2.0',
          },
          data: updatedXml,
        });
        
        console.log(`[IETM Reporter] ✓ Execution result state updated successfully`);
      } else {
        console.warn('[IETM Reporter] Could not find state in original XML, skipping state update');
      }
      
      return resultId;
      
    } catch (error: any) {
      console.error('[IETM Reporter] Error in POST-GET-PUT workflow:', error);
      throw error;
    }
  }

  /**
   * Upload test execution output as text attachment
   * Based on Java reference implementation approach
   */
  private async uploadAttachments(
    executionResultId: string,
    result: CollectedTestResult
  ): Promise<void> {
    if (!this.client) {
      throw new Error('IETM client not initialized');
    }

    // Build test execution output text
    const testOutput = this.buildTestOutput(result);
    
    if (!testOutput || testOutput.trim().length === 0) {
      console.log('[IETM Reporter] No test output to upload');
      return;
    }

    console.log(
      `[IETM Reporter] Uploading test execution output for ${result.test.title} (${testOutput.length} chars)...`
    );

    // Create AttachmentHandler instance
    const attachmentHandler = new AttachmentHandler(this.client);

    try {
      // Upload test output as text attachment
      const attachmentUrl = await attachmentHandler.uploadTestOutput(
        testOutput,
        result.test.title,
        executionResultId
      );

      if (attachmentUrl) {
        console.log(
          `[IETM Reporter] ✓ Test output uploaded successfully: ${attachmentUrl}`
        );
      } else {
        console.error(
          `[IETM Reporter] ✗ Failed to upload test output for ${result.test.title}`
        );
      }
    } catch (error) {
      console.error(
        `[IETM Reporter] ✗ Error uploading test output:`,
        error
      );
    }
  }

  /**
   * Build test execution output text from test result
   */
  private buildTestOutput(result: CollectedTestResult): string {
    const lines: string[] = [];
    
    // Header
    lines.push('='.repeat(80));
    lines.push(`Test: ${result.test.title}`);
    lines.push(`Status: ${result.result.status}`);
    lines.push(`Duration: ${result.result.duration}ms`);
    lines.push(`Started: ${result.result.startTime.toISOString()}`);
    lines.push('='.repeat(80));
    lines.push('');
    
    // Test location
    if (result.test.location) {
      lines.push(`Location: ${result.test.location.file}:${result.test.location.line}:${result.test.location.column}`);
      lines.push('');
    }
    
    // Error information if test failed
    if (result.result.error) {
      lines.push('ERROR:');
      lines.push('-'.repeat(80));
      lines.push(result.result.error.message || 'Unknown error');
      if (result.result.error.stack) {
        lines.push('');
        lines.push('Stack Trace:');
        lines.push(result.result.error.stack);
      }
      lines.push('-'.repeat(80));
      lines.push('');
    }
    
    // Test steps (if available)
    if (result.result.steps && result.result.steps.length > 0) {
      lines.push('STEPS:');
      lines.push('-'.repeat(80));
      result.result.steps.forEach((step, index) => {
        lines.push(`${index + 1}. ${step.title}`);
        lines.push(`   Duration: ${step.duration}ms`);
        if (step.error) {
          lines.push(`   Error: ${step.error.message}`);
        }
      });
      lines.push('-'.repeat(80));
      lines.push('');
    }
    
    // Standard output
    if (result.result.stdout && result.result.stdout.length > 0) {
      lines.push('STDOUT:');
      lines.push('-'.repeat(80));
      result.result.stdout.forEach(output => {
        lines.push(output.toString());
      });
      lines.push('-'.repeat(80));
      lines.push('');
    }
    
    // Standard error
    if (result.result.stderr && result.result.stderr.length > 0) {
      lines.push('STDERR:');
      lines.push('-'.repeat(80));
      result.result.stderr.forEach(output => {
        lines.push(output.toString());
      });
      lines.push('-'.repeat(80));
      lines.push('');
    }
    
    // Artifacts information
    if (result.artifacts.screenshots.length > 0 ||
        result.artifacts.videos.length > 0 ||
        result.artifacts.traces.length > 0) {
      lines.push('ARTIFACTS:');
      lines.push('-'.repeat(80));
      
      if (result.artifacts.screenshots.length > 0) {
        lines.push(`Screenshots (${result.artifacts.screenshots.length}):`);
        result.artifacts.screenshots.forEach(file => {
          lines.push(`  - ${path.basename(file)}`);
        });
      }
      
      if (result.artifacts.videos.length > 0) {
        lines.push(`Videos (${result.artifacts.videos.length}):`);
        result.artifacts.videos.forEach(file => {
          lines.push(`  - ${path.basename(file)}`);
        });
      }
      
      if (result.artifacts.traces.length > 0) {
        lines.push(`Traces (${result.artifacts.traces.length}):`);
        result.artifacts.traces.forEach(file => {
          lines.push(`  - ${path.basename(file)}`);
        });
      }
      
      lines.push('-'.repeat(80));
      lines.push('');
    }
    
    // Footer
    lines.push('='.repeat(80));
    lines.push(`Generated by IETM Playwright Reporter at ${new Date().toISOString()}`);
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }
}

// Export as default for Playwright
export default IETMReporter;

// Made with Bob
