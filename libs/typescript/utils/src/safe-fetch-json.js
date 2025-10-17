import { safeFetch } from './safe-fetch.js';
const DEFAULT_ACCEPT = 'application/json';
const DEFAULT_USER_AGENT = 'brAInwav-safe-fetch/1.0';
function hasHeader(headersInit, key) {
    if (!headersInit) {
        return false;
    }
    const headers = new Headers(headersInit);
    return headers.has(key);
}
// eslint-disable-next-line sonarjs/function-return-type
function mergeHeaders(existing, additions) {
    const headers = new Headers(existing ?? {});
    for (const [header, value] of Object.entries(additions)) {
        if (value !== undefined) {
            headers.set(header, value);
        }
    }
    return headers;
}
function resolveUserAgent(requested, existing) {
    if (requested) {
        return requested;
    }
    return hasHeader(existing, 'user-agent') ? undefined : DEFAULT_USER_AGENT;
}
export async function safeFetchJson(url, options = {}) {
    const { schema, rejectOnNon2xx = true, accept = DEFAULT_ACCEPT, userAgent, fetchOptions, allowEmptyResponse = false, emptyResponseValue, ...safeFetchOptions } = options;
    const headers = mergeHeaders(fetchOptions?.headers, {
        Accept: accept,
        'User-Agent': resolveUserAgent(userAgent, fetchOptions?.headers),
    });
    const response = await safeFetch(url, {
        ...safeFetchOptions,
        fetchOptions: { ...fetchOptions, headers },
    });
    if (rejectOnNon2xx && !response.ok) {
        throw new Error(`[brAInwav] HTTP ${response.status} ${response.statusText || 'Unknown status'}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    const normalizedContentType = contentType.toLowerCase();
    const noContentStatus = response.status === 204 || response.status === 304;
    if (noContentStatus || (!normalizedContentType && allowEmptyResponse)) {
        if (!allowEmptyResponse) {
            throw new Error('[brAInwav] Expected JSON but response had no content');
        }
        const fallbackValue = (emptyResponseValue ?? {});
        return schema ? schema.parse(fallbackValue) : fallbackValue;
    }
    if (!normalizedContentType.includes('application/json')) {
        throw new Error(`[brAInwav] Expected JSON but received '${contentType || 'unknown'}'`);
    }
    const data = (await response.json());
    return schema ? schema.parse(data) : data;
}
