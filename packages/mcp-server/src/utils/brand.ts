/**
 * BrAInwav Brand Constants
 *
 * Centralized brand configuration for consistent
 * naming, logging, and health responses.
 */

export const BRAND = {
	prefix: 'brAInwav',
	serverName: 'brAInwav Cortex Memory Server',
	healthMessage: 'brAInwav Cortex Memory Server - Operational',
	connectLog: 'brAInwav MCP client connected',
	disconnectLog: 'brAInwav MCP client disconnected',
} as const;

/**
 * Brand-aware logger helper
 */
export function createBrandedLog(event: string, details?: Record<string, any>) {
	return {
		branding: BRAND.prefix,
		event,
		...details,
	};
}

/**
 * Standard health response with branding
 */
export function createHealthResponse(
	status: 'healthy' | 'unhealthy' = 'healthy',
	details?: Record<string, any>,
) {
	return {
		status,
		brand: BRAND.prefix,
		message: BRAND.healthMessage,
		timestamp: new Date().toISOString(),
		...details,
	};
}
