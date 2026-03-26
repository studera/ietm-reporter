/**
 * Error Handling Example
 * Demonstrates how to use custom error types and circuit breaker
 */

import {
  IETMError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  CircuitBreaker,
  CircuitState,
  isIETMError,
  isAuthenticationError,
  isNetworkError,
  isValidationError,
  isRetryableError,
  getErrorMessage,
} from '../src/errors';

async function main() {
  console.log('=== Error Handling Examples ===\n');

  // Example 1: Authentication Errors
  console.log('Example 1: Authentication Errors');
  demonstrateAuthenticationErrors();

  // Example 2: Network Errors
  console.log('\nExample 2: Network Errors');
  demonstrateNetworkErrors();

  // Example 3: Validation Errors
  console.log('\nExample 3: Validation Errors');
  demonstrateValidationErrors();

  // Example 4: Error Type Guards
  console.log('\nExample 4: Error Type Guards');
  demonstrateTypeGuards();

  // Example 5: Circuit Breaker
  console.log('\nExample 5: Circuit Breaker');
  await demonstrateCircuitBreaker();

  // Example 6: Error Recovery
  console.log('\nExample 6: Error Recovery');
  await demonstrateErrorRecovery();
}

function demonstrateAuthenticationErrors() {
  try {
    // Invalid credentials
    throw AuthenticationError.invalidCredentials({
      url: 'https://jazz.net/jts/j_security_check',
      method: 'POST',
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      console.log('Authentication Error Caught:');
      console.log(error.getDetailedMessage());
      console.log(`\nRetryable: ${error.canRetry()}`);
      console.log(`Status Code: ${error.getStatusCode()}`);
    }
  }

  console.log('\n---');

  try {
    // Session expired
    throw AuthenticationError.sessionExpired({
      url: 'https://jazz.net/qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources',
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      console.log('Session Expired:');
      console.log(error.message);
      console.log(`Retryable: ${error.canRetry()}`);
    }
  }

  console.log('\n---');

  try {
    // Forbidden access
    throw AuthenticationError.forbidden('/testcase/123', {
      statusCode: 403,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      console.log('Forbidden Access:');
      console.log(error.message);
    }
  }
}

function demonstrateNetworkErrors() {
  try {
    // Connection timeout
    throw NetworkError.timeout('https://jazz.net/qm/service', 30000, {
      method: 'GET',
    });
  } catch (error) {
    if (isNetworkError(error)) {
      console.log('Network Timeout:');
      console.log(error.getDetailedMessage());
      console.log(`\nRetryable: ${error.canRetry()}`);
    }
  }

  console.log('\n---');

  try {
    // Rate limited
    throw NetworkError.rateLimited('https://jazz.net/qm/service', 60);
  } catch (error) {
    if (isNetworkError(error)) {
      console.log('Rate Limited:');
      console.log(error.message);
      const retryAfter = error.context.data?.retryAfter;
      console.log(`Retry after: ${retryAfter} seconds`);
    }
  }

  console.log('\n---');

  try {
    // Server unavailable
    throw NetworkError.serverUnavailable('https://jazz.net/qm');
  } catch (error) {
    if (isNetworkError(error)) {
      console.log('Server Unavailable:');
      console.log(error.message);
      console.log(`Server Error: ${error.isServerError()}`);
    }
  }
}

function demonstrateValidationErrors() {
  try {
    // Missing required field
    throw ValidationError.missingField('username');
  } catch (error) {
    if (isValidationError(error)) {
      console.log('Missing Field:');
      console.log(error.getDetailedMessage());
      console.log(`\nRetryable: ${error.canRetry()}`);
    }
  }

  console.log('\n---');

  try {
    // Invalid value
    throw ValidationError.invalidValue('port', '8080abc', 'number');
  } catch (error) {
    if (isValidationError(error)) {
      console.log('Invalid Value:');
      console.log(error.message);
      console.log(`Field: ${error.field}`);
      console.log(`Value: ${error.value}`);
    }
  }

  console.log('\n---');

  try {
    // Invalid test case ID
    throw ValidationError.invalidTestCaseId('INVALID-123');
  } catch (error) {
    if (isValidationError(error)) {
      console.log('Invalid Test Case ID:');
      console.log(error.getDetailedMessage());
    }
  }
}

function demonstrateTypeGuards() {
  const errors: unknown[] = [
    AuthenticationError.invalidCredentials(),
    NetworkError.timeout('https://example.com', 5000),
    ValidationError.missingField('email'),
    new Error('Generic error'),
    'String error',
  ];

  errors.forEach((error, index) => {
    console.log(`\nError ${index + 1}:`);
    console.log(`  Is IETMError: ${isIETMError(error)}`);
    console.log(`  Is AuthenticationError: ${isAuthenticationError(error)}`);
    console.log(`  Is NetworkError: ${isNetworkError(error)}`);
    console.log(`  Is ValidationError: ${isValidationError(error)}`);
    console.log(`  Is Retryable: ${isRetryableError(error)}`);
    console.log(`  Message: ${getErrorMessage(error).substring(0, 50)}...`);
  });
}

async function demonstrateCircuitBreaker() {
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 5000, // 5 seconds
    successThreshold: 2,
    onStateChange: (oldState, newState) => {
      console.log(`Circuit state changed: ${oldState} -> ${newState}`);
    },
  });

  // Simulate a failing service
  let callCount = 0;
  const unreliableService = async (): Promise<string> => {
    callCount++;
    console.log(`  Call ${callCount}`);

    if (callCount <= 3) {
      throw new Error('Service unavailable');
    }
    return 'Success';
  };

  // Try to call the service multiple times
  for (let i = 1; i <= 6; i++) {
    try {
      console.log(`\nAttempt ${i}:`);
      const result = await breaker.execute(unreliableService);
      console.log(`  Result: ${result}`);
    } catch (error) {
      if (error instanceof Error) {
        console.log(`  Error: ${error.message}`);
      }
    }

    // Show circuit breaker stats
    const stats = breaker.getStats();
    console.log(`  Circuit State: ${stats.state}`);
    console.log(`  Failures: ${stats.failures}, Successes: ${stats.successes}`);
  }

  // Force reset
  console.log('\nForcing circuit reset...');
  breaker.forceReset();
  console.log(`Circuit State: ${breaker.getState()}`);
}

async function demonstrateErrorRecovery() {
  // Simulate a function that might fail
  const riskyOperation = async (shouldFail: boolean): Promise<string> => {
    if (shouldFail) {
      throw NetworkError.timeout('https://example.com/api', 5000);
    }
    return 'Operation successful';
  };

  // Retry logic with exponential backoff
  const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`  Attempt ${attempt}/${maxRetries}`);
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isRetryableError(error)) {
          console.log('  Error is not retryable, giving up');
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`  Failed, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };

  // Test with failing operation
  console.log('Testing with failing operation:');
  try {
    await retryWithBackoff(() => riskyOperation(true), 3, 100);
  } catch (error) {
    console.log(`  Final error: ${getErrorMessage(error).substring(0, 50)}...`);
  }

  console.log('\nTesting with successful operation:');
  try {
    const result = await retryWithBackoff(() => riskyOperation(false), 3, 100);
    console.log(`  Result: ${result}`);
  } catch (error) {
    console.log(`  Error: ${getErrorMessage(error)}`);
  }
}

// Run the examples
main().catch(console.error);

// Made with Bob