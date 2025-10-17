/**
 * MCP Client Types - Shared contracts for Agent MCP Client
 * @package @cortex-os/rag-contracts
 * @author brAInwav Team
 */

/**
 * Vendor-neutral MCP integration configuration
 */
export type MCPIntegrationConfig = Record<string, unknown>;

/**
 * Knowledge search filters for semantic queries
 */
export interface KnowledgeSearchFilters {
	category?: string[];
	source?: string[];
	dateRange?: { from?: string; to?: string };
	tags?: string[];
	contentType?: string[];
}

/**
 * Knowledge search result from MCP server
 */
export interface KnowledgeSearchResult {
	id: string;
	title: string;
	content: string;
	score: number;
	source: string;
	metadata: Record<string, unknown>;
	timestamp: string;
}

/**
 * Agent MCP Client interface for remote tool execution
 */
export interface AgentMCPClient {
	initialize(): Promise<unknown>;
	callTool(name: string, args: Record<string, unknown>, timeout?: number): Promise<unknown>;
	searchKnowledgeBase(
		query: string,
		options?: { limit?: number; filters?: KnowledgeSearchFilters },
	): Promise<KnowledgeSearchResult[]>;
	createTask(
		title: string,
		description: string,
		options?: Record<string, unknown>,
	): Promise<unknown>;
	updateTaskStatus(taskId: string, status: string, notes?: string): Promise<unknown>;
	uploadDocument(
		content: string,
		filename: string,
		options?: { tags?: string[]; metadata?: Record<string, unknown> },
	): Promise<{ documentId: string; url: string }>;
	healthCheck(): Promise<boolean>;
	disconnect(): Promise<void>;
}
