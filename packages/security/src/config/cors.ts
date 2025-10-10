/**
 * [brAInwav] CORS Security Configuration
 * Fixes CodeQL alerts #213, #212 - CORS misconfiguration
 *
 * Implements strict origin validation with whitelist approach
 * to prevent CORS reflection attacks when credentials are enabled.
 */

/**
 * Allowed origins for CORS requests
 * Default to localhost ports used by brAInwav services
 */
export const ALLOWED_ORIGINS = [
	'http://localhost:3024', // MCP Gateway
	'http://localhost:3026', // Runtime Server
	'http://localhost:3028', // Local Memory API
	'http://localhost:39300', // Additional service
	process.env.ALLOWED_ORIGIN, // Environment-configured origin
].filter(Boolean) as string[];

/**
 * Validates origin against whitelist
 * CodeQL Fix: Replaces origin reflection with explicit whitelist validation
 *
 * @param origin - The origin header from the request
 * @param callback - Callback with (error, allowed)
 */
export function validateOrigin(
	origin: string | undefined,
	callback: (err: Error | null, allow?: boolean) => void,
): void {
	// Allow same-origin requests (no origin header)
	if (!origin) {
		callback(null, true);
		return;
	}

	// Check if origin is in whitelist
	if (ALLOWED_ORIGINS.includes(origin)) {
		callback(null, true);
		return;
	}

	// Reject all other origins
	callback(new Error(`[brAInwav] CORS: Origin ${origin} not allowed`), undefined);
}

/**
 * CORS options for Express/HTTP servers
 *
 * Security features:
 * - Explicit origin validation (no reflection)
 * - Credentials enabled for authenticated requests
 * - No wildcard when credentials are enabled
 */
export const corsOptions = {
	origin: validateOrigin,
	credentials: true,
};
