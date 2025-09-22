const scriptTagPattern = /<script[^>]*?>[\s\S]*?<\/script>/gi;
// Remove ASCII control characters (U+0000–U+001F) and DEL (U+007F) without regex to avoid linter false-positives
const stripControlChars = (s: string): string => {
	let out = '';
	for (let i = 0; i < s.length; i++) {
		const code = s.charCodeAt(i);
		if (code >= 32 && code !== 127) out += s[i];
	}
	return out;
};

export function sanitizePayload<T>(payload: T): T {
	if (payload === null || payload === undefined) {
		return payload;
	}

	if (typeof payload === 'string') {
		return stripControlChars(payload.replace(scriptTagPattern, '')) as T;
	}

	if (Array.isArray(payload)) {
		return payload.map((item) => sanitizePayload(item)) as T;
	}

	if (typeof payload === 'object') {
		const entries = Object.entries(payload as Record<string, unknown>).map(([key, value]) => [
			key,
			sanitizePayload(value),
		]);
		return Object.fromEntries(entries) as T;
	}

	return payload;
}

export function sanitizeHeaders(
	headers: Record<string, string> | undefined,
): Record<string, string> {
	if (!headers) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(headers).map(([key, value]) => [
			key.toLowerCase(),
			sanitizePayload(value.trim()),
		]),
	);
}
