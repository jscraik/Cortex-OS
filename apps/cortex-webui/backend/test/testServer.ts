import type { AddressInfo } from 'net';
import { createServer, type ServerComponents } from '../src/server';

export interface TestServer {
	url: string;
	port: number;
	components: ServerComponents;
	stop: () => Promise<void>;
}

/**
 * Creates a test server instance on an ephemeral port for testing.
 * Auto-starts the server and provides cleanup utilities.
 */
export async function createTestServer(): Promise<TestServer> {
	const components = createServer();
	const { server, stop } = components;

	// Start on ephemeral port (0 = auto-assign)
	await new Promise<void>((resolve, reject) => {
		server.listen(0, (err?: Error) => {
			if (err) reject(err);
			else resolve();
		});
	});

	const address = server.address() as AddressInfo;
	if (!address) {
		throw new Error('Failed to get server address');
	}

	const port = address.port;
	const url = `http://127.0.0.1:${port}`;

	return {
		url,
		port,
		components,
		stop,
	};
}

/**
 * WebSocket URL helper for test server.
 */
export function getWsUrl(testServer: TestServer): string {
	return `ws://127.0.0.1:${testServer.port}/ws`;
}
