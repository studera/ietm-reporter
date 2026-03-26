/**
 * Base IETM Error Class
 * Base class for all IETM-specific errors with enhanced error information
 */

export interface ErrorContext {
  /** HTTP status code if applicable */
  statusCode?: number;

  /** Original error that caused this error */
  cause?: Error;

  /** Additional context data */
  data?: Record<string, unknown>;

  /** Timestamp when error occurred */
  timestamp?: Date;

  /** Request URL if applicable */
  url?: string;

  /** HTTP method if applicable */
  method?: string;

  /** Retry attempt number if applicable */
  retryAttempt?: number;
}

export interface TroubleshootingHint {
  /** Problem description */
  problem: string;

  /** Suggested solution */
  solution: string;

  /** Documentation link if available */
  docLink?: string;
}

export class IETMError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly troubleshooting: TroubleshootingHint[];
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    code: string,
    context: ErrorContext = {},
    troubleshooting: TroubleshootingHint[] = [],
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'IETMError';
    this.code = code;
    this.context = {
      ...context,
      timestamp: context.timestamp || new Date(),
    };
    this.troubleshooting = troubleshooting;
    this.isRetryable = isRetryable;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get formatted error message with context
   */
  getDetailedMessage(): string {
    let message = `[${this.code}] ${this.message}`;

    if (this.context.statusCode) {
      message += `\nHTTP Status: ${this.context.statusCode}`;
    }

    if (this.context.url) {
      message += `\nURL: ${this.context.method || 'GET'} ${this.context.url}`;
    }

    if (this.context.retryAttempt !== undefined) {
      message += `\nRetry Attempt: ${this.context.retryAttempt}`;
    }

    if (this.troubleshooting.length > 0) {
      message += '\n\nTroubleshooting:';
      this.troubleshooting.forEach((hint, index) => {
        message += `\n${index + 1}. ${hint.problem}`;
        message += `\n   Solution: ${hint.solution}`;
        if (hint.docLink) {
          message += `\n   Docs: ${hint.docLink}`;
        }
      });
    }

    if (this.context.cause) {
      message += `\n\nCaused by: ${this.context.cause.message}`;
    }

    return message;
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      troubleshooting: this.troubleshooting,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }

  /**
   * Check if error is retryable
   */
  canRetry(): boolean {
    return this.isRetryable;
  }

  /**
   * Get HTTP status code if available
   */
  getStatusCode(): number | undefined {
    return this.context.statusCode;
  }

  /**
   * Check if error is a specific HTTP status
   */
  isStatus(statusCode: number): boolean {
    return this.context.statusCode === statusCode;
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    const status = this.context.statusCode;
    return status !== undefined && status >= 400 && status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    const status = this.context.statusCode;
    return status !== undefined && status >= 500 && status < 600;
  }
}

// Made with Bob