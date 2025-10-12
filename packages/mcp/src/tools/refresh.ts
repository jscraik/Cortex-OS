import { randomUUID } from 'crypto';
import type { MCPNotificationHandler } from '../notifications/handlers.js';
import type { Server, ServerLogger } from '../server.js';

/**
 * Manual refresh tool parameters
 */
export interface RefreshParams {
	scope?: 'prompts' | 'resources' | 'tools' | 'all';
	force?: boolean;
}

/**
 * Refresh tool result
 */
export interface RefreshResult {
	refreshed: {
		prompts: boolean;
		resources: boolean;
		tools: boolean;
	};
	timestamp: string;
	correlationId: string;
	message: string;
}

/**
 * Manual refresh tool for clients that don't support MCP notifications
 * Provides a way to manually trigger refresh of prompts, resources, and tools
 */
export class ManualRefreshTool {
	private server: Server;
	private notificationHandler: MCPNotificationHandler;
	private logger: ServerLogger;

	constructor(server: Server, notificationHandler: MCPNotificationHandler) {
		this.server = server;
		this.notificationHandler = notificationHandler;
		this.logger = server.getLogger();
	}

	/**
	 * Register the refresh tool with the server
	 */
	register(): void {
		this.server.registerTool({
			name: 'cortex_mcp_refresh',
			description:
				"[brAInwav] Manually refresh MCP prompts, resources, and tools list. Use this when clients don't support automatic notifications.",
			inputSchema: {
				type: 'object',
				properties: {
					scope: {
						type: 'string',
						enum: ['prompts', 'resources', 'tools', 'all'],
						description: 'What to refresh. Defaults to "all".',
						default: 'all',
					},
					force: {
						type: 'boolean',
						description: 'Force refresh even if no changes detected.',
						default: false,
					},
				},
				required: [],
			},
			handler: this.handleRefresh.bind(this),
		});

		this.logStructured('refresh_tool_registered', {});
	}

	/**
	 * Handle refresh tool execution
	 */
	private async handleRefresh(params: RefreshParams, context?: any): Promise<RefreshResult> {
		const correlationId = context?.correlationId || this.generateCorrelationId();
		const scope = params.scope || 'all';
		const force = params.force || false;

		this.logStructured('refresh_started', {
			scope,
			force,
			correlationId,
		});

		const refreshed = {
			prompts: false,
			resources: false,
			tools: false,
		};

		try {
			// Refresh based on scope
			if (scope === 'prompts' || scope === 'all') {
				await this.refreshPrompts(force, correlationId);
				refreshed.prompts = true;
			}

			if (scope === 'resources' || scope === 'all') {
				await this.refreshResources(force, correlationId);
				refreshed.resources = true;
			}

			if (scope === 'tools' || scope === 'all') {
				await this.refreshTools(force, correlationId);
				refreshed.tools = true;
			}

			const result: RefreshResult = {
				refreshed,
				timestamp: new Date().toISOString(),
				correlationId,
				message: this.buildRefreshMessage(scope, refreshed),
			};

			this.logStructured('refresh_completed', {
				scope,
				refreshed,
				correlationId,
				success: true,
			});

			return result;
		} catch (error) {
			this.logStructured('refresh_failed', {
				scope,
				correlationId,
				error: error instanceof Error ? error.message : String(error),
				success: false,
			});

			throw error;
		}
	}

	/**
	 * Refresh prompts and emit listChanged notification
	 */
	private async refreshPrompts(force: boolean, correlationId: string): Promise<void> {
		if (force) {
			// Force refresh by emitting notification even if no changes
			await this.notificationHandler.emitPromptsListChanged(correlationId);
		}

		this.logStructured('prompts_refreshed', {
			force,
			correlationId,
		});
	}

	/**
	 * Refresh resources and emit notifications
	 */
	private async refreshResources(force: boolean, correlationId: string): Promise<void> {
		if (force) {
			// Force refresh by emitting notifications even if no changes
			await this.notificationHandler.emitResourcesListChanged(correlationId);
		}

		this.logStructured('resources_refreshed', {
			force,
			correlationId,
		});
	}

	/**
	 * Refresh tools and emit listChanged notification
	 */
	private async refreshTools(force: boolean, correlationId: string): Promise<void> {
		if (force) {
			// Force refresh by emitting notification even if no changes
			await this.notificationHandler.emitToolsListChanged(correlationId);
		}

		this.logStructured('tools_refreshed', {
			force,
			correlationId,
		});
	}

	/**
	 * Build user-friendly refresh message
	 */
	private buildRefreshMessage(
		scope: string,
		refreshed: { prompts: boolean; resources: boolean; tools: boolean },
	): string {
		const refreshedItems: string[] = [];

		if (refreshed.prompts) {
			refreshedItems.push('prompts');
		}
		if (refreshed.resources) {
			refreshedItems.push('resources');
		}
		if (refreshed.tools) {
			refreshedItems.push('tools');
		}

		if (refreshedItems.length === 0) {
			return `[brAInwav] No items were refreshed for scope: ${scope}`;
		}

		return `[brAInwav] Successfully refreshed: ${refreshedItems.join(', ')}`;
	}

	/**
	 * Generate correlation ID for tracking
	 */
	private generateCorrelationId(): string {
		return `refresh_${Date.now()}_${randomUUID().substring(0, 8)}`;
	}

	/**
	 * Log structured events with brAInwav branding
	 */
	private logStructured(event: string, data: any): void {
		this.logger.info({
			timestamp: new Date().toISOString(),
			event,
			brand: 'brAInwav',
			service: 'cortex-os-mcp-refresh-tool',
			...data,
		});
	}
}

/**
 * Factory function to create manual refresh tool
 */
export function createManualRefreshTool(
	server: Server,
	notificationHandler: MCPNotificationHandler,
): ManualRefreshTool {
	return new ManualRefreshTool(server, notificationHandler);
}

/**
 * CLI helper function for manual refresh
 */
export async function refreshMCPResources(
	scope: RefreshParams['scope'] = 'all',
	force = false,
): Promise<void> {
	// This would be used by CLI tools like `pnpm mcp:refresh`
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			event: 'cli_refresh_initiated',
			brand: 'brAInwav',
			service: 'cortex-os-mcp-cli',
			scope,
			force,
		}),
	);

	// In a real implementation, this would connect to the MCP server
	// and call the refresh tool remotely
	console.log(`[brAInwav] Refresh requested for scope: ${scope}, force: ${force}`);
}

/**
 * Utility function to check if client needs manual refresh
 * Based on known client limitations
 */
export function needsManualRefresh(clientInfo?: { name?: string; version?: string }): boolean {
	// Known clients that don't support MCP notifications
	const clientsNeedingRefresh = ['claude-code', 'claude', 'anthropic-claude'];

	const clientName = clientInfo?.name?.toLowerCase() || '';

	return clientsNeedingRefresh.some((name) => clientName.includes(name));
}
