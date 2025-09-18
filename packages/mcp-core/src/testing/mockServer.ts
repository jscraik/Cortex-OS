import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createEnhancedClient, type EnhancedClient } from '../client.js';
import type { ServerInfo } from '../contracts.js';

type Awaitable<T> = T | Promise<T>;

interface ToolPayload {
	name?: string;
	arguments?: unknown;
}

function isToolPayload(value: unknown): value is ToolPayload {
	return typeof value === 'object' && value !== null;
}

export interface MockServerOptions {
	readonly transport?: 'http';
	readonly port?: number;
}

export interface RecordedToolCall {
	readonly id: string;
	readonly tool: string;
	readonly args: unknown;
	readonly timestamp: number;
}

type ToolHandler = (args: unknown) => Awaitable<unknown>;

export class MockMCPServer {
	private readonly handlers = new Map<string, ToolHandler>();
	private readonly recordedCalls: RecordedToolCall[] = [];
	private httpServer?: ReturnType<typeof createServer>;
	private endpointValue?: string;
	private closed = false;
	private pingCountValue = 0;

	private constructor(private readonly options: MockServerOptions = {}) {}

	static async create(options?: MockServerOptions): Promise<MockMCPServer> {
		const server = new MockMCPServer(options);
		await server.start();
		return server;
	}

	async start(): Promise<void> {
		if (this.httpServer) return;

		const server = createServer((req, res) => {
			void this.handleRequest(req, res);
		});
		this.httpServer = server;

		await new Promise<void>((resolve) => {
			server.listen(this.options.port ?? 0, '127.0.0.1', resolve);
		});

		const address = this.httpServer.address();
		if (!address || typeof address === 'string') {
			throw new Error('Unable to determine mock MCP server address');
		}

		const { port } = address as AddressInfo;
		this.endpointValue = `http://127.0.0.1:${port}`;
		this.closed = false;
		this.pingCountValue = 0;
		this.recordedCalls.length = 0;
	}

	registerTool(name: string, handler: ToolHandler): void {
		if (!name) {
			throw new Error('Tool name is required');
		}
		this.handlers.set(name, handler);
	}

	get endpoint(): string {
		if (!this.endpointValue) {
			throw new Error('Mock MCP server has not been started');
		}
		return this.endpointValue;
	}

	get calls(): readonly RecordedToolCall[] {
		return [...this.recordedCalls];
	}

	get pingCount(): number {
		return this.pingCountValue;
	}

	clearCalls(): void {
		this.recordedCalls.length = 0;
	}

	async stop(): Promise<void> {
		const server = this.httpServer;
		if (!server) {
			this.closed = true;
			this.endpointValue = undefined;
			return;
		}

		await new Promise<void>((resolve, reject) => {
			server.close((err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});

		this.httpServer = undefined;
		this.endpointValue = undefined;
		this.closed = true;
	}

	private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		try {
			if (this.closed) {
				res.statusCode = 503;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ error: 'Mock MCP server closed' }));
				return;
			}

			if (req.method !== 'POST') {
				res.statusCode = 405;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ error: 'Only POST is supported' }));
				return;
			}

			const rawBody = await this.readBody(req);
			let payload: ToolPayload = {};
			try {
				const parsed = rawBody ? JSON.parse(rawBody) : {};
				payload = isToolPayload(parsed) ? parsed : {};
			} catch (_error) {
				res.statusCode = 400;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
				return;
			}

			const toolName = typeof payload.name === 'string' ? payload.name : undefined;
			const args = payload.arguments ?? {};

			if (toolName === 'ping') {
				this.pingCountValue += 1;
				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ ok: true }));
				return;
			}

			if (!toolName) {
				res.statusCode = 400;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ error: 'Tool name is required' }));
				return;
			}

			const handler = this.handlers.get(toolName);
			if (!handler) {
				res.statusCode = 404;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ error: `Tool ${toolName} is not registered` }));
				return;
			}

			const call: RecordedToolCall = {
				id: randomUUID(),
				tool: toolName,
				args,
				timestamp: Date.now(),
			};
			this.recordedCalls.push(call);

			const result = await handler(args);
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(result ?? {}));
		} catch (error) {
			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					error: error instanceof Error ? error.message : String(error),
				}),
			);
		}
	}

	private async readBody(req: IncomingMessage): Promise<string> {
		const chunks: Buffer[] = [];
		for await (const chunk of req) {
			chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
		}
		return Buffer.concat(chunks).toString('utf8');
	}
}

export async function createMockMCPServer(options?: MockServerOptions): Promise<MockMCPServer> {
	return await MockMCPServer.create(options);
}

export interface TestClientOptions {
	readonly requestTimeoutMs?: number;
	readonly headers?: Record<string, string>;
}

export class TestClient {
	constructor(private readonly client: EnhancedClient) {}

	async callTool(name: string, args?: unknown): Promise<unknown> {
		return await this.client.callTool({ name, arguments: args });
	}

	async ping(): Promise<void> {
		await this.client.ping();
	}

	async close(): Promise<void> {
		await this.client.close();
	}
}

export async function createTestClient(
	server: MockMCPServer,
	options?: TestClientOptions,
): Promise<TestClient> {
	const serverInfo: ServerInfo & { requestTimeoutMs?: number } = {
		name: 'mock-mcp-server',
		transport: 'http',
		endpoint: server.endpoint,
		requestTimeoutMs: options?.requestTimeoutMs,
		headers: options?.headers,
	};
	const client = await createEnhancedClient(serverInfo);
	return new TestClient(client);
}

export interface MockServerFixture {
	readonly server: MockMCPServer;
	readonly client: TestClient;
	teardown: () => Promise<void>;
}

export interface SetupMockServerOptions {
	readonly server?: MockServerOptions;
	readonly client?: TestClientOptions;
}

export async function setupMockServer(
	options?: SetupMockServerOptions,
): Promise<MockServerFixture> {
	const server = await createMockMCPServer(options?.server);
	const client = await createTestClient(server, options?.client);
	return {
		server,
		client,
		teardown: async () => {
			await client.close();
			await server.stop();
		},
	};
}

export function assertToolCall(
	server: MockMCPServer,
	toolName: string,
	expectedCount?: number,
): RecordedToolCall[] {
	const matching = server.calls.filter((call) => call.tool === toolName);
	assert.ok(
		matching.length > 0,
		`Expected tool ${toolName} to be called but no calls were recorded`,
	);

	if (expectedCount !== undefined) {
		assert.equal(
			matching.length,
			expectedCount,
			`Expected tool ${toolName} to be called ${expectedCount} time(s) but received ${matching.length}`,
		);
	}

	return matching;
}

export function assertTextContent(result: unknown, expectedSubstring: string): void {
	const maybeContent = (result as { content?: unknown }).content;
	const blocks = Array.isArray(maybeContent) ? maybeContent : [];
	const text = blocks
		.map((block) => {
			if (typeof block !== 'object' || block === null) {
				return '';
			}
			const { type, text: blockText } = block as {
				type?: unknown;
				text?: unknown;
			};
			return type === 'text' && typeof blockText === 'string' ? blockText : '';
		})
		.filter((segment) => segment.length > 0)
		.join(' ')
		.trim();

	assert.ok(
		text.includes(expectedSubstring),
		`Expected response text to include "${expectedSubstring}" but received "${text}"`,
	);
}
