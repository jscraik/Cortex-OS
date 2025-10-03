/**
 * Resilient Executor - brAInwav Agent Toolkit
 *
 * Provides circuit breaker pattern and retry logic with jittered backoff
 * for robust tool execution in production environments.
 */

export interface CircuitBreakerOptions {
	/** Failure threshold before opening circuit (default: 5) */
	failureThreshold?: number;
	/** Success threshold to close circuit (default: 2) */
	successThreshold?: number;
	/** Half-open state timeout in ms (default: 30000) */
	timeout?: number;
	/** Reset failure count after this many ms (default: 60000) */
	resetTimeout?: number;
}

export interface RetryOptions {
	/** Maximum retry attempts (default: 3) */
	maxAttempts?: number;
	/** Initial delay in ms (default: 100) */
	initialDelay?: number;
	/** Maximum delay in ms (default: 5000) */
	maxDelay?: number;
	/** Backoff multiplier (default: 2) */
	backoffMultiplier?: number;
	/** Add jitter to prevent thundering herd (default: true) */
	enableJitter?: boolean;
}

export interface ResilientExecutorOptions {
	/** Circuit breaker configuration */
	circuitBreaker?: CircuitBreakerOptions;
	/** Retry configuration */
	retry?: RetryOptions;
	/** Overall execution timeout in ms (default: 30000) */
	executionTimeout?: number;
	/** Enable/disable resilience features */
	enabled?: boolean;
}

type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker implementation
 */
const createCircuitBreaker = (opts: CircuitBreakerOptions = {}) => {
	const config = {
		failureThreshold: opts.failureThreshold ?? 5,
		successThreshold: opts.successThreshold ?? 2,
		timeout: opts.timeout ?? 30000,
		resetTimeout: opts.resetTimeout ?? 60000,
	};

	let state: CircuitState = 'closed';
	let failures = 0;
	let successes = 0;
	let lastFailureTime = 0;
	let nextAttemptTime = 0;

	const recordSuccess = (): void => {
		failures = 0;
		lastFailureTime = 0;

		if (state === 'half-open') {
			successes += 1;
			if (successes >= config.successThreshold) {
				state = 'closed';
				successes = 0;
			}
		}
	};

	const recordFailure = (): void => {
		failures += 1;
		lastFailureTime = Date.now();
		successes = 0;

		if (failures >= config.failureThreshold) {
			state = 'open';
			nextAttemptTime = Date.now() + config.timeout;
		}
	};

	const canExecute = (): { allowed: boolean; reason?: string } => {
		// Reset failure count if reset timeout has passed
		if (lastFailureTime && Date.now() - lastFailureTime > config.resetTimeout) {
			failures = 0;
			lastFailureTime = 0;
		}

		if (state === 'closed') {
			return { allowed: true };
		}

		if (state === 'open') {
			if (Date.now() >= nextAttemptTime) {
				state = 'half-open';
				successes = 0;
				return { allowed: true };
			}
			return {
				allowed: false,
				reason: `Circuit breaker open. Next attempt at ${new Date(nextAttemptTime).toISOString()}`,
			};
		}

		// half-open state - allow single probe
		return { allowed: true };
	};

	const getState = (): {
		state: CircuitState;
		failures: number;
		successes: number;
	} => ({
		state,
		failures,
		successes,
	});

	return {
		recordSuccess,
		recordFailure,
		canExecute,
		getState,
	};
};

/**
 * Retry logic with exponential backoff and jitter
 */
const createRetryPolicy = (opts: RetryOptions = {}) => {
	const config = {
		maxAttempts: opts.maxAttempts ?? 3,
		initialDelay: opts.initialDelay ?? 100,
		maxDelay: opts.maxDelay ?? 5000,
		backoffMultiplier: opts.backoffMultiplier ?? 2,
		enableJitter: opts.enableJitter !== false,
	};

	const calculateDelay = (attempt: number): number => {
		const exponential = config.initialDelay * config.backoffMultiplier ** (attempt - 1);
		const delay = Math.min(exponential, config.maxDelay);

		if (!config.enableJitter) {
			return delay;
		}

		// Add ±25% jitter
		const jitter = delay * (0.75 + Math.random() * 0.5);
		return Math.floor(jitter);
	};

	const shouldRetry = (attempt: number, error: Error): boolean => {
		if (attempt >= config.maxAttempts) {
			return false;
		}

		// Don't retry validation errors or client errors
		if (
			error.message.includes('validation') ||
			error.message.includes('invalid') ||
			error.message.includes('not found')
		) {
			return false;
		}

		return true;
	};

	return {
		calculateDelay,
		shouldRetry,
		maxAttempts: config.maxAttempts,
	};
};

/**
 * Creates a resilient executor with circuit breaker and retry logic
 */
export const createResilientExecutor = (opts: ResilientExecutorOptions = {}) => {
	const enabled = opts.enabled !== false;
	const executionTimeout = opts.executionTimeout ?? 30000;
	const circuitBreaker = createCircuitBreaker(opts.circuitBreaker);
	const retryPolicy = createRetryPolicy(opts.retry);

	const executeWithTimeout = async <T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> => {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(
				() => reject(new Error(`brAInwav: Execution timeout after ${timeoutMs}ms`)),
				timeoutMs,
			);
		});

		return Promise.race([fn(), timeoutPromise]);
	};

	const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

	const execute = async <T>(
		fn: () => Promise<T>,
		context?: { preserve?: Record<string, unknown> },
	): Promise<T> => {
		if (!enabled) {
			return executeWithTimeout(fn, executionTimeout);
		}

		// Check circuit breaker
		const canExec = circuitBreaker.canExecute();
		if (!canExec.allowed) {
			throw new Error(canExec.reason || 'brAInwav: Circuit breaker open, execution blocked');
		}

		let attempt = 0;
		let lastError: Error | undefined;

		while (attempt < retryPolicy.maxAttempts) {
			attempt += 1;

			try {
				const result = await executeWithTimeout(fn, executionTimeout);
				circuitBreaker.recordSuccess();
				return result;
			} catch (error) {
				lastError = error as Error;
				circuitBreaker.recordFailure();

				// Check if we should retry
				if (!retryPolicy.shouldRetry(attempt, lastError)) {
					throw lastError;
				}

				// Calculate delay and wait before retry
				const delay = retryPolicy.calculateDelay(attempt);
				console.warn(
					`brAInwav: Retry attempt ${attempt}/${retryPolicy.maxAttempts} after ${delay}ms. Error: ${lastError.message}`,
				);

				// Preserve context across retries if provided
				if (context?.preserve) {
					console.debug('brAInwav: Preserving context across retry:', context.preserve);
				}

				await sleep(delay);
			}
		}

		// All retries exhausted
		throw lastError || new Error('brAInwav: All retry attempts exhausted');
	};

	const getHealth = () => {
		const cbState = circuitBreaker.getState();
		return {
			healthy: cbState.state === 'closed',
			circuitState: cbState.state,
			failures: cbState.failures,
			successes: cbState.successes,
			maxRetries: retryPolicy.maxAttempts,
		};
	};

	return {
		execute,
		getHealth,
		isEnabled: () => enabled,
	};
};

export type ResilientExecutor = ReturnType<typeof createResilientExecutor>;
