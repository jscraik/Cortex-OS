import { randomUUID } from 'crypto';
import { MCPToolVersionException } from '../errors.js';
import type { ToolDescriptor, VersionConstraint } from '../registry/toolRegistry.js';
import type { Server } from '../server.js';

/**
 * Tool requirements specification (SEP-1575)
 */
export interface ToolRequirements {
	[toolName: string]: VersionConstraint;
}

/**
 * Enhanced tool call parameters with version requirements
 */
export interface ToolCallParams {
	name: string;
	arguments?: any;
	tool_requirements?: ToolRequirements;
	_meta?: {
		correlationId?: string;
		requester?: string;
		preferredVersions?: ToolRequirements;
	};
}

/**
 * Tool call result with version information
 */
export interface ToolCallResult {
	content: Array<{
		type: string;
		text?: string;
		data?: any;
	}>;
	_toolVersion?: string;
	_correlationId?: string;
}

/**
 * Enhanced tool call handler with SEP-1575 version constraint support
 */
export class VersionedToolCallHandler {
	private server: Server;
	private registry: any; // VersionedToolRegistry - avoid circular import
	private versioningEnabled: boolean;

	constructor(server: Server, registry: any, versioningEnabled = false) {
		this.server = server;
		this.registry = registry;
		this.versioningEnabled = versioningEnabled;
	}

	/**
	 * Handle enhanced tool call with version constraints
	 */
	async handleToolCall(params: ToolCallParams): Promise<ToolCallResult> {
		const correlationId = params._meta?.correlationId || this.generateCorrelationId();

		this.logStructured('tool_call_started', {
			toolName: params.name,
			correlationId,
			versioningEnabled: this.versioningEnabled,
			hasRequirements: !!params.tool_requirements,
		});

		try {
			// Validate tool requirements if versioning is enabled
			if (this.versioningEnabled && params.tool_requirements) {
				await this.validateToolRequirements(params.tool_requirements, correlationId);
			}

			// Resolve tool with version constraints
			const constraint = this.getToolConstraint(params.name, params);
			const tool = this.resolveToolWithVersion(params.name, constraint, correlationId);

			if (!tool) {
				throw new MCPToolVersionException(
					`Tool not found: ${params.name}${constraint ? ` (constraint: ${constraint})` : ''}`,
					'UNSATISFIED_TOOL_VERSION',
				);
			}

			// Execute the tool
			const result = await this.executeTool(tool, params.arguments, {
				correlationId,
				toolName: params.name,
				version: tool.version,
				requester: params._meta?.requester,
			});

			const toolCallResult: ToolCallResult = {
				content: result.content || [
					{
						type: 'text',
						text: typeof result === 'string' ? result : JSON.stringify(result),
					},
				],
				_correlationId: correlationId,
			};

			// Add version information if available
			if (tool.version) {
				toolCallResult._toolVersion = tool.version;
			}

			this.logStructured('tool_call_completed', {
				toolName: params.name,
				version: tool.version,
				correlationId,
				success: true,
			});

			return toolCallResult;
		} catch (error) {
			this.logStructured('tool_call_failed', {
				toolName: params.name,
				correlationId,
				error: error instanceof Error ? error.message : String(error),
				success: false,
			});

			throw error;
		}
	}

	/**
	 * Validate all tool requirements before execution
	 */
	private async validateToolRequirements(
		requirements: ToolRequirements,
		correlationId: string,
	): Promise<void> {
		const validationErrors: string[] = [];

		for (const [toolName, constraint] of Object.entries(requirements)) {
			if (!this.registry.isConstraintSatisfiable(toolName, constraint)) {
				validationErrors.push(`Tool ${toolName} constraint ${constraint} is not satisfiable`);
			}
		}

		if (validationErrors.length > 0) {
			throw new MCPToolVersionException(
				`Tool requirements validation failed: ${validationErrors.join('; ')}`,
				'UNSATISFIED_TOOL_VERSION',
			);
		}

		this.logStructured('tool_requirements_validated', {
			requirements,
			correlationId,
			validated: true,
		});
	}

	/**
	 * Get version constraint for a tool from call parameters
	 */
	private getToolConstraint(
		toolName: string,
		params: ToolCallParams,
	): VersionConstraint | undefined {
		// Priority order:
		// 1. tool_requirements in the call
		// 2. _meta.preferredVersions
		// 3. No constraint (latest)

		if (params.tool_requirements?.[toolName]) {
			return params.tool_requirements[toolName];
		}

		if (params._meta?.preferredVersions?.[toolName]) {
			return params._meta.preferredVersions[toolName];
		}

		return undefined;
	}

	/**
	 * Resolve tool with version constraints
	 */
	private resolveToolWithVersion(
		toolName: string,
		constraint: VersionConstraint | undefined,
		correlationId: string,
	): ToolDescriptor | null {
		const tool = this.registry.resolveTool(toolName, constraint);

		if (!tool) {
			this.logStructured('tool_resolution_failed', {
				toolName,
				constraint,
				correlationId,
				reason: 'tool_not_found',
			});
			return null;
		}

		this.logStructured('tool_resolved', {
			toolName,
			resolvedVersion: tool.version,
			constraint,
			correlationId,
		});

		return tool;
	}

	/**
	 * Execute a tool with proper error handling
	 */
	private async executeTool(tool: ToolDescriptor, args: any, context: any): Promise<any> {
		if (!tool.handler) {
			throw new MCPToolVersionException(
				`Tool ${tool.name} has no handler implementation`,
				'INVALID_TOOL_VERSION',
			);
		}

		try {
			// Add deprecation warning if applicable
			if (tool.metadata?.deprecationMessage) {
				this.logStructured('tool_deprecation_warning', {
					toolName: tool.name,
					version: tool.version,
					message: tool.metadata.deprecationMessage,
				});
			}

			// Execute the tool handler
			const result = await tool.handler(args, context);

			this.logStructured('tool_executed', {
				toolName: tool.name,
				version: tool.version,
				success: true,
			});

			return result;
		} catch (error) {
			this.logStructured('tool_execution_failed', {
				toolName: tool.name,
				version: tool.version,
				error: error instanceof Error ? error.message : String(error),
			});

			// Re-throw with context
			throw new MCPToolVersionException(
				`Tool execution failed: ${tool.name}${tool.version ? `@${tool.version}` : ''} - ${error instanceof Error ? error.message : String(error)}`,
				'UNSATISFIED_TOOL_VERSION',
			);
		}
	}

	/**
	 * Generate correlation ID for tracking
	 */
	private generateCorrelationId(): string {
		return `tool_${Date.now()}_${randomUUID().substring(0, 8)}`;
	}

	/**
	 * Enable or disable versioning feature
	 */
	setVersioningEnabled(enabled: boolean): void {
		this.versioningEnabled = enabled;
		this.logStructured('versioning_toggled', { enabled });
	}

	/**
	 * Check if versioning is enabled
	 */
	isVersioningEnabled(): boolean {
		return this.versioningEnabled;
	}

	/**
	 * Get handler statistics
	 */
	getStats(): {
		versioningEnabled: boolean;
		registryStats?: any;
	} {
		return {
			versioningEnabled: this.versioningEnabled,
			...(this.registry.getStats && { registryStats: this.registry.getStats() }),
		};
	}

	/**
	 * Log structured events with brAInwav branding
	 */
	private logStructured(event: string, data: any): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			event,
			brand: 'brAInwav',
			service: 'cortex-os-mcp-tool-call-handler',
			...data,
		};

		console.log(JSON.stringify(logEntry));
	}
}

/**
 * Factory function to create enhanced tool call handler
 */
export function createVersionedToolCallHandler(
	server: Server,
	registry: any,
	versioningEnabled = false,
): VersionedToolCallHandler {
	return new VersionedToolCallHandler(server, registry, versioningEnabled);
}

/**
 * Utility function to extract tool requirements from request metadata
 */
export function extractToolRequirements(request: any): ToolRequirements | undefined {
	// Check for tool requirements in various locations
	const meta = request._meta || request.meta || {};
	return meta.tool_requirements || meta.toolRequirements;
}

/**
 * Utility function to create standardized tool call parameters
 */
export function createToolCallParams(
	name: string,
	args?: any,
	options?: {
		toolRequirements?: ToolRequirements;
		correlationId?: string;
		requester?: string;
		preferredVersions?: ToolRequirements;
	},
): ToolCallParams {
	return {
		name,
		arguments: args,
		tool_requirements: options?.toolRequirements,
		_meta: {
			correlationId: options?.correlationId,
			requester: options?.requester,
			preferredVersions: options?.preferredVersions,
		},
	};
}
