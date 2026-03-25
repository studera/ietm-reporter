/**
 * Execution Result Builder
 * Builds OSLC-compliant execution result XML for IETM
 */

import { XmlBuilder } from './XmlBuilder';
import {
  ExecutionResult,
  StepResult,
  Variable,
  Property,
  ExecutionState,
  StepType,
} from '../models/ExecutionResult';

export class ExecutionResultBuilder extends XmlBuilder {
  private result: ExecutionResult;

  constructor(result: ExecutionResult) {
    super('resources/ExecutionResultTemplate.xml');
    this.result = result;
  }

  /**
   * Build the complete execution result XML
   */
  build(): string {
    let xml = this.template;

    // Replace basic fields
    xml = this.replacePlaceholder(xml, 'TITLE', this.escapeXml(this.result.title));
    xml = this.replacePlaceholder(xml, 'CREATOR', this.escapeXml(this.result.creator));
    xml = this.replacePlaceholder(xml, 'OWNER', this.escapeXml(this.result.owner));
    xml = this.replacePlaceholder(xml, 'STATE', this.result.state);
    xml = this.replacePlaceholder(xml, 'MACHINE', this.escapeXml(this.result.machine || 'localhost'));
    xml = this.replacePlaceholder(xml, 'ITERATIONS', this.result.iterations || '1');
    xml = this.replacePlaceholder(xml, 'START_TIME', this.result.startTime);
    xml = this.replacePlaceholder(xml, 'END_TIME', this.result.endTime);
    xml = this.replacePlaceholder(xml, 'WEIGHT', this.result.weight || '100');
    xml = this.replacePlaceholder(xml, 'TESTER', this.escapeXml(this.result.tester));

    // Replace resource links
    xml = this.replacePlaceholder(xml, 'TEST_CASE_HREF', this.result.testCase.href);
    xml = this.replacePlaceholder(xml, 'EXECUTION_WORK_ITEM_HREF', this.result.executionWorkItem.href);

    // Replace optional fields
    xml = this.replacePlaceholder(xml, 'TEST_SCRIPT', this.buildTestScript());
    xml = this.replacePlaceholder(xml, 'VARIABLES', this.buildVariables());
    xml = this.replacePlaceholder(xml, 'ADAPTER_ID', this.buildAdapterId());
    xml = this.replacePlaceholder(xml, 'STEP_RESULTS', this.buildStepResults());

    return xml;
  }

  /**
   * Build test script element
   */
  private buildTestScript(): string {
    if (!this.result.testScript) {
      return '';
    }

    return this.buildSelfClosingElement(
      'testscript',
      { href: this.result.testScript.href },
      'ns2'
    );
  }

  /**
   * Build variables elements
   */
  private buildVariables(): string {
    if (!this.result.variables || this.result.variables.length === 0) {
      return '';
    }

    const variables = this.result.variables.map(variable => {
      const nameElement = this.buildElement('name', variable.name, undefined, 'ns2');
      const valueElement = this.buildElement('value', variable.value, undefined, 'ns2');
      return this.buildElementRaw('variable', `\n        ${nameElement}\n        ${valueElement}\n    `, undefined, 'ns2');
    });

    return variables.join('\n    ');
  }

  /**
   * Build adapter ID element
   */
  private buildAdapterId(): string {
    if (!this.result.adapterId) {
      return '';
    }

    return this.buildElement('adapterId', this.result.adapterId, undefined, 'ns8');
  }

  /**
   * Build step results elements
   */
  private buildStepResults(): string {
    if (!this.result.stepResults || this.result.stepResults.length === 0) {
      return '';
    }

    const steps = this.result.stepResults.map(step => this.buildStepResult(step));
    return steps.join('\n    ');
  }

  /**
   * Build a single step result element
   */
  private buildStepResult(step: StepResult): string {
    const elements: string[] = [];

    // Step index
    elements.push(this.buildElement('stepIndex', step.stepIndex.toString(), undefined, 'ns2'));

    // Start and end time
    elements.push(this.buildElement('startTime', step.startTime, undefined, 'ns2'));
    elements.push(this.buildElement('endTime', step.endTime, undefined, 'ns2'));

    // Result state
    elements.push(this.buildElement('result', step.result, undefined, 'ns2'));

    // Description
    if (step.description) {
      elements.push(this.buildElement('description', step.description, undefined, 'ns2'));
    }

    // Step type
    const stepType = step.stepType || StepType.EXECUTION;
    elements.push(this.buildElement('stepType', stepType, undefined, 'ns2'));

    // Tester
    elements.push(this.buildElement('tester', step.tester, undefined, 'ns2'));

    // Step attachment
    if (step.stepAttachment) {
      elements.push(
        this.buildSelfClosingElement(
          'stepAttachment',
          { href: step.stepAttachment.href },
          'ns2'
        )
      );
    }

    // Actual result
    if (step.actualResult) {
      elements.push(this.buildElement('actualResult', step.actualResult, undefined, 'ns2'));
    }

    // Expected result
    if (step.expectedResult) {
      elements.push(this.buildElement('expectedResult', step.expectedResult, undefined, 'ns2'));
    }

    // Properties
    if (step.properties && step.properties.length > 0) {
      elements.push(this.buildProperties(step.properties));
    }

    const content = elements.map(el => `\n        ${el}`).join('') + '\n    ';
    return this.buildElementRaw('stepResult', content, undefined, 'ns2');
  }

  /**
   * Build properties elements
   */
  private buildProperties(properties: Property[]): string {
    const propertyElements = properties.map(prop => {
      return this.buildElement(
        'property',
        prop.propertyValue,
        { propertyName: prop.propertyName },
        'ns2'
      );
    });

    const content = propertyElements.map(el => `\n            ${el}`).join('') + '\n        ';
    return this.buildElementRaw('properties', content, undefined, 'ns2');
  }

  /**
   * Static factory method to create builder from result
   */
  static fromResult(result: ExecutionResult): ExecutionResultBuilder {
    return new ExecutionResultBuilder(result);
  }

  /**
   * Validate execution result before building
   */
  static validate(result: ExecutionResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!result.title) errors.push('Title is required');
    if (!result.creator) errors.push('Creator is required');
    if (!result.owner) errors.push('Owner is required');
    if (!result.state) errors.push('State is required');
    if (!result.startTime) errors.push('Start time is required');
    if (!result.endTime) errors.push('End time is required');
    if (!result.tester) errors.push('Tester is required');
    if (!result.testCase || !result.testCase.href) errors.push('Test case reference is required');
    if (!result.executionWorkItem || !result.executionWorkItem.href) {
      errors.push('Execution work item reference is required');
    }

    // Validate state is a valid execution state
    if (result.state && !Object.values(ExecutionState).includes(result.state as ExecutionState)) {
      errors.push(`Invalid state: ${result.state}`);
    }

    // Validate dates
    try {
      const start = new Date(result.startTime);
      const end = new Date(result.endTime);
      if (isNaN(start.getTime())) {
        errors.push('Invalid start time format');
      }
      if (isNaN(end.getTime())) {
        errors.push('Invalid end time format');
      }
      if (start > end) {
        errors.push('Start time must be before end time');
      }
    } catch (e) {
      errors.push('Invalid date format');
    }

    // Validate step results
    if (result.stepResults) {
      result.stepResults.forEach((step, index) => {
        if (!step.stepIndex && step.stepIndex !== 0) {
          errors.push(`Step ${index}: stepIndex is required`);
        }
        if (!step.startTime) {
          errors.push(`Step ${index}: startTime is required`);
        }
        if (!step.endTime) {
          errors.push(`Step ${index}: endTime is required`);
        }
        if (!step.result) {
          errors.push(`Step ${index}: result is required`);
        }
        if (!step.tester) {
          errors.push(`Step ${index}: tester is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Made with Bob