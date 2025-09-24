import { WritableStream } from 'node:stream/web';
import type { RedactionConfig, RedactionPattern } from './types.js';

/**
 * Apply redaction patterns to a value
 */
function applyRedaction(value: unknown, pattern: RedactionPattern, path: string[] = []): unknown {
	if (typeof value === 'string') {
		// Check if field name matches
		const fieldName = path[path.length - 1];
		if (pattern.fields?.includes(fieldName)) {
			return typeof pattern.replacement === 'function'
				? pattern.replacement(value)
				: pattern.replacement;
		}

		// Check regex pattern
		if (pattern.pattern && !pattern.pattern.startsWith('^')) {
			// Simple field pattern
			if (fieldName === pattern.pattern) {
				return typeof pattern.replacement === 'function'
					? pattern.replacement(value)
					: pattern.replacement;
			}
		} else {
			// Regex pattern
			try {
				const regex = new RegExp(pattern.pattern, 'g');
				return value.replace(regex, (match) =>
					typeof pattern.replacement === 'function'
						? pattern.replacement(match)
						: pattern.replacement,
				);
			} catch {
				// Invalid regex, return original value
				return value;
			}
		}
	} else if (Array.isArray(value)) {
		return value.map((item, index) => applyRedaction(item, pattern, [...path, index.toString()]));
	} else if (value && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
			result[key] = applyRedaction(val, pattern, [...path, key]);
		}
		return result;
	}

	return value;
}

/**
 * Apply all redaction patterns to an object
 */
function applyAllRedactions(obj: unknown, config: RedactionConfig): unknown {
	let result = obj;
	for (const pattern of config.patterns) {
		result = applyRedaction(result, pattern);
	}
	return result;
}

/**
 * Handle circular references during redaction
 */
function safeStringify(obj: unknown): string {
	const seen = new WeakSet();
	return JSON.stringify(obj, (_key, value) => {
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) {
				return '[Circular]';
			}
			seen.add(value);
		}
		return value;
	});
}

/**
 * Create a redaction transform stream
 */
export function createRedactionStream(
	destination: WritableStream<Uint8Array>,
	config: RedactionConfig,
): WritableStream<Uint8Array> {
	return new WritableStream({
		async write(chunk) {
			const writer = destination.getWriter();
			try {
				// Parse the chunk, apply redactions, and re-encode
				const text = new TextDecoder().decode(chunk);
				const entry = JSON.parse(text);
				const redactedEntry = applyAllRedactions(entry, config);
				const redactedText = safeStringify(redactedEntry);
				const encoded = new TextEncoder().encode(`${redactedText}\n`);
				await writer.write(encoded);
			} catch {
				// If redaction fails, write original chunk
				await writer.write(chunk);
			} finally {
				writer.releaseLock();
			}
		},
		close() {
			destination.close();
		},
		abort(reason) {
			destination.abort(reason);
		},
	});
}
