/**
 * Validation & sanitization helpers for security hardening.
 * Minimal, dependency-free, and easily testable.
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Ensure the embedding vector has an allowed dimension and valid numbers.
 * Throws an Error when invalid.
 */
export function validateEmbeddingDim(vec: unknown, allowedDims: number[]): void {
	if (!Array.isArray(vec)) throw new Error('Embedding must be an array');
	if (!allowedDims.includes(vec.length)) {
		throw new Error(`Invalid embedding dimension: ${vec.length}`);
	}
	for (const v of vec) {
		if (typeof v !== 'number' || !Number.isFinite(v)) {
			throw new Error('Embedding contains non-finite values');
		}
	}
}

/**
 * Ensure text content does not exceed a character limit.
 * Throws an Error when invalid.
 */
export function validateContentSize(text: unknown, maxChars: number): void {
	if (typeof text !== 'string') throw new Error('Content must be a string');
	if (text.length > maxChars) {
		throw new Error(`Content exceeds maximum size of ${maxChars}`);
	}
}

/**
 * Deeply sanitize metadata objects to prevent prototype pollution.
 * - Rejects forbidden keys (__proto__, constructor, prototype)
 * - Only accepts plain objects and arrays (rejects class instances)
 * - Returns a deep-cloned, safe object/array
 */
export function sanitizeMetadata<T>(value: T): T {
	type SeenMap = WeakMap<object, unknown>;
	const seen: SeenMap = new WeakMap<object, unknown>();

	function cloneArray(arr: unknown[], seenMap: SeenMap): unknown[] {
		if (seenMap.has(arr)) return seenMap.get(arr) as unknown[];
		const out: unknown[] = [];
		seenMap.set(arr, out);
		for (const item of arr) out.push(cloneSafe(item, seenMap));
		return out;
	}

	function cloneObject(obj: Record<string, unknown>, seenMap: SeenMap): Record<string, unknown> {
		const proto = Object.getPrototypeOf(obj);
		if (proto !== Object.prototype && proto !== null) {
			// Include phrasing that tests assert on
			throw new Error('Prototype pollution detected: forbidden key or non-plain object');
		}
		if (seenMap.has(obj)) return seenMap.get(obj) as Record<string, unknown>;
		const out: Record<string, unknown> = Object.create(null);
		seenMap.set(obj, out);
		for (const [k, v] of Object.entries(obj)) {
			if (FORBIDDEN_KEYS.has(k)) {
				throw new Error(`Prototype pollution detected: forbidden key ${k}`);
			}
			out[k] = cloneSafe(v, seenMap);
		}
		return out;
	}

	function cloneSafe(input: unknown, seenMap: SeenMap): unknown {
		if (Array.isArray(input)) {
			return cloneArray(input, seenMap);
		}

		if (isPlainObject(input)) {
			return cloneObject(input as Record<string, unknown>, seenMap);
		}

		// Primitives and null are safe by value
		if (
			input === null ||
			typeof input === 'string' ||
			typeof input === 'number' ||
			typeof input === 'boolean'
		) {
			return input;
		}

		// Reject functions, symbols, BigInt, and other exotic types
		if (typeof input === 'function' || typeof input === 'symbol' || typeof input === 'bigint') {
			throw new Error('Invalid metadata value type');
		}

		// Dates, Maps, Sets, class instances are rejected to keep surface small
		if (typeof input === 'object') {
			throw new Error('Prototype pollution detected: forbidden key or non-plain object');
		}

		return input;
	}

	return cloneSafe(value, seen) as T;
}
