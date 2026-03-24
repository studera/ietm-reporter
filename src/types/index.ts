/**
 * Type definitions for IETM Playwright Client
 */

export interface IETMConfig {
  server: {
    baseUrl: string;
    projectId: string;
    contextId: string;
  };
  auth: {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  };
  testPlan?: {
    id: string;
    name?: string;
  };
  mapping?: {
    strategy: 'title' | 'id' | 'tag';
    mappings?: Record<string, string>;
  };
  retry?: {
    maxRetries: number;
    retryDelay: number;
  };
  logging?: {
    level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    file?: string;
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
