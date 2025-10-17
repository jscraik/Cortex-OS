/**
 * Safe HTTP client utilities with SSRF protection
 *
 * This module provides secure wrappers around fetch() to prevent
 * Server-Side Request Forgery (SSRF) attacks by validating URLs
 * against allowlists and enforcing security constraints.
 */
/**
 * Default safe fetch configuration
 */
const DEFAULT_OPTIONS = {
    allowedProtocols: ['https:'],
    allowLocalhost: false,
    timeout: 30000,
};
const PRIVATE_IPV4_PATTERNS = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[0-1])\./,
    /^169\.254\./,
    /^100\.(6[4-9]|[7-9]\d|1\d\d|2[0-1]\d|22[0-7])\./,
];
const LOOPBACK_HOSTNAMES = ['localhost', '::1'];
export const SAFE_FETCH_BRAND_PREFIX = '[brAInwav]';
/**
 * Determines whether the hostname represents a private or loopback range.
 */
export function isPrivateHostname(hostname) {
    const normalized = hostname.toLowerCase();
    if (LOOPBACK_HOSTNAMES.includes(normalized)) {
        return true;
    }
    return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(normalized));
}
function normalizeHosts(allowedHosts) {
    return allowedHosts?.map((host) => host.toLowerCase());
}
/**
 * Validates a URL against security constraints
 */
export function validateUrl(url, options = {}) {
    try {
        const parsedUrl = new URL(url);
        const protocols = options.allowedProtocols ?? DEFAULT_OPTIONS.allowedProtocols;
        if (!protocols.includes(parsedUrl.protocol)) {
            return {
                valid: false,
                reason: `Protocol '${parsedUrl.protocol}' not allowed. Allowed: ${protocols.join(', ')}`,
            };
        }
        const hostname = parsedUrl.hostname.toLowerCase();
        const allowLocalhost = options.allowLocalhost ?? DEFAULT_OPTIONS.allowLocalhost;
        if (!allowLocalhost && isPrivateHostname(hostname)) {
            return {
                valid: false,
                reason: `Localhost/private IP access not allowed: ${hostname}`,
            };
        }
        const allowedHosts = normalizeHosts(options.allowedHosts);
        if (allowedHosts?.length && !allowedHosts.includes(hostname)) {
            return {
                valid: false,
                reason: `Host '${hostname}' not in allowlist: ${allowedHosts.join(', ')}`,
            };
        }
        return { valid: true };
    }
    catch (error) {
        return {
            valid: false,
            reason: `Invalid URL: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
/**
 * Safe fetch wrapper with SSRF protection
 *
 * @param url - URL to fetch
 * @param options - Security and fetch options
 * @returns Promise<Response>
 * @throws Error if URL validation fails or request times out
 */
export async function safeFetch(url, options = {}) {
    const validation = validateUrl(url, options);
    if (!validation.valid) {
        throw new Error(`${SAFE_FETCH_BRAND_PREFIX} Safe fetch blocked: ${validation.reason}`);
    }
    const timeout = options.timeout ?? DEFAULT_OPTIONS.timeout;
    const controller = options.controller ?? new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    try {
        const fetchOptions = {
            ...options.fetchOptions,
            signal: controller.signal,
            // Security defaults
            redirect: options.fetchOptions?.redirect ?? 'manual',
            referrerPolicy: options.fetchOptions?.referrerPolicy ?? 'no-referrer',
        };
        const response = await fetchImpl(url, fetchOptions);
        clearTimeout(timeoutId);
        return response;
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`${SAFE_FETCH_BRAND_PREFIX} Request timeout after ${timeout}ms`);
        }
        throw error;
    }
}
/**
 * Creates a configured safe fetch function with preset security options
 *
 * @param defaultOptions - Default security options to apply
 * @returns Configured safe fetch function
 */
export function createSafeFetch(defaultOptions) {
    return (url, options = {}) => {
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            allowedHosts: options.allowedHosts ?? defaultOptions.allowedHosts,
            allowedProtocols: options.allowedProtocols ?? defaultOptions.allowedProtocols,
            fetchOptions: { ...defaultOptions.fetchOptions, ...options.fetchOptions },
            fetchImpl: options.fetchImpl ?? defaultOptions.fetchImpl,
            controller: options.controller,
        };
        return safeFetch(url, mergedOptions);
    };
}
