/**
 * Unit tests for ResultPublisher
 */

import { ResultPublisher } from '../../src/publisher/ResultPublisher';
import { IETMClient } from '../../src/client/IETMClient';

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
});
