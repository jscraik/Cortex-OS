/**
 * @file_path packages/mcp/src/mcp-client.ts
 * @description JSON-RPC 2.0 compliant MCP client for CLI configuration validation
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-15
 * @version 1.0.0
 * @status active
 */

import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import {
	McpEventTypes,
	type McpToolCallBegin,
	type McpToolCallEnd,
} from "@cortex-os/contracts";
import WebSocket from "ws";
import { z } from "zod";
import { PendingRequests } from "./pendingRequests";
import { trackRequest } from "./trackRequest";

/**
 * JSON-RPC 2.0 message schemas
 */
export const JsonRpcRequestSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: z.union([z.string(), z.number(), z.null()]).optional(),
	method: z.string(),
	params: z.unknown().optional(),
});

export const JsonRpcResponseSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: z.union([z.string(), z.number(), z.null()]),
	result: z.unknown().optional(),
	error: z
		.object({
			code: z.number(),
			message: z.string(),
			data: z.unknown().optional(),
		})
		.optional(),
});

export const JsonRpcNotificationSchema = z.object({
	jsonrpc: z.literal("2.0"),
	method: z.string(),
	params: z.unknown().optional(),
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;
export type JsonRpcNotification = z.infer<typeof JsonRpcNotificationSchema>;

export type JsonRpcMessage =
	| JsonRpcRequest
	| JsonRpcResponse
	| JsonRpcNotification;

/**
 * Enhanced error type for MCP errors with additional properties
 */
export interface McpError extends Error {
	code?: number;
	data?: unknown;
}

/**
 * MCP-specific message types
 */
export interface McpInitializeParams {
	protocolVersion: string;
	capabilities: {
		tools?: { listChanged?: boolean };
		logging?: Record<string, unknown>;
		experimental?: Record<string, unknown>;
	};
	clientInfo: {
		name: string;
		version: string;
	};
}

export interface McpInitializeResult {
	protocolVersion: string;
	capabilities: {
		tools?: { listChanged?: boolean };
		logging?: Record<string, unknown>;
		experimental?: Record<string, unknown>;
	};
	serverInfo: {
		name: string;
		version: string;
	};
}

export interface McpToolListResult {
	tools: Array<{
		name: string;
		description: string;
		inputSchema?: Record<string, unknown>;
	}>;
}

export interface McpToolCallParams {
	name: string;
	arguments?: Record<string, unknown>;
}

export interface McpToolCallResult {
	content: Array<{
		type: "text" | "image";
		text?: string;
		data?: string;
		mimeType?: string;
	}>;
	isError?: boolean;
}

/**
 * Connection state and configuration
 */
export enum ConnectionState {
	Disconnected = "disconnected",
	Connecting = "connecting",
	Connected = "connected",
	Initialized = "initialized",
	Error = "error",
}

export interface McpConnectionConfig {
	url: string;
	timeout?: number;
	retryAttempts?: number;
	retryDelay?: number;
	heartbeatInterval?: number;
	clientInfo?: {
		name: string;
		version: string;
	};
}

export interface McpClientOptions {
	timeout: number;
	retryAttempts: number;
	retryDelay: number;
	heartbeatInterval: number;
	enableMetrics: boolean;
	// When provided, tool call telemetry will be published via this hook as A2A-friendly events
	publishEvent?: (evt: { type: string; payload: unknown }) => void;
}

/**
 * Performance and telemetry interfaces
 */
export interface McpMetrics {
	connectionAttempts: number;
	successfulConnections: number;
	failedConnections: number;
	requestCount: number;
	responseCount: number;
	averageResponseTime: number;
	errors: Array<{
		timestamp: Date;
		error: string;
		method?: string;
	}>;
	uptime: number;
}

/**
 * JSON-RPC 2.0 compliant MCP client
 */
export class McpClient extends EventEmitter {
	private ws: WebSocket | null = null;
	private connectionState: ConnectionState = ConnectionState.Disconnected;
	private readonly pendingRequests = new PendingRequests();
	private heartbeatTimer: NodeJS.Timeout | null = null;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private readonly metrics: McpMetrics = {
		connectionAttempts: 0,
		successfulConnections: 0,
		failedConnections: 0,
		requestCount: 0,
		responseCount: 0,
		averageResponseTime: 0,
		errors: [],
		uptime: 0,
	};
	private connectTime: number = 0;
	private readonly responseTimes: number[] = [];

	constructor(
		private readonly config: McpConnectionConfig,
		private readonly options: McpClientOptions = {
			timeout: 30000,
			retryAttempts: 3,
			retryDelay: 1000,
			heartbeatInterval: 30000,
			enableMetrics: true,
		},
	) {
		super();
		this.setupErrorHandling();
	}

	/**
	 * Connect to MCP server with retry logic
	 */
	async connect(): Promise<void> {
		if (
			this.connectionState === ConnectionState.Connected ||
			this.connectionState === ConnectionState.Initialized
		) {
			return;
		}

		this.connectionState = ConnectionState.Connecting;
		this.metrics.connectionAttempts++;

		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
			try {
				await this.attemptConnection();
				this.metrics.successfulConnections++;
				this.connectTime = Date.now();
				this.emit("connected");
				return;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				this.recordError(lastError, "connect");

				if (attempt < this.options.retryAttempts) {
					await this.delay(this.options.retryDelay * 2 ** attempt);
				}
			}
		}

		this.connectionState = ConnectionState.Error;
		this.metrics.failedConnections++;
		throw new Error(
			`Failed to connect after ${this.options.retryAttempts + 1} attempts: ${lastError?.message}`,
		);
	}

	/**
	 * Initialize MCP protocol handshake
	 */
	async initialize(): Promise<McpInitializeResult> {
		if (this.connectionState !== ConnectionState.Connected) {
			throw new Error("Must be connected before initializing");
		}

		const initParams: McpInitializeParams = {
			protocolVersion: "2024-11-05",
			capabilities: {
				tools: { listChanged: false },
				logging: {},
			},
			clientInfo: this.config.clientInfo || {
				name: "cortex-cli-mcp-client",
				version: "1.0.0",
			},
		};

		const result = await this.request<McpInitializeResult>(
			"initialize",
			initParams,
		);
		this.connectionState = ConnectionState.Initialized;
		this.startHeartbeat();
		this.emit("initialized", result);
		return result;
	}

	/**
	 * List available tools from MCP server
	 */
	async listTools(): Promise<McpToolListResult> {
		this.ensureInitialized();
		return await this.request<McpToolListResult>("tools/list");
	}

	/**
	 * Call a tool on the MCP server
	 */
	async callTool(
		name: string,
		args?: Record<string, unknown>,
	): Promise<McpToolCallResult> {
		this.ensureInitialized();
		const params: McpToolCallParams = { name, arguments: args };
		const callId = randomUUID();
		const start = Date.now();
		const redactedArgs = args ? redactForEvent(args) : undefined;
		const beginEvt: McpToolCallBegin = {
			callId,
			name,
			arguments: redactedArgs,
			timestamp: start,
		};
		this.emit("tool-call-begin", beginEvt);
		if (
			this.options.publishEvent &&
			process.env.CORTEX_MCP_A2A_TELEMETRY === "1"
		) {
			this.options.publishEvent({
				type: McpEventTypes.ToolCallBegin,
				payload: beginEvt,
			});
		}
		try {
			const result = await this.request<McpToolCallResult>(
				"tools/call",
				params,
			);
			const endEvt: McpToolCallEnd = {
				callId,
				name,
				durationMs: Date.now() - start,
				success: !result.isError,
			};
			this.emit("tool-call-end", endEvt);
			if (
				this.options.publishEvent &&
				process.env.CORTEX_MCP_A2A_TELEMETRY === "1"
			) {
				this.options.publishEvent({
					type: McpEventTypes.ToolCallEnd,
					payload: endEvt,
				});
			}
			return result;
		} catch (error) {
			const endEvt: McpToolCallEnd = {
				callId,
				name,
				durationMs: Date.now() - start,
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			this.emit("tool-call-end", endEvt);
			if (
				this.options.publishEvent &&
				process.env.CORTEX_MCP_A2A_TELEMETRY === "1"
			) {
				this.options.publishEvent({
					type: McpEventTypes.ToolCallEnd,
					payload: endEvt,
				});
			}
			throw error;
		}
	}

	/**
	 * Send a ping to check server responsiveness
	 */
	async ping(): Promise<{ pong: boolean; timestamp: string }> {
		this.ensureInitialized();
		return await this.request<{ pong: boolean; timestamp: string }>("ping");
	}

	/**
	 * Disconnect from MCP server
	 */
	async disconnect(): Promise<void> {
		this.stopHeartbeat();
		this.stopReconnectTimer();

		// Reject all pending requests
		this.pendingRequests.forEach(({ reject, timeout }) => {
			clearTimeout(timeout);
			reject(new Error("Connection closed"));
		});
		this.pendingRequests.clear();

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.connectionState = ConnectionState.Disconnected;
		this.emit("disconnected");
	}

	/**
	 * Get connection state
	 */
	getState(): ConnectionState {
		return this.connectionState;
	}

	/**
	 * Get performance metrics
	 */
	getMetrics(): McpMetrics {
		const uptime = this.connectTime > 0 ? Date.now() - this.connectTime : 0;
		const avgResponseTime =
			this.responseTimes.length > 0
				? this.responseTimes.reduce((a, b) => a + b, 0) /
					this.responseTimes.length
				: 0;

		return {
			...this.metrics,
			uptime,
			averageResponseTime: Math.round(avgResponseTime * 100) / 100,
		};
	}

	/**
	 * Check if client is ready for requests
	 */
	isReady(): boolean {
		return this.connectionState === ConnectionState.Initialized;
	}

	private async attemptConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(this.config.url);

				const connectTimeout = setTimeout(() => {
					reject(
						new Error(
							`Connection timeout after ${this.config.timeout || 30000}ms`,
						),
					);
				}, this.config.timeout || 30000);

				this.ws.on("open", () => {
					clearTimeout(connectTimeout);
					this.connectionState = ConnectionState.Connected;
					resolve();
				});

				this.ws.on("message", (data) => {
					this.handleMessage(data.toString());
				});

				this.ws.on("error", (error) => {
					clearTimeout(connectTimeout);
					this.connectionState = ConnectionState.Error;
					reject(error instanceof Error ? error : new Error(String(error)));
				});

				this.ws.on("close", () => {
					this.connectionState = ConnectionState.Disconnected;
					this.emit("disconnected");

					if (this.options.retryAttempts > 0) {
						this.scheduleReconnect();
					}
				});
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	private async request<T>(method: string, params?: unknown): Promise<T> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error("WebSocket not connected");
		}

		const id = randomUUID();
		const request: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };

		return trackRequest<T>(
			request,
			method,
			{
				timeout: this.options.timeout,
				retryAttempts: this.options.retryAttempts,
				retryDelay: this.options.retryDelay,
			},
			(data) => {
				const ws = this.ws;
				if (!ws) {
					throw new Error("WebSocket not connected");
				}
				ws.send(data);
			},
			this.pendingRequests,
			this.metrics,
			this.responseTimes,
			this.delay.bind(this),
			this.recordError.bind(this),
		);
	}

	private handleMessage(data: string): void {
		try {
			const message = JSON.parse(data) as JsonRpcMessage;

			if ("id" in message && message.id !== undefined && message.id !== null) {
				// This is a response
				const response = message as JsonRpcResponse;
				this.handleResponse(response);
			} else {
				// This is a notification
				const notification = message as JsonRpcNotification;
				this.handleNotification(notification);
			}
		} catch (error) {
			this.recordError(
				error instanceof Error ? error : new Error(String(error)),
				"handleMessage",
			);
		}
	}

	private handleResponse(response: JsonRpcResponse): void {
		this.metrics.responseCount++;
		const respId = response.id;

		if (respId == null) return; // orphaned or notification-like

		const pending = this.pendingRequests.get(respId);
		if (!pending) return;

		this.pendingRequests.delete(respId);
		clearTimeout(pending.timeout);

		if (response.error) {
			const error = new Error(
				`MCP Error: ${response.error.message}`,
			) as McpError;
			error.code = response.error.code;
			error.data = response.error.data;
			this.recordError(error, pending.method);
			pending.reject(error);
		} else {
			pending.resolve(response.result);
		}
	}

	private handleNotification(notification: JsonRpcNotification): void {
		this.emit("notification", notification.method, notification.params);
	}

	private ensureInitialized(): void {
		if (this.connectionState !== ConnectionState.Initialized) {
			throw new Error(
				"MCP client not initialized. Call connect() and initialize() first.",
			);
		}
	}

	private startHeartbeat(): void {
		if (this.options.heartbeatInterval <= 0) return;

		this.heartbeatTimer = setInterval(async () => {
			try {
				await this.ping();
			} catch (error) {
				this.recordError(
					error instanceof Error ? error : new Error(String(error)),
					"heartbeat",
				);
			}
		}, this.options.heartbeatInterval);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer) return;

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect().catch((error) => {
				this.recordError(
					error instanceof Error ? error : new Error(String(error)),
					"reconnect",
				);
			});
		}, this.options.retryDelay);
	}

	private stopReconnectTimer(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	private recordError(error: Error, method?: string): void {
		if (this.options.enableMetrics) {
			this.metrics.errors.push({
				timestamp: new Date(),
				error: error.message,
				method,
			});

			// Keep only last 100 errors
			if (this.metrics.errors.length > 100) {
				this.metrics.errors = this.metrics.errors.slice(-100);
			}
		}

		this.emit("error", error, method);
	}

	private setupErrorHandling(): void {
		this.on("error", (error, method) => {
			if (this.listenerCount("error") === 1) {
				// No other error listeners, prevent crash

				const inMethod = method ? ` in ${method}` : "";
				console.error(`MCP Client Error${inMethod}: ${error.message}`);
			}
		});
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Local redaction for event payloads to avoid leaking secrets via telemetry
function redactForEvent(input: unknown, depth = 0): unknown {
	if (depth > 6 || input == null) return input;
	if (Array.isArray(input))
		return input.map((v) => redactForEvent(v, depth + 1));
	if (typeof input !== "object") return input;

	const SENSITIVE_KEYS = new Set([
		"password",
		"pass",
		"secret",
		"token",
		"apiKey",
		"apikey",
		"access_token",
		"authorization",
		"cookie",
		"session",
		"privateKey",
		"clientSecret",
		"signingKey",
	]);

	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
		if (SENSITIVE_KEYS.has(k) || /key|secret|token|pass(word)?/i.test(k)) {
			out[k] = "***";
		} else {
			out[k] = redactForEvent(v, depth + 1);
		}
	}
	return out;
}

/**
 * Utility function to create MCP client with common defaults
 */
export function createMcpClient(
	url: string,
	options: Partial<McpClientOptions> = {},
): McpClient {
	const config: McpConnectionConfig = {
		url,
		timeout: options.timeout || 30000,
		clientInfo: {
			name: "cortex-cli",
			version: "1.0.0",
		},
	};

	const clientOptions: McpClientOptions = {
		timeout: 30000,
		retryAttempts: 3,
		retryDelay: 1000,
		heartbeatInterval: 30000,
		enableMetrics: true,
		publishEvent:
			options.publishEvent ||
			// Soft-couple via global hook set by ASBR boot wiring to avoid cross-package imports
			(
				globalThis as unknown as {
					__CORTEX_MCP_PUBLISH__?: (evt: unknown) => void;
				}
			).__CORTEX_MCP_PUBLISH__,
		...options,
	};

	return new McpClient(config, clientOptions);
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
