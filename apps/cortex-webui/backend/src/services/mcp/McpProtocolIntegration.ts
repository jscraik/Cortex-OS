/**
 * MCP Protocol Integration for cortex-webui
 *
 * Provides comprehensive MCP protocol support including stdio/HTTP transport,
 * JSON-RPC 2.0 message handling, tool capability negotiation, and server discovery.
 */

import { ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import logger from '../utils/logger.js';

// MCP Protocol types
export interface McpMessage {
	jsonrpc: '2.0';
	id?: string | number | null;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export interface McpServerInfo {
	name: string;
	version: string;
	transport: 'stdio' | 'http' | 'ws' | 'sse';
	command?: string;
	args?: string[];
	env?: Record<string, string>;
	endpoint?: string;
	headers?: Record<string, string>;
}

export interface McpServer {
	info: McpServerInfo;
	status: 'disconnected' | 'connecting' | 'connected' | 'error';
	tools: Array<{
		name: string;
		description: string;
		inputSchema: unknown;
	}>;
	capabilities: {
		tools: unknown;
		logging?: unknown;
		resources?: unknown;
	};
	lastActivity?: Date;
	error?: Error;
}

// JSON-RPC 2.0 message schemas
const initializeRequestSchema = z.object({
	jsonrpc: z.literal('2.0'),
	id: z.union([z.string(), z.number()]),
	method: z.literal('initialize'),
	params: z.object({
		protocolVersion: z.string(),
		capabilities: z.object({
			tools: z.object({}).optional(),
			logging: z.object({}).optional(),
			resources: z.object({}).optional(),
		}),
		clientInfo: z.object({
			name: z.string(),
			version: z.string(),
		}),
	}),
});

const listToolsRequestSchema = z.object({
	jsonrpc: z.literal('2.0'),
	id: z.union([z.string(), z.number()]),
	method: z.literal('tools/list'),
	params: z.object({}).optional(),
});

const callToolRequestSchema = z.object({
	jsonrpc: z.literal('2.0'),
	id: z.union([z.string(), z.number()]),
	method: z.literal('tools/call'),
	params: z.object({
		name: z.string(),
		arguments: z.record(z.unknown()).optional(),
	}),
});

export class McpProtocolIntegration extends EventEmitter {
	private servers = new Map<string, McpServer>();
	private connections = new Map<string, ChildProcess | WebSocket>();
	private pendingRequests = new Map<
		string | number,
		{
			resolve: (value: unknown) => void;
			reject: (error: Error) => void;
			timeout: NodeJS.Timeout;
		}
	>();
	private wsServer?: WebSocketServer;

	constructor() {
		super();
		this.setupWebSocketServer();
	}

	/**
	 * Register a new MCP server
	 */
	public async registerServer(serverInfo: McpServerInfo): Promise<void> {
		const serverId = `${serverInfo.name}-${serverInfo.transport}`;

		if (this.servers.has(serverId)) {
			throw new Error(`Server ${serverId} already exists`);
		}

		const server: McpServer = {
			info: serverInfo,
			status: 'disconnected',
			tools: [],
			capabilities: {},
		};

		this.servers.set(serverId, server);
		await this.connectToServer(serverId);

		logger.info('brAInwav MCP server registered', {
			serverId,
			name: serverInfo.name,
			transport: serverInfo.transport,
		});
		this.emit('serverRegistered', server);
	}

	/**
	 * Connect to an MCP server
	 */
	private async connectToServer(serverId: string): Promise<void> {
		const server = this.servers.get(serverId);
		if (!server) {
			throw new Error(`Server ${serverId} not found`);
		}

		server.status = 'connecting';

		try {
			switch (server.info.transport) {
				case 'stdio':
					await this.connectStdioServer(serverId);
					break;
				case 'http':
					await this.connectHttpServer(serverId);
					break;
				case 'ws':
					await this.connectWebSocketServer(serverId);
					break;
				default:
					throw new Error(`Unsupported transport: ${server.info.transport}`);
			}

			// Initialize connection
			await this.initializeServer(serverId);

			// List available tools
			await this.listServerTools(serverId);

			server.status = 'connected';
			server.lastActivity = new Date();

			logger.info('brAInwav MCP server connected', { serverId });
			this.emit('serverConnected', server);
		} catch (error) {
			server.status = 'error';
			server.error = error instanceof Error ? error : new Error('Unknown connection error');

			logger.error('brAInwav MCP server connection failed', {
				serverId,
				error: server.error.message,
			});
			this.emit('serverConnectionFailed', server);
		}
	}

	/**
	 * Connect to stdio-based MCP server
	 */
	private async connectStdioServer(serverId: string): Promise<void> {
		const server = this.servers.get(serverId)!;

		if (!server.info.command) {
			throw new Error('Command required for stdio transport');
		}

		const child = spawn(server.info.command, server.info.args || [], {
			env: { ...process.env, ...server.info.env },
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		child.on('error', (error) => {
			server.status = 'error';
			server.error = error;
			this.emit('serverError', { serverId, error });
		});

		child.on('exit', (code, signal) => {
			server.status = 'disconnected';
			this.connections.delete(serverId);
			this.emit('serverDisconnected', { serverId, code, signal });
		});

		// Handle stdout messages
		child.stdout?.on('data', (data) => {
			const messages = data.toString().trim().split('\n');
			messages.forEach((message) => {
				if (message.trim()) {
					try {
						const mcpMessage = JSON.parse(message) as McpMessage;
						this.handleMessage(serverId, mcpMessage);
					} catch (error) {
						logger.warn('brAInwav MCP: Failed to parse message', { serverId, message, error });
					}
				}
			});
		});

		// Handle stderr for logging
		child.stderr?.on('data', (data) => {
			logger.warn('brAInwav MCP server stderr', { serverId, message: data.toString() });
		});

		this.connections.set(serverId, child);
	}

	/**
	 * Connect to HTTP-based MCP server
	 */
	private async connectHttpServer(serverId: string): Promise<void> {
		const server = this.servers.get(serverId)!;

		if (!server.info.endpoint) {
			throw new Error('Endpoint required for HTTP transport');
		}

		// For HTTP transport, we'll use fetch for JSON-RPC communication
		// The connection is represented by a simple flag since HTTP is stateless
		this.connections.set(serverId, 'http');
	}

	/**
	 * Connect to WebSocket-based MCP server
	 */
	private async connectWebSocketServer(serverId: string): Promise<void> {
		const server = this.servers.get(serverId)!;

		if (!server.info.endpoint) {
			throw new Error('Endpoint required for WebSocket transport');
		}

		const ws = new WebSocket(server.info.endpoint, {
			headers: server.info.headers,
		});

		ws.on('open', () => {
			logger.info('brAInwav MCP WebSocket connection opened', { serverId });
		});

		ws.on('message', (data) => {
			try {
				const mcpMessage = JSON.parse(data.toString()) as McpMessage;
				this.handleMessage(serverId, mcpMessage);
			} catch (error) {
				logger.warn('brAInwav MCP: Failed to parse WebSocket message', { serverId, error });
			}
		});

		ws.on('error', (error) => {
			server.status = 'error';
			server.error = error;
			this.emit('serverError', { serverId, error });
		});

		ws.on('close', () => {
			server.status = 'disconnected';
			this.connections.delete(serverId);
			this.emit('serverDisconnected', { serverId });
		});

		this.connections.set(serverId, ws);
	}

	/**
	 * Initialize MCP server connection
	 */
	private async initializeServer(serverId: string): Promise<void> {
		const initRequest = {
			jsonrpc: '2.0' as const,
			id: randomUUID(),
			method: 'initialize' as const,
			params: {
				protocolVersion: '2024-11-05',
				capabilities: {
					tools: {},
				},
				clientInfo: {
					name: 'cortex-webui',
					version: '1.0.0',
				},
			},
		};

		const response = await this.sendRequest(serverId, initRequest);

		// Send initialized notification
		await this.sendNotification(serverId, {
			jsonrpc: '2.0',
			method: 'notifications/initialized',
		});

		const server = this.servers.get(serverId)!;
		server.capabilities = (response as any)?.result?.capabilities || {};
	}

	/**
	 * List tools available on server
	 */
	private async listServerTools(serverId: string): Promise<void> {
		const listToolsRequest = {
			jsonrpc: '2.0' as const,
			id: randomUUID(),
			method: 'tools/list' as const,
		};

		const response = await this.sendRequest(serverId, listToolsRequest);
		const server = this.servers.get(serverId)!;
		server.tools = (response as any)?.result?.tools || [];
	}

	/**
	 * Send JSON-RPC request to server
	 */
	private async sendRequest(serverId: string, message: McpMessage): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const id = message.id || randomUUID();
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error(`Request timeout: ${id}`));
			}, 30000);

			this.pendingRequests.set(id, { resolve, reject, timeout });

			try {
				this.sendMessage(serverId, { ...message, id });
			} catch (error) {
				clearTimeout(timeout);
				this.pendingRequests.delete(id);
				reject(error);
			}
		});
	}

	/**
	 * Send JSON-RPC notification to server
	 */
	private async sendNotification(serverId: string, message: McpMessage): Promise<void> {
		this.sendMessage(serverId, { ...message, id: null });
	}

	/**
	 * Send message to server
	 */
	private sendMessage(serverId: string, message: McpMessage): void {
		const connection = this.connections.get(serverId);
		if (!connection) {
			throw new Error(`No connection to server: ${serverId}`);
		}

		const messageStr = JSON.stringify(message) + '\n';

		if (connection === 'http') {
			// HTTP transport: use fetch
			this.sendHttpRequest(serverId, message);
		} else if (connection instanceof ChildProcess) {
			// stdio transport
			connection.stdin?.write(messageStr);
		} else if (connection instanceof WebSocket) {
			// WebSocket transport
			connection.send(messageStr);
		} else {
			throw new Error(`Unknown connection type for server: ${serverId}`);
		}
	}

	/**
	 * Send HTTP request for JSON-RPC
	 */
	private async sendHttpRequest(serverId: string, message: McpMessage): Promise<void> {
		const server = this.servers.get(serverId)!;

		try {
			const response = await fetch(server.info.endpoint!, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...server.info.headers,
				},
				body: JSON.stringify(message),
			});

			if (!response.ok) {
				throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
			}

			const responseData = (await response.json()) as McpMessage;
			this.handleMessage(serverId, responseData);
		} catch (error) {
			logger.error('brAInwav MCP HTTP request failed', { serverId, error });

			// Reject pending request
			if (message.id) {
				const pending = this.pendingRequests.get(message.id);
				if (pending) {
					this.pendingRequests.delete(message.id);
					clearTimeout(pending.timeout);
					pending.reject(error instanceof Error ? error : new Error('HTTP request failed'));
				}
			}
		}
	}

	/**
	 * Handle incoming message from server
	 */
	private handleMessage(serverId: string, message: McpMessage): void {
		const server = this.servers.get(serverId);
		if (!server) {
			return;
		}

		server.lastActivity = new Date();

		// Handle response to request
		if (message.id !== undefined && message.id !== null) {
			const pending = this.pendingRequests.get(message.id);
			if (pending) {
				this.pendingRequests.delete(message.id);
				clearTimeout(pending.timeout);

				if (message.error) {
					pending.reject(new Error(message.error.message));
				} else {
					pending.resolve(message.result);
				}
			}
		}

		// Handle notifications
		if (message.method) {
			this.emit('serverNotification', { serverId, message });
		}
	}

	/**
	 * Call tool on server
	 */
	public async callTool(
		serverId: string,
		toolName: string,
		args: Record<string, unknown> = {},
	): Promise<unknown> {
		const server = this.servers.get(serverId);
		if (!server) {
			throw new Error(`Server ${serverId} not found`);
		}

		if (server.status !== 'connected') {
			throw new Error(`Server ${serverId} is not connected (status: ${server.status})`);
		}

		const request = {
			jsonrpc: '2.0' as const,
			id: randomUUID(),
			method: 'tools/call' as const,
			params: {
				name: toolName,
				arguments: args,
			},
		};

		return this.sendRequest(serverId, request);
	}

	/**
	 * Get server information
	 */
	public getServer(serverId: string): McpServer | undefined {
		return this.servers.get(serverId);
	}

	/**
	 * List all servers
	 */
	public listServers(): McpServer[] {
		return Array.from(this.servers.values());
	}

	/**
	 * Disconnect from server
	 */
	public async disconnectServer(serverId: string): Promise<void> {
		const server = this.servers.get(serverId);
		if (!server) {
			return;
		}

		const connection = this.connections.get(serverId);
		if (connection) {
			if (connection instanceof ChildProcess) {
				connection.kill();
			} else if (connection instanceof WebSocket) {
				connection.close();
			}
			this.connections.delete(serverId);
		}

		server.status = 'disconnected';
		logger.info('brAInwav MCP server disconnected', { serverId });
		this.emit('serverDisconnected', { serverId });
	}

	/**
	 * Setup WebSocket server for incoming MCP connections
	 */
	private setupWebSocketServer(): void {
		this.wsServer = new WebSocketServer({ port: 8765 });

		this.wsServer.on('connection', (ws, request) => {
			const serverId = `incoming-${request.socket.remoteAddress}-${Date.now()}`;

			const server: McpServer = {
				info: {
					name: serverId,
					version: '1.0.0',
					transport: 'ws',
				},
				status: 'connected',
				tools: [],
				capabilities: {},
			};

			this.servers.set(serverId, server);
			this.connections.set(serverId, ws);

			ws.on('message', (data) => {
				try {
					const mcpMessage = JSON.parse(data.toString()) as McpMessage;
					this.handleMessage(serverId, mcpMessage);
				} catch (error) {
					logger.warn('brAInwav MCP: Failed to parse incoming WebSocket message', {
						serverId,
						error,
					});
				}
			});

			ws.on('close', () => {
				this.servers.delete(serverId);
				this.connections.delete(serverId);
			});

			logger.info('brAInwav MCP: Incoming WebSocket connection', { serverId });
		});

		logger.info('brAInwav MCP WebSocket server listening on port 8765');
	}

	/**
	 * Shutdown all connections
	 */
	public async shutdown(): Promise<void> {
		// Close all server connections
		for (const serverId of this.servers.keys()) {
			await this.disconnectServer(serverId);
		}

		// Close WebSocket server
		if (this.wsServer) {
			this.wsServer.close();
		}

		// Clear pending requests
		for (const [id, pending] of this.pendingRequests) {
			clearTimeout(pending.timeout);
			pending.reject(new Error('Server shutting down'));
		}
		this.pendingRequests.clear();

		logger.info('brAInwav MCP protocol integration shutdown complete');
	}
}
