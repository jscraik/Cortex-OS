const scriptTagPattern = /<script[^>]*?>[\s\S]*?<\/script>/gi;
const controlCharPattern = /[\u0000-\u001f\u007f]/g;

export function sanitizePayload<T>(payload: T): T {
	if (payload === null || payload === undefined) {
		return payload;
	}

	if (typeof payload === 'string') {
		return payload.replace(scriptTagPattern, '').replace(controlCharPattern, '') as T;
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
