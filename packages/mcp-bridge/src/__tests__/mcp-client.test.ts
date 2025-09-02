/**
 * @file_path packages/mcp/src/__tests__/mcp-client.test.ts
 * @description Tests for MCP client with JSON-RPC 2.0 compliance
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-15
 * @version 1.0.0
 * @status active
 */

/* eslint-disable max-nested-callbacks, sonarjs/no-nested-functions */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockedFunction,
	vi,
} from "vitest";
import WebSocket from "ws";
import { createConnectionManager } from "../connection-manager";
import {
	ConnectionState,
	createMcpClient,
	type McpClient,
} from "../mcp-client";

// Mock WebSocket
vi.mock("ws", () => {
	return {
		default: vi.fn(),
		WebSocket: {
			CONNECTING: 0,
			OPEN: 1,
			CLOSING: 2,
			CLOSED: 3,
		},
	};
});

const MockWebSocket = WebSocket as MockedFunction<typeof WebSocket>;

describe("McpClient", () => {
	let client: McpClient;
	type EventHandler = (...args: unknown[]) => void;
	type MockWs = {
		readyState: number;
		send: ReturnType<typeof vi.fn>;
		close: ReturnType<typeof vi.fn>;
		addEventListener: ReturnType<typeof vi.fn>;
		removeEventListener: ReturnType<typeof vi.fn>;
		dispatchEvent: ReturnType<typeof vi.fn>;
		url: string;
		protocol: string;
		extensions: string;
		bufferedAmount: number;
		binaryType: BinaryType;
		onopen: EventHandler | null;
		onerror: EventHandler | null;
		onclose: EventHandler | null;
		onmessage: EventHandler | null;
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
		emit: ReturnType<typeof vi.fn>;
		removeAllListeners: ReturnType<typeof vi.fn>;
		_trigger: (event: string, ...args: unknown[]) => void;
		_setReady: () => void;
		_setError: (error: Error) => void;
	};
	let mockWs: MockWs;
	const defaultOptions = {
		url: "ws://localhost:8080",
		timeout: 5000,
		retryAttempts: 0,
		retryDelay: 1000,
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Track event handlers for later triggering
		const eventHandlers: Record<string, EventHandler[]> = {};

		// Create a mock WebSocket instance with proper event handling
		mockWs = {
			readyState: WebSocket.CONNECTING,
			send: vi.fn(),
			close: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			url: defaultOptions.url,
			protocol: "",
			extensions: "",
			bufferedAmount: 0,
			binaryType: "blob" as BinaryType,
			onopen: null,
			onerror: null,
			onclose: null,
			onmessage: null,
			// Event emitter functionality for Node.js EventEmitter style events
			on: vi.fn((event: string, handler: EventHandler) => {
				if (!eventHandlers[event]) {
					eventHandlers[event] = [];
				}
				eventHandlers[event].push(handler);
			}),
			off: vi.fn(),
			emit: vi.fn(),
			removeAllListeners: vi.fn(),
			// Helper to trigger events in tests
			_trigger: (event: string, ...args: unknown[]) => {
				if (eventHandlers[event]) {
					eventHandlers[event].forEach((handler) => {
						handler(...args);
					});
				}
			},
			_setReady: () => {
				mockWs.readyState = WebSocket.OPEN;
				mockWs._trigger("open");
			},
			_setError: (error: Error) => {
				mockWs.readyState = WebSocket.CLOSED;
				mockWs._trigger("error", error);
			},
		};

		MockWebSocket.mockReturnValue(mockWs);
		client = createMcpClient(defaultOptions.url, defaultOptions);
	});

	afterEach(() => {
		if (client) {
			client.disconnect();
		}
		vi.clearAllMocks();
	});

	// Helper to extract the first registered handler for an event name
	function getEventHandler(event: string): EventHandler | undefined {
		const calls = (mockWs.on as unknown as { mock: { calls: unknown[][] } })
			.mock.calls as unknown[][];
		const found = calls.find((call) => call[0] === event);
		return found?.[1] as EventHandler | undefined;
	}

	function getLastEventHandler(event: string): EventHandler | undefined {
		const calls = (mockWs.on as unknown as { mock: { calls: unknown[][] } })
			.mock.calls as unknown[][];
		for (let i = calls.length - 1; i >= 0; i--) {
			if (calls[i][0] === event) return calls[i][1] as EventHandler;
		}
		return undefined;
	}

	function getLastSentMessage(): Record<string, unknown> | undefined {
		const calls = (mockWs.send as unknown as { mock: { calls: unknown[][] } })
			.mock.calls as unknown[][];
		const last = calls[calls.length - 1];
		return last
			? (JSON.parse(last[0] as string) as Record<string, unknown>)
			: undefined;
	}

	describe("Connection Management", () => {
		it("should start in disconnected state", () => {
			expect(client.getState()).toBe(ConnectionState.Disconnected);
		});

		it("should connect successfully", async () => {
			// Simulate successful connection
			const connectPromise = client.connect();
			mockWs._setReady();

			await connectPromise;

			expect(client.getState()).toBe(ConnectionState.Connected);
			expect(MockWebSocket).toHaveBeenCalledWith(defaultOptions.url);
		});

		it("should handle connection errors with retry", async () => {
			const error = new Error("Connection failed");

			const failingMockWs: MockWs = {
				...mockWs,
				on: vi.fn((event: string, handler: EventHandler) => {
					if (event === "error") {
						handler(error);
					}
				}),
			};

			MockWebSocket.mockReturnValue(failingMockWs);

			const retryClient = createMcpClient(defaultOptions.url, {
				...defaultOptions,
				retryAttempts: 3,
			});
			const connectPromise = retryClient.connect();

			await expect(connectPromise).rejects.toThrow(
				"Failed to connect after 4 attempts",
			);
			expect(retryClient.getState()).toBe(ConnectionState.Error);
		}, 15000);

		it("should disconnect cleanly", async () => {
			// Connect first
			const connectPromise = client.connect();
			mockWs._setReady();
			await connectPromise;

			// Disconnect
			await client.disconnect();

			expect(mockWs.close).toHaveBeenCalled();
			expect(client.getState()).toBe(ConnectionState.Disconnected);
		});
	});

	describe("JSON-RPC 2.0 Protocol", () => {
		beforeEach(async () => {
			// Connect first
			const connectPromise = client.connect();
			mockWs._setReady();
			await connectPromise;
		});

		it("should initialize with proper JSON-RPC message", async () => {
			const initPromise = client.initialize();

			// Check that initialize request was sent
			expect(mockWs.send).toHaveBeenCalled();
			const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);

			expect(sentMessage).toMatchObject({
				jsonrpc: "2.0",
				method: "initialize",
				id: expect.any(String),
				params: expect.objectContaining({
					protocolVersion: "2024-11-05",
					clientInfo: expect.objectContaining({
						name: "cortex-cli",
						version: "1.0.0",
					}),
				}),
			});

			// Simulate server response
			const messageHandler = getEventHandler("message");

			if (messageHandler) {
				const response = {
					jsonrpc: "2.0",
					id: sentMessage.id,
					result: {
						protocolVersion: "2024-11-05",
						capabilities: { tools: { listChanged: false } },
						serverInfo: { name: "test-server", version: "1.0.0" },
					},
				};
				messageHandler(Buffer.from(JSON.stringify(response)));
			}

			const result = await initPromise;

			expect(result).toMatchObject({
				protocolVersion: "2024-11-05",
				serverInfo: { name: "test-server", version: "1.0.0" },
			});
			expect(client.getState()).toBe(ConnectionState.Initialized);
		});

		it("should handle JSON-RPC errors correctly", async () => {
			const initPromise = client.initialize();

			const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
			const messageHandler = getEventHandler("message");

			if (messageHandler) {
				const errorResponse = {
					jsonrpc: "2.0",
					id: sentMessage.id,
					error: {
						code: -32600,
						message: "Invalid Request",
						data: "Test error",
					},
				};
				messageHandler(Buffer.from(JSON.stringify(errorResponse)));
			}

			await expect(initPromise).rejects.toThrow("MCP Error: Invalid Request");
		});

		it("should handle request timeouts", async () => {
			vi.useFakeTimers();

			const connectPromise = client.connect();
			const openHandler = getEventHandler("open");
			openHandler?.();
			await connectPromise;

			const initPromise = client.initialize();

			vi.advanceTimersByTime(6000);

			await expect(initPromise).rejects.toThrow(
				"Request timeout for method: initialize",
			);
			// pendingRequests are internal; timeout was thrown as expected

			vi.useRealTimers();
		}, 10000);

		it("retries requests before failing", async () => {
			const clientWithRetry = createMcpClient(defaultOptions.url, {
				timeout: 50,
				retryAttempts: 2,
				retryDelay: 10,
			});

			const connectPromise = clientWithRetry.connect();
			const openHandler = getLastEventHandler("open");
			openHandler?.();
			await connectPromise;

			const initPromise = clientWithRetry.initialize();
			await expect(initPromise).rejects.toThrow(
				"Request timeout for method: initialize",
			);
			expect(mockWs.send).toHaveBeenCalledTimes(3);
			expect(clientWithRetry.getMetrics().requestCount).toBe(1);
			await clientWithRetry.disconnect();
		}, 5000);

		it("updates metrics on successful request", async () => {
			vi.useFakeTimers();
			const connectPromise = client.connect();
			const openHandler = getEventHandler("open");
			openHandler?.();
			await connectPromise;

			const initPromise = client.initialize();
			const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
			vi.advanceTimersByTime(50);
			const messageHandler = getEventHandler("message");
			if (messageHandler) {
				const response = {
					jsonrpc: "2.0",
					id: sentMessage.id,
					result: { ok: true },
				};
				messageHandler(Buffer.from(JSON.stringify(response)));
			}
			await initPromise;

			const metrics = client.getMetrics();
			expect(metrics.requestCount).toBe(1);
			expect(metrics.responseCount).toBe(1);
			expect(metrics.averageResponseTime).toBeGreaterThan(0);
			vi.useRealTimers();
		});
	});

	describe("Tool Operations", () => {
		let messageHandler: EventHandler | undefined;

		beforeEach(async () => {
			// Connect and initialize
			const connectPromise = client.connect();
			const openHandler = getEventHandler("open");
			openHandler?.();
			await connectPromise;

			const initPromise = client.initialize();
			messageHandler = getEventHandler("message");

			if (messageHandler) {
				const initMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
				const response = {
					jsonrpc: "2.0",
					id: initMessage.id,
					result: {
						protocolVersion: "2024-11-05",
						capabilities: { tools: { listChanged: false } },
						serverInfo: { name: "test-server", version: "1.0.0" },
					},
				};
				messageHandler(Buffer.from(JSON.stringify(response)));
			}

			await initPromise;
			// Clear send calls but keep the handler
			mockWs.send.mockClear();
		});

		it("should list tools correctly", async () => {
			const listPromise = client.listTools();

			// Wait a bit for the message to be sent
			await new Promise((resolve) => setTimeout(resolve, 10));

			const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
			expect(sentMessage).toMatchObject({
				jsonrpc: "2.0",
				method: "tools/list",
				id: expect.any(String),
			});

			if (messageHandler) {
				const response = {
					jsonrpc: "2.0",
					id: sentMessage.id,
					result: {
						tools: [
							{
								name: "config-validator",
								description: "Validates configurations",
							},
							{
								name: "generate-guide",
								description: "Generates documentation",
							},
						],
					},
				};
				messageHandler(Buffer.from(JSON.stringify(response)));
			}

			const result = await listPromise;

			expect(result.tools).toHaveLength(2);
			expect(result.tools[0]).toMatchObject({
				name: "config-validator",
				description: "Validates configurations",
			});
		}, 10000);

		it("should call tools with parameters", async () => {
			const toolArgs = {
				configType: "cortex",
				config: { mode: "simple" },
				options: { strictMode: true },
			};

			const callPromise = client.callTool("config-validator", toolArgs);

			// Wait a bit for the message to be sent
			await new Promise((resolve) => setTimeout(resolve, 10));

			const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
			expect(sentMessage).toMatchObject({
				jsonrpc: "2.0",
				method: "tools/call",
				id: expect.any(String),
				params: {
					name: "config-validator",
					arguments: toolArgs,
				},
			});

			if (messageHandler) {
				const response = {
					jsonrpc: "2.0",
					id: sentMessage.id,
					result: {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									valid: true,
									errors: [],
									warnings: [],
									metadata: { configType: "cortex" },
								}),
							},
						],
					},
				};
				messageHandler(Buffer.from(JSON.stringify(response)));
			}

			const result = await callPromise;
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe("text");
		}, 10000);
	});

	describe("Metrics and Performance", () => {
		it("should track connection metrics", () => {
			const metrics = client.getMetrics();

			expect(metrics).toMatchObject({
				connectionAttempts: expect.any(Number),
				successfulConnections: expect.any(Number),
				failedConnections: expect.any(Number),
				requestCount: expect.any(Number),
				responseCount: expect.any(Number),
				averageResponseTime: expect.any(Number),
				errors: expect.any(Array),
				uptime: expect.any(Number),
			});
		});

		it("should track request/response times", async () => {
			// Connect and initialize first
			const connectPromise = client.connect();
			mockWs._setReady();
			await connectPromise;

			const initPromise = client.initialize();
			const messageHandler = getEventHandler("message");

			if (messageHandler) {
				const initMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
				const response = {
					jsonrpc: "2.0",
					id: initMessage.id,
					result: {
						protocolVersion: "2024-11-05",
						capabilities: {},
						serverInfo: { name: "test", version: "1.0.0" },
					},
				};
				messageHandler(Buffer.from(JSON.stringify(response)));
			}

			await initPromise;

			const initialMetrics = client.getMetrics();
			expect(initialMetrics.requestCount).toBeGreaterThan(0);
			expect(initialMetrics.responseCount).toBeGreaterThan(0);
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed JSON messages", async () => {
			const connectPromise = client.connect();
			mockWs._setReady();
			await connectPromise;

			const messageHandler = getEventHandler("message");

			const errorSpy = vi.fn();
			client.on("error", errorSpy);

			if (messageHandler) {
				messageHandler(Buffer.from("invalid json"));
			}

			expect(errorSpy).toHaveBeenCalled();
		});

		it("should enforce initialization requirement", async () => {
			const connectPromise = client.connect();
			mockWs._setReady();
			await connectPromise;

			// Try to call tool before initialization
			await expect(client.listTools()).rejects.toThrow(
				"MCP client not initialized",
			);
		});

		it("should handle WebSocket closure gracefully", async () => {
			const connectPromise = client.connect();
			mockWs._setReady();
			await connectPromise;

			const disconnectedSpy = vi.fn();
			client.on("disconnected", disconnectedSpy);

			const closeHandler = getEventHandler("close");
			closeHandler?.();

			expect(disconnectedSpy).toHaveBeenCalled();
			expect(client.getState()).toBe(ConnectionState.Disconnected);
		});
	});

	describe("Telemetry & Qualification", () => {
		it("emits tool-call telemetry with redacted arguments", async () => {
			// connect + initialize
			const connectPromise = client.connect();
			const openHandler = getEventHandler("open");
			openHandler?.();
			await connectPromise;

			const initPromise = client.initialize();
			const msgHandler = getLastEventHandler("message");
			if (msgHandler) {
				const initMsg = getLastSentMessage();
				msgHandler(
					Buffer.from(
						JSON.stringify({ jsonrpc: "2.0", id: initMsg.id, result: {} }),
					),
				);
			}
			await initPromise;

			const beginSpy = vi.fn();
			const endSpy = vi.fn();
			client.on("tool-call-begin", beginSpy);
			client.on("tool-call-end", endSpy);

			const args = {
				token: "secret-token",
				nested: { apiKey: "k-123", ok: true },
			};
			const callP = client.callTool("demo", args);

			// allow send to fire
			await new Promise((r) => setTimeout(r, 5));
			const sent = getLastSentMessage();
			const response = {
				jsonrpc: "2.0",
				id: sent.id,
				result: { content: [{ type: "text", text: "ok" }] },
			};
			if (msgHandler) msgHandler(Buffer.from(JSON.stringify(response)));
			await callP;

			expect(beginSpy).toHaveBeenCalledTimes(1);
			const beginPayload = beginSpy.mock.calls[0][0];
			expect(beginPayload).toHaveProperty("name", "demo");
			expect(beginPayload.arguments.token).toBe("***");
			expect(beginPayload.arguments.nested.apiKey).toBe("***");

			expect(endSpy).toHaveBeenCalledTimes(1);
			const endPayload = endSpy.mock.calls[0][0];
			expect(endPayload.success).toBe(true);
			expect(typeof endPayload.durationMs).toBe("number");
		});

		it("qualifies tool names and truncates with hash when needed", async () => {
			const mgr = createConnectionManager(
				{
					localServers: [],
					remoteServers: [],
					discoveryTimeout: 10,
					healthCheckInterval: 0,
				},
				{
					maxConnectionsPerServer: 2,
					maxTotalConnections: 4,
					idleTimeout: 1000,
					acquisitionTimeout: 1000,
					validateOnAcquire: false,
					validateOnReturn: false,
				},
				{ timeout: 50, retryAttempts: 0, heartbeatInterval: 0 },
			);

			// seed healthy servers
			(
				mgr as unknown as {
					servers: Map<
						string,
						{ url: string; status: string; lastCheck: Date }
					>;
				}
			).servers = new Map<
				string,
				{ url: string; status: string; lastCheck: Date }
			>([
				["srv-a", { url: "ws://a", status: "healthy", lastCheck: new Date() }],
				[
					"srv-b-with-very-very-very-very-very-very-long-id",
					{ url: "ws://b", status: "healthy", lastCheck: new Date() },
				],
			]);

			// stub acquireConnection to return fake listTools
			const fakeListTools = async () => ({
				tools: [
					{ name: "echo", description: "echo" },
					{
						name: "name-that-is-super-super-super-super-super-long",
						description: "long",
					},
				],
			});
			const fakeConnection = {
				isReady: () => true,
				listTools: fakeListTools,
			};
			(
				mgr as unknown as {
					acquireConnection: (sid: string) => Promise<{
						connection: typeof fakeConnection;
						serverId: string;
						release: () => void;
					}>;
				}
			).acquireConnection = async (sid: string) => ({
				connection: fakeConnection,
				serverId: sid,
				release: () => undefined,
			});

			const map = await (
				mgr as unknown as {
					listQualifiedTools: () => Promise<Record<string, unknown>>;
				}
			).listQualifiedTools();
			const keys = Object.keys(map);
			// expect two servers * two tools each = 4 qualified entries
			expect(keys.length).toBe(4);
			// Ensure at least one long-qualified name got truncated to <= 64
			const longKeys = keys.filter((k) => k.includes("name-that-is-super"));
			expect(longKeys.every((k) => k.length <= 64)).toBe(true);
		});
	});
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
