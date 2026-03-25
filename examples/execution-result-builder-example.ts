/**
 * Example: Using ExecutionResultBuilder
 * Demonstrates how to build execution result XML for IETM
 */

import {
  ExecutionResultBuilder,
  ExecutionResult,
  ExecutionState,
  StepType,
  createResourceLink,
  formatDateToISO,
  mapPlaywrightStatusToState,
} from '../src';

async function main() {
  console.log('=== Execution Result Builder Example ===\n');

  // Example 1: Simple execution result
  console.log('1. Building simple execution result...');
  const simpleResult: ExecutionResult = {
    title: 'Login Test - Passed',
    creator: 'playwright-user',
    owner: 'playwright-user',
    state: ExecutionState.PASSED,
    machine: 'ci-server-01',
    startTime: formatDateToISO(new Date('2024-03-25T10:00:00Z')),
    endTime: formatDateToISO(new Date('2024-03-25T10:05:00Z')),
    tester: 'playwright-user',
    testCase: createResourceLink(
      'https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_8_TkcFwFEfCGYIoRgUkqqw/testcase/urn:com.ibm.rqm:testcase:2218'
    ),
    executionWorkItem: createResourceLink(
      'https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_8_TkcFwFEfCGYIoRgUkqqw/executionworkitem/urn:com.ibm.rqm:executionworkitem:1234'
    ),
  };

  const simpleBuilder = new ExecutionResultBuilder(simpleResult);
  const simpleXml = simpleBuilder.build();
  console.log('Simple XML (first 500 chars):');
  console.log(simpleXml.substring(0, 500) + '...\n');

  // Example 2: Execution result with step results
  console.log('2. Building execution result with steps...');
  const resultWithSteps: ExecutionResult = {
    title: 'Login Test with Steps',
    creator: 'playwright-user',
    owner: 'playwright-user',
    state: ExecutionState.PASSED,
    machine: 'ci-server-01',
    startTime: formatDateToISO(new Date('2024-03-25T10:00:00Z')),
    endTime: formatDateToISO(new Date('2024-03-25T10:05:00Z')),
    tester: 'playwright-user',
    testCase: createResourceLink(
      'https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_8_TkcFwFEfCGYIoRgUkqqw/testcase/urn:com.ibm.rqm:testcase:2218'
    ),
    executionWorkItem: createResourceLink(
      'https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_8_TkcFwFEfCGYIoRgUkqqw/executionworkitem/urn:com.ibm.rqm:executionworkitem:1234'
    ),
    adapterId: 'playwright-adapter-v1',
    stepResults: [
      {
        stepIndex: 1,
        startTime: formatDateToISO(new Date('2024-03-25T10:00:00Z')),
        endTime: formatDateToISO(new Date('2024-03-25T10:01:00Z')),
        result: ExecutionState.PASSED,
        description: 'Navigate to login page',
        stepType: StepType.EXECUTION,
        tester: 'playwright-user',
        expectedResult: 'Login page should be displayed',
        actualResult: 'Login page displayed successfully',
        properties: [
          { propertyName: 'javaLineNo', propertyValue: '15' },
          { propertyName: 'testFile', propertyValue: 'login.spec.ts' },
        ],
      },
      {
        stepIndex: 2,
        startTime: formatDateToISO(new Date('2024-03-25T10:01:00Z')),
        endTime: formatDateToISO(new Date('2024-03-25T10:02:00Z')),
        result: ExecutionState.PASSED,
        description: 'Enter username and password',
        stepType: StepType.EXECUTION,
        tester: 'playwright-user',
        expectedResult: 'Credentials should be accepted',
        actualResult: 'Credentials entered successfully',
      },
      {
        stepIndex: 3,
        startTime: formatDateToISO(new Date('2024-03-25T10:02:00Z')),
        endTime: formatDateToISO(new Date('2024-03-25T10:03:00Z')),
        result: ExecutionState.PASSED,
        description: 'Click login button',
        stepType: StepType.EXECUTION,
        tester: 'playwright-user',
        expectedResult: 'User should be logged in',
        actualResult: 'User logged in successfully',
      },
    ],
  };

  const stepsBuilder = new ExecutionResultBuilder(resultWithSteps);
  const stepsXml = stepsBuilder.build();
  console.log('XML with steps (first 800 chars):');
  console.log(stepsXml.substring(0, 800) + '...\n');

  // Example 3: Failed test with attachment
  console.log('3. Building failed execution result with attachment...');
  const failedResult: ExecutionResult = {
    title: 'Login Test - Failed',
    creator: 'playwright-user',
    owner: 'playwright-user',
    state: ExecutionState.FAILED,
    machine: 'ci-server-01',
    startTime: formatDateToISO(new Date('2024-03-25T10:00:00Z')),
    endTime: formatDateToISO(new Date('2024-03-25T10:02:00Z')),
    tester: 'playwright-user',
    testCase: createResourceLink(
      'https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_8_TkcFwFEfCGYIoRgUkqqw/testcase/urn:com.ibm.rqm:testcase:2218'
    ),
    executionWorkItem: createResourceLink(
      'https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_8_TkcFwFEfCGYIoRgUkqqw/executionworkitem/urn:com.ibm.rqm:executionworkitem:1234'
    ),
    stepResults: [
      {
        stepIndex: 1,
        startTime: formatDateToISO(new Date('2024-03-25T10:00:00Z')),
        endTime: formatDateToISO(new Date('2024-03-25T10:02:00Z')),
        result: ExecutionState.FAILED,
        description: 'Login attempt failed',
        tester: 'playwright-user',
        expectedResult: 'User should be logged in',
        actualResult: 'Error: Invalid credentials',
        stepAttachment: createResourceLink(
          'https://jazz.net/sandbox01-qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/_8_TkcFwFEfCGYIoRgUkqqw/attachment/12345',
          'screenshot-failure.png'
        ),
      },
    ],
  };

  const failedBuilder = new ExecutionResultBuilder(failedResult);
  const failedXml = failedBuilder.build();
  console.log('Failed test XML (first 600 chars):');
  console.log(failedXml.substring(0, 600) + '...\n');

  // Example 4: Validation
  console.log('4. Validating execution results...');
  
  const validResult = simpleResult;
  const validation1 = ExecutionResultBuilder.validate(validResult);
  console.log(`Valid result validation: ${validation1.valid}`);
  console.log(`Errors: ${validation1.errors.length}\n`);

  const invalidResult: ExecutionResult = {
    ...simpleResult,
    title: '',
    startTime: 'invalid-date',
  };
  const validation2 = ExecutionResultBuilder.validate(invalidResult);
  console.log(`Invalid result validation: ${validation2.valid}`);
  console.log(`Errors: ${validation2.errors.join(', ')}\n`);

  // Example 5: Using Playwright status mapping
  console.log('5. Mapping Playwright test status...');
  const playwrightStatuses = ['passed', 'failed', 'skipped', 'timedout'];
  playwrightStatuses.forEach(status => {
    const state = mapPlaywrightStatusToState(status);
    console.log(`  ${status} -> ${state}`);
  });

  console.log('\n=== Example Complete ===');
}

// Run the example
main().catch(console.error);

// Made with Bob