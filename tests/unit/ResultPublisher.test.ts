/**
 * Unit tests for ResultPublisher
 */

import { ResultPublisher, PublishProgress } from '../../src/publisher/ResultPublisher';
import { IETMClient } from '../../src/client/IETMClient';
import { ExecutionResult, ExecutionState } from '../../src/models/ExecutionResult';
import * as fs from 'fs';

// Mock IETMClient
jest.mock('../../src/client/IETMClient');

describe('ResultPublisher', () => {
  let mockClient: jest.Mocked<IETMClient>;
  let publisher: ResultPublisher;

  beforeEach(() => {
    mockClient = {
      initialize: jest.fn(),
      getTestCase: jest.fn(),
    } as any;

    publisher = new ResultPublisher(mockClient);
  });

  describe('constructor', () => {
    it('should create publisher with default options', () => {
      expect(publisher).toBeDefined();
    });

    it('should accept custom options', () => {
      const customPublisher = new ResultPublisher(mockClient, {
        batchSize: 5,
        createExecutionRecords: false,
        uploadAttachments: false,
      });

      expect(customPublisher).toBeDefined();
    });
  });

  describe('publishResults', () => {
    it('should publish single result', async () => {
      const executionResult: ExecutionResult = {
        title: 'Test 1',
        creator: 'test-user',
        owner: 'test-user',
        state: ExecutionState.PASSED,
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: '2024-01-01T10:00:01.000Z',
        tester: 'test-user',
        testCase: { href: 'https://example.com/testcase/1' },
        executionWorkItem: { href: 'https://example.com/exec/1' },
      };

      const results = [
        {
          executionResult,
          testCaseId: '1',
        },
      ];

      const summary = await publisher.publishResults(results);

      expect(summary.total).toBe(1);
      expect(summary.succeeded).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.results).toHaveLength(1);
      expect(summary.results[0]?.success).toBe(true);
    });

    it('should publish multiple results', async () => {
      const results = Array.from({ length: 5 }, (_, i) => ({
        executionResult: {
          title: `Test ${i + 1}`,
          creator: 'test-user',
          owner: 'test-user',
          state: ExecutionState.PASSED,
          startTime: '2024-01-01T10:00:00.000Z',
          endTime: '2024-01-01T10:00:01.000Z',
          tester: 'test-user',
          testCase: { href: `https://example.com/testcase/${i + 1}` },
          executionWorkItem: { href: `https://example.com/exec/${i + 1}` },
        },
        testCaseId: `${i + 1}`,
      }));

      const summary = await publisher.publishResults(results);

      expect(summary.total).toBe(5);
      expect(summary.succeeded).toBe(5);
      expect(summary.failed).toBe(0);
    });

    it('should process results in batches', async () => {
      const batchSize = 3;
      const publisher = new ResultPublisher(mockClient, { batchSize });

      const results = Array.from({ length: 10 }, (_, i) => ({
        executionResult: {
          title: `Test ${i + 1}`,
          creator: 'test-user',
          owner: 'test-user',
          state: ExecutionState.PASSED,
          startTime: '2024-01-01T10:00:00.000Z',
          endTime: '2024-01-01T10:00:01.000Z',
          tester: 'test-user',
          testCase: { href: `https://example.com/testcase/${i + 1}` },
          executionWorkItem: { href: `https://example.com/exec/${i + 1}` },
        },
        testCaseId: `${i + 1}`,
      }));

      const summary = await publisher.publishResults(results);

      expect(summary.total).toBe(10);
      expect(summary.succeeded).toBe(10);
    });

    it('should call progress callback', async () => {
      const progressCallback = jest.fn();
      const publisher = new ResultPublisher(mockClient, {
        onProgress: progressCallback,
      });

      const results = [
        {
          executionResult: {
            title: 'Test 1',
            creator: 'test-user',
            owner: 'test-user',
            state: ExecutionState.PASSED,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T10:00:01.000Z',
            tester: 'test-user',
            testCase: { href: 'https://example.com/testcase/1' },
            executionWorkItem: { href: 'https://example.com/exec/1' },
          },
          testCaseId: '1',
        },
      ];

      await publisher.publishResults(results);

      expect(progressCallback).toHaveBeenCalled();
      const progress: PublishProgress = progressCallback.mock.calls[0][0];
      expect(progress.total).toBe(1);
      expect(progress.currentBatch).toBe(1);
      expect(progress.totalBatches).toBe(1);
    });

    it('should handle errors gracefully with continueOnError', async () => {
      const publisher = new ResultPublisher(mockClient, {
        continueOnError: true,
      });

      // Create a result that will cause an error (missing required fields)
      const results = [
        {
          executionResult: {} as ExecutionResult, // Invalid result
          testCaseId: '1',
        },
      ];

      const summary = await publisher.publishResults(results);

      expect(summary.total).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.errors).toHaveLength(1);
    });

    it('should prevent duplicates when enabled', async () => {
      const publisher = new ResultPublisher(mockClient, {
        preventDuplicates: true,
      });

      const executionResult: ExecutionResult = {
        title: 'Test 1',
        creator: 'test-user',
        owner: 'test-user',
        state: ExecutionState.PASSED,
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: '2024-01-01T10:00:01.000Z',
        tester: 'test-user',
        testCase: { href: 'https://example.com/testcase/1' },
        executionWorkItem: { href: 'https://example.com/exec/1' },
      };

      const results = [
        { executionResult, testCaseId: '1' },
        { executionResult, testCaseId: '1' }, // Duplicate
      ];

      const summary = await publisher.publishResults(results);

      expect(summary.total).toBe(2);
      expect(summary.succeeded).toBe(2);
      // Second one should be skipped as duplicate
      expect(summary.results[1]?.error).toContain('Duplicate');
    });

    it('should use custom execution record ID generator', async () => {
      const customGenerator = jest.fn((testCaseId: string) => `custom-${testCaseId}`);
      const publisher = new ResultPublisher(mockClient, {
        executionRecordIdGenerator: customGenerator,
      });

      const results = [
        {
          executionResult: {
            title: 'Test 1',
            creator: 'test-user',
            owner: 'test-user',
            state: ExecutionState.PASSED,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T10:00:01.000Z',
            tester: 'test-user',
            testCase: { href: 'https://example.com/testcase/1' },
            executionWorkItem: { href: 'https://example.com/exec/1' },
          },
          testCaseId: '1',
        },
      ];

      await publisher.publishResults(results);

      expect(customGenerator).toHaveBeenCalledWith('1');
    });
  });

  describe('clearCache', () => {
    it('should clear duplicate detection cache', async () => {
      const publisher = new ResultPublisher(mockClient, {
        preventDuplicates: true,
      });

      const executionResult: ExecutionResult = {
        title: 'Test 1',
        creator: 'test-user',
        owner: 'test-user',
        state: ExecutionState.PASSED,
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: '2024-01-01T10:00:01.000Z',
        tester: 'test-user',
        testCase: { href: 'https://example.com/testcase/1' },
        executionWorkItem: { href: 'https://example.com/exec/1' },
      };

      // Publish once
      await publisher.publishResults([{ executionResult, testCaseId: '1' }]);

      // Publish again - should be skipped as duplicate
      const summary1 = await publisher.publishResults([{ executionResult, testCaseId: '1' }]);
      expect(summary1.succeeded).toBe(1);
      expect(summary1.results[0]?.resultUrl).toBeUndefined(); // Skipped, no URL

      // Clear cache
      publisher.clearCache();

      // Publish again - should succeed now with new URL
      const summary2 = await publisher.publishResults([{ executionResult, testCaseId: '1' }]);
      expect(summary2.succeeded).toBe(1);
      expect(summary2.results[0]?.resultUrl).toBeDefined(); // Has URL (was uploaded)
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', () => {
      const summary = {
        total: 10,
        succeeded: 8,
        failed: 2,
        duration: 5000,
        results: [],
        errors: [],
      };

      const stats = publisher.getStatistics(summary);

      expect(stats.successRate).toBe(80);
      expect(stats.failureRate).toBe(20);
      expect(stats.averageTimePerResult).toBe(500);
    });

    it('should handle zero results', () => {
      const summary = {
        total: 0,
        succeeded: 0,
        failed: 0,
        duration: 0,
        results: [],
        errors: [],
      };

      const stats = publisher.getStatistics(summary);

      expect(stats.successRate).toBe(0);
      expect(stats.failureRate).toBe(0);
      expect(stats.averageTimePerResult).toBe(0);
    });
  });

  describe('attachment handling', () => {
    it('should skip attachments when uploadAttachments is false', async () => {
      const publisher = new ResultPublisher(mockClient, {
        uploadAttachments: false,
      });

      const results = [
        {
          executionResult: {
            title: 'Test 1',
            creator: 'test-user',
            owner: 'test-user',
            state: ExecutionState.PASSED,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T10:00:01.000Z',
            tester: 'test-user',
            testCase: { href: 'https://example.com/testcase/1' },
            executionWorkItem: { href: 'https://example.com/exec/1' },
          },
          testCaseId: '1',
          attachments: {
            screenshots: ['screenshot1.png'],
            videos: ['video1.mp4'],
          },
        },
      ];

      const summary = await publisher.publishResults(results);

      expect(summary.succeeded).toBe(1);
      // Attachments should not be uploaded (empty array or undefined)
      const attachments = summary.results[0]?.attachmentUrls;
      expect(attachments === undefined || attachments.length === 0).toBe(true);
    });
  });
});

// Made with Bob