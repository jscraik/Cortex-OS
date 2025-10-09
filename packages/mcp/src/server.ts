import { randomUUID } from 'node:crypto';
import type { ServerInfo } from '@cortex-os/mcp-core';

import { HTTPException } from './errors.js';

/**
 * Base MCP Server class
 * Provides core functionality for MCP protocol implementation
 * with brAInwav branding and structured logging
 */
export class Server {
	protected tools = new Map<string, any>();
	protected prompts = new Map<string, any>();
	protected resources = new Map<string, any>();
	protected capabilities: ServerInfo = {
		name: 'cortex-os-mcp-server',
		version: '1.0.0',
		transport: 'stdio',
	};

	private requestCount = 0;
	private correlationIds = new Set<string>();

	constructor() {
		this.setupDefaultCapabilities();
	}

	/**
	 * Setup default MCP capabilities
	 */
	private setupDefaultCapabilities(): void {
		this.capabilities = {
			...this.capabilities,
			capabilities: {
				tools: {},
				prompts: {},
				resources: {},
			},
		};
	}

	/**
	 * Register a tool with the server
	 */
	registerTool(tool: {
		name: string;
		description?: string;
		inputSchema: any;
		handler: (args: any, context?: any) => Promise<any>;
	}): void {
		if (!tool.name) {
			throw new HTTPException(400, '[brAInwav] Tool name is required');
		}

		this.tools.set(tool.name, {
			name: tool.name,
			description: tool.description || `Tool: ${tool.name}`,
			inputSchema: tool.inputSchema,
			handler: tool.handler,
		});

		this.logStructured('tool_registered', { toolName: tool.name });
	}

	/**
	 * Register a prompt with the server
	 */
	registerPrompt(prompt: {
		name: string;
		description?: string;
		arguments?: Array<{ name: string; description?: string; required?: boolean }>;
	}): void {
		if (!prompt.name) {
			throw new HTTPException(400, '[brAInwav] Prompt name is required');
		}

		this.prompts.set(prompt.name, {
			name: prompt.name,
			description: prompt.description || `Prompt: ${prompt.name}`,
			arguments: prompt.arguments || [],
		});

		this.logStructured('prompt_registered', { promptName: prompt.name });
	}

	/**
	 * Register a resource with the server
	 */
	registerResource(resource: {
		uri: string;
		name: string;
		description?: string;
		mimeType?: string;
	}): void {
		if (!resource.uri) {
			throw new HTTPException(400, '[brAInwav] Resource URI is required');
		}

		this.resources.set(resource.uri, {
			uri: resource.uri,
			name: resource.name,
			description: resource.description || `Resource: ${resource.name}`,
			mimeType: resource.mimeType || 'text/plain',
		});

		this.logStructured('resource_registered', { resourceUri: resource.uri });
	}

	/**
	 * Get server capabilities including listChanged flags
	 */
	getServerInfo(): ServerInfo {
		return {
			...this.capabilities,
			...this.getServerCapabilities(),
		};
	}

	/**
	 * Get current MCP capabilities with notification flags
	 */
	protected getServerCapabilities(): ServerInfo {
		return {
			capabilities: {
				tools: {
					listChanged: true,
				},
				prompts: {
					listChanged: true,
				},
				resources: {
					subscribe: true,
					listChanged: true,
				},
			},
		};
	}

	/**
	 * Handle incoming MCP request
	 */
	async handleRequest(request: {
		method: string;
		params?: any;
		id?: string | number;
	}): Promise<any> {
		const correlationId = request.id?.toString() || randomUUID();
		this.correlationIds.add(correlationId);
		this.requestCount++;

		try {
			this.logStructured('request_started', {
				method: request.method,
				correlationId,
				requestCount: this.requestCount,
			});

			const result = await this.routeRequest(request);

			this.logStructured('request_completed', {
				method: request.method,
				correlationId,
				success: true,
			});

			return {
				jsonrpc: '2.0',
				id: request.id,
				result,
			};
		} catch (error) {
			this.logStructured('request_failed', {
				method: request.method,
				correlationId,
				error: error instanceof Error ? error.message : String(error),
				success: false,
			});

			return {
				jsonrpc: '2.0',
				id: request.id,
				error: {
					code: error instanceof HTTPException ? error.status : -32000,
					message: error instanceof Error ? error.message : 'Unknown error',
					...(error instanceof HTTPException &&
						error.headers && {
							data: { headers: error.headers },
						}),
				},
			};
		} finally {
			this.correlationIds.delete(correlationId);
		}
	}

	/**
	 * Route request to appropriate handler
	 */
	private async routeRequest(request: { method: string; params?: any }): Promise<any> {
		switch (request.method) {
			case 'initialize':
				return this.handleInitialize(request.params);
			case 'tools/list':
				return this.handleToolsList();
			case 'tools/call':
				return this.handleToolsCall(request.params);
			case 'prompts/list':
				return this.handlePromptsList();
			case 'prompts/get':
				return this.handlePromptsGet(request.params);
			case 'resources/list':
				return this.handleResourcesList();
			case 'resources/read':
				return this.handleResourcesRead(request.params);
			case 'resources/subscribe':
				return this.handleResourcesSubscribe(request.params);
			default:
				throw new HTTPException(-32601, '[brAInwav] Method not found');
		}
	}

	/**
	 * Handle initialize request
	 */
	private async handleInitialize(_params?: any): Promise<any> {
		return this.getServerInfo();
	}

	/**
	 * Handle tools/list request
	 */
	private async handleToolsList(): Promise<any> {
		return {
			tools: Array.from(this.tools.values()).map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
			})),
		};
	}

	/**
	 * Handle tools/call request
	 */
	private async handleToolsCall(params?: any): Promise<any> {
		if (!params?.name) {
			throw new HTTPException(-32602, '[brAInwav] Invalid params: tool name required');
		}

		const tool = this.tools.get(params.name);
		if (!tool) {
			throw new HTTPException(-32601, `[brAInwav] Tool not found: ${params.name}`);
		}

		const result = await tool.handler(params.arguments || {}, {
			toolName: params.name,
			correlationId: randomUUID(),
		});

		return {
			content: [
				{
					type: 'text',
					text: typeof result === 'string' ? result : JSON.stringify(result),
				},
			],
		};
	}

	/**
	 * Handle prompts/list request
	 */
	private async handlePromptsList(): Promise<any> {
		return {
			prompts: Array.from(this.prompts.values()).map((prompt) => ({
				name: prompt.name,
				description: prompt.description,
				arguments: prompt.arguments,
			})),
		};
	}

	/**
	 * Handle prompts/get request
	 */
	private async handlePromptsGet(params?: any): Promise<any> {
		if (!params?.name) {
			throw new HTTPException(-32602, '[brAInwav] Invalid params: prompt name required');
		}

		const prompt = this.prompts.get(params.name);
		if (!prompt) {
			throw new HTTPException(-32601, `[brAInwav] Prompt not found: ${params.name}`);
		}

		return {
			description: prompt.description,
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: prompt.description || `Using prompt: ${prompt.name}`,
					},
				},
			],
		};
	}

	/**
	 * Handle resources/list request
	 */
	private async handleResourcesList(): Promise<any> {
		return {
			resources: Array.from(this.resources.values()).map((resource) => ({
				uri: resource.uri,
				name: resource.name,
				description: resource.description,
				mimeType: resource.mimeType,
			})),
		};
	}

	/**
	 * Handle resources/read request
	 */
	private async handleResourcesRead(params?: any): Promise<any> {
		if (!params?.uri) {
			throw new HTTPException(-32602, '[brAInwav] Invalid params: resource URI required');
		}

		const resource = this.resources.get(params.uri);
		if (!resource) {
			throw new HTTPException(-32601, `[brAInwav] Resource not found: ${params.uri}`);
		}

		// For now, return basic resource info
		// In real implementation, this would read the actual resource content
		return {
			contents: [
				{
					uri: resource.uri,
					mimeType: resource.mimeType,
					text: `Resource content for: ${resource.name}`,
				},
			],
		};
	}

	/**
	 * Handle resources/subscribe request
	 */
	private async handleResourcesSubscribe(params?: any): Promise<any> {
		if (!params?.uri) {
			throw new HTTPException(-32602, '[brAInwav] Invalid params: resource URI required');
		}

		const resource = this.resources.get(params.uri);
		if (!resource) {
			throw new HTTPException(-32601, `[brAInwav] Resource not found: ${params.uri}`);
		}

		this.logStructured('resource_subscribed', { resourceUri: params.uri });

		return { subscribed: true };
	}

	/**
	 * Send response (for HTTP-based servers)
	 */
	async sendResponse(_response: any, data: any): Promise<void> {
		// Base implementation - override in HTTP servers
		this.logStructured('response_sent', { data });
	}

	/**
	 * Emit notification (for real-time updates)
	 */
	protected emitNotification(method: string, params?: any): void {
		this.logStructured('notification_emitted', { method, params });
		// Base implementation - override in transport-specific servers
	}

	/**
	 * Structured logging with brAInwav branding
	 */
	private logStructured(event: string, data: any): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			event,
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			...data,
		};

		// In production, this would use proper logging infrastructure
		console.log(JSON.stringify(logEntry));
	}

	/**
	 * Get server statistics
	 */
	getStats(): {
		requestCount: number;
		activeRequests: number;
		toolsCount: number;
		promptsCount: number;
		resourcesCount: number;
	} {
		return {
			requestCount: this.requestCount,
			activeRequests: this.correlationIds.size,
			toolsCount: this.tools.size,
			promptsCount: this.prompts.size,
			resourcesCount: this.resources.size,
		};
	}
}

// Factory function to create Server
export function createServer(): Server {
	return new Server();
}

export default Server;
