export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

export function deepClone<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') return obj;
	if (obj instanceof Date) return new Date(obj.getTime()) as T;
	if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T;
	if (typeof obj === 'object') {
		const cloned: Record<string, unknown> = {};
		for (const key in obj as Record<string, unknown>) {
			// Use Object.prototype.hasOwnProperty indirectly via Object.hasOwn (Node 16+)
			if (Object.hasOwn(obj as object, key)) {
				cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
			}
		}
		return cloned as T;
	}
	return obj;
}

export function estimateTokens(text: string, model?: string): number {
	if (!text) return 0;
	// Simple heuristic: whitespace-delimited words
	const words = String(text).trim().split(/\s+/).filter(Boolean).length;
	const base = Math.max(0, words);
	if (model === 'mlx') {
		// MLX efficiency factor (~0.85)
		return Math.floor(base * 0.85);
	}
	return base;
}

export function filterDefined<T>(array: (T | undefined | null)[]): T[] {
	return array.filter((item): item is T => item != null);
}

// Secure ID helpers (local fallback using Node crypto)
import crypto from 'node:crypto';

function _secureId(prefix: string): string {
	const id = crypto.randomUUID?.() ?? crypto.randomBytes(16).toString('hex');
	return `${prefix}-${id}`;
}

export function generateAgentId(): string {
	return crypto.randomUUID?.() ?? crypto.randomBytes(16).toString('hex');
}

export function generateTraceId(): string {
	return crypto.randomUUID?.() ?? crypto.randomBytes(16).toString('hex');
}

export function isDefined<T>(value: T | undefined | null): value is T {
	return value != null;
}

export async function retry<T>(
	fn: () => Promise<T>,
	maxAttempts: number = 3,
	delay: number = 1000,
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			if (attempt === maxAttempts) break;
			await sleep(delay * attempt);
		}
	}

	throw lastError || new Error('Unknown error occurred');
}

export function safeGet<T>(
	obj: any,
	path: string,
	defaultValue?: T,
): T | undefined {
	const keys = path.split('.');
	let current = obj;

	for (const key of keys) {
		if (current == null || typeof current !== 'object') {
			return defaultValue;
		}
		current = current[key];
	}

	return current !== undefined ? current : defaultValue;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number,
): (...args: Parameters<T>) => void {
	let inThrottle = false;
	let trailingArgs: Parameters<T> | null = null;
	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => {
				inThrottle = false;
				if (trailingArgs) {
					const ta = trailingArgs;
					trailingArgs = null;
					func(...ta);
				}
			}, limit);
		} else {
			trailingArgs = args;
		}
	};
}

// Standalone timeout that rejects after ms
export function timeout(ms: number, message?: string): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(
			() => reject(new Error(message || `Operation timed out after ${ms}ms`)),
			ms,
		),
	);
}

export function truncateToTokens(text: string, maxTokens: number): string {
	const words = String(text).trim().split(/\s+/).filter(Boolean);
	if (words.length <= maxTokens) return text;
	const sliced = words.slice(0, maxTokens).join(' ');
	return `${sliced}...`;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([promise, timeout(ms)]);
}

export function sanitizeText(text: string): string {
	// Remove potential script injections and sanitize input
	return text
		.replace(/<script[^>]*>.*?<\/script>/gi, '')
		.replace(/<[^>]*>/g, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+\s*=/gi, '')
		.trim();
}

export function redactPII(text: string): string {
	// Redact personally identifiable information
	return text
		.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
		.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
		.replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
		.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CREDIT_CARD]');
}
