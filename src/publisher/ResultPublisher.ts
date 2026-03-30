/**
 * Result Publisher
 * Publishes test execution results to IETM with batching and error handling
 */

import { IETMClient } from '../client/IETMClient';

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

  constructor(client: IETMClient) {
    this.client = client;
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