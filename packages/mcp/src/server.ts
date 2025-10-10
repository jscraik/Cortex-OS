import { randomUUID } from 'node:crypto';
import type { ServerInfo } from '@cortex-os/mcp-core';
import type { Logger } from 'pino';
import { pino } from 'pino';
import { z } from 'zod';

import { HTTPException } from './errors.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type StructuredLogger = Pick<Logger, LogLevel>;
export type ServerLogger = StructuredLogger;

const resourceContentSchema = z.object({
	uri: z.string().min(1).optional(),
	mimeType: z.string().min(1).optional(),
	text: z.string().optional(),
	data: z.string().optional(),
	encoding: z.enum(['base64']).optional(),
});

const resourceReadResultSchema = z.object({
	contents: z
		.array(resourceContentSchema)
		.min(1, 'Resource content must include at least one entry'),
});

const resourceRegistrationSchema = z.object({
	uri: z.string().min(1, 'Resource URI is required'),
	name: z.string().min(1, 'Resource name is required'),
	description: z.string().optional(),
	mimeType: z.string().default('text/plain'),
	content: resourceReadResultSchema.optional(),
});

const resourceReadParamsSchema = z.object({
	uri: z
		.string({
			invalid_type_error: 'resource URI must be a string',
			required_error: 'resource URI must be a string',
		})
		.min(1, 'resource URI must be a string'),
});

type ResourceReadResult = z.infer<typeof resourceReadResultSchema>;

type ResourceRegistrationInput = z.input<typeof resourceRegistrationSchema> & {
	read?: (request: { uri: string; correlationId?: string }) => Promise<ResourceReadResult>;
};

type ResourceEntry = {
	uri: string;
	name: string;
	description: string;
	mimeType: string;
	defaultContent?: ResourceReadResult;
	read?: (request: { uri: string; correlationId?: string }) => Promise<ResourceReadResult>;
};

/**
 * Base MCP Server class
 * Provides core functionality for MCP protocol implementation
 * with brAInwav branding and structured logging
 */
export class Server {
	protected tools = new Map<string, any>();
	protected prompts = new Map<string, any>();
	protected resources = new Map<string, ResourceEntry>();
	protected capabilities: ServerInfo = {
		name: 'cortex-os-mcp-server',
		version: '1.0.0',
		transport: 'stdio',
	};

	private requestCount = 0;
	private correlationIds = new Set<string>();
	private readonly logger: StructuredLogger;

	constructor(options?: { logger?: StructuredLogger }) {
		this.logger =
			options?.logger ??
			pino({
				level: process.env.MCP_LOG_LEVEL ?? 'info',
				name: 'cortex-os-mcp-base-server',
				base: {
					brand: 'brAInwav',
					service: 'cortex-os-mcp-server',
				},
			});
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
			throw new HTTPException(400, 'Tool name is required');
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
			throw new HTTPException(400, 'Prompt name is required');
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
	registerResource(resource: ResourceRegistrationInput): void {
		const parsed = resourceRegistrationSchema.safeParse(resource);
		if (!parsed.success) {
			const message = parsed.error.errors[0]?.message ?? 'Resource registration failed';
			throw new HTTPException(400, message);
		}

		const readHandler = resource.read;
		if (readHandler !== undefined && typeof readHandler !== 'function') {
			throw new HTTPException(
				400,
				'Resource read handler must be a function that returns resource contents',
			);
		}

		const entry: ResourceEntry = {
			uri: parsed.data.uri,
			name: parsed.data.name,
			description: parsed.data.description || `Resource: ${parsed.data.name}`,
			mimeType: parsed.data.mimeType,
			defaultContent: parsed.data.content
				? resourceReadResultSchema.parse(parsed.data.content)
				: undefined,
			read: readHandler,
		};

		this.resources.set(entry.uri, entry);
		this.logStructured('resource_registered', {
			resourceUri: entry.uri,
			hasReadHandler: Boolean(entry.read),
			hasDefaultContent: Boolean(entry.defaultContent),
		});
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
			this.logStructured(
				'request_failed',
				{
					method: request.method,
					correlationId,
					error: error instanceof Error ? error.message : String(error),
					success: false,
				},
				'error',
			);

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
				throw new HTTPException(-32601, 'Method not found');
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
			throw new HTTPException(-32602, 'Invalid params: tool name required');
		}

		const tool = this.tools.get(params.name);
		if (!tool) {
			throw new HTTPException(-32601, `Tool not found: ${params.name}`);
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
			throw new HTTPException(-32602, 'Invalid params: prompt name required');
		}

		const prompt = this.prompts.get(params.name);
		if (!prompt) {
			throw new HTTPException(-32601, `Prompt not found: ${params.name}`);
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
		const parsedParams = resourceReadParamsSchema.safeParse(params);
		if (!parsedParams.success) {
			const reason = parsedParams.error.errors[0]?.message ?? 'resource URI must be a string';
			throw new HTTPException(-32602, `Invalid params: ${reason}`);
		}

		const { uri } = parsedParams.data;
		const resource = this.resources.get(uri);
		if (!resource) {
			throw new HTTPException(-32601, `Resource not found: ${uri}`);
		}

		const correlationId = randomUUID();
		this.logStructured('resource_read_started', { resourceUri: uri, correlationId }, 'debug');

		let validated: ResourceReadResult;
		try {
			let result: ResourceReadResult;
			if (typeof resource.read === 'function') {
				result = await resource.read({ uri, correlationId });
			} else if (resource.defaultContent) {
				result = resource.defaultContent;
			} else {
				throw new HTTPException(501, `Resource ${uri} does not expose readable content`);
			}
			validated = resourceReadResultSchema.parse(result);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const status = error instanceof HTTPException ? error.status : 500;
			this.logStructured(
				'resource_read_failed',
				{ resourceUri: uri, correlationId, error: message },
				'error',
			);
			if (error instanceof HTTPException) {
				throw error;
			}
			throw new HTTPException(status, `Resource read failed: ${message}`);
		}

		const contents = validated.contents.map((content) => ({
			uri: content.uri ?? resource.uri,
			mimeType: content.mimeType ?? resource.mimeType,
			text: content.text,
			data: content.data,
			encoding: content.encoding,
		}));

		this.logStructured('resource_read_completed', {
			resourceUri: uri,
			correlationId,
			provider: resource.read ? 'handler' : 'static',
			items: contents.length,
		});

		return { contents };
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
	private logStructured(event: string, data: any, level: LogLevel = 'info'): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			event,
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			...data,
		};

		if (typeof this.logger[level] === 'function') {
			this.logger[level](logEntry);
		}
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

	getLogger(): StructuredLogger {
		return this.logger;
	}
}

// Factory function to create Server
export function createServer(): Server {
	return new Server();
}

export default Server;
