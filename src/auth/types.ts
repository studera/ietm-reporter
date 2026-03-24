/**
 * Authentication types for IETM client
 */

export interface AuthConfig {
  /**
   * IETM QM server base URL
   */
  baseUrl: string;

  /**
   * IETM JTS server URL for form-based authentication
   */
  jtsUrl: string;

  /**
   * Username for Basic Authentication
   */
  username: string;

  /**
   * Password for Basic Authentication
   */
  password: string;

  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial retry delay in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Timeout for requests in milliseconds
   * @default 30000
   */
  timeout?: number;
}

export interface AuthState {
  /**
   * Whether the client is currently authenticated
   */
  isAuthenticated: boolean;

  /**
   * Timestamp of last successful authentication
   */
  lastAuthTime?: Date;

  /**
   * Number of authentication attempts
   */
  authAttempts: number;
}

export interface RetryConfig {
  /**
   * Maximum number of retries
   */
  maxRetries: number;

  /**
   * Current retry attempt (0-based)
   */
  currentRetry: number;

  /**
   * Delay before next retry in milliseconds
   */
  retryDelay: number;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: any
  ) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

// Made with Bob
