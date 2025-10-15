import { WritableStream } from 'node:stream/web';
import type { RedactionConfig, RedactionPattern } from './types.js';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

interface CompiledPattern {
	readonly replacement: RedactionPattern['replacement'];
	readonly fieldNames: Set<string>;
	readonly fieldRegex?: RegExp;
	readonly patternSource?: string;
}

function compilePattern(pattern: RedactionPattern): CompiledPattern {
	const fieldNames = new Set(
		(pattern.fields ?? []).map((field) => field.trim().toLowerCase()).filter(Boolean),
	);

	let fieldRegex: RegExp | undefined;
	let patternSource: string | undefined;

	if (pattern.pattern) {
		patternSource = pattern.pattern;
		try {
			fieldRegex = new RegExp(pattern.pattern, 'i');
		} catch {
			fieldRegex = undefined;
			patternSource = undefined;
		}
	}

	return {
		replacement: pattern.replacement,
		fieldNames,
		fieldRegex,
		patternSource,
	};
}

function applyReplacement(
	replacement: RedactionPattern['replacement'],
	value: string,
): string {
	return typeof replacement === 'function' ? replacement(value) : replacement;
}

function isNumericPathSegment(segment: string): boolean {
	return /^\d+$/.test(segment);
}

function collectFieldSegments(path: string[]): { normalized: string[]; original: string[] } {
	const normalized: string[] = [];
	const original: string[] = [];

	for (const segment of path) {
		if (isNumericPathSegment(segment)) {
			continue;
		}
		normalized.push(segment.toLowerCase());
		original.push(segment);
	}

	return { normalized, original };
}

function redactString(value: string, path: string[], patterns: CompiledPattern[]): string {
	let result = value;
	const { normalized, original } = collectFieldSegments(path);
	const currentNormalized = normalized.at(-1);
	const currentOriginal = original.at(-1);

	for (const pattern of patterns) {
		const matchesField =
			pattern.fieldNames.size > 0 &&
			currentNormalized !== undefined &&
			(() => {
				for (const field of pattern.fieldNames) {
					if (currentNormalized === field || currentNormalized.includes(field)) {
						return true;
					}
				}
				return false;
			})();

		const matchesFieldRegex =
			pattern.fieldRegex !== undefined && currentOriginal !== undefined
				? pattern.fieldRegex.test(currentOriginal)
				: false;

		if (matchesField || matchesFieldRegex) {
			result = applyReplacement(pattern.replacement, result);
			continue;
		}

		if (!pattern.patternSource) {
			continue;
		}

		try {
			const regex = new RegExp(pattern.patternSource, 'gi');
			const replaced = result.replace(regex, (match) => applyReplacement(pattern.replacement, match));
			if (replaced !== result) {
				result = pattern.fieldNames.size > 0
					? applyReplacement(pattern.replacement, result)
					: replaced;
			}
		} catch {
			// Ignore invalid regex patterns
		}
	}

	return result;
}

function redactValue(value: unknown, path: string[], patterns: CompiledPattern[]): unknown {
	if (typeof value === 'string') {
		return redactString(value, path, patterns);
	}

	if (Array.isArray(value)) {
		let mutated = false;
		const redactedArray = value.map((item, index) => {
			const redactedItem = redactValue(item, [...path, index.toString()], patterns);
			if (redactedItem !== item) {
				mutated = true;
			}
			return redactedItem;
		});
		return mutated ? redactedArray : value;
	}

	if (value && typeof value === 'object') {
		let mutated = false;
		const source = value as Record<string, unknown>;
		const redactedEntries = Object.entries(source).map(([key, entryValue]) => {
			const redactedEntryValue = redactValue(entryValue, [...path, key], patterns);
			if (redactedEntryValue !== entryValue) {
				mutated = true;
			}
			return [key, redactedEntryValue] as const;
		});

		if (!mutated) {
			return value;
		}

		return Object.fromEntries(redactedEntries);
	}

	return value;
}

function applyRedactions(payload: unknown, compiledPatterns: CompiledPattern[]): unknown {
	return redactValue(payload, [], compiledPatterns);
}

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

export function createRedactionStream(
	destination: WritableStream<Uint8Array>,
	config: RedactionConfig,
): WritableStream<Uint8Array> {
	const compiledPatterns = config.patterns.map(compilePattern);

	return new WritableStream({
		async write(chunk) {
			const writer = destination.getWriter();
			try {
				const text = decoder.decode(chunk);
				const normalized = text.trim();

				if (!normalized) {
					await writer.write(chunk);
					return;
				}

				let parsed: unknown;
				try {
					parsed = JSON.parse(normalized);
				} catch {
					await writer.write(chunk);
					return;
				}

				const redactedEntry = applyRedactions(parsed, compiledPatterns);
				const redactedText = safeStringify(redactedEntry);
				const encoded = encoder.encode(`${redactedText}\n`);
				await writer.write(encoded);
			} catch {
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
