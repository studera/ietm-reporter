/**
 * Unit tests for error handling classes
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
  ErrorContext,
} from '../../src/errors';

describe('IETMError', () => {
  describe('constructor', () => {
    it('should create error with basic properties', () => {
      const error = new IETMError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('IETMError');
      expect(error.isRetryable).toBe(false);
      expect(error.context).toEqual({ timestamp: expect.any(Date) });
      expect(error.troubleshooting).toEqual([]);
    });

    it('should create error with full context', () => {
      const context = {
        statusCode: 500,
        url: 'https://example.com',
        method: 'POST',
        data: { key: 'value' },
      };
      const hints = [
        { problem: 'Server error', solution: 'Retry later' },
      ];

      const error = new IETMError(
        'Server error',
        'SERVER_ERROR',
        context,
        hints,
        true
      );

      expect(error.context).toMatchObject(context);
      expect(error.troubleshooting).toEqual(hints);
      expect(error.isRetryable).toBe(true);
    });

    it('should set timestamp', () => {
      const before = new Date();
      const error = new IETMError('Test', 'TEST');
      const after = new Date();

      expect(error.context.timestamp).toBeInstanceOf(Date);
      expect(error.context.timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.context.timestamp!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getDetailedMessage', () => {
    it('should return message with code', () => {
      const error = new IETMError('Test error', 'TEST_ERROR');
      const message = error.getDetailedMessage();

      expect(message).toContain('Test error');
      expect(message).toContain('[TEST_ERROR]');
    });

    it('should include troubleshooting hints', () => {
      const error = new IETMError(
        'Test error',
        'TEST_ERROR',
        {},
        [
          { problem: 'Problem 1', solution: 'Solution 1' },
          { problem: 'Problem 2', solution: 'Solution 2', docLink: 'https://docs.example.com' },
        ]
      );
      const message = error.getDetailedMessage();

      expect(message).toContain('Problem 1');
      expect(message).toContain('Solution 1');
      expect(message).toContain('Problem 2');
      expect(message).toContain('Solution 2');
      expect(message).toContain('https://docs.example.com');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const error = new IETMError(
        'Test error',
        'TEST_ERROR',
        { statusCode: 500 },
        [{ problem: 'Test', solution: 'Fix' }],
        true
      );
      const json = error.toJSON();

      expect(json.name).toBe('IETMError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_ERROR');
      expect((json.context as ErrorContext).statusCode).toBe(500);
      expect(json.troubleshooting).toHaveLength(1);
      expect(json.isRetryable).toBe(true);
    });
  });

  describe('helper methods', () => {
    it('should check if error can retry', () => {
      const retryable = new IETMError('Test', 'TEST', {}, [], true);
      const notRetryable = new IETMError('Test', 'TEST', {}, [], false);

      expect(retryable.canRetry()).toBe(true);
      expect(notRetryable.canRetry()).toBe(false);
    });

    it('should get status code', () => {
      const error = new IETMError('Test', 'TEST', { statusCode: 404 });
      expect(error.getStatusCode()).toBe(404);
    });

    it('should check status code', () => {
      const error = new IETMError('Test', 'TEST', { statusCode: 404 });
      expect(error.isStatus(404)).toBe(true);
      expect(error.isStatus(500)).toBe(false);
    });

    it('should identify client errors', () => {
      const error400 = new IETMError('Test', 'TEST', { statusCode: 400 });
      const error404 = new IETMError('Test', 'TEST', { statusCode: 404 });
      const error500 = new IETMError('Test', 'TEST', { statusCode: 500 });

      expect(error400.isClientError()).toBe(true);
      expect(error404.isClientError()).toBe(true);
      expect(error500.isClientError()).toBe(false);
    });

    it('should identify server errors', () => {
      const error400 = new IETMError('Test', 'TEST', { statusCode: 400 });
      const error500 = new IETMError('Test', 'TEST', { statusCode: 500 });
      const error503 = new IETMError('Test', 'TEST', { statusCode: 503 });

      expect(error400.isServerError()).toBe(false);
      expect(error500.isServerError()).toBe(true);
      expect(error503.isServerError()).toBe(true);
    });
  });
});

describe('AuthenticationError', () => {
  describe('factory methods', () => {
    it('should create invalidCredentials error', () => {
      const error = AuthenticationError.invalidCredentials();

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(error.canRetry()).toBe(true);
      expect(error.troubleshooting.length).toBeGreaterThan(0);
    });

    it('should create sessionExpired error', () => {
      const error = AuthenticationError.sessionExpired();

      expect(error.code).toBe('AUTH_SESSION_EXPIRED');
      expect(error.canRetry()).toBe(true);
    });

    it('should create missingCredentials error', () => {
      const error = AuthenticationError.missingCredentials();

      expect(error.code).toBe('AUTH_MISSING_CREDENTIALS');
      expect(error.canRetry()).toBe(false);
    });

    it('should create forbidden error', () => {
      const error = AuthenticationError.forbidden('/resource');

      expect(error.code).toBe('AUTH_FORBIDDEN');
      expect(error.message).toContain('/resource');
      expect(error.canRetry()).toBe(true);
    });

    it('should create accountLocked error', () => {
      const error = AuthenticationError.accountLocked();

      expect(error.code).toBe('AUTH_ACCOUNT_LOCKED');
      expect(error.canRetry()).toBe(false);
    });
  });
});

describe('NetworkError', () => {
  describe('factory methods', () => {
    it('should create timeout error', () => {
      const error = NetworkError.timeout('https://example.com', 5000);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.code).toBe('NETWORK_TIMEOUT');
      expect(error.message).toContain('5000ms');
      expect(error.canRetry()).toBe(true);
    });

    it('should create connectionRefused error', () => {
      const error = NetworkError.connectionRefused('https://example.com');

      expect(error.code).toBe('NETWORK_CONNECTION_REFUSED');
      expect(error.canRetry()).toBe(true);
    });

    it('should create dnsFailure error', () => {
      const error = NetworkError.dnsFailure('example.com');

      expect(error.code).toBe('NETWORK_DNS_FAILURE');
      expect(error.message).toContain('example.com');
    });

    it('should create sslError error', () => {
      const error = NetworkError.sslError('https://example.com');

      expect(error.code).toBe('NETWORK_SSL_ERROR');
      expect(error.canRetry()).toBe(true);
    });

    it('should create rateLimited error', () => {
      const error = NetworkError.rateLimited('https://example.com', 60);

      expect(error.code).toBe('NETWORK_RATE_LIMITED');
      expect(error.context.data?.retryAfter).toBe(60);
      expect(error.canRetry()).toBe(true);
    });

    it('should create serverUnavailable error', () => {
      const error = NetworkError.serverUnavailable('https://example.com');

      expect(error.code).toBe('NETWORK_SERVER_UNAVAILABLE');
      expect(error.getStatusCode()).toBe(503);
    });

    it('should create badGateway error', () => {
      const error = NetworkError.badGateway('https://example.com');

      expect(error.code).toBe('NETWORK_BAD_GATEWAY');
      expect(error.getStatusCode()).toBe(502);
    });

    it('should create gatewayTimeout error', () => {
      const error = NetworkError.gatewayTimeout('https://example.com');

      expect(error.code).toBe('NETWORK_GATEWAY_TIMEOUT');
      expect(error.getStatusCode()).toBe(504);
    });
  });
});

describe('ValidationError', () => {
  describe('factory methods', () => {
    it('should create missingField error', () => {
      const error = ValidationError.missingField('username');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe('VALIDATION_MISSING_FIELD');
      expect(error.field).toBe('username');
      expect(error.canRetry()).toBe(false);
    });

    it('should create invalidValue error', () => {
      const error = ValidationError.invalidValue('age', 'abc', 'number');

      expect(error.code).toBe('VALIDATION_INVALID_VALUE');
      expect(error.field).toBe('age');
      expect(error.value).toBe('abc');
      expect(error.message).toContain('number');
    });

    it('should create invalidFormat error', () => {
      const error = ValidationError.invalidFormat('email', 'notanemail', 'email address');

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.field).toBe('email');
    });

    it('should create outOfRange error', () => {
      const error = ValidationError.outOfRange('port', 70000, 1, 65535);

      expect(error.code).toBe('VALIDATION_OUT_OF_RANGE');
      expect(error.message).toContain('1');
      expect(error.message).toContain('65535');
    });

    it('should create invalidConfig error', () => {
      const error = ValidationError.invalidConfig('baseUrl', 'Missing baseUrl');

      expect(error.code).toBe('VALIDATION_INVALID_CONFIG');
    });

    it('should create invalidUrl error', () => {
      const error = ValidationError.invalidUrl('serverUrl', 'not a url');

      expect(error.code).toBe('VALIDATION_INVALID_URL');
      expect(error.value).toBe('not a url');
    });

    it('should create invalidDate error', () => {
      const error = ValidationError.invalidDate('startDate', 'invalid');

      expect(error.code).toBe('VALIDATION_INVALID_DATE');
      expect(error.field).toBe('startDate');
    });

    it('should create invalidXml error', () => {
      const error = ValidationError.invalidXml('Missing closing tag');

      expect(error.code).toBe('VALIDATION_INVALID_XML');
    });

    it('should create invalidTestCaseId error', () => {
      const error = ValidationError.invalidTestCaseId('INVALID-123');

      expect(error.code).toBe('VALIDATION_INVALID_TEST_CASE_ID');
      expect(error.value).toBe('INVALID-123');
    });
  });

  describe('getDetailedMessage', () => {
    it('should include field and value information', () => {
      const error = ValidationError.invalidValue('username', 'ab', 'at least 3 characters');
      const message = error.getDetailedMessage();

      expect(message).toContain('username');
      expect(message).toContain('ab');
    });
  });
});

describe('CircuitBreaker', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const breaker = new CircuitBreaker();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });

    it('should create with custom options', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 10,
        resetTimeout: 30000,
        successThreshold: 3,
      });

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('execute', () => {
    it('should execute successful function', async () => {
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(breaker.getStats().successes).toBe(1);
    });

    it('should track failures', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow('fail');
      }

      expect(breaker.getStats().failures).toBe(3);
    });

    it('should open circuit after threshold', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // First two failures
      await expect(breaker.execute(fn)).rejects.toThrow('fail');
      await expect(breaker.execute(fn)).rejects.toThrow('fail');

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Next call should fail immediately without calling function
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(fn).toHaveBeenCalledTimes(2); // Not called the third time
    });

    it('should transition to half-open after timeout', async () => {
      jest.useFakeTimers();

      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000,
      });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow('fail');
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should be half-open now
      fn.mockResolvedValue('success');
      await breaker.execute(fn);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      jest.useRealTimers();
    });

    it('should close circuit after success threshold in half-open', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 2,
        resetTimeout: 100,
      });

      // Open the circuit
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(breaker.execute(failFn)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Two successes should transition to half-open then closed
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit on failure in half-open', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 100,
      });

      // Open the circuit
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(breaker.execute(failFn)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Failure in half-open should reopen
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('state management', () => {
    it('should call onStateChange callback', async () => {
      const onStateChange = jest.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        onStateChange,
      });

      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(breaker.execute(fn)).rejects.toThrow();

      expect(onStateChange).toHaveBeenCalledWith(
        CircuitState.CLOSED,
        CircuitState.OPEN
      );
    });

    it('should force reset', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });

      // Open the circuit
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      breaker.execute(fn).catch(() => {});

      breaker.forceReset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().failures).toBe(0);
      expect(breaker.getStats().successes).toBe(0);
    });

  });

  describe('getStats', () => {
    it('should return current statistics', async () => {
      const breaker = new CircuitBreaker();

      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      await breaker.execute(failFn).catch(() => {});

      const stats = breaker.getStats();

      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failures).toBe(1);
      expect(stats.successes).toBe(1);
      expect(stats.lastFailureTime).toBeDefined();
    });
  });
});

describe('Type Guards', () => {
  describe('isIETMError', () => {
    it('should identify IETM errors', () => {
      const ietmError = new IETMError('Test', 'TEST');
      const authError = AuthenticationError.invalidCredentials();
      const genericError = new Error('Generic');

      expect(isIETMError(ietmError)).toBe(true);
      expect(isIETMError(authError)).toBe(true);
      expect(isIETMError(genericError)).toBe(false);
      expect(isIETMError('string')).toBe(false);
      expect(isIETMError(null)).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('should identify authentication errors', () => {
      const authError = AuthenticationError.invalidCredentials();
      const networkError = NetworkError.timeout('url', 5000);
      const genericError = new Error('Generic');

      expect(isAuthenticationError(authError)).toBe(true);
      expect(isAuthenticationError(networkError)).toBe(false);
      expect(isAuthenticationError(genericError)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      const networkError = NetworkError.timeout('url', 5000);
      const authError = AuthenticationError.invalidCredentials();

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(authError)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should identify validation errors', () => {
      const validationError = ValidationError.missingField('field');
      const authError = AuthenticationError.invalidCredentials();

      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(authError)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryable = new IETMError('Test', 'TEST', {}, [], true);
      const notRetryable = new IETMError('Test', 'TEST', {}, [], false);
      const genericError = new Error('Generic');

      expect(isRetryableError(retryable)).toBe(true);
      expect(isRetryableError(notRetryable)).toBe(false);
      expect(isRetryableError(genericError)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should get message from IETM error', () => {
      const error = new IETMError('Test message', 'TEST');
      expect(getErrorMessage(error)).toBe('[TEST] Test message');
    });

    it('should get message from generic error', () => {
      const error = new Error('Generic message');
      expect(getErrorMessage(error)).toBe('Generic message');
    });

    it('should handle string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should handle unknown errors', () => {
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
      expect(getErrorMessage(123)).toBe('123');
    });
  });
});

// Made with Bob