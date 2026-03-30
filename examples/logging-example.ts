/**
 * Logging Example
 * Demonstrates how to use the logging system
 */

import { getLogger, createComponentLogger, Logger } from '../src/logging';
import { AuthenticationError, NetworkError, ValidationError } from '../src/errors';

async function main() {
  console.log('=== Logging Examples ===\n');

  // Example 1: Basic Logging
  console.log('Example 1: Basic Logging');
  demonstrateBasicLogging();

  // Example 2: Component Logger
  console.log('\nExample 2: Component Logger');
  demonstrateComponentLogger();

  // Example 3: Context Logging
  console.log('\nExample 3: Context Logging');
  demonstrateContextLogging();

  // Example 4: Error Logging
  console.log('\nExample 4: Error Logging');
  demonstrateErrorLogging();

  // Example 5: HTTP Request/Response Logging
  console.log('\nExample 5: HTTP Request/Response Logging');
  demonstrateHttpLogging();

  // Example 6: Test Execution Logging
  console.log('\nExample 6: Test Execution Logging');
  demonstrateTestLogging();

  // Example 7: Sensitive Data Sanitization
  console.log('\nExample 7: Sensitive Data Sanitization');
  demonstrateSanitization();

  // Example 8: Log Level Management
  console.log('\nExample 8: Log Level Management');
  demonstrateLogLevels();

  // Example 9: Child Logger
  console.log('\nExample 9: Child Logger');
  demonstrateChildLogger();

  // Example 10: Custom Configuration
  console.log('\nExample 10: Custom Configuration');
  demonstrateCustomConfig();
}

function demonstrateBasicLogging() {
  const logger = getLogger();

  logger.error('This is an error message');
  logger.warn('This is a warning message');
  logger.info('This is an info message');
  logger.debug('This is a debug message');
  logger.trace('This is a trace message');
}

function demonstrateComponentLogger() {
  // Create logger for specific component
  const authLogger = createComponentLogger('AuthManager');
  const clientLogger = createComponentLogger('IETMClient');

  authLogger.info('Authentication started');
  authLogger.info('Authentication successful');

  clientLogger.info('Fetching test cases');
  clientLogger.info('Test cases retrieved');
}

function demonstrateContextLogging() {
  const logger = getLogger();

  // Log with request context
  logger.info('Processing request', {
    requestId: 'req-123',
    userId: 'user-456',
    component: 'RequestHandler',
  });

  // Log with test context
  logger.info('Test execution started', {
    testCaseId: 'TC-001',
    testTitle: 'Login test',
    component: 'TestRunner',
  });

  // Log with execution context
  logger.info('Result published', {
    testCaseId: 'TC-001',
    executionRecordId: 'ER-789',
    component: 'IETMReporter',
  });
}

function demonstrateErrorLogging() {
  const logger = getLogger();

  // Log generic error
  try {
    throw new Error('Something went wrong');
  } catch (error) {
    logger.error('Operation failed', error as Error);
  }

  // Log authentication error
  try {
    throw AuthenticationError.invalidCredentials();
  } catch (error) {
    logger.error('Authentication failed', error as Error, {
      component: 'AuthManager',
      url: 'https://jazz.net/jts/j_security_check',
    });
  }

  // Log network error
  try {
    throw NetworkError.timeout('https://jazz.net/qm/service', 5000);
  } catch (error) {
    logger.error('Network request failed', error as Error, {
      component: 'IETMClient',
      method: 'GET',
    });
  }

  // Log validation error
  try {
    throw ValidationError.missingField('username');
  } catch (error) {
    logger.error('Validation failed', error as Error, {
      component: 'ConfigManager',
    });
  }
}

function demonstrateHttpLogging() {
  const logger = getLogger();

  // Log HTTP request
  logger.logRequest('GET', 'https://jazz.net/qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources', {
    component: 'IETMClient',
    requestId: 'req-123',
  });

  // Simulate request processing
  const startTime = Date.now();
  // ... request processing ...
  const duration = Date.now() - startTime;

  // Log successful response
  logger.logResponse(
    'GET',
    'https://jazz.net/qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources',
    200,
    duration,
    {
      component: 'IETMClient',
      requestId: 'req-123',
    }
  );

  // Log error response
  logger.logResponse(
    'POST',
    'https://jazz.net/qm/service/executionresults',
    500,
    150,
    {
      component: 'IETMClient',
      requestId: 'req-124',
    }
  );
}

function demonstrateTestLogging() {
  const logger = getLogger();

  // Log test start
  logger.logTestStart('TC-001', 'User login test', {
    component: 'TestRunner',
  });

  // Simulate test execution
  const startTime = Date.now();
  // ... test execution ...
  const duration = Date.now() - startTime;

  // Log test end - passed
  logger.logTestEnd('TC-001', 'User login test', 'passed', duration, {
    component: 'TestRunner',
  });

  // Log test end - failed
  logger.logTestEnd('TC-002', 'User logout test', 'failed', 1200, {
    component: 'TestRunner',
    error: 'Logout button not found',
  });

  // Log test end - skipped
  logger.logTestEnd('TC-003', 'Password reset test', 'skipped', 0, {
    component: 'TestRunner',
    reason: 'Feature not implemented',
  });

  // Log result publication
  logger.logResultPublication('TC-001', 'ER-001', true, {
    component: 'IETMReporter',
  });

  logger.logResultPublication('TC-002', 'ER-002', false, {
    component: 'IETMReporter',
    error: 'Network timeout',
  });

  // Log attachment upload
  logger.logAttachmentUpload('ER-001', 'screenshot.png', 123456, true, {
    component: 'AttachmentHandler',
  });

  logger.logAttachmentUpload('ER-001', 'video.webm', 5242880, false, {
    component: 'AttachmentHandler',
    error: 'File too large',
  });
}

function demonstrateSanitization() {
  const logger = getLogger({
    sanitize: true,
  });

  // Password will be sanitized
  logger.info('User login attempt', {
    username: 'john.doe',
    password: 'secret123', // Will be redacted
    component: 'AuthManager',
  });

  // API key will be sanitized
  logger.info('API request', {
    url: 'https://api.example.com/data',
    apiKey: 'abc123xyz', // Will be redacted
    component: 'APIClient',
  });

  // Authorization header will be sanitized
  logger.info('HTTP request', {
    method: 'GET',
    url: 'https://api.example.com',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123', // Will be redacted
    },
    component: 'HTTPClient',
  });

  // Nested sensitive data will be sanitized
  logger.info('Configuration loaded', {
    server: {
      url: 'https://jazz.net',
      credentials: {
        username: 'user',
        password: 'pass123', // Will be redacted
      },
    },
    component: 'ConfigManager',
  });
}

function demonstrateLogLevels() {
  const logger = getLogger({
    level: 'info',
  });

  console.log('Current log level:', logger.getLevel());

  logger.error('Error message - always visible');
  logger.warn('Warning message - always visible');
  logger.info('Info message - visible at info level');
  logger.debug('Debug message - NOT visible at info level');

  // Change log level to debug
  logger.setLevel('debug');
  console.log('Changed log level to:', logger.getLevel());

  logger.debug('Debug message - NOW visible at debug level');
  logger.trace('Trace message - visible at debug level');

  // Change log level to error
  logger.setLevel('error');
  console.log('Changed log level to:', logger.getLevel());

  logger.error('Error message - visible at error level');
  logger.warn('Warning message - NOT visible at error level');
}

function demonstrateChildLogger() {
  const parentLogger = getLogger({
    level: 'debug',
    defaultMeta: {
      service: 'ietm-client',
      version: '1.0.0',
    },
  });

  // Create child logger with additional metadata
  const authLogger = parentLogger.child({
    component: 'AuthManager',
    module: 'authentication',
  });

  const clientLogger = parentLogger.child({
    component: 'IETMClient',
    module: 'api-client',
  });

  // Child loggers inherit parent configuration and metadata
  authLogger.info('Authentication started');
  authLogger.info('Session created');

  clientLogger.info('Fetching test cases');
  clientLogger.info('Test cases retrieved');
}

function demonstrateCustomConfig() {
  // Create logger with custom configuration
  const customLogger = getLogger({
    level: 'debug',
    console: true,
    file: true,
    logDir: 'custom-logs',
    filename: 'my-app-%DATE%.log',
    maxSize: '20m',
    maxFiles: 14,
    json: false,
    colorize: true,
    sanitize: true,
    defaultMeta: {
      application: 'IETM Playwright Client',
      environment: 'production',
      version: '1.0.0',
    },
  });

  customLogger.info('Logger configured with custom settings');
  customLogger.debug('Debug information', {
    config: {
      logDir: 'custom-logs',
      maxSize: '20m',
      maxFiles: 14,
    },
  });

  // Add custom sensitive key
  customLogger.addSensitiveKey('customSecret');

  customLogger.info('Custom sensitive data', {
    publicData: 'visible',
    customSecret: 'hidden', // Will be redacted
  });
}

// Run the examples
main().catch(console.error);

// Made with Bob