import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const WebFetchInputSchema = z.object({
	url: z.string().url('Must be a valid URL'),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).default('GET'),
	headers: z.record(z.string()).optional(),
	body: z.string().optional(),
	timeout: z.number().int().positive().max(60000).default(10000), // 10s default, 60s max
	followRedirects: z.boolean().default(true),
	maxRedirects: z.number().int().min(0).max(10).default(5),
	responseType: z.enum(['text', 'json', 'blob', 'arraybuffer']).default('text'),
});

export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;

export interface WebFetchResult {
	url: string;
	status: number;
	statusText: string;
	headers: Record<string, string>;
	data?: string | Record<string, unknown> | ArrayBuffer;
	contentType?: string;
	contentLength?: number;
	responseTime: number;
	redirected: boolean;
	redirectCount?: number;
	timestamp: string;
}

export class WebFetchTool implements McpTool<WebFetchInput, WebFetchResult> {
	readonly name = 'web-fetch';
	readonly description =
		'Fetches content from a specified URL with support for different HTTP methods and response types.';
	readonly inputSchema = WebFetchInputSchema as any;

	async execute(input: WebFetchInput, context?: ToolExecutionContext): Promise<WebFetchResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('WebFetch tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		const startTime = Date.now();

		try {
			// Security checks
			const url = new URL(input.url);

			// Block local/private network access
			if (this.isLocalOrPrivateNetwork(url.hostname)) {
				throw new ToolExecutionError(
					`Access to local/private networks is blocked: ${url.hostname}`,
					{
						code: 'E_BLOCKED_NETWORK',
					},
				);
			}

			// Block non-HTTP(S) protocols
			if (!['http:', 'https:'].includes(url.protocol)) {
				throw new ToolExecutionError(`Protocol not allowed: ${url.protocol}`, {
					code: 'E_BLOCKED_PROTOCOL',
				});
			}

			// Prepare fetch options
			const fetchOptions: RequestInit = {
				method: input.method,
				headers: {
					'User-Agent': 'Cortex-OS MCP WebFetch Tool/1.0',
					...input.headers,
				},
				redirect: input.followRedirects ? 'follow' : 'manual',
				signal: AbortSignal.timeout(input.timeout),
			};

			// Add body for appropriate methods
			if (input.body && ['POST', 'PUT', 'PATCH'].includes(input.method)) {
				fetchOptions.body = input.body;
				if (!input.headers?.['Content-Type']) {
					fetchOptions.headers = {
						...fetchOptions.headers,
						'Content-Type': 'application/json',
					};
				}
			}

			// Handle context signal
			if (context?.signal) {
				const combinedSignal = AbortSignal.any([
					context.signal,
					AbortSignal.timeout(input.timeout),
				]);
				fetchOptions.signal = combinedSignal;
			}

			// Make the request
			const response = await fetch(input.url, fetchOptions);
			const responseTime = Date.now() - startTime;

			// Extract response headers
			const responseHeaders: Record<string, string> = {};
			response.headers.forEach((value, key) => {
				responseHeaders[key.toLowerCase()] = value;
			});

			const contentType = response.headers.get('content-type') || undefined;
			const contentLength = response.headers.get('content-length')
				? parseInt(response.headers.get('content-length')!, 10)
				: undefined;

			// Process response based on type
			let data: string | Record<string, unknown> | ArrayBuffer | undefined;

			try {
				switch (input.responseType) {
					case 'json':
						data = await response.json();
						break;
					case 'blob': {
						const blob = await response.blob();
						data = await blob.arrayBuffer();
						break;
					}
					case 'arraybuffer':
						data = await response.arrayBuffer();
						break;
					default:
						data = await response.text();
						break;
				}
			} catch (parseError) {
				// If parsing fails, still return the response with error info
				data = `Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
			}

			return {
				url: response.url, // Final URL after redirects
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders,
				data,
				contentType,
				contentLength,
				responseTime,
				redirected: response.redirected,
				redirectCount: response.redirected
					? this.estimateRedirectCount(input.url, response.url)
					: 0,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) {
				throw error;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('AbortError') || errorMessage.includes('TimeoutError')) {
				throw new ToolExecutionError(`Request timed out after ${input.timeout}ms`, {
					code: 'E_TIMEOUT',
					cause: error,
				});
			}

			if (errorMessage.includes('NetworkError') || errorMessage.includes('ENOTFOUND')) {
				throw new ToolExecutionError(`Network error: ${errorMessage}`, {
					code: 'E_NETWORK_ERROR',
					cause: error,
				});
			}

			if (errorMessage.includes('TypeError')) {
				throw new ToolExecutionError(`Invalid URL or request: ${errorMessage}`, {
					code: 'E_INVALID_REQUEST',
					cause: error,
				});
			}

			throw new ToolExecutionError(`Web fetch failed: ${errorMessage}`, {
				code: 'E_FETCH_FAILED',
				cause: error,
			});
		}
	}

	private isLocalOrPrivateNetwork(hostname: string): boolean {
		// Check for localhost
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
			return true;
		}

		// Check for private IP ranges
		const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		const ipv4Match = hostname.match(ipv4Regex);

		if (ipv4Match) {
			const [, a, b] = ipv4Match.map(Number);

			// Private IP ranges
			if (a === 10) return true; // 10.0.0.0/8
			if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
			if (a === 192 && b === 168) return true; // 192.168.0.0/16
			if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local)

			// Reserved IP ranges
			if (a === 127) return true; // 127.0.0.0/8 (loopback)
			if (a === 0) return true; // 0.0.0.0/8 (this network)
			if (a >= 224) return true; // 224.0.0.0/4 (multicast and reserved)
		}

		// Check for IPv6 private ranges
		if (hostname.includes(':')) {
			if (hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) return true; // fc00::/7 (unique local)
			if (hostname.startsWith('fe80:')) return true; // fe80::/10 (link-local)
			if (hostname.startsWith('::1')) return true; // ::1 (loopback)
		}

		return false;
	}

	private estimateRedirectCount(originalUrl: string, finalUrl: string): number {
		// This is a simple estimation - in practice, you'd track actual redirects
		if (originalUrl === finalUrl) return 0;

		// Simple heuristic: different domains suggest at least one redirect
		try {
			const originalDomain = new URL(originalUrl).hostname;
			const finalDomain = new URL(finalUrl).hostname;
			return originalDomain !== finalDomain ? 1 : 0;
		} catch {
			return 0;
		}
	}
}

export const webFetchTool = new WebFetchTool();
