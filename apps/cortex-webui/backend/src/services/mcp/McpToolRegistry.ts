/**
 * MCP Tool Registry for cortex-webui
 *
 * Provides dynamic tool discovery, registration, and lifecycle management
 * for MCP tools with comprehensive metadata and schema validation.
 */

import { EventEmitter } from 'node:events';
import { z } from 'zod';
import logger from '../utils/logger.js';

// Tool metadata and schema types
export interface McpToolMetadata {
	id: string;
	name: string;
	version: string;
	description: string;
	category: string;
	tags: string[];
	author?: string;
	homepage?: string;
	transport: 'stdio' | 'http' | 'ws' | 'sse';
	serverName: string;
	status: 'active' | 'inactive' | 'error' | 'loading';
	registeredAt: string;
	lastUsed?: string;
	usageCount: number;
	permissions: string[];
	resourceLimits?: ResourceLimits;
}

export interface ResourceLimits {
	maxExecutionTime: number; // ms
	maxMemoryUsage: number; // bytes
	maxConcurrentCalls: number;
}

export interface McpToolSchema {
	name: string;
	description: string;
	inputSchema: z.ZodTypeAny;
	outputSchema: z.ZodTypeAny;
}

export interface McpToolRegistration {
	metadata: McpToolMetadata;
	schema: McpToolSchema;
	handler: (params: unknown, context: ExecutionContext) => Promise<unknown>;
}

export interface ExecutionContext {
	userId?: string;
	sessionId?: string;
	correlationId: string;
	timestamp: string;
	permissions: string[];
	tenant?: string;
	capabilityTokens?: string[];
	budgetProfile?: string;
	requestCost?: number;
	requestDurationMs?: number;
}

export interface ToolRegistryStats {
	totalTools: number;
	toolsByCategory: Record<string, number>;
	toolsByTransport: Record<string, number>;
	toolsByStatus: Record<string, number>;
	mostUsedTools: Array<{ name: string; usageCount: number }>;
	recentlyRegistered: Array<{ name: string; registeredAt: string }>;
}

// Validation schemas
const toolMetadataSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100),
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
	description: z.string().min(1).max(500),
	category: z.string().min(1).max(50),
	tags: z.array(z.string().max(50)).max(10),
	author: z.string().max(100).optional(),
	homepage: z.string().url().optional(),
	transport: z.enum(['stdio', 'http', 'ws', 'sse']),
	serverName: z.string().min(1).max(128),
	status: z.enum(['active', 'inactive', 'error', 'loading']).default('active'),
	registeredAt: z.string().datetime(),
	lastUsed: z.string().datetime().optional(),
	usageCount: z.number().int().min(0).default(0),
	permissions: z.array(z.string()).max(20),
	resourceLimits: z
		.object({
			maxExecutionTime: z.number().int().min(1000).max(300000),
			maxMemoryUsage: z
				.number()
				.int()
				.min(1024 * 1024)
				.max(1024 * 1024 * 1024),
			maxConcurrentCalls: z.number().int().min(1).max(100),
		})
		.optional(),
});

const toolRegistrationSchema = z.object({
	metadata: toolMetadataSchema,
	schema: z.object({
		name: z.string().min(1).max(100),
		description: z.string().min(1).max(500),
		inputSchema: z.any(),
		outputSchema: z.any(),
	}),
	handler: z.function(),
});

// Tool Registry Implementation
export class McpToolRegistry extends EventEmitter {
	private tools = new Map<string, McpToolRegistration>();
	private toolsByName = new Map<string, string>(); // name -> id mapping
	private toolsByServer = new Map<string, Set<string>>(); // server -> tool IDs
	private categoryIndex = new Map<string, Set<string>>(); // category -> tool IDs
	private tagIndex = new Map<string, Set<string>>(); // tag -> tool IDs

	/**
	 * Register a new MCP tool
	 */
	public async registerTool(registration: McpToolRegistration): Promise<void> {
		// Validate registration
		const validated = toolRegistrationSchema.parse(registration);

		// Check for conflicts
		if (this.tools.has(validated.metadata.id)) {
			throw new Error(`Tool with ID ${validated.metadata.id} already exists`);
		}

		if (this.toolsByName.has(validated.metadata.name)) {
			const existingId = this.toolsByName.get(validated.metadata.name)!;
			throw new Error(
				`Tool with name ${validated.metadata.name} already exists (ID: ${existingId})`,
			);
		}

		// Add to registry
		this.tools.set(validated.metadata.id, validated);
		this.toolsByName.set(validated.metadata.name, validated.metadata.id);

		// Update server index
		const serverTools = this.toolsByServer.get(validated.metadata.serverName) || new Set();
		serverTools.add(validated.metadata.id);
		this.toolsByServer.set(validated.metadata.serverName, serverTools);

		// Update category index
		const categoryTools = this.categoryIndex.get(validated.metadata.category) || new Set();
		categoryTools.add(validated.metadata.id);
		this.categoryIndex.set(validated.metadata.category, categoryTools);

		// Update tag indexes
		for (const tag of validated.metadata.tags) {
			const tagTools = this.tagIndex.get(tag) || new Set();
			tagTools.add(validated.metadata.id);
			this.tagIndex.set(tag, tagTools);
		}

		// Emit events
		this.emit('toolRegistered', validated);
		logger.info('brAInwav MCP tool registered', {
			toolId: validated.metadata.id,
			toolName: validated.metadata.name,
			category: validated.metadata.category,
			serverName: validated.metadata.serverName,
		});
	}

	/**
	 * Unregister an MCP tool
	 */
	public async unregisterTool(toolId: string): Promise<void> {
		const tool = this.tools.get(toolId);
		if (!tool) {
			throw new Error(`Tool with ID ${toolId} not found`);
		}

		// Remove from registry
		this.tools.delete(toolId);
		this.toolsByName.delete(tool.metadata.name);

		// Update server index
		const serverTools = this.toolsByServer.get(tool.metadata.serverName);
		if (serverTools) {
			serverTools.delete(toolId);
			if (serverTools.size === 0) {
				this.toolsByServer.delete(tool.metadata.serverName);
			}
		}

		// Update category index
		const categoryTools = this.categoryIndex.get(tool.metadata.category);
		if (categoryTools) {
			categoryTools.delete(toolId);
			if (categoryTools.size === 0) {
				this.categoryIndex.delete(tool.metadata.category);
			}
		}

		// Update tag indexes
		for (const tag of tool.metadata.tags) {
			const tagTools = this.tagIndex.get(tag);
			if (tagTools) {
				tagTools.delete(toolId);
				if (tagTools.size === 0) {
					this.tagIndex.delete(tag);
				}
			}
		}

		// Emit events
		this.emit('toolUnregistered', tool);
		logger.info('brAInwav MCP tool unregistered', {
			toolId: tool.metadata.id,
			toolName: tool.metadata.name,
		});
	}

	/**
	 * Get tool by ID
	 */
	public getTool(toolId: string): McpToolRegistration | undefined {
		return this.tools.get(toolId);
	}

	/**
	 * Get tool by name
	 */
	public getToolByName(name: string): McpToolRegistration | undefined {
		const toolId = this.toolsByName.get(name);
		return toolId ? this.tools.get(toolId) : undefined;
	}

	/**
	 * List tools with optional filtering
	 */
	public listTools(
		options: {
			category?: string;
			serverName?: string;
			tags?: string[];
			status?: McpToolMetadata['status'];
			transport?: McpToolMetadata['transport'];
			limit?: number;
			offset?: number;
		} = {},
	): McpToolRegistration[] {
		let results: McpToolRegistration[] = Array.from(this.tools.values());

		// Apply filters
		if (options.category) {
			const categoryToolIds = this.categoryIndex.get(options.category) || new Set();
			results = results.filter((tool) => categoryToolIds.has(tool.metadata.id));
		}

		if (options.serverName) {
			const serverToolIds = this.toolsByServer.get(options.serverName) || new Set();
			results = results.filter((tool) => serverToolIds.has(tool.metadata.id));
		}

		if (options.tags && options.tags.length > 0) {
			results = results.filter((tool) =>
				options.tags?.some((tag) => tool.metadata.tags.includes(tag)),
			);
		}

		if (options.status) {
			results = results.filter((tool) => tool.metadata.status === options.status);
		}

		if (options.transport) {
			results = results.filter((tool) => tool.metadata.transport === options.transport);
		}

		// Sort by name
		results.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

		// Apply pagination
		const limit = options.limit || 50;
		const offset = options.offset || 0;
		return results.slice(offset, offset + limit);
	}

	/**
	 * Get tools for a specific server
	 */
	public getToolsForServer(serverName: string): McpToolRegistration[] {
		const toolIds = this.toolsByServer.get(serverName) || new Set();
		return Array.from(toolIds)
			.map((id) => this.tools.get(id))
			.filter((tool): tool is McpToolRegistration => tool !== undefined);
	}

	/**
	 * Update tool status
	 */
	public async updateToolStatus(toolId: string, status: McpToolMetadata['status']): Promise<void> {
		const tool = this.tools.get(toolId);
		if (!tool) {
			throw new Error(`Tool with ID ${toolId} not found`);
		}

		const oldStatus = tool.metadata.status;
		tool.metadata.status = status;

		this.emit('toolStatusChanged', { tool, oldStatus, newStatus: status });
		logger.info('brAInwav MCP tool status updated', {
			toolId: tool.metadata.id,
			toolName: tool.metadata.name,
			oldStatus,
			newStatus: status,
		});
	}

	/**
	 * Record tool usage
	 */
	public recordToolUsage(toolId: string): void {
		const tool = this.tools.get(toolId);
		if (tool) {
			tool.metadata.usageCount++;
			tool.metadata.lastUsed = new Date().toISOString();
			this.emit('toolUsed', tool);
		}
	}

	/**
	 * Get registry statistics
	 */
	public getStats(): ToolRegistryStats {
		const tools = Array.from(this.tools.values());

		const toolsByCategory: Record<string, number> = {};
		const toolsByTransport: Record<string, number> = {};
		const toolsByStatus: Record<string, number> = {};

		tools.forEach((tool) => {
			toolsByCategory[tool.metadata.category] = (toolsByCategory[tool.metadata.category] || 0) + 1;
			toolsByTransport[tool.metadata.transport] =
				(toolsByTransport[tool.metadata.transport] || 0) + 1;
			toolsByStatus[tool.metadata.status] = (toolsByStatus[tool.metadata.status] || 0) + 1;
		});

		const mostUsedTools = tools
			.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
			.slice(0, 10)
			.map((tool) => ({
				name: tool.metadata.name,
				usageCount: tool.metadata.usageCount,
			}));

		const recentlyRegistered = tools
			.sort(
				(a, b) =>
					new Date(b.metadata.registeredAt).getTime() - new Date(a.metadata.registeredAt).getTime(),
			)
			.slice(0, 10)
			.map((tool) => ({
				name: tool.metadata.name,
				registeredAt: tool.metadata.registeredAt,
			}));

		return {
			totalTools: tools.length,
			toolsByCategory,
			toolsByTransport,
			toolsByStatus,
			mostUsedTools,
			recentlyRegistered,
		};
	}

	/**
	 * Search tools by query
	 */
	public searchTools(query: string): McpToolRegistration[] {
		const lowerQuery = query.toLowerCase();
		return Array.from(this.tools.values()).filter(
			(tool) =>
				tool.metadata.name.toLowerCase().includes(lowerQuery) ||
				tool.metadata.description.toLowerCase().includes(lowerQuery) ||
				tool.metadata.category.toLowerCase().includes(lowerQuery) ||
				tool.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
		);
	}

	/**
	 * Get all categories
	 */
	public getCategories(): string[] {
		return Array.from(this.categoryIndex.keys()).sort();
	}

	/**
	 * Get all tags
	 */
	public getTags(): string[] {
		return Array.from(this.tagIndex.keys()).sort();
	}

	/**
	 * Clear all tools (for testing)
	 */
	public async clear(): Promise<void> {
		this.tools.clear();
		this.toolsByName.clear();
		this.toolsByServer.clear();
		this.categoryIndex.clear();
		this.tagIndex.clear();
		this.emit('registryCleared');
	}
}

// Global registry instance
export const mcpToolRegistry = new McpToolRegistry();
