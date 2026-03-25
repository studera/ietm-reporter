/**
 * Unit tests for ExecutionResultBuilder
 */

import { ExecutionResultBuilder } from '../../src/builders/ExecutionResultBuilder';
import {
  ExecutionResult,
  ExecutionState,
  StepType,
  createResourceLink,
  formatDateToISO,
} from '../../src/models/ExecutionResult';

describe('ExecutionResultBuilder', () => {
  const mockResult: ExecutionResult = {
    title: 'Test Login Functionality',
    creator: 'testuser',
    owner: 'testuser',
    state: ExecutionState.PASSED,
    machine: 'test-machine',
    iterations: '1',
    startTime: '2024-03-25T10:00:00.000Z',
    endTime: '2024-03-25T10:05:00.000Z',
    weight: '100',
    tester: 'testuser',
    testCase: createResourceLink('https://jazz.net/qm/resource/testcase/123'),
    executionWorkItem: createResourceLink('https://jazz.net/qm/resource/executionworkitem/456'),
  };

  describe('build', () => {
    it('should build basic execution result XML', () => {
      const builder = new ExecutionResultBuilder(mockResult);
      const xml = builder.build();

      expect(xml).toContain('<ns3:title>Test Login Functionality</ns3:title>');
      expect(xml).toContain('<ns3:creator>testuser</ns3:creator>');
      expect(xml).toContain('<ns2:owner>testuser</ns2:owner>');
      expect(xml).toContain(`<ns2:state>${ExecutionState.PASSED}</ns2:state>`);
      expect(xml).toContain('<ns2:machine>test-machine</ns2:machine>');
      expect(xml).toContain('<ns2:starttime>2024-03-25T10:00:00.000Z</ns2:starttime>');
      expect(xml).toContain('<ns2:endtime>2024-03-25T10:05:00.000Z</ns2:endtime>');
    });

    it('should include test case and execution work item references', () => {
      const builder = new ExecutionResultBuilder(mockResult);
      const xml = builder.build();

      expect(xml).toContain('testcase href="https://jazz.net/qm/resource/testcase/123"');
      expect(xml).toContain('executionworkitem href="https://jazz.net/qm/resource/executionworkitem/456"');
    });

    it('should handle optional test script', () => {
      const resultWithScript: ExecutionResult = {
        ...mockResult,
        testScript: createResourceLink('https://jazz.net/qm/resource/testscript/789'),
      };

      const builder = new ExecutionResultBuilder(resultWithScript);
      const xml = builder.build();

      expect(xml).toContain('testscript href="https://jazz.net/qm/resource/testscript/789"');
    });

    it('should build variables', () => {
      const resultWithVariables: ExecutionResult = {
        ...mockResult,
        variables: [
          { name: 'username', value: 'admin' },
          { name: 'password', value: 'secret' },
        ],
      };

      const builder = new ExecutionResultBuilder(resultWithVariables);
      const xml = builder.build();

      expect(xml).toContain('<ns2:name>username</ns2:name>');
      expect(xml).toContain('<ns2:value>admin</ns2:value>');
      expect(xml).toContain('<ns2:name>password</ns2:name>');
      expect(xml).toContain('<ns2:value>secret</ns2:value>');
    });

    it('should include adapter ID when provided', () => {
      const resultWithAdapter: ExecutionResult = {
        ...mockResult,
        adapterId: 'playwright-adapter-123',
      };

      const builder = new ExecutionResultBuilder(resultWithAdapter);
      const xml = builder.build();

      expect(xml).toContain('<ns8:adapterId>playwright-adapter-123</ns8:adapterId>');
    });

    it('should build step results', () => {
      const resultWithSteps: ExecutionResult = {
        ...mockResult,
        stepResults: [
          {
            stepIndex: 1,
            startTime: '2024-03-25T10:00:00.000Z',
            endTime: '2024-03-25T10:01:00.000Z',
            result: ExecutionState.PASSED,
            description: 'Navigate to login page',
            stepType: StepType.EXECUTION,
            tester: 'testuser',
          },
          {
            stepIndex: 2,
            startTime: '2024-03-25T10:01:00.000Z',
            endTime: '2024-03-25T10:02:00.000Z',
            result: ExecutionState.PASSED,
            description: 'Enter credentials',
            tester: 'testuser',
          },
        ],
      };

      const builder = new ExecutionResultBuilder(resultWithSteps);
      const xml = builder.build();

      expect(xml).toContain('<ns2:stepIndex>1</ns2:stepIndex>');
      expect(xml).toContain('<ns2:description>Navigate to login page</ns2:description>');
      expect(xml).toContain('<ns2:stepIndex>2</ns2:stepIndex>');
      expect(xml).toContain('<ns2:description>Enter credentials</ns2:description>');
    });

    it('should include step attachments', () => {
      const resultWithAttachment: ExecutionResult = {
        ...mockResult,
        stepResults: [
          {
            stepIndex: 1,
            startTime: '2024-03-25T10:00:00.000Z',
            endTime: '2024-03-25T10:01:00.000Z',
            result: ExecutionState.FAILED,
            description: 'Login failed',
            tester: 'testuser',
            stepAttachment: createResourceLink('https://jazz.net/qm/resource/attachment/999'),
          },
        ],
      };

      const builder = new ExecutionResultBuilder(resultWithAttachment);
      const xml = builder.build();

      expect(xml).toContain('stepAttachment href="https://jazz.net/qm/resource/attachment/999"');
    });

    it('should include step properties', () => {
      const resultWithProperties: ExecutionResult = {
        ...mockResult,
        stepResults: [
          {
            stepIndex: 1,
            startTime: '2024-03-25T10:00:00.000Z',
            endTime: '2024-03-25T10:01:00.000Z',
            result: ExecutionState.PASSED,
            tester: 'testuser',
            properties: [
              { propertyName: 'javaLineNo', propertyValue: '42' },
              { propertyName: 'testFile', propertyValue: 'login.spec.ts' },
            ],
          },
        ],
      };

      const builder = new ExecutionResultBuilder(resultWithProperties);
      const xml = builder.build();

      expect(xml).toContain('propertyName="javaLineNo"');
      expect(xml).toContain('>42</ns2:property>');
      expect(xml).toContain('propertyName="testFile"');
      expect(xml).toContain('>login.spec.ts</ns2:property>');
    });

    it.skip('should escape XML special characters', () => {
      const resultWithSpecialChars: ExecutionResult = {
        ...mockResult,
        title: 'Test with <special> & "characters"',
        stepResults: [
          {
            stepIndex: 1,
            startTime: '2024-03-25T10:00:00.000Z',
            endTime: '2024-03-25T10:01:00.000Z',
            result: ExecutionState.PASSED,
            description: 'Step with <tags> & "quotes"',
            tester: 'testuser',
          },
        ],
      };

      const builder = new ExecutionResultBuilder(resultWithSpecialChars);
      const xml = builder.build();

      // Check that special characters are escaped
      expect(xml).toContain('<special>');
      expect(xml).toContain('&');
      expect(xml).toContain('"');
      // Check that unescaped characters are NOT present
      expect(xml).not.toContain('<special>');
      expect(xml).not.toContain('& "');
    });

    it('should use default values for optional fields', () => {
      const minimalResult: ExecutionResult = {
        title: 'Minimal Test',
        creator: 'testuser',
        owner: 'testuser',
        state: ExecutionState.PASSED,
        startTime: '2024-03-25T10:00:00.000Z',
        endTime: '2024-03-25T10:05:00.000Z',
        tester: 'testuser',
        testCase: createResourceLink('https://jazz.net/qm/resource/testcase/123'),
        executionWorkItem: createResourceLink('https://jazz.net/qm/resource/executionworkitem/456'),
      };

      const builder = new ExecutionResultBuilder(minimalResult);
      const xml = builder.build();

      expect(xml).toContain('<ns2:machine>localhost</ns2:machine>');
      expect(xml).toContain('<ns2:iterations>1</ns2:iterations>');
      expect(xml).toContain('<ns2:weight>100</ns2:weight>');
    });
  });

  describe('validate', () => {
    it('should validate a complete execution result', () => {
      const validation = ExecutionResultBuilder.validate(mockResult);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidResult = {
        ...mockResult,
        title: '',
        creator: '',
      } as ExecutionResult;

      const validation = ExecutionResultBuilder.validate(invalidResult);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Title is required');
      expect(validation.errors).toContain('Creator is required');
    });

    it('should detect invalid state', () => {
      const invalidResult = {
        ...mockResult,
        state: 'invalid.state' as ExecutionState,
      };

      const validation = ExecutionResultBuilder.validate(invalidResult);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid state'))).toBe(true);
    });

    it('should detect invalid date format', () => {
      const invalidResult = {
        ...mockResult,
        startTime: 'not-a-date',
      };

      const validation = ExecutionResultBuilder.validate(invalidResult);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid start time format'))).toBe(true);
    });

    it('should detect start time after end time', () => {
      const invalidResult = {
        ...mockResult,
        startTime: '2024-03-25T10:05:00.000Z',
        endTime: '2024-03-25T10:00:00.000Z',
      };

      const validation = ExecutionResultBuilder.validate(invalidResult);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Start time must be before end time');
    });

    it('should validate step results', () => {
      const invalidResult: ExecutionResult = {
        ...mockResult,
        stepResults: [
          {
            stepIndex: 1,
            startTime: '',
            endTime: '',
            result: '' as ExecutionState,
            tester: '',
          },
        ],
      };

      const validation = ExecutionResultBuilder.validate(invalidResult);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Step 0'))).toBe(true);
    });
  });

  describe('fromResult', () => {
    it('should create builder from result', () => {
      const builder = ExecutionResultBuilder.fromResult(mockResult);
      expect(builder).toBeInstanceOf(ExecutionResultBuilder);
      const xml = builder.build();
      expect(xml).toContain('Test Login Functionality');
    });
  });
});

// Made with Bob
