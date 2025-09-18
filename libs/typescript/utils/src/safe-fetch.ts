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
}

/**
 * Default safe fetch configuration
 */
const DEFAULT_OPTIONS: Required<Omit<SafeFetchOptions, 'allowedHosts' | 'fetchOptions'>> = {
	allowedProtocols: ['https:'],
	allowLocalhost: false,
	timeout: 30000,
};

/**
 * Validates a URL against security constraints
 */
export function validateUrl(
	url: string,
	options: Pick<SafeFetchOptions, 'allowedProtocols' | 'allowedHosts' | 'allowLocalhost'> = {},
): { valid: boolean; reason?: string } {
	try {
		const parsedUrl = new URL(url);
		const protocols = options.allowedProtocols ?? DEFAULT_OPTIONS.allowedProtocols;
		const allowLocalhost = options.allowLocalhost ?? DEFAULT_OPTIONS.allowLocalhost;

		// Protocol validation
		if (!protocols.includes(parsedUrl.protocol)) {
			return {
				valid: false,
				reason: `Protocol '${parsedUrl.protocol}' not allowed. Allowed: ${protocols.join(', ')}`,
			};
		}

		// Localhost validation
		const hostname = parsedUrl.hostname.toLowerCase();
		const isLocalhost =
			['localhost', '127.0.0.1', '::1'].includes(hostname) ||
			hostname.startsWith('192.168.') ||
			hostname.startsWith('10.') ||
			(hostname.startsWith('172.') && /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname));

		if (isLocalhost && !allowLocalhost) {
			return {
				valid: false,
				reason: `Localhost/private IP access not allowed: ${hostname}`,
			};
		}

		// Host allowlist validation
		if (options.allowedHosts && options.allowedHosts.length > 0) {
			if (!options.allowedHosts.includes(hostname)) {
				return {
					valid: false,
					reason: `Host '${hostname}' not in allowlist: ${options.allowedHosts.join(', ')}`,
				};
			}
		}

		return { valid: true };
	} catch (error) {
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
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
	const validation = validateUrl(url, options);
	if (!validation.valid) {
		throw new Error(`Safe fetch blocked: ${validation.reason}`);
	}

	const timeout = options.timeout ?? DEFAULT_OPTIONS.timeout;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const fetchOptions: RequestInit = {
			...options.fetchOptions,
			signal: controller.signal,
			// Security defaults
			redirect: options.fetchOptions?.redirect ?? 'manual',
			referrerPolicy: options.fetchOptions?.referrerPolicy ?? 'no-referrer',
		};

		const response = await fetch(url, fetchOptions);
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`Request timeout after ${timeout}ms`);
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
export function createSafeFetch(defaultOptions: SafeFetchOptions) {
	return (url: string, options: SafeFetchOptions = {}) => {
		const mergedOptions = {
			...defaultOptions,
			...options,
			allowedHosts: options.allowedHosts ?? defaultOptions.allowedHosts,
			allowedProtocols: options.allowedProtocols ?? defaultOptions.allowedProtocols,
			fetchOptions: { ...defaultOptions.fetchOptions, ...options.fetchOptions },
		};
		return safeFetch(url, mergedOptions);
	};
}
