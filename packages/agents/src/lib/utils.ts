/**
 * Common utility functions
 */

import { createSecureId } from './secure-random.js';

/**
 * Sleep for a specified number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Generate a secure identifier string of the requested length.
 */
export const generateId = (length = 8): string => {
	const id = createSecureId().replace(/-/g, '');
	return id.slice(0, Math.max(1, length));
};

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Check if a value is a promise
 */
export const isPromise = (value: any): value is Promise<any> => {
	return value && typeof value.then === 'function';
};

/**
 * Retry a function with exponential backoff
 */
export const retry = async <T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	baseDelay = 1000,
): Promise<T> => {
	let lastError: Error;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			if (attempt === maxRetries) {
				throw error;
			}

			const delay = baseDelay * 2 ** (attempt - 1);
			await sleep(delay);
		}
	}

	throw lastError!;
};

/**
 * Debounce a function
 */
export const debounce = <T extends (...args: any[]) => any>(
	fn: T,
	delay: number,
): ((...args: Parameters<T>) => void) => {
	let timeoutId: NodeJS.Timeout;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
};

/**
 * Throttle a function
 */
export const throttle = <T extends (...args: any[]) => any>(
	fn: T,
	limit: number,
): ((...args: Parameters<T>) => void) => {
	let inThrottle: boolean;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			fn(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
};

/**
 * Create a simple event emitter
 */
export interface EventEmitter {
	on(event: string, listener: (...args: any[]) => void): void;
	off(event: string, listener: (...args: any[]) => void): void;
	emit(event: string, ...args: any[]): void;
}

export const createEventEmitter = (): EventEmitter => {
	const listeners: Record<string, Function[]> = {};

	return {
		on(event: string, listener: (...args: any[]) => void) {
			if (!listeners[event]) {
				listeners[event] = [];
			}
			listeners[event].push(listener);
		},

		off(event: string, listener: (...args: any[]) => void) {
			if (!listeners[event]) return;
			const index = listeners[event].indexOf(listener);
			if (index > -1) {
				listeners[event].splice(index, 1);
			}
		},

		emit(event: string, ...args: any[]) {
			if (!listeners[event]) return;
			listeners[event].forEach((listener) => listener(...args));
		},
	};
};

/**
 * Estimate token count for text (rough approximation)
 */
export const estimateTokens = (text: string): number => {
	// Simple approximation: 1 token ≈ 4 characters for English text
	return Math.ceil(text.length / 4);
};

/**
 * Redact secrets from a string
 */
export const redactSecrets = (str: string, secrets: string[] = []): string => {
	let redacted = str;

	// Redact common secret patterns
	const patterns = [
		/api[_-]?key[s]?\s*[:=]\s*["']?([a-zA-Z0-9_-]{32,})["']?/gi,
		/password[s]?\s*[:=]\s*["']?([a-zA-Z0-9_-]{8,})["']?/gi,
		/token[s]?\s*[:=]\s*["']?([a-zA-Z0-9_-]{32,})["']?/gi,
		/bearer\s+([a-zA-Z0-9_-]{32,})/gi,
	];

	for (const pattern of patterns) {
		redacted = redacted.replace(pattern, '[REDACTED]');
	}

	// Redact provided secrets
	for (const secret of secrets) {
		if (secret.length > 4) {
			redacted = redacted.replace(new RegExp(secret, 'g'), '[REDACTED]');
		}
	}

	return redacted;
};

/**
 * Wrap a promise with a timeout
 */
export const withTimeout = <T>(
	promise: Promise<T>,
	timeoutMs: number,
	timeoutError: Error = new Error('Operation timed out'),
): Promise<T> => {
	const timeoutPromise = new Promise<never>((_resolve, reject) => {
		setTimeout(() => reject(timeoutError), timeoutMs);
	});

	return Promise.race([promise, timeoutPromise]);
};
