/**
 * @file_path libs/typescript/utils/src/port-utils.ts
 * @description Port allocation utilities for preventing conflicts in tests and services
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-28
 * @version 1.0.0
 * @status active
 */
import * as net from 'node:net';
/**
 * Check if a port is available for use
 */
export async function isPortAvailable(port, host = 'localhost') {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.listen(port, host, () => {
			server.close(() => {
				resolve(true);
			});
		});
		server.on('error', () => {
			resolve(false);
		});
	});
}
/**
 * Find an available port starting from a base port
 */
export async function findAvailablePort(
	startPort = 3000,
	maxAttempts = 100,
	host = 'localhost',
) {
	for (let port = startPort; port < startPort + maxAttempts; port++) {
		if (await isPortAvailable(port, host)) {
			return port;
		}
	}
	throw new Error(
		`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`,
	);
}
/**
 * Get an available port or use default if available
 */
export async function getPort(preferredPort, host = 'localhost') {
	if (preferredPort && (await isPortAvailable(preferredPort, host))) {
		return preferredPort;
	}
	return findAvailablePort(preferredPort || 3000, 100, host);
}
/**
 * Port ranges for different service types to avoid conflicts
 */
export const PORT_RANGES = {
	TEST_SERVERS: { start: 24000, end: 24999 },
	WEB_SERVERS: { start: 3000, end: 3999 },
	API_SERVERS: { start: 8000, end: 8999 },
	WEBSOCKET_SERVERS: { start: 9000, end: 9999 },
	MCP_SERVERS: { start: 10000, end: 10999 },
};
/**
 * Get an available port within a specific range
 */
export async function getPortInRange(range, host = 'localhost') {
	return findAvailablePort(range.start, range.end - range.start + 1, host);
}
/**
 * Port allocation for tests to prevent conflicts
 */
export class TestPortAllocator {
	static allocatedPorts = new Set();
	/**
	 * Allocate a port for testing, ensuring no conflicts
	 */
	static async allocate(_preferredPort) {
		const port = await getPortInRange(PORT_RANGES.TEST_SERVERS);
		if (TestPortAllocator.allocatedPorts.has(port)) {
			// If already allocated, find another one
			return TestPortAllocator.allocate();
		}
		TestPortAllocator.allocatedPorts.add(port);
		return port;
	}
	/**
	 * Release a port when test is done
	 */
	static release(port) {
		TestPortAllocator.allocatedPorts.delete(port);
	}
	/**
	 * Clear all allocated ports (for cleanup)
	 */
	static clearAll() {
		TestPortAllocator.allocatedPorts.clear();
	}
}
// Export commonly used functions
export { TestPortAllocator as PortAllocator };
//# sourceMappingURL=port-utils.js.map
