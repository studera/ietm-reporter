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
    if (!this.options.enabled) {
      console.log('[IETM Reporter] Disabled');
      return;
    }

    this.startTime = new Date();
    const testCount = suite.allTests().length;
    
    console.log(`[IETM Reporter] Starting test run with ${testCount} tests`);
    
    // Load IETM configuration
    try {
      if (fs.existsSync(this.options.configPath)) {
        this.config = loadConfig(this.options.configPath);
        console.log('[IETM Reporter] Configuration loaded');
      } else {
        console.warn(`[IETM Reporter] Config file not found: ${this.options.configPath}`);
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
        
        console.log('[IETM Reporter] Creating IETM client with config:', {
          qmServerUrl: clientConfig.qmServerUrl,
          jtsServerUrl: clientConfig.jtsServerUrl,
          username: clientConfig.username,
          projectName: clientConfig.projectName,
          contextId: clientConfig.contextId,
        });
        
        this.client = new IETMClient(clientConfig);
        await this.client.initialize();
        console.log('[IETM Reporter] ✓ IETM client initialized successfully');
      } catch (error) {
        console.error('[IETM Reporter] ✗ Failed to initialize IETM client:', error);
        console.error('[IETM Reporter] Reporter will continue without IETM integration');
        // Don't throw - allow tests to continue
      }
    }
  }

  /**
   * Called when a test starts
   */
  async onTestBegin(test: TestCase, result: TestResult): Promise<void> {
    if (!this.options.enabled) return;

    const testCaseId = this.options.testCaseIdExtractor(test);
    
    if (testCaseId) {
      console.log(`[IETM Reporter] Test started: ${test.title} (IETM ID: ${testCaseId})`);
    } else {
      console.log(`[IETM Reporter] Test started: ${test.title} (no IETM mapping)`);
    }

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
    
    // Collect test result
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

    // Build execution result if test case ID is available
    if (testCaseId && this.client) {
      try {
        collectedResult.executionResult = await this.buildExecutionResult(
          test,
          result,
          testCaseId,
          collectedResult.artifacts
        );
      } catch (error) {
        console.error(`[IETM Reporter] Failed to build execution result for ${test.title}:`, error);
      }
    }

    this.results.push(collectedResult);

    const status = result.status;
    const duration = result.duration;
    console.log(
      `[IETM Reporter] Test ended: ${test.title} - ${status} (${duration}ms)`
    );

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

    const endTime = new Date();
    const duration = this.startTime ? endTime.getTime() - this.startTime.getTime() : 0;

    console.log(`[IETM Reporter] Test run finished with status: ${result.status}`);
    console.log(`[IETM Reporter] Duration: ${duration}ms`);
    console.log(`[IETM Reporter] Total tests: ${this.results.length}`);

    // Count results by status
    const statusCounts = this.results.reduce((acc, r) => {
      acc[r.result.status] = (acc[r.result.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('[IETM Reporter] Results by status:', statusCounts);

    // Now build execution results for tests with IETM mappings
    // The client should be fully initialized by now
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
    } else {
      console.log('[IETM Reporter] IETM client not initialized, skipping upload');
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

    // Query TCER (Test Case Execution Record) for this test case
    let executionWorkItemUrl: string;
    try {
      const tcers = await this.client!.getTestExecutionRecords(testCaseId);
      
      if (tcers && tcers.length > 0 && tcers[0]) {
        // Use the first TCER found (most recent or active)
        const tcerId = tcers[0].id;
        executionWorkItemUrl = `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/executionworkitem/urn:com.ibm.rqm:executionworkitem:${tcerId}`;
        console.log(`[IETM Reporter] Found TCER ${tcerId} for test case ${testCaseId}`);
      } else {
        // Fallback to hardcoded TCER ID 1829 if no TCER found
        console.warn(`[IETM Reporter] No TCER found for test case ${testCaseId}, using fallback TCER 1829`);
        executionWorkItemUrl = `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/executionworkitem/urn:com.ibm.rqm:executionworkitem:1829`;
      }
    } catch (error) {
      // OSLC query may fail due to server limitations or query format issues
      console.warn(`[IETM Reporter] TCER query failed for test case ${testCaseId}, using fallback TCER 1829`);
      executionWorkItemUrl = `${baseUrl}/service/com.ibm.rqm.integration.service.IIntegrationService/resources/${contextId}/executionworkitem/urn:com.ibm.rqm:executionworkitem:1829`;
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
   * This bypasses the IETMClient's simplified interface and posts the full XML
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

    // Post execution result XML directly
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

    // Extract created resource URL from response
    const { parseXml, findFirstNodeByTag } = require('../utils/XmlParser');
    
    try {
      const parsed = parseXml(response);
      
      // IETM returns an Atom feed with resultId
      const resultIdNode = findFirstNodeByTag(parsed, 'rqm:resultId') ||
                           findFirstNodeByTag(parsed, 'resultId');
      
      if (resultIdNode) {
        // Extract the text content of the resultId node
        const resultId = typeof resultIdNode === 'object' && '#text' in resultIdNode
          ? resultIdNode['#text']
          : resultIdNode;
        
        console.log(`[IETM Reporter] ✓ Execution result created with ID: ${resultId}`);
        return String(resultId);
      }
      
      // Fallback: try RDF format
      const resultNode = findFirstNodeByTag(parsed, 'executionresult') ||
                         findFirstNodeByTag(parsed, 'ns2:executionresult') ||
                         findFirstNodeByTag(parsed, 'rqm:executionresult') ||
                         findFirstNodeByTag(parsed, 'ExecutionResult');
      
      if (resultNode) {
        const resourceUrl = resultNode['@_rdf:about'] || resultNode['@_about'] || '';
        if (resourceUrl) {
          const resultId = resourceUrl.split('/').pop() || resourceUrl;
          console.log(`[IETM Reporter] ✓ Execution result created with ID: ${resultId}`);
          return resultId;
        }
      }
      
      console.log('[IETM Reporter] Response XML:', response.substring(0, 500));
      throw new Error('Failed to parse execution result response - no resultId found');
    } catch (error) {
      console.error('[IETM Reporter] Failed to parse response:', error);
      console.log('[IETM Reporter] Response (first 1000 chars):', response.substring(0, 1000));
      throw error;
    }
  }
}

// Export as default for Playwright
export default IETMReporter;

// Made with Bob
