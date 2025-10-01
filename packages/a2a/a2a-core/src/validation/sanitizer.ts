import type { A2AEventEnvelope } from '@cortex-os/a2a-events';

/**
 * Sanitizes HTML and JavaScript content from strings to prevent XSS attacks
 * while preserving safe content and brAInwav branding
 */
function sanitizeString(input: string): string {
	if (typeof input !== 'string') {
		return input;
	}

	// Remove script tags and their content
	let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

	// Remove iframe with javascript protocol
	sanitized = sanitized.replace(
		/<iframe[^>]*src=["']javascript:[^"']*["'][^>]*>.*?<\/iframe>/gi,
		'',
	);

	// Remove inline event handlers (onclick, onerror, etc.)
	sanitized = sanitized.replace(/<[^>]*\s(on\w+)=["'][^"']*["'][^>]*>/gi, (match) => {
		return match.replace(/\s(on\w+)=["'][^"']*["']/gi, '');
	});

	// Remove img tags with onerror handlers, but preserve the alt text or content after
	sanitized = sanitized.replace(/<img[^>]*onerror=["'][^"']*["'][^>]*>/gi, '');

	// Remove div with onclick and similar, but preserve inner text
	sanitized = sanitized.replace(/<(\w+)[^>]*\s(on\w+)=["'][^"']*["'][^>]*>(.*?)<\/\1>/gi, '$3');

	// Remove any remaining HTML tags but preserve content
	sanitized = sanitized.replace(/<[^>]*>/g, '');

	return sanitized;
}

/**
 * Recursively sanitizes an object, handling nested objects and arrays
 */
function sanitizeValue(value: unknown): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === 'string') {
		return sanitizeString(value);
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => sanitizeValue(item));
	}

	if (typeof value === 'object') {
		const sanitizedObject: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value)) {
			sanitizedObject[key] = sanitizeValue(val);
		}
		return sanitizedObject;
	}

	return value;
}

/**
 * Sanitizes an A2A event envelope by removing malicious content while preserving
 * safe fields and the overall structure. Ensures brAInwav branding is maintained.
 */
export function sanitizeEventEnvelope(envelope: unknown): unknown {
	if (!envelope || typeof envelope !== 'object') return envelope;

	type EnvelopeLike = Record<string, unknown>;
	const e = envelope as EnvelopeLike;

	// A2A envelope shape (new schema)
	if ('event' in e) {
		const clone = JSON.parse(JSON.stringify(e)) as EnvelopeLike;
		clone['event'] = sanitizeValue(e['event']);
		if (clone['metadata']) {
			clone['metadata'] = sanitizeValue(e['metadata']);
		}
		return clone as A2AEventEnvelope;
	}

	// Legacy CloudEvent-like shape
	if ('data' in e) {
		const clone = JSON.parse(JSON.stringify(e)) as EnvelopeLike;
		clone['data'] = sanitizeValue(e['data']);
		if (clone['metadata']) {
			clone['metadata'] = sanitizeValue(e['metadata']);
		}
		return clone;
	}

	// Unknown shape: attempt a best-effort deep sanitize
	return sanitizeValue(e);
}
