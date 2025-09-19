/**
 * Security utilities for sanitizing inputs and metadata
 */

export const MAX_CONTENT_SIZE = 25_000; // characters
export const ALLOWED_EMBEDDING_DIMS = new Set([384, 768, 1024, 1536, 3072]);

export function validateContentSize(content: string): void {
	if (typeof content !== 'string') throw new Error('Invalid input');
	if (content.length > MAX_CONTENT_SIZE) throw new Error('Content exceeds maximum size');
}

function assertNoShellMeta(content: string): void {
	const SHELL_META = /[;&|`$<>]/;
	if (SHELL_META.test(content) || content.includes('$(')) throw new Error('Invalid input');
}

export function sanitizeTextInputs(texts: string[]): string[] {
	if (!Array.isArray(texts)) throw new Error('Invalid input');
	for (const t of texts) {
		validateContentSize(t);
		// Check for ASCII control chars except tab (0x09), LF (0x0A), CR (0x0D)
		for (let i = 0; i < t.length; i++) {
			const code = t.charCodeAt(i);
			const isControl = code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d;
			if (isControl) throw new Error('Invalid input');
		}
		assertNoShellMeta(t);
	}
	return texts;
}

export function sanitizeMetadata(metadata: unknown): void {
	const seen = new WeakSet<Record<string, unknown>>();
	const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
	function walk(node: unknown) {
		if (!node || typeof node !== 'object') return;
		// Allow arrays, but walk their elements safely
		if (Array.isArray(node)) {
			for (const v of node) walk(v);
			return;
		}
		const obj = node as Record<string, unknown>;
		// Detect non-plain prototypes which can indicate pollution via __proto__
		const proto = Object.getPrototypeOf(obj);
		if (proto !== Object.prototype && proto !== null) {
			throw new Error('Prototype pollution detected');
		}
		if (seen.has(obj)) return;
		seen.add(obj);
		for (const [k, v] of Object.entries(obj)) {
			if (forbidden.has(k)) throw new Error('Prototype pollution detected');
			walk(v);
		}
	}
	walk(metadata);
}

export function validateEmbeddingDimensions(embedding: number[]): true {
	if (!Array.isArray(embedding) || embedding.some((n) => typeof n !== 'number')) {
		throw new Error('Invalid embedding');
	}
	if (!ALLOWED_EMBEDDING_DIMS.has(embedding.length)) throw new Error('Invalid embedding dimension');
	return true;
}
