/**
 * Authentication Error
 * Thrown when authentication fails or credentials are invalid
 */

import { IETMError, ErrorContext, TroubleshootingHint } from './IETMError';

export class AuthenticationError extends IETMError {
  constructor(message: string, context: ErrorContext = {}) {
    const troubleshooting: TroubleshootingHint[] = [
      {
        problem: 'Invalid credentials',
        solution: 'Verify your username and password in the .env file or configuration',
        docLink: 'https://jazz.net/wiki/bin/view/Main/JazzFormBasedAuthentication',
      },
      {
        problem: 'Account locked',
        solution: 'Check if your account is locked due to too many failed login attempts',
      },
      {
        problem: 'Session expired',
        solution: 'The authentication session may have expired. The client will automatically retry.',
      },
      {
        problem: 'Network connectivity',
        solution: 'Ensure you can reach the IETM server and JTS server URLs',
      },
    ];

    // Authentication errors are retryable (session might have expired)
    super(message, 'AUTH_ERROR', context, troubleshooting, true);
    this.name = 'AuthenticationError';
  }

  /**
   * Create error for invalid credentials
   */
  static invalidCredentials(context: ErrorContext = {}): AuthenticationError {
    const error = new AuthenticationError(
      'Authentication failed: Invalid username or password',
      {
        ...context,
        statusCode: context.statusCode || 401,
      }
    );
    (error as any).code = 'AUTH_INVALID_CREDENTIALS';
    return error;
  }

  /**
   * Create error for session expiration
   */
  static sessionExpired(context: ErrorContext = {}): AuthenticationError {
    const error = new AuthenticationError('Authentication session has expired', {
      ...context,
      statusCode: context.statusCode || 401,
    });
    (error as any).code = 'AUTH_SESSION_EXPIRED';
    return error;
  }

  /**
   * Create error for missing credentials
   */
  static missingCredentials(context: ErrorContext = {}): AuthenticationError {
    const error = new AuthenticationError('Missing authentication credentials', {
      ...context,
      statusCode: 401,
    });
    (error as any).code = 'AUTH_MISSING_CREDENTIALS';
    (error as any).isRetryable = false; // Missing credentials won't fix themselves
    error.troubleshooting.unshift({
      problem: 'Credentials not provided',
      solution:
        'Set IETM_USERNAME and IETM_PASSWORD environment variables or provide them in configuration',
    });
    return error;
  }

  /**
   * Create error for forbidden access
   */
  static forbidden(resource: string, context: ErrorContext = {}): AuthenticationError {
    const error = new AuthenticationError(`Access forbidden to resource: ${resource}`, {
      ...context,
      statusCode: 403,
    });
    (error as any).code = 'AUTH_FORBIDDEN';
    error.troubleshooting.unshift({
      problem: 'Insufficient permissions',
      solution: 'Ensure your user account has the required permissions to access this resource',
    });
    return error;
  }

  /**
   * Create error for account lockout
   */
  static accountLocked(context: ErrorContext = {}): AuthenticationError {
    const error = new AuthenticationError('Account is locked due to too many failed login attempts', {
      ...context,
      statusCode: 401,
    });
    (error as any).code = 'AUTH_ACCOUNT_LOCKED';
    error.troubleshooting.unshift({
      problem: 'Account locked',
      solution: 'Wait for the lockout period to expire or contact your administrator to unlock the account',
    });
    // Account lockout is not retryable - create new error with isRetryable = false
    const finalError = new AuthenticationError(error.message, error.context);
    (finalError as any).code = 'AUTH_ACCOUNT_LOCKED';
    (finalError as any).isRetryable = false;
    return finalError;
  }
}

// Made with Bob