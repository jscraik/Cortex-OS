export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  readonly failureThreshold?: number;
  readonly resetTimeout?: number;
  readonly monitoringPeriod?: number;
  readonly timeout?: number;
}

/** Default configuration values */
const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT = 60000; // 1 minute
const DEFAULT_MONITORING_PERIOD = 60000; // 1 minute

export interface CircuitBreakerMetrics {
  readonly successes: number;
  readonly failures: number;
  readonly totalRequests: number;
  readonly failureRate: number;
  readonly state: CircuitState;
  readonly lastFailureTime?: Date;
  readonly nextAttemptTime?: Date;
}

export interface CircuitBreakerOptions<T = unknown> {
  readonly fallback?: (error?: Error) => Promise<T>;
}

export type StateChangeHandler = (newState: CircuitState, previousState: CircuitState) => void;

/**
 * Circuit Breaker implementation for fault tolerance
 */
export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly monitoringPeriod: number;
  private readonly timeout: number;

  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  private monitoringStartTime: number;
  private stateChangeHandlers: StateChangeHandler[] = [];

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.resetTimeout = config.resetTimeout ?? DEFAULT_RESET_TIMEOUT;
    this.monitoringPeriod = config.monitoringPeriod ?? DEFAULT_MONITORING_PERIOD;
    this.timeout = config.timeout ?? 0;
    this.monitoringStartTime = Date.now();
  }

  /**
   * Execute a function with circuit breaker protection
   * @param fn - The function to execute with circuit breaker protection
   * @param options - Optional configuration including fallback function
   * @returns Promise that resolves with the function result or rejects with an error
   */
  async execute<T>(fn: () => Promise<T>, options?: CircuitBreakerOptions<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.nextAttemptTime && now < this.nextAttemptTime) {
        // Circuit is open, try fallback or throw
        if (options?.fallback) {
          return options.fallback(new Error('Circuit breaker is OPEN - not accepting requests'));
        }
        throw new Error('Circuit breaker is OPEN - not accepting requests');
      } else {
        // Time to attempt reset - transition to half-open
        this.setState('HALF_OPEN');
      }
    }

    // Check for monitoring period reset
    this.checkMonitoringPeriodReset();

    try {
      // Execute with timeout if specified
      let result: Promise<T>;
      if (this.timeout > 0) {
        result = Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), this.timeout)
          ),
        ]);
      } else {
        result = fn();
      }

      const value = await result;

      // Success - update metrics
      this.successes++;
      if (this.state === 'HALF_OPEN') {
        // Successful request in half-open state - close the circuit
        this.setState('CLOSED');
        this.failures = 0; // Reset failure count
      }

      return value;
    } catch (error) {
      // Failure - update metrics
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.state === 'HALF_OPEN') {
        // Failure in half-open state - reopen circuit
        this.setState('OPEN');
        this.nextAttemptTime = Date.now() + this.resetTimeout;
      } else if (this.failures >= this.failureThreshold) {
        // Threshold reached - open circuit
        this.setState('OPEN');
        this.nextAttemptTime = Date.now() + this.resetTimeout;
      }

      // Try fallback or rethrow
      if (options?.fallback) {
        return options.fallback(error as Error);
      }
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const totalRequests = this.successes + this.failures;
    const failureRate = totalRequests > 0 ? this.failures / totalRequests : 0;

    return {
      successes: this.successes,
      failures: this.failures,
      totalRequests,
      failureRate,
      state: this.state,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : undefined,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime) : undefined,
    };
  }

  /**
   * Register a state change handler
   */
  onStateChange(handler: StateChangeHandler): void {
    this.stateChangeHandlers.push(handler);
  }

  /**
   * Remove a state change handler
   */
  offStateChange(handler: StateChangeHandler): void {
    const index = this.stateChangeHandlers.indexOf(handler);
    if (index > -1) {
      this.stateChangeHandlers.splice(index, 1);
    }
  }

  /**
   * Force reset the circuit breaker to closed state
   */
  reset(): void {
    this.setState('CLOSED');
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.monitoringStartTime = Date.now();
  }

  /**
   * Check if monitoring period has elapsed and reset counters
   */
  private checkMonitoringPeriodReset(): void {
    const elapsed = Date.now() - this.monitoringStartTime;
    if (elapsed > this.monitoringPeriod) {
      // Reset counters for new monitoring period
      this.failures = 0;
      this.successes = 0;
      this.monitoringStartTime = Date.now();
    }
  }

  /**
   * Change state and notify handlers
   */
  private setState(newState: CircuitState): void {
    if (newState !== this.state) {
      const previousState = this.state;
      this.state = newState;

      // Notify state change handlers
      this.stateChangeHandlers.forEach(handler => {
        try {
          handler(newState, previousState);
        } catch (error) {
          console.error('Error in state change handler:', error);
        }
      });
    }
  }
}