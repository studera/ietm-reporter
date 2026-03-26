/**
 * Validation Error
 * Thrown when data validation fails (invalid configuration, malformed data, etc.)
 */

import { IETMError, ErrorContext, TroubleshootingHint } from './IETMError';

export class ValidationError extends IETMError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly constraint?: string;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    constraint?: string,
    context: ErrorContext = {}
  ) {
    const troubleshooting: TroubleshootingHint[] = [
      {
        problem: 'Invalid data format',
        solution: 'Check that the data matches the expected format and schema',
      },
      {
        problem: 'Missing required fields',
        solution: 'Ensure all required fields are provided',
      },
      {
        problem: 'Invalid configuration',
        solution: 'Verify your configuration file and environment variables',
        docLink: 'https://github.com/your-repo/docs/configuration.md',
      },
    ];

    // Validation errors are not retryable (data needs to be fixed)
    super(message, 'VALIDATION_ERROR', context, troubleshooting, false);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.constraint = constraint;
  }

  /**
   * Create error for missing required field
   */
  static missingField(field: string, context: ErrorContext = {}): ValidationError {
    const error = new ValidationError(
      `Missing required field: ${field}`,
      field,
      undefined,
      'required',
      context
    );
    (error as any).code = 'VALIDATION_MISSING_FIELD';
    error.troubleshooting.unshift({
      problem: `Required field '${field}' is missing`,
      solution: `Provide a value for the '${field}' field`,
    });
    return error;
  }

  /**
   * Create error for invalid field value
   */
  static invalidValue(
    field: string,
    value: unknown,
    expectedType: string,
    context: ErrorContext = {}
  ): ValidationError {
    const error = new ValidationError(
      `Invalid value for field '${field}': expected ${expectedType}, got ${typeof value}`,
      field,
      value,
      `type:${expectedType}`,
      context
    );
    (error as any).code = 'VALIDATION_INVALID_VALUE';
    error.troubleshooting.unshift({
      problem: `Field '${field}' has invalid type`,
      solution: `Provide a ${expectedType} value for '${field}'`,
    });
    return error;
  }

  /**
   * Create error for invalid format
   */
  static invalidFormat(
    field: string,
    value: unknown,
    format: string,
    context: ErrorContext = {}
  ): ValidationError {
    const error = new ValidationError(
      `Invalid format for field '${field}': expected ${format}`,
      field,
      value,
      `format:${format}`,
      context
    );
    (error as any).code = 'VALIDATION_INVALID_FORMAT';
    error.troubleshooting.unshift({
      problem: `Field '${field}' has invalid format`,
      solution: `Provide a value in ${format} format for '${field}'`,
    });
    return error;
  }

  /**
   * Create error for value out of range
   */
  static outOfRange(
    field: string,
    value: unknown,
    min?: number,
    max?: number,
    context: ErrorContext = {}
  ): ValidationError {
    const rangeStr = min !== undefined && max !== undefined
      ? `between ${min} and ${max}`
      : min !== undefined
      ? `at least ${min}`
      : `at most ${max}`;

    const error = new ValidationError(
      `Value for field '${field}' is out of range: must be ${rangeStr}`,
      field,
      value,
      `range:${min}-${max}`,
      context
    );
    (error as any).code = 'VALIDATION_OUT_OF_RANGE';
    error.troubleshooting.unshift({
      problem: `Field '${field}' value is out of range`,
      solution: `Provide a value ${rangeStr} for '${field}'`,
    });
    return error;
  }

  /**
   * Create error for invalid configuration
   */
  static invalidConfig(configKey: string, reason: string, context: ErrorContext = {}): ValidationError {
    const error = new ValidationError(
      `Invalid configuration for '${configKey}': ${reason}`,
      configKey,
      undefined,
      'config',
      context
    );
    (error as any).code = 'VALIDATION_INVALID_CONFIG';
    error.troubleshooting.unshift({
      problem: `Configuration '${configKey}' is invalid`,
      solution: `Fix the configuration: ${reason}`,
    });
    return error;
  }

  /**
   * Create error for invalid URL
   */
  static invalidUrl(field: string, value: string, context: ErrorContext = {}): ValidationError {
    const error = new ValidationError(
      `Invalid URL for field '${field}': ${value}`,
      field,
      value,
      'url',
      context
    );
    (error as any).code = 'VALIDATION_INVALID_URL';
    error.troubleshooting.unshift({
      problem: `Field '${field}' contains an invalid URL`,
      solution: 'Provide a valid URL with protocol (http:// or https://)',
    });
    return error;
  }

  /**
   * Create error for invalid date
   */
  static invalidDate(field: string, value: string, context: ErrorContext = {}): ValidationError {
    const error = new ValidationError(
      `Invalid date for field '${field}': ${value}`,
      field,
      value,
      'date',
      context
    );
    (error as any).code = 'VALIDATION_INVALID_DATE';
    error.troubleshooting.unshift({
      problem: `Field '${field}' contains an invalid date`,
      solution: 'Provide a valid ISO 8601 date string (e.g., 2024-01-01T10:00:00.000Z)',
    });
    return error;
  }

  /**
   * Create error for invalid XML
   */
  static invalidXml(reason: string, context: ErrorContext = {}): ValidationError {
    const error = new ValidationError(`Invalid XML: ${reason}`, 'xml', undefined, 'xml', context);
    (error as any).code = 'VALIDATION_INVALID_XML';
    error.troubleshooting.unshift({
      problem: 'XML is malformed or invalid',
      solution: 'Ensure the XML is well-formed and matches the expected schema',
    });
    return error;
  }

  /**
   * Create error for invalid test case ID
   */
  static invalidTestCaseId(testCaseId: string, context: ErrorContext = {}): ValidationError {
    const error = new ValidationError(
      `Invalid test case ID: ${testCaseId}`,
      'testCaseId',
      testCaseId,
      'testcase',
      context
    );
    (error as any).code = 'VALIDATION_INVALID_TEST_CASE_ID';
    error.troubleshooting.unshift({
      problem: 'Test case ID is invalid or does not exist in IETM',
      solution: 'Verify the test case ID exists in IETM and is accessible',
    });
    return error;
  }

  /**
   * Get detailed validation message
   */
  override getDetailedMessage(): string {
    let message = super.getDetailedMessage();

    if (this.field) {
      message += `\nField: ${this.field}`;
    }

    if (this.value !== undefined) {
      message += `\nValue: ${JSON.stringify(this.value)}`;
    }

    if (this.constraint) {
      message += `\nConstraint: ${this.constraint}`;
    }

    return message;
  }
}

// Made with Bob