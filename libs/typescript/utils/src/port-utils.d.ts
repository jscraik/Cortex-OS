/**
 * @file_path libs/typescript/utils/src/port-utils.ts
 * @description Port allocation utilities for preventing conflicts in tests and services
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-28
 * @version 1.0.0
 * @status active
 */
/**
 * Check if a port is available for use
 */
export declare function isPortAvailable(
	port: number,
	host?: string,
): Promise<boolean>;
/**
 * Find an available port starting from a base port
 */
export declare function findAvailablePort(
	startPort?: number,
	maxAttempts?: number,
	host?: string,
): Promise<number>;
/**
 * Get an available port or use default if available
 */
export declare function getPort(
	preferredPort?: number,
	host?: string,
): Promise<number>;
/**
 * Port ranges for different service types to avoid conflicts
 */
export declare const PORT_RANGES: {
	readonly TEST_SERVERS: {
		readonly start: 24000;
		readonly end: 24999;
	};
	readonly WEB_SERVERS: {
		readonly start: 3000;
		readonly end: 3999;
	};
	readonly API_SERVERS: {
		readonly start: 8000;
		readonly end: 8999;
	};
	readonly WEBSOCKET_SERVERS: {
		readonly start: 9000;
		readonly end: 9999;
	};
	readonly MCP_SERVERS: {
		readonly start: 10000;
		readonly end: 10999;
	};
};
/**
 * Get an available port within a specific range
 */
export declare function getPortInRange(
	range: {
		start: number;
		end: number;
	},
	host?: string,
): Promise<number>;
/**
 * Port allocation for tests to prevent conflicts
 */
export declare const PortAllocator: {
	allocatedPorts: Set<number>;
	allocate(_preferredPort?: number): Promise<number>;
	release(port: number): void;
	clearAll(): void;
};
//# sourceMappingURL=port-utils.d.ts.map
