/**
 * Errors Module
 * Exports all error types and utilities
 */

import { IETMError as IETMErrorClass } from './IETMError';
import { AuthenticationError as AuthenticationErrorClass } from './AuthenticationError';
import { NetworkError as NetworkErrorClass } from './NetworkError';
import { ValidationError as ValidationErrorClass } from './ValidationError';

export { IETMError } from './IETMError';
export type { ErrorContext, TroubleshootingHint } from './IETMError';

export { AuthenticationError } from './AuthenticationError';
export { NetworkError } from './NetworkError';
export { ValidationError } from './ValidationError';

export { CircuitBreaker, CircuitState } from './CircuitBreaker';
export type { CircuitBreakerOptions, CircuitBreakerStats } from './CircuitBreaker';

/**
 * Type guard to check if error is an IETMError
 */
export function isIETMError(error: unknown): error is IETMErrorClass {
  return error instanceof IETMErrorClass;
}

/**
 * Type guard to check if error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationErrorClass {
  return error instanceof AuthenticationErrorClass;
}

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkErrorClass {
  return error instanceof NetworkErrorClass;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationErrorClass {
  return error instanceof ValidationErrorClass;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isIETMError(error)) {
    return error.canRetry();
  }
  return false;
}

/**
 * Get error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (isIETMError(error)) {
    return error.getDetailedMessage();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Made with Bob