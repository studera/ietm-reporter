/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests to a failing service
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, requests fail immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit */
  failureThreshold?: number;

  /** Time in ms to wait before attempting to close circuit */
  resetTimeout?: number;

  /** Number of successful requests needed to close circuit from half-open */
  successThreshold?: number;

  /** Time window in ms for counting failures */
  windowSize?: number;

  /** Callback when circuit state changes */
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private failureTimestamps: Date[] = [];

  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      successThreshold: options.successThreshold || 2,
      windowSize: options.windowSize || 60000, // 1 minute
      onStateChange: options.onStateChange || (() => {}),
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`
        );
      }
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful request
   */
  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.reset();
      }
    }
  }

  /**
   * Record a failed request
   */
  private onFailure(): void {
    this.failures++;
    const now = new Date();
    this.lastFailureTime = now;
    this.failureTimestamps.push(now);

    // Remove old failures outside the window
    this.cleanupOldFailures();

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediately open circuit on failure in half-open state
      this.transitionTo(CircuitState.OPEN);
      this.scheduleReset();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we've exceeded the failure threshold
      if (this.failureTimestamps.length >= this.options.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
        this.scheduleReset();
      }
    }
  }

  /**
   * Remove failures outside the time window
   */
  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.options.windowSize;
    this.failureTimestamps = this.failureTimestamps.filter(
      (timestamp) => timestamp.getTime() > cutoff
    );
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return false;
    }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Schedule the next reset attempt
   */
  private scheduleReset(): void {
    this.nextAttemptTime = new Date(Date.now() + this.options.resetTimeout);
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    console.log(`[CircuitBreaker] State transition: ${oldState} -> ${newState}`);
    this.options.onStateChange(oldState, newState);
  }

  /**
   * Reset the circuit breaker
   */
  private reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    this.nextAttemptTime = undefined;
  }

  /**
   * Manually reset the circuit breaker
   */
  forceReset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.reset();
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }
}

// Made with Bob