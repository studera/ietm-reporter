/**
 * Network Error
 * Thrown when network-related issues occur (timeouts, connection failures, etc.)
 */

import { IETMError, ErrorContext, TroubleshootingHint } from './IETMError';

export class NetworkError extends IETMError {
  constructor(message: string, context: ErrorContext = {}) {
    const troubleshooting: TroubleshootingHint[] = [
      {
        problem: 'Network connectivity',
        solution: 'Check your internet connection and ensure the IETM server is reachable',
      },
      {
        problem: 'Firewall or proxy',
        solution: 'Verify that your firewall or proxy settings allow connections to the IETM server',
      },
      {
        problem: 'DNS resolution',
        solution: 'Ensure the IETM server hostname can be resolved',
      },
      {
        problem: 'Server unavailable',
        solution: 'The IETM server may be down or undergoing maintenance',
      },
    ];

    // Network errors are retryable
    super(message, 'NETWORK_ERROR', context, troubleshooting, true);
    this.name = 'NetworkError';
  }

  /**
   * Create error for connection timeout
   */
  static timeout(url: string, timeoutMs: number, context: ErrorContext = {}): NetworkError {
    const error = new NetworkError(`Request timeout after ${timeoutMs}ms: ${url}`, {
      ...context,
      url,
      statusCode: 408,
    });
    (error as any).code = 'NETWORK_TIMEOUT';
    error.troubleshooting.unshift({
      problem: 'Request timeout',
      solution: `The server did not respond within ${timeoutMs}ms. Try increasing the timeout or check server performance.`,
    });
    return error;
  }

  /**
   * Create error for connection refused
   */
  static connectionRefused(url: string, context: ErrorContext = {}): NetworkError {
    const error = new NetworkError(`Connection refused: ${url}`, {
      ...context,
      url,
    });
    (error as any).code = 'NETWORK_CONNECTION_REFUSED';
    error.troubleshooting.unshift({
      problem: 'Connection refused',
      solution: 'The server actively refused the connection. Verify the server URL and port are correct.',
    });
    return error;
  }

  /**
   * Create error for DNS resolution failure
   */
  static dnsFailure(hostname: string, context: ErrorContext = {}): NetworkError {
    const error = new NetworkError(`DNS resolution failed for: ${hostname}`, {
      ...context,
      url: hostname,
    });
    (error as any).code = 'NETWORK_DNS_FAILURE';
    error.troubleshooting.unshift({
      problem: 'DNS resolution failed',
      solution: 'The hostname could not be resolved. Check the server URL and your DNS settings.',
    });
    return error;
  }

  /**
   * Create error for SSL/TLS issues
   */
  static sslError(url: string, context: ErrorContext = {}): NetworkError {
    const error = new NetworkError(`SSL/TLS error: ${url}`, {
      ...context,
      url,
    });
    (error as any).code = 'NETWORK_SSL_ERROR';
    error.troubleshooting.unshift({
      problem: 'SSL/TLS certificate error',
      solution: 'The server certificate may be invalid or expired. For development, you may need to disable SSL verification.',
    });
    return error;
  }

  /**
   * Create error for rate limiting
   */
  static rateLimited(url: string, retryAfter?: number, context: ErrorContext = {}): NetworkError {
    const message = retryAfter
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds: ${url}`
      : `Rate limit exceeded: ${url}`;

    const error = new NetworkError(message, {
      ...context,
      url,
      statusCode: 429,
      data: { retryAfter },
    });
    (error as any).code = 'NETWORK_RATE_LIMITED';

    error.troubleshooting.unshift({
      problem: 'Rate limit exceeded',
      solution: retryAfter
        ? `Wait ${retryAfter} seconds before retrying. Consider reducing request frequency.`
        : 'Reduce the frequency of requests to the server.',
    });
    return error;
  }

  /**
   * Create error for server unavailable
   */
  static serverUnavailable(url: string, context: ErrorContext = {}): NetworkError {
    const error = new NetworkError(`Server unavailable: ${url}`, {
      ...context,
      url,
      statusCode: 503,
    });
    (error as any).code = 'NETWORK_SERVER_UNAVAILABLE';
    error.troubleshooting.unshift({
      problem: 'Server unavailable',
      solution: 'The server is temporarily unavailable. It may be down for maintenance or overloaded.',
    });
    return error;
  }

  /**
   * Create error for bad gateway
   */
  static badGateway(url: string, context: ErrorContext = {}): NetworkError {
    const error = new NetworkError(`Bad gateway: ${url}`, {
      ...context,
      url,
      statusCode: 502,
    });
    (error as any).code = 'NETWORK_BAD_GATEWAY';
    error.troubleshooting.unshift({
      problem: 'Bad gateway',
      solution: 'The gateway or proxy server received an invalid response. This is usually a temporary issue.',
    });
    return error;
  }

  /**
   * Create error for gateway timeout
   */
  static gatewayTimeout(url: string, context: ErrorContext = {}): NetworkError {
    const error = new NetworkError(`Gateway timeout: ${url}`, {
      ...context,
      url,
      statusCode: 504,
    });
    (error as any).code = 'NETWORK_GATEWAY_TIMEOUT';
    error.troubleshooting.unshift({
      problem: 'Gateway timeout',
      solution: 'The gateway or proxy server did not receive a timely response from the upstream server.',
    });
    return error;
  }
}

// Made with Bob