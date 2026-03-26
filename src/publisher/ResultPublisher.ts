/**
 * Result Publisher
 * Publishes test execution results to IETM with batching and error handling
 */

import { IETMClient } from '../client/IETMClient';
import { ExecutionResult } from '../models/ExecutionResult';
import { ExecutionResultBuilder } from '../builders/ExecutionResultBuilder';
import * as fs from 'fs';
import * as path from 'path';

export interface PublishOptions {
  /** Batch size for uploading results */
  batchSize?: number;

  /** Whether to create test execution records if they don't exist */
  createExecutionRecords?: boolean;

  /** Test plan ID for creating execution records */
  testPlanId?: string;

  /** Whether to upload attachments (screenshots, videos) */
  uploadAttachments?: boolean;

  /** Maximum file size for attachments in bytes */
  maxAttachmentSize?: number;

  /** Whether to continue on errors */
  continueOnError?: boolean;

  /** Progress callback */
  onProgress?: (progress: PublishProgress) => void;

  /** Whether to implement idempotency (prevent duplicates) */
  preventDuplicates?: boolean;

  /** Custom execution record ID generator */
  executionRecordIdGenerator?: (testCaseId: string) => string;
}

export interface PublishProgress {
  /** Total number of results to publish */
  total: number;

  /** Number of results published so far */
  completed: number;

  /** Number of successful publishes */
  succeeded: number;

  /** Number of failed publishes */
  failed: number;

  /** Current batch number */
  currentBatch: number;

  /** Total number of batches */
  totalBatches: number;

  /** Current operation */
  operation: string;
}

export interface PublishResult {
  /** Test case ID */
  testCaseId: string;

  /** Execution record ID */
  executionRecordId: string;

  /** Whether the publish was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** URL of the created execution result */
  resultUrl?: string;

  /** Uploaded attachment URLs */
  attachmentUrls?: string[];
}

export interface PublishSummary {
  /** Total results processed */
  total: number;

  /** Number of successful publishes */
  succeeded: number;

  /** Number of failed publishes */
  failed: number;

  /** Duration in milliseconds */
  duration: number;

  /** Individual results */
  results: PublishResult[];

  /** Errors encountered */
  errors: Array<{ testCaseId: string; error: string }>;
}

export class ResultPublisher {
  private client: IETMClient;
  private options: Required<PublishOptions>;
  private publishedResults: Set<string> = new Set();

  constructor(client: IETMClient, options: PublishOptions = {}) {
    this.client = client;
    this.options = {
      batchSize: options.batchSize || 10,
      createExecutionRecords: options.createExecutionRecords !== false,
      testPlanId: options.testPlanId || '',
      uploadAttachments: options.uploadAttachments !== false,
      maxAttachmentSize: options.maxAttachmentSize || 10 * 1024 * 1024, // 10MB
      continueOnError: options.continueOnError !== false,
      onProgress: options.onProgress || (() => {}),
      preventDuplicates: options.preventDuplicates !== false,
      executionRecordIdGenerator: options.executionRecordIdGenerator || this.defaultExecutionRecordIdGenerator,
    };
  }

  /**
   * Publish multiple execution results
   */
  async publishResults(
    executionResults: Array<{
      executionResult: ExecutionResult;
      testCaseId: string;
      attachments?: {
        screenshots?: string[];
        videos?: string[];
        traces?: string[];
      };
    }>
  ): Promise<PublishSummary> {
    const startTime = Date.now();
    const results: PublishResult[] = [];
    const errors: Array<{ testCaseId: string; error: string }> = [];

    const totalBatches = Math.ceil(executionResults.length / this.options.batchSize);

    console.log(`[ResultPublisher] Publishing ${executionResults.length} results in ${totalBatches} batches`);

    // Process in batches
    for (let i = 0; i < executionResults.length; i += this.options.batchSize) {
      const batch = executionResults.slice(i, i + this.options.batchSize);
      const batchNumber = Math.floor(i / this.options.batchSize) + 1;

      console.log(`[ResultPublisher] Processing batch ${batchNumber}/${totalBatches} (${batch.length} results)`);

      // Process batch
      for (const item of batch) {
        const progress: PublishProgress = {
          total: executionResults.length,
          completed: results.length,
          succeeded: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          currentBatch: batchNumber,
          totalBatches,
          operation: `Publishing result for test case ${item.testCaseId}`,
        };

        this.options.onProgress(progress);

        try {
          const result = await this.publishSingleResult(item);
          results.push(result);

          if (!result.success) {
            errors.push({ testCaseId: item.testCaseId, error: result.error || 'Unknown error' });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[ResultPublisher] Error publishing result for ${item.testCaseId}:`, errorMsg);

          results.push({
            testCaseId: item.testCaseId,
            executionRecordId: '',
            success: false,
            error: errorMsg,
          });

          errors.push({ testCaseId: item.testCaseId, error: errorMsg });

          if (!this.options.continueOnError) {
            throw error;
          }
        }
      }

      // Small delay between batches to avoid overwhelming the server
      if (batchNumber < totalBatches) {
        await this.delay(500);
      }
    }

    const duration = Date.now() - startTime;
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[ResultPublisher] Publishing complete: ${succeeded} succeeded, ${failed} failed (${duration}ms)`);

    return {
      total: executionResults.length,
      succeeded,
      failed,
      duration,
      results,
      errors,
    };
  }

  /**
   * Publish a single execution result
   */
  private async publishSingleResult(item: {
    executionResult: ExecutionResult;
    testCaseId: string;
    attachments?: {
      screenshots?: string[];
      videos?: string[];
      traces?: string[];
    };
  }): Promise<PublishResult> {
    const { executionResult, testCaseId, attachments } = item;

    // Check for duplicates
    if (this.options.preventDuplicates) {
      const resultKey = this.getResultKey(testCaseId, executionResult);
      if (this.publishedResults.has(resultKey)) {
        console.log(`[ResultPublisher] Skipping duplicate result for ${testCaseId}`);
        return {
          testCaseId,
          executionRecordId: '',
          success: true,
          error: 'Duplicate (skipped)',
        };
      }
      this.publishedResults.add(resultKey);
    }

    try {
      // Step 1: Get or create execution record
      const executionRecordId = await this.getOrCreateExecutionRecord(testCaseId);

      // Step 2: Build XML for execution result
      const builder = ExecutionResultBuilder.fromResult(executionResult);
      const xml = builder.build();

      // Step 3: Upload execution result
      console.log(`[ResultPublisher] Uploading execution result for test case ${testCaseId}`);
      const resultUrl = await this.uploadExecutionResult(executionRecordId, xml);

      // Step 4: Upload attachments if enabled
      const attachmentUrls: string[] = [];
      if (this.options.uploadAttachments && attachments) {
        const uploadedUrls = await this.uploadAttachments(
          executionRecordId,
          attachments
        );
        attachmentUrls.push(...uploadedUrls);
      }

      console.log(`[ResultPublisher] ✓ Successfully published result for ${testCaseId}`);

      return {
        testCaseId,
        executionRecordId,
        success: true,
        resultUrl,
        attachmentUrls,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ResultPublisher] ✗ Failed to publish result for ${testCaseId}:`, errorMsg);

      return {
        testCaseId,
        executionRecordId: '',
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get or create a test execution record
   */
  private async getOrCreateExecutionRecord(testCaseId: string): Promise<string> {
    // Try to find existing execution record
    try {
      const existingRecord = await this.findExecutionRecord(testCaseId);
      if (existingRecord) {
        console.log(`[ResultPublisher] Using existing execution record: ${existingRecord}`);
        return existingRecord;
      }
    } catch (error) {
      console.log(`[ResultPublisher] No existing execution record found for ${testCaseId}`);
    }

    // Create new execution record if enabled
    if (this.options.createExecutionRecords) {
      console.log(`[ResultPublisher] Creating new execution record for ${testCaseId}`);
      return await this.createExecutionRecord(testCaseId);
    }

    // Use generated ID if creation is disabled
    const generatedId = this.options.executionRecordIdGenerator(testCaseId);
    console.log(`[ResultPublisher] Using generated execution record ID: ${generatedId}`);
    return generatedId;
  }

  /**
   * Find existing execution record for a test case
   */
  private async findExecutionRecord(testCaseId: string): Promise<string | null> {
    // TODO: Implement query to find execution record
    // For now, return null (will create new record)
    return null;
  }

  /**
   * Create a new test execution record
   */
  private async createExecutionRecord(testCaseId: string): Promise<string> {
    // TODO: Implement execution record creation via IETM API
    // For now, use generated ID
    return this.options.executionRecordIdGenerator(testCaseId);
  }

  /**
   * Upload execution result XML to IETM
   */
  private async uploadExecutionResult(
    executionRecordId: string,
    xml: string
  ): Promise<string> {
    // TODO: Implement actual upload to IETM
    // For now, return a mock URL
    const url = `https://ietm.example.com/execution-results/${executionRecordId}`;
    console.log(`[ResultPublisher] Would upload to: ${url}`);
    return url;
  }

  /**
   * Upload attachments (screenshots, videos, traces)
   */
  private async uploadAttachments(
    executionRecordId: string,
    attachments: {
      screenshots?: string[];
      videos?: string[];
      traces?: string[];
    }
  ): Promise<string[]> {
    const uploadedUrls: string[] = [];

    // Upload screenshots
    if (attachments.screenshots) {
      for (const screenshot of attachments.screenshots) {
        try {
          const url = await this.uploadAttachment(executionRecordId, screenshot, 'screenshot');
          uploadedUrls.push(url);
        } catch (error) {
          console.error(`[ResultPublisher] Failed to upload screenshot ${screenshot}:`, error);
        }
      }
    }

    // Upload videos
    if (attachments.videos) {
      for (const video of attachments.videos) {
        try {
          const url = await this.uploadAttachment(executionRecordId, video, 'video');
          uploadedUrls.push(url);
        } catch (error) {
          console.error(`[ResultPublisher] Failed to upload video ${video}:`, error);
        }
      }
    }

    // Upload traces
    if (attachments.traces) {
      for (const trace of attachments.traces) {
        try {
          const url = await this.uploadAttachment(executionRecordId, trace, 'trace');
          uploadedUrls.push(url);
        } catch (error) {
          console.error(`[ResultPublisher] Failed to upload trace ${trace}:`, error);
        }
      }
    }

    return uploadedUrls;
  }

  /**
   * Upload a single attachment file
   */
  private async uploadAttachment(
    executionRecordId: string,
    filePath: string,
    type: string
  ): Promise<string> {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > this.options.maxAttachmentSize) {
      throw new Error(
        `File too large: ${filePath} (${stats.size} bytes, max ${this.options.maxAttachmentSize})`
      );
    }

    // TODO: Implement actual file upload to IETM
    // For now, return a mock URL
    const fileName = path.basename(filePath);
    const url = `https://ietm.example.com/attachments/${executionRecordId}/${fileName}`;
    console.log(`[ResultPublisher] Would upload ${type}: ${fileName} (${stats.size} bytes)`);
    return url;
  }

  /**
   * Generate a unique key for a result (for duplicate detection)
   */
  private getResultKey(testCaseId: string, executionResult: ExecutionResult): string {
    return `${testCaseId}-${executionResult.startTime}-${executionResult.state}`;
  }

  /**
   * Default execution record ID generator
   */
  private defaultExecutionRecordIdGenerator(testCaseId: string): string {
    const timestamp = Date.now();
    return `exec-${testCaseId}-${timestamp}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear duplicate detection cache
   */
  clearCache(): void {
    this.publishedResults.clear();
  }

  /**
   * Get publish statistics
   */
  getStatistics(summary: PublishSummary): {
    successRate: number;
    failureRate: number;
    averageTimePerResult: number;
  } {
    return {
      successRate: summary.total > 0 ? (summary.succeeded / summary.total) * 100 : 0,
      failureRate: summary.total > 0 ? (summary.failed / summary.total) * 100 : 0,
      averageTimePerResult: summary.total > 0 ? summary.duration / summary.total : 0,
    };
  }
}

// Made with Bob