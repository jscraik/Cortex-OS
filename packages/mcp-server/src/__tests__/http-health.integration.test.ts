import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createServer as createNetServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { FastMCP, type ContentResult } from 'fastmcp';
import { z } from 'zod';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const SERVER_START_TIMEOUT_MS = 20_000;
const HEALTH_POLL_INTERVAL_MS = 250;
const SERVER_VERSION = '3.0.0' as const;

let port: number;
let healthUrl: string;
let server: FastMCP;

async function getAvailablePort(): Promise<number> {
	return await new Promise((resolve, reject) => {
		const netServer = createNetServer();
		netServer.listen(0, () => {
			const address = netServer.address() as AddressInfo;
			netServer.close((closeErr) => {
				if (closeErr) {
					reject(closeErr);
					return;
				}
				resolve(address.port);
			});
		});
		netServer.on('error', reject);
	});
}

async function waitForHealthReady(url: string, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url, { cache: 'no-store' });
			if (response.ok) {
				return;
			}
		} catch {
			// Ignore transient connection failures while the server starts
		}
		await delay(HEALTH_POLL_INTERVAL_MS);
	}

	throw new Error(`Health endpoint at ${url} did not become ready within ${timeoutMs}ms`);
}

async function waitFor(predicate: () => boolean, label: string, timeoutMs = 5_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (predicate()) {
			return;
		}
		await delay(HEALTH_POLL_INTERVAL_MS);
	}

	throw new Error(`${label} not received within ${timeoutMs}ms`);
}

describe('brAInwav MCP HTTP transport', () => {
	beforeAll(async () => {
		port = await getAvailablePort();
		healthUrl = `http://127.0.0.1:${port}/health`;

		server = new FastMCP({
			name: 'brainwav-cortex-memory',
			version: SERVER_VERSION,
			instructions: 'brAInwav integration test harness for FastMCP HTTP transport.',
			authenticate: async () => ({
				user: 'integration-test',
				timestamp: new Date().toISOString(),
				branding: 'brAInwav',
			}),
			ping: {
				enabled: true,
				intervalMs: 20_000,
				logLevel: 'debug',
			},
			health: {
				enabled: true,
				message: 'brAInwav Cortex Memory Server - Operational',
				path: '/health',
				status: 200,
			},
		});

		server.addTool({
			name: 'brAInwav.test_tool',
			description: 'Test tool to verify HTTP transport registration',
			parameters: z
				.object({
					message: z.string().optional(),
				})
				.describe('Optional message to echo'),
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				title: 'brAInwav Test Tool',
			},
			async execute(args): Promise<ContentResult> {
				const text = args.message ?? 'brAInwav tool executed';
				return {
					content: [
						{
							type: 'text',
							text,
						},
					],
				};
			},
		});

		await server.start({
			transportType: 'httpStream',
			httpStream: {
				port,
				host: '127.0.0.1',
				endpoint: '/mcp',
				enableJsonResponse: true,
				stateless: true,
			},
		});

		await waitForHealthReady(healthUrl, SERVER_START_TIMEOUT_MS);
	}, SERVER_START_TIMEOUT_MS + 5_000);

	afterAll(async () => {
		await server.stop();
	});

	it('exposes a branded health endpoint', async () => {
		const response = await fetch(healthUrl, { cache: 'no-store' });
		expect(response.status).toBe(200);
		const body = await response.text();
		expect(body).toContain('brAInwav Cortex Memory Server - Operational');
	});

	it('supports MCP HTTP streaming clients', async () => {
	const mcpUrl = `http://127.0.0.1:${port}/mcp`;
	const initializePayload = {
		jsonrpc: '2.0',
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: LATEST_PROTOCOL_VERSION,
			capabilities: {
				tools: { listChanged: false },
				resources: { subscribe: false, listChanged: false },
				prompts: { listChanged: false },
				roots: { listChanged: false },
			},
			clientInfo: {
				name: 'integration-test-client',
				title: 'Integration Test Client',
				version: '1.0.0',
			},
		},
	};

	const listPayload = {
		jsonrpc: '2.0',
		id: '2',
		method: 'tools/list',
	};

	const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
	await transport.start();
	const responses: Array<Record<string, unknown>> = [];
	transport.onmessage = (message) => {
		responses.push(message as Record<string, unknown>);
	};

	await transport.send(initializePayload);
	await waitFor(() => responses.length > 0, 'initialize response');

	const initMessage = responses.find((msg) => String(msg.id) === '1');
	expect(initMessage).toBeDefined();
	responses.length = 0;

	await transport.send(listPayload);
	await waitFor(() => responses.length > 0, 'tools/list response');
	const listMessage = responses.find((msg) => String(msg.id) === '2');
	expect(listMessage).toBeDefined();
	const tools = (listMessage?.result as { tools?: Array<{ name: string }> })?.tools ?? [];

	expect(Array.isArray(tools)).toBe(true);
	expect(tools.length).toBeGreaterThan(0);
	expect(tools.map((tool) => tool.name)).toContain('brAInwav.test_tool');

	await transport.close();
	});
});
