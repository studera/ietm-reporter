/**
 * Logger
 * Comprehensive logging system using Winston with file rotation and sensitive data sanitization
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { IETMError } from '../errors';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerConfig {
  /** Log level (default: 'info') */
  level?: LogLevel;

  /** Enable console logging (default: true) */
  console?: boolean;

  /** Enable file logging (default: true) */
  file?: boolean;

  /** Log file directory (default: 'logs') */
  logDir?: string;

  /** Log file name pattern (default: 'ietm-client-%DATE%.log') */
  filename?: string;

  /** Maximum size of each log file (default: '10m') */
  maxSize?: string;

  /** Maximum number of days to keep logs (default: 7) */
  maxFiles?: string | number;

  /** Enable JSON format for structured logging (default: false) */
  json?: boolean;

  /** Enable colorized output for console (default: true) */
  colorize?: boolean;

  /** Sanitize sensitive data from logs (default: true) */
  sanitize?: boolean;

  /** Custom metadata to include in all logs */
  defaultMeta?: Record<string, unknown>;
}

export interface LogContext {
  /** Component or module name */
  component?: string;

  /** Request ID for tracing */
  requestId?: string;

  /** User ID or username */
  userId?: string;

  /** Test case ID */
  testCaseId?: string;

  /** Execution record ID */
  executionRecordId?: string;

  /** HTTP method */
  method?: string;

  /** URL being accessed */
  url?: string;

  /** HTTP status code */
  statusCode?: number;

  /** Duration in milliseconds */
  duration?: number;

  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Singleton Logger class
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private config: Required<LoggerConfig>;
  private sensitiveKeys = [
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'authorization',
    'auth',
    'cookie',
    'session',
  ];

  private constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level || 'info',
      console: config.console !== false,
      file: config.file !== false,
      logDir: config.logDir || 'logs',
      filename: config.filename || 'ietm-client-%DATE%.log',
      maxSize: config.maxSize || '10m',
      maxFiles: config.maxFiles || 7,
      json: config.json || false,
      colorize: config.colorize !== false,
      sanitize: config.sanitize !== false,
      defaultMeta: config.defaultMeta || {},
    };

    this.logger = this.createLogger();
  }

  /**
   * Get or create logger instance
   */
  static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Reset logger instance (useful for testing)
   */
  static resetInstance(): void {
    if (Logger.instance) {
      Logger.instance.logger.close();
      Logger.instance = null as any;
    }
  }

  /**
   * Create Winston logger with configured transports
   */
  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.console) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            this.config.colorize ? winston.format.colorize() : winston.format.uncolorize(),
            winston.format.printf(this.formatConsoleLog.bind(this))
          ),
        })
      );
    }

    // File transport with rotation
    if (this.config.file) {
      transports.push(
        new DailyRotateFile({
          dirname: this.config.logDir,
          filename: this.config.filename,
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.maxSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            this.config.json ? winston.format.json() : winston.format.printf(this.formatFileLog.bind(this))
          ),
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      defaultMeta: this.config.defaultMeta,
      transports,
    });
  }

  /**
   * Format log for console output
   */
  private formatConsoleLog(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, component, ...meta } = info;
    const componentStr = component ? `[${component}]` : '';
    const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level} ${componentStr} ${message}${metaStr}`;
  }

  /**
   * Format log for file output
   */
  private formatFileLog(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`;
  }

  /**
   * Sanitize sensitive data from object
   */
  private sanitize(obj: any): any {
    if (!this.config.sanitize) {
      return obj;
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (this.sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Prepare log metadata
   */
  private prepareMetadata(context?: LogContext): Record<string, unknown> {
    if (!context) {
      return {};
    }
    return this.sanitize(context);
  }

  /**
   * Log error level message
   */
  error(message: string, context?: LogContext): void;
  error(message: string, error: Error, context?: LogContext): void;
  error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
    const isError = errorOrContext instanceof Error;
    const err = isError ? errorOrContext : undefined;
    const ctx = isError ? context : errorOrContext;

    const meta = this.prepareMetadata(ctx);

    if (err) {
      if (err instanceof IETMError) {
        this.logger.error(message, {
          ...meta,
          error: {
            name: err.name,
            code: err.code,
            message: err.message,
            context: err.context,
            troubleshooting: err.troubleshooting,
            stack: err.stack,
          },
        });
      } else {
        this.logger.error(message, {
          ...meta,
          error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
          },
        });
      }
    } else {
      this.logger.error(message, meta);
    }
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.prepareMetadata(context));
  }

  /**
   * Log info level message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.prepareMetadata(context));
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.prepareMetadata(context));
  }

  /**
   * Log trace level message (most verbose)
   */
  trace(message: string, context?: LogContext): void {
    // Winston doesn't have trace level, use debug with trace indicator
    this.logger.debug(`[TRACE] ${message}`, this.prepareMetadata(context));
  }

  /**
   * Log HTTP request
   */
  logRequest(method: string, url: string, context?: LogContext): void {
    this.debug(`HTTP Request: ${method} ${url}`, {
      ...context,
      method,
      url,
      type: 'request',
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'debug';
    this.logger[level](`HTTP Response: ${method} ${url} ${statusCode} (${duration}ms)`, {
      ...this.prepareMetadata(context),
      method,
      url,
      statusCode,
      duration,
      type: 'response',
    });
  }

  /**
   * Log test execution start
   */
  logTestStart(testCaseId: string, testTitle: string, context?: LogContext): void {
    this.info(`Test started: ${testTitle}`, {
      ...context,
      testCaseId,
      testTitle,
      type: 'test-start',
    });
  }

  /**
   * Log test execution end
   */
  logTestEnd(
    testCaseId: string,
    testTitle: string,
    status: string,
    duration: number,
    context?: LogContext
  ): void {
    const level = status === 'passed' ? 'info' : status === 'failed' ? 'error' : 'warn';
    this.logger[level](`Test ${status}: ${testTitle} (${duration}ms)`, {
      ...this.prepareMetadata(context),
      testCaseId,
      testTitle,
      status,
      duration,
      type: 'test-end',
    });
  }

  /**
   * Log result publication
   */
  logResultPublication(
    testCaseId: string,
    executionRecordId: string,
    success: boolean,
    context?: LogContext
  ): void {
    const level = success ? 'info' : 'error';
    const message = success
      ? `Result published for test case ${testCaseId}`
      : `Failed to publish result for test case ${testCaseId}`;

    this.logger[level](message, {
      ...this.prepareMetadata(context),
      testCaseId,
      executionRecordId,
      success,
      type: 'result-publication',
    });
  }

  /**
   * Log attachment upload
   */
  logAttachmentUpload(
    executionRecordId: string,
    filename: string,
    size: number,
    success: boolean,
    context?: LogContext
  ): void {
    const level = success ? 'debug' : 'warn';
    const message = success
      ? `Attachment uploaded: ${filename} (${size} bytes)`
      : `Failed to upload attachment: ${filename}`;

    this.logger[level](message, {
      ...this.prepareMetadata(context),
      executionRecordId,
      filename,
      size,
      success,
      type: 'attachment-upload',
    });
  }

  /**
   * Create child logger with additional default metadata
   */
  child(defaultMeta: Record<string, unknown>): Logger {
    const childLogger = Object.create(Logger.prototype);
    childLogger.logger = this.logger.child(this.sanitize(defaultMeta));
    childLogger.config = this.config;
    childLogger.sensitiveKeys = this.sensitiveKeys;
    return childLogger;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.logger.level = level;
  }

  /**
   * Add custom sensitive key for sanitization
   */
  addSensitiveKey(key: string): void {
    if (!this.sensitiveKeys.includes(key.toLowerCase())) {
      this.sensitiveKeys.push(key.toLowerCase());
    }
  }

  /**
   * Close logger and flush logs
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.close();
      resolve();
    });
  }
}

/**
 * Get default logger instance
 */
export function getLogger(config?: LoggerConfig): Logger {
  return Logger.getInstance(config);
}

/**
 * Create a child logger with component context
 */
export function createComponentLogger(component: string, config?: LoggerConfig): Logger {
  return getLogger(config).child({ component });
}

// Made with Bob