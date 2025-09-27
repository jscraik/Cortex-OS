/**
 * Retry utilities for A2A system following Sept 2025 standards
 * Deterministic retry logic without Math.random() for predictable testing
 */

export interface RetryConfig {
	maxRetries: number;
	baseDelayMs: number;
	maxDelayMs: number;
	enableJitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	baseDelayMs: 1000,
	maxDelayMs: 30000,
	enableJitter: true,
};

/**
 * Create retry configuration with defaults
 */
export const createRetryConfig = (overrides: Partial<RetryConfig> = {}): RetryConfig => ({
	...DEFAULT_RETRY_CONFIG,
	...overrides,
});

/**
 * Calculate deterministic retry delay based on retry count and message ID
 * Uses string hash for deterministic jitter instead of Math.random()
 */
export const calculateRetryDelay = (
	retryCount: number,
	messageId: string,
	config: RetryConfig = DEFAULT_RETRY_CONFIG,
): number => {
	if (retryCount <= 0) {
		return config.baseDelayMs;
	}

	// Exponential backoff: delay = base * 2^(retryCount - 1)
	let delay = config.baseDelayMs * 2 ** (retryCount - 1);

	// Apply deterministic jitter if enabled
	if (config.enableJitter) {
		const jitter = calculateDeterministicJitter(messageId);
		// Jitter range: ±50% of base delay
		delay = delay * (0.5 + 0.5 * jitter);
	}

	// Cap at maximum delay
	return Math.min(delay, config.maxDelayMs);
};

/**
 * Calculate deterministic jitter based on string hash
 * Returns value between 0 and 1
 */
export const calculateDeterministicJitter = (input: string): number => {
	if (!input) {
		return 0.5; // Default fallback
	}

	// Simple string hash function
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	// Convert to 0-1 range
	return Math.abs(hash) / 2147483647;
};

/**
 * Check if retry should be attempted based on config
 */
export const shouldRetry = (retryCount: number, config: RetryConfig): boolean => {
	return retryCount < config.maxRetries;
};

/**
 * Get next retry timestamp
 */
export const getNextRetryTimestamp = (
	retryCount: number,
	messageId: string,
	config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Date => {
	const delay = calculateRetryDelay(retryCount, messageId, config);
	return new Date(Date.now() + delay);
};
