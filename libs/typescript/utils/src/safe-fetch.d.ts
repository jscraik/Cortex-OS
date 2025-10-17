/**
 * Safe HTTP client utilities with SSRF protection
 *
 * This module provides secure wrappers around fetch() to prevent
 * Server-Side Request Forgery (SSRF) attacks by validating URLs
 * against allowlists and enforcing security constraints.
 */
export interface SafeFetchOptions {
    /** Allowed protocols (default: ['https:']) */
    allowedProtocols?: string[];
    /** Allowed hostnames/domains */
    allowedHosts?: string[];
    /** Allow localhost (default: false in production) */
    allowLocalhost?: boolean;
    /** Additional fetch options */
    fetchOptions?: RequestInit;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Custom fetch implementation (useful for testing) */
    fetchImpl?: typeof fetch;
    /** Optional controller to allow external cancellation */
    controller?: AbortController;
}
export declare const SAFE_FETCH_BRAND_PREFIX = "[brAInwav]";
/**
 * Determines whether the hostname represents a private or loopback range.
 */
export declare function isPrivateHostname(hostname: string): boolean;
/**
 * Validates a URL against security constraints
 */
export declare function validateUrl(url: string, options?: Pick<SafeFetchOptions, 'allowedProtocols' | 'allowedHosts' | 'allowLocalhost'>): {
    valid: boolean;
    reason?: string;
};
/**
 * Safe fetch wrapper with SSRF protection
 *
 * @param url - URL to fetch
 * @param options - Security and fetch options
 * @returns Promise<Response>
 * @throws Error if URL validation fails or request times out
 */
export declare function safeFetch(url: string, options?: SafeFetchOptions): Promise<Response>;
/**
 * Creates a configured safe fetch function with preset security options
 *
 * @param defaultOptions - Default security options to apply
 * @returns Configured safe fetch function
 */
export declare function createSafeFetch(defaultOptions: SafeFetchOptions): (url: string, options?: SafeFetchOptions) => Promise<Response>;
