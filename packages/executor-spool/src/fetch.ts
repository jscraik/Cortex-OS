import type { FetchResult, RestrictedFetchOptions, RestrictedFetchPolicy } from './types.js';

const DEFAULT_PROTOCOLS: Array<'https:' | 'http:'> = ['https:'];
const DEFAULT_REQUESTS_PER_MINUTE = 60;

interface RateBucket {
	tokens: number;
	lastRefill: number;
}

interface PreparedRequest {
	parsed: URL;
	rpm: number;
	burst: number;
	maxBytes: number;
}

interface BodyBundle {
	buffer: Uint8Array;
	contentType?: string;
	payload: string | Uint8Array;
}

const rateState = new Map<string, RateBucket>();

const wildcardMatch = (host: string, pattern: string): boolean => {
	if (pattern === '*') {
		return true;
	}
	if (pattern.startsWith('*.')) {
		const suffix = pattern.slice(2);
		return host === suffix || host.endsWith(`.${suffix}`);
	}
	return host === pattern;
};

const assertHostAllowed = (host: string, allowed: string[]): void => {
	if (allowed.some((pattern) => wildcardMatch(host, pattern))) {
		return;
	}
	throw new Error(`Host ${host} is not permitted by restricted fetch policy`);
};

const refillTokens = (bucket: RateBucket, rpm: number, burst: number): void => {
	const now = Date.now();
	const elapsed = now - bucket.lastRefill;
	const tokensToAdd = (elapsed / 60_000) * rpm;
	bucket.tokens = Math.min(burst, bucket.tokens + tokensToAdd);
	bucket.lastRefill = now;
};

const takeToken = (key: string, rpm: number, burst: number): void => {
	const bucket = rateState.get(key) ?? { tokens: burst, lastRefill: Date.now() };
	refillTokens(bucket, rpm, burst);
	if (bucket.tokens < 1) {
		throw new Error(`Rate limit exceeded for ${key}`);
	}
	bucket.tokens -= 1;
	rateState.set(key, bucket);
};

const chooseResponseBody = (buffer: Uint8Array, contentType: string | undefined): string | Uint8Array => {
	if (!contentType) {
		return buffer;
	}
	const normalized = contentType.toLowerCase();
	if (normalized.includes('json') || normalized.startsWith('text/') || normalized.includes('yaml')) {
		return new TextDecoder().decode(buffer);
	}
	return buffer;
};

const enforceContentType = (contentType: string | undefined, allowed?: string[]): void => {
	if (!allowed || allowed.length === 0 || !contentType) {
		return;
	}
	const lower = contentType.toLowerCase();
	const permitted = allowed.some((type) => lower.startsWith(type.toLowerCase()));
	if (!permitted) {
		throw new Error(`Content type ${contentType} blocked by fetch policy`);
	}
};

const prepareRequest = (url: string, policy: RestrictedFetchPolicy): PreparedRequest => {
	const parsed = new URL(url);
	const protocols = policy.allowedProtocols ?? DEFAULT_PROTOCOLS;
	if (!protocols.includes(parsed.protocol as 'https:' | 'http:')) {
		throw new Error(`Protocol ${parsed.protocol} not allowed`);
	}
	assertHostAllowed(parsed.hostname, policy.allowedHosts);
	const rpm = policy.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE;
	const burst = policy.burst ?? rpm;
	const maxBytes = policy.maxContentLength ?? Number.POSITIVE_INFINITY;
	return { parsed, rpm, burst, maxBytes };
};

const collectBody = async (
	response: Response,
	maxBytes: number,
	allowedTypes?: string[],
): Promise<BodyBundle> => {
	const contentType = response.headers.get('content-type') ?? undefined;
	enforceContentType(contentType, allowedTypes);
	const lengthHeader = response.headers.get('content-length');
	if (lengthHeader) {
		const claimed = Number.parseInt(lengthHeader, 10);
		if (!Number.isNaN(claimed) && claimed > maxBytes) {
			throw new Error(`Response content-length ${claimed} exceeds limit`);
		}
	}
	const buffer = new Uint8Array(await response.arrayBuffer());
	if (buffer.byteLength > maxBytes) {
		throw new Error(`Response size ${buffer.byteLength} exceeds limit`);
	}
	return { buffer, contentType, payload: chooseResponseBody(buffer, contentType) };
};

const buildResult = (response: Response, bundle: BodyBundle): FetchResult => ({
	url: response.url,
	status: response.status,
	headers: Object.fromEntries(response.headers.entries()),
	body: bundle.payload,
	contentType: bundle.contentType,
	fetchedAt: new Date().toISOString(),
	durationMs: response.headers.has('x-response-time')
		? Number.parseFloat(response.headers.get('x-response-time') ?? '0')
		: 0,
	bytes: bundle.buffer.byteLength,
});

export const restrictedFetch = async (
	url: string,
	policy: RestrictedFetchPolicy,
	options: RestrictedFetchOptions = {},
): Promise<FetchResult> => {
	const prepared = prepareRequest(url, policy);
	takeToken(prepared.parsed.hostname, prepared.rpm, prepared.burst);
	const response = await fetch(prepared.parsed, {
		method: options.method ?? 'GET',
		headers: options.headers,
		body: options.body ?? null,
		signal: options.signal,
	});
	const body = await collectBody(response, prepared.maxBytes, policy.allowedContentTypes);
	return buildResult(response, body);
};
