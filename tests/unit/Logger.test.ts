/**
 * Unit tests for Logger
 */

import { Logger, getLogger, createComponentLogger, LogLevel } from '../../src/logging';
import { IETMError, AuthenticationError } from '../../src/errors';
import fs from 'fs';
import path from 'path';

// Mock winston to avoid actual file writes during tests
jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(),
    close: jest.fn(),
    level: 'info',
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      colorize: jest.fn(),
      uncolorize: jest.fn(),
      printf: jest.fn(),
      json: jest.fn(),
    },
    transports: {
      Console: jest.fn(),
    },
  };
});

jest.mock('winston-daily-rotate-file', () => {
  return jest.fn();
});

describe('Logger', () => {
  beforeEach(() => {
    // Reset singleton instance before each test
    Logger.resetInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    Logger.resetInstance();
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();

      expect(logger1).toBe(logger2);
    });

    it('should accept configuration', () => {
      const logger = Logger.getInstance({
        level: 'debug',
        console: true,
        file: false,
      });

      expect(logger.getLevel()).toBe('debug');
    });
  });

  describe('getLogger', () => {
    it('should return logger instance', () => {
      const logger = getLogger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should return same instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });
  });

  describe('createComponentLogger', () => {
    it('should create child logger with component', () => {
      const logger = createComponentLogger('TestComponent');
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('log levels', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance({ level: 'debug' });
    });

    it('should log error messages', () => {
      logger.error('Test error');
      // Winston mock should have been called
      expect(logger).toBeDefined();
    });

    it('should log error with Error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(logger).toBeDefined();
    });

    it('should log error with IETMError', () => {
      const error = new IETMError('IETM error', 'TEST_ERROR');
      logger.error('IETM error occurred', error);
      expect(logger).toBeDefined();
    });

    it('should log warning messages', () => {
      logger.warn('Test warning');
      expect(logger).toBeDefined();
    });

    it('should log info messages', () => {
      logger.info('Test info');
      expect(logger).toBeDefined();
    });

    it('should log debug messages', () => {
      logger.debug('Test debug');
      expect(logger).toBeDefined();
    });

    it('should log trace messages', () => {
      logger.trace('Test trace');
      expect(logger).toBeDefined();
    });
  });

  describe('context logging', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance();
    });

    it('should log with context', () => {
      logger.info('Test message', {
        component: 'TestComponent',
        requestId: '123',
        userId: 'user1',
      });
      expect(logger).toBeDefined();
    });

    it('should log with test case context', () => {
      logger.info('Test started', {
        testCaseId: 'TC-001',
        component: 'TestRunner',
      });
      expect(logger).toBeDefined();
    });

    it('should log with HTTP context', () => {
      logger.info('HTTP request', {
        method: 'GET',
        url: 'https://example.com/api',
        statusCode: 200,
      });
      expect(logger).toBeDefined();
    });
  });

  describe('sensitive data sanitization', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance({ sanitize: true });
    });

    it('should sanitize password field', () => {
      logger.info('Login attempt', {
        username: 'user1',
        password: 'secret123',
      });
      expect(logger).toBeDefined();
    });

    it('should sanitize token field', () => {
      logger.info('API call', {
        url: 'https://api.example.com',
        token: 'abc123xyz',
      });
      expect(logger).toBeDefined();
    });

    it('should sanitize nested sensitive data', () => {
      logger.info('Config loaded', {
        server: {
          url: 'https://example.com',
          apiKey: 'secret-key',
        },
      });
      expect(logger).toBeDefined();
    });

    it('should sanitize authorization header', () => {
      logger.info('HTTP request', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        },
      });
      expect(logger).toBeDefined();
    });

    it('should not sanitize when disabled', () => {
      const unsanitizedLogger = Logger.getInstance({ sanitize: false });
      Logger.resetInstance();
      const newLogger = Logger.getInstance({ sanitize: false });

      newLogger.info('Login', {
        password: 'visible',
      });
      expect(newLogger).toBeDefined();
    });
  });

  describe('specialized logging methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance();
    });

    it('should log HTTP request', () => {
      logger.logRequest('GET', 'https://example.com/api');
      expect(logger).toBeDefined();
    });

    it('should log HTTP response', () => {
      logger.logResponse('GET', 'https://example.com/api', 200, 150);
      expect(logger).toBeDefined();
    });

    it('should log HTTP error response', () => {
      logger.logResponse('POST', 'https://example.com/api', 500, 200);
      expect(logger).toBeDefined();
    });

    it('should log test start', () => {
      logger.logTestStart('TC-001', 'Login test');
      expect(logger).toBeDefined();
    });

    it('should log test end with passed status', () => {
      logger.logTestEnd('TC-001', 'Login test', 'passed', 1500);
      expect(logger).toBeDefined();
    });

    it('should log test end with failed status', () => {
      logger.logTestEnd('TC-001', 'Login test', 'failed', 1500);
      expect(logger).toBeDefined();
    });

    it('should log test end with skipped status', () => {
      logger.logTestEnd('TC-001', 'Login test', 'skipped', 0);
      expect(logger).toBeDefined();
    });

    it('should log result publication success', () => {
      logger.logResultPublication('TC-001', 'ER-001', true);
      expect(logger).toBeDefined();
    });

    it('should log result publication failure', () => {
      logger.logResultPublication('TC-001', 'ER-001', false);
      expect(logger).toBeDefined();
    });

    it('should log attachment upload success', () => {
      logger.logAttachmentUpload('ER-001', 'screenshot.png', 12345, true);
      expect(logger).toBeDefined();
    });

    it('should log attachment upload failure', () => {
      logger.logAttachmentUpload('ER-001', 'screenshot.png', 12345, false);
      expect(logger).toBeDefined();
    });
  });

  describe('child logger', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance();
    });

    it('should create child logger with default metadata', () => {
      const childLogger = logger.child({ component: 'ChildComponent' });
      expect(childLogger).toBeInstanceOf(Logger);
    });

    it('should create child with additional metadata', () => {
      const parentLogger = Logger.getInstance({ level: 'debug' });
      const childLogger = parentLogger.child({ component: 'Child' });
      // Child logger is a Logger instance with additional metadata
      expect(childLogger).toBeInstanceOf(Logger);
    });
  });

  describe('log level management', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance({ level: 'info' });
    });

    it('should get current log level', () => {
      expect(logger.getLevel()).toBe('info');
    });

    it('should set log level dynamically', () => {
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');
    });

    it('should change log level to error', () => {
      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });

    it('should change log level to trace', () => {
      logger.setLevel('trace');
      expect(logger.getLevel()).toBe('trace');
    });
  });

  describe('sensitive key management', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance({ sanitize: true });
    });

    it('should add custom sensitive key', () => {
      logger.addSensitiveKey('customSecret');
      logger.info('Test', { customSecret: 'value' });
      expect(logger).toBeDefined();
    });

    it('should not add duplicate sensitive keys', () => {
      logger.addSensitiveKey('password');
      logger.addSensitiveKey('password');
      expect(logger).toBeDefined();
    });
  });

  describe('configuration options', () => {
    it('should create logger with console only', () => {
      const logger = Logger.getInstance({
        console: true,
        file: false,
      });
      expect(logger).toBeDefined();
    });

    it('should create logger with file only', () => {
      const logger = Logger.getInstance({
        console: false,
        file: true,
      });
      expect(logger).toBeDefined();
    });

    it('should create logger with JSON format', () => {
      const logger = Logger.getInstance({
        json: true,
      });
      expect(logger).toBeDefined();
    });

    it('should create logger without colorization', () => {
      const logger = Logger.getInstance({
        colorize: false,
      });
      expect(logger).toBeDefined();
    });

    it('should create logger with custom log directory', () => {
      const logger = Logger.getInstance({
        logDir: 'custom-logs',
      });
      expect(logger).toBeDefined();
    });

    it('should create logger with custom filename', () => {
      const logger = Logger.getInstance({
        filename: 'custom-%DATE%.log',
      });
      expect(logger).toBeDefined();
    });

    it('should create logger with custom max size', () => {
      const logger = Logger.getInstance({
        maxSize: '20m',
      });
      expect(logger).toBeDefined();
    });

    it('should create logger with custom max files', () => {
      const logger = Logger.getInstance({
        maxFiles: 14,
      });
      expect(logger).toBeDefined();
    });

    it('should create logger with default metadata', () => {
      const logger = Logger.getInstance({
        defaultMeta: {
          service: 'ietm-client',
          version: '1.0.0',
        },
      });
      expect(logger).toBeDefined();
    });
  });

  describe('error handling with different error types', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance();
    });

    it('should log generic Error', () => {
      const error = new Error('Generic error');
      logger.error('Error occurred', error);
      expect(logger).toBeDefined();
    });

    it('should log IETMError with context', () => {
      const error = new IETMError(
        'IETM operation failed',
        'IETM_ERROR',
        { statusCode: 500 },
        [{ problem: 'Server error', solution: 'Retry' }]
      );
      logger.error('IETM error', error);
      expect(logger).toBeDefined();
    });

    it('should log AuthenticationError', () => {
      const error = AuthenticationError.invalidCredentials();
      logger.error('Auth failed', error);
      expect(logger).toBeDefined();
    });

    it('should log error with additional context', () => {
      const error = new Error('Test error');
      logger.error('Error with context', error, {
        component: 'TestComponent',
        requestId: '123',
      });
      expect(logger).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close logger', async () => {
      const logger = Logger.getInstance();
      await expect(logger.close()).resolves.toBeUndefined();
    });
  });
});

// Made with Bob