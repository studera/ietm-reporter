/**
 * Unit tests for ExecutionResult model
 */

import {
  ExecutionResult,
  ExecutionState,
  StepType,
  StepResult,
  ResourceLink,
  Variable,
  Property,
  mapPlaywrightStatusToState,
  formatDateToISO,
  createResourceLink,
} from '../../../src/models/ExecutionResult';

describe('ExecutionResult Model', () => {
  describe('ExecutionState enum', () => {
    it('should have correct state values', () => {
      expect(ExecutionState.PASSED).toBe('com.ibm.rqm.execution.common.state.passed');
      expect(ExecutionState.FAILED).toBe('com.ibm.rqm.execution.common.state.failed');
      expect(ExecutionState.INCOMPLETE).toBe('com.ibm.rqm.execution.common.state.incomplete');
      expect(ExecutionState.INCONCLUSIVE).toBe('com.ibm.rqm.execution.common.state.inconclusive');
      expect(ExecutionState.BLOCKED).toBe('com.ibm.rqm.execution.common.state.blocked');
      expect(ExecutionState.ERROR).toBe('com.ibm.rqm.execution.common.state.error');
    });
  });

  describe('StepType enum', () => {
    it('should have correct step type values', () => {
      expect(StepType.EXECUTION).toBe('com.ibm.rqm.execution.common.elementtype.execution');
      expect(StepType.SETUP).toBe('com.ibm.rqm.execution.common.elementtype.setup');
      expect(StepType.TEARDOWN).toBe('com.ibm.rqm.execution.common.elementtype.teardown');
    });
  });

  describe('mapPlaywrightStatusToState()', () => {
    it('should map "passed" to PASSED', () => {
      expect(mapPlaywrightStatusToState('passed')).toBe(ExecutionState.PASSED);
    });

    it('should map "failed" to FAILED', () => {
      expect(mapPlaywrightStatusToState('failed')).toBe(ExecutionState.FAILED);
    });

    it('should map "skipped" to INCOMPLETE', () => {
      expect(mapPlaywrightStatusToState('skipped')).toBe(ExecutionState.INCOMPLETE);
    });

    it('should map "timedout" to ERROR', () => {
      expect(mapPlaywrightStatusToState('timedout')).toBe(ExecutionState.ERROR);
    });

    it('should map unknown status to INCONCLUSIVE', () => {
      expect(mapPlaywrightStatusToState('unknown')).toBe(ExecutionState.INCONCLUSIVE);
      expect(mapPlaywrightStatusToState('interrupted')).toBe(ExecutionState.INCONCLUSIVE);
    });

    it('should be case-insensitive', () => {
      expect(mapPlaywrightStatusToState('PASSED')).toBe(ExecutionState.PASSED);
      expect(mapPlaywrightStatusToState('Failed')).toBe(ExecutionState.FAILED);
      expect(mapPlaywrightStatusToState('SKIPPED')).toBe(ExecutionState.INCOMPLETE);
    });
  });

  describe('formatDateToISO()', () => {
    it('should format date to ISO 8601 string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const result = formatDateToISO(date);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle current date', () => {
      const date = new Date();
      const result = formatDateToISO(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should preserve milliseconds', () => {
      const date = new Date('2024-01-15T10:30:00.123Z');
      const result = formatDateToISO(date);
      expect(result).toContain('.123Z');
    });
  });

  describe('createResourceLink()', () => {
    it('should create resource link with href only', () => {
      const link = createResourceLink('https://example.com/resource/123');
      expect(link).toEqual({
        href: 'https://example.com/resource/123',
        title: undefined,
      });
    });

    it('should create resource link with href and title', () => {
      const link = createResourceLink('https://example.com/resource/123', 'Test Resource');
      expect(link).toEqual({
        href: 'https://example.com/resource/123',
        title: 'Test Resource',
      });
    });

    it('should handle empty title', () => {
      const link = createResourceLink('https://example.com/resource/123', '');
      expect(link.href).toBe('https://example.com/resource/123');
      expect(link.title).toBe('');
    });
  });

  describe('ExecutionResult interface', () => {
    it('should accept valid execution result', () => {
      const result: ExecutionResult = {
        title: 'Test Execution',
        creator: 'testuser',
        owner: 'testuser',
        state: ExecutionState.PASSED,
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T10:05:00.000Z',
        tester: 'testuser',
        testCase: { href: 'https://example.com/testcase/1' },
        executionWorkItem: { href: 'https://example.com/executionworkitem/1' },
      };

      expect(result.title).toBe('Test Execution');
      expect(result.state).toBe(ExecutionState.PASSED);
    });

    it('should accept optional fields', () => {
      const result: ExecutionResult = {
        title: 'Test Execution',
        creator: 'testuser',
        owner: 'testuser',
        state: ExecutionState.PASSED,
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T10:05:00.000Z',
        tester: 'testuser',
        testCase: { href: 'https://example.com/testcase/1' },
        executionWorkItem: { href: 'https://example.com/executionworkitem/1' },
        machine: 'test-machine',
        iterations: '1',
        weight: '100',
        adapterId: 'playwright-adapter',
      };

      expect(result.machine).toBe('test-machine');
      expect(result.iterations).toBe('1');
      expect(result.weight).toBe('100');
      expect(result.adapterId).toBe('playwright-adapter');
    });
  });

  describe('StepResult interface', () => {
    it('should accept valid step result', () => {
      const stepResult: StepResult = {
        stepIndex: 1,
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T10:01:00.000Z',
        result: ExecutionState.PASSED,
        tester: 'testuser',
      };

      expect(stepResult.stepIndex).toBe(1);
      expect(stepResult.result).toBe(ExecutionState.PASSED);
    });

    it('should accept optional fields', () => {
      const stepResult: StepResult = {
        stepIndex: 1,
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T10:01:00.000Z',
        result: ExecutionState.PASSED,
        tester: 'testuser',
        description: 'Test step description',
        stepType: StepType.EXECUTION,
        actualResult: 'Actual result text',
        expectedResult: 'Expected result text',
      };

      expect(stepResult.description).toBe('Test step description');
      expect(stepResult.stepType).toBe(StepType.EXECUTION);
      expect(stepResult.actualResult).toBe('Actual result text');
      expect(stepResult.expectedResult).toBe('Expected result text');
    });
  });

  describe('Variable interface', () => {
    it('should accept valid variable', () => {
      const variable: Variable = {
        name: 'testVar',
        value: 'testValue',
      };

      expect(variable.name).toBe('testVar');
      expect(variable.value).toBe('testValue');
    });
  });

  describe('Property interface', () => {
    it('should accept valid property', () => {
      const property: Property = {
        propertyName: 'lineNumber',
        propertyValue: '42',
      };

      expect(property.propertyName).toBe('lineNumber');
      expect(property.propertyValue).toBe('42');
    });
  });

  describe('ResourceLink interface', () => {
    it('should accept href only', () => {
      const link: ResourceLink = {
        href: 'https://example.com/resource/123',
      };

      expect(link.href).toBe('https://example.com/resource/123');
      expect(link.title).toBeUndefined();
    });

    it('should accept href and title', () => {
      const link: ResourceLink = {
        href: 'https://example.com/resource/123',
        title: 'Test Resource',
      };

      expect(link.href).toBe('https://example.com/resource/123');
      expect(link.title).toBe('Test Resource');
    });
  });
});

// Made with Bob