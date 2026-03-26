/**
 * Type definitions for IETM Playwright Client
 */

export interface IETMConfig {
  server: {
    baseUrl: string;
    jtsUrl?: string;
    projectId?: string;
    projectName?: string;
    contextId?: string;
    autoDiscoverIds?: boolean;
  };
  auth:
    | {
        type: 'oauth1';
        consumerKey: string;
        consumerSecret: string;
        accessToken: string;
        accessTokenSecret: string;
      }
    | {
        type: 'basic';
        username: string;
        password: string;
      };
  testPlan?: {
    id: string;
    name?: string;
  };
  mapping?: {
    strategy: 'title' | 'id' | 'tag';
    annotationType?: string;
    mappings?: Record<string, string>;
  };
  retry?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier?: number;
  };
  logging?: {
    level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    file?: string;
    console?: boolean;
    maxFiles?: number;
    maxSize?: string;
  };
  attachments?: {
    uploadScreenshots?: boolean;
    uploadVideos?: boolean;
    uploadLogs?: boolean;
    maxFileSize?: number;
    compressImages?: boolean;
  };
  reporting?: {
    batchSize?: number;
    reportOnlyMappedTests?: boolean;
    createExecutionRecords?: boolean;
    updateExistingResults?: boolean;
  };
}

export interface TestResult {
  id: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedout';
  duration: number;
  startTime: Date;
  endTime: Date;
  error?: {
    message: string;
    stack?: string;
  };
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  path: string;
  contentType: string;
}

export interface IETMTestCase {
  id: string;
  title: string;
  description?: string;
  webId: string;
}

export interface IETMTestResult {
  id: string;
  verdict: 'passed' | 'failed' | 'blocked' | 'inconclusive';
  startTime: string;
  endTime: string;
  testCase: string;
  executionRecord?: string;
}

// Made with Bob
