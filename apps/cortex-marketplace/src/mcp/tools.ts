/**
 * MCP tool contract definitions for the cortex-marketplace package.
 *
 * These definitions provide contract-first metadata, schemas, and
 * validation helpers for exposing Cortex marketplace capabilities over the Model Context
 * Protocol. These tools enable agents to search, discover, and install MCP servers.
 */

import { randomUUID } from 'node:crypto';
import { ZodError, type ZodIssue, type ZodType, z } from 'zod';

interface MarketplaceToolResponse {
	content: Array<{ type: 'text'; text: string }>;
	metadata: {
		correlationId: string;
		timestamp: string;
		tool: string;
	};
	isError?: boolean;
}

interface MarketplaceTool {
	name: string;
	aliases?: string[];
	description: string;
	inputSchema: ZodType;
	handler: (params: unknown) => Promise<MarketplaceToolResponse>;
	invoke?: ToolContractInvoker;
}

class MarketplaceToolError extends Error {
	constructor(
		public code:
			| 'validation_error'
			| 'server_not_found'
			| 'category_not_found'
			| 'service_error'
			| 'internal_error',
		message: string,
		public details: string[] = [],
	) {
		super(message);
		this.name = 'MarketplaceToolError';
	}
}

type ContractErrorDetail = { issues: ZodIssue[] } | undefined;

type ContractInvocationError = {
	code: string;
	message: string;
	httpStatus: number;
	retryable: boolean;
	details?: ContractErrorDetail;
};

type ToolContractResult =
	| { type: 'error'; error: ContractInvocationError }
	| { type: 'result'; result: Record<string, unknown> };

type ToolContractInvoker = (
	input: unknown,
	context?: Record<string, unknown>,
) => Promise<ToolContractResult>;

// Constants
export const MAX_SEARCH_LIMIT = 100;
export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_STATS_LIMIT = 50;

// Validation schemas
const ServerIdSchema = z
	.string()
	.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, 'Invalid server ID format')
	.min(1)
	.max(128);

const CategoryNameSchema = z
	.string()
	.regex(/^[a-zA-Z0-9._-]+$/, 'Invalid category name format')
	.min(1)
	.max(64);

const ClientTypeSchema = z.enum(['claude', 'cline', 'cursor', 'continue', 'devin', 'windsurf']);

const SearchSortBySchema = z.enum(['relevance', 'downloads', 'rating', 'updated']);
const SortOrderSchema = z.enum(['asc', 'desc']);
const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
const CapabilitySchema = z.enum(['tools', 'resources', 'prompts']);

// Input schemas for MCP tools
const SearchServersInputSchema = z.object({
	query: z.string().optional().describe('Search query string'),
	category: CategoryNameSchema.optional().describe('Filter by category'),
	riskLevel: RiskLevelSchema.optional().describe('Filter by security risk level'),
	featured: z.boolean().optional().describe('Filter to only featured servers'),
	publisher: z.string().optional().describe('Filter by publisher name'),
	minRating: z.number().min(0).max(5).optional().describe('Minimum rating filter'),
	tags: z.array(z.string()).optional().describe('Filter by tags'),
	capabilities: z.array(CapabilitySchema).optional().describe('Filter by capabilities'),
	limit: z
		.number()
		.min(1)
		.max(MAX_SEARCH_LIMIT)
		.default(DEFAULT_SEARCH_LIMIT)
		.describe('Maximum results to return'),
	offset: z.number().min(0).default(0).describe('Number of results to skip'),
	sortBy: SearchSortBySchema.default('relevance').describe('Sort criteria'),
	sortOrder: SortOrderSchema.default('desc').describe('Sort order'),
});

const GetServerInputSchema = z.object({
	serverId: ServerIdSchema.describe('The server ID to retrieve'),
});

const GetInstallInstructionsInputSchema = z.object({
	serverId: ServerIdSchema.describe('The server ID for installation instructions'),
	client: ClientTypeSchema.optional().describe('Target client for installation instructions'),
});

const GetCategoryServersInputSchema = z.object({
	category: CategoryNameSchema.describe('Category name'),
	limit: z
		.number()
		.min(1)
		.max(MAX_SEARCH_LIMIT)
		.default(DEFAULT_SEARCH_LIMIT)
		.describe('Maximum results to return'),
	offset: z.number().min(0).default(0).describe('Number of results to skip'),
	sortBy: SearchSortBySchema.default('relevance').describe('Sort criteria'),
	sortOrder: SortOrderSchema.default('desc').describe('Sort order'),
});

const GetTrendingInputSchema = z.object({
	period: z
		.enum(['day', 'week', 'month'])
		.default('week')
		.describe('Time period for trending analysis'),
	limit: z.number().min(1).max(MAX_STATS_LIMIT).default(10).describe('Maximum results to return'),
});

const GetPopularInputSchema = z.object({
	category: CategoryNameSchema.optional().describe('Filter by category'),
	limit: z.number().min(1).max(MAX_STATS_LIMIT).default(10).describe('Maximum results to return'),
});

const GetTopRatedInputSchema = z.object({
	category: CategoryNameSchema.optional().describe('Filter by category'),
	minDownloads: z.number().min(0).default(100).describe('Minimum download count filter'),
	limit: z.number().min(1).max(MAX_STATS_LIMIT).default(10).describe('Maximum results to return'),
});

// Helper functions
function createSuccessResponse(
	tool: string,
	data: unknown,
	correlationId?: string,
): MarketplaceToolResponse {
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify(data, null, 2),
			},
		],
		metadata: {
			correlationId: correlationId || randomUUID(),
			timestamp: new Date().toISOString(),
			tool,
		},
	};
}

function createErrorResponse(
	tool: string,
	error: MarketplaceToolError,
	correlationId?: string,
): MarketplaceToolResponse {
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify(
					{
						error: {
							code: error.code,
							message: error.message,
							details: error.details,
						},
					},
					null,
					2,
				),
			},
		],
		metadata: {
			correlationId: correlationId || randomUUID(),
			timestamp: new Date().toISOString(),
			tool,
		},
		isError: true,
	};
}

function validateInput<T>(schema: ZodType<T>, input: unknown): T {
	try {
		return schema.parse(input);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new MarketplaceToolError(
				'validation_error',
				'Invalid input parameters',
				error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
			);
		}
		throw error;
	}
}

// MCP Tool definitions
export const marketplaceMcpTools: MarketplaceTool[] = [
	{
		name: 'marketplace.search_servers',
		aliases: ['search', 'find_servers'],
		description:
			'Search and filter MCP servers in the marketplace with various criteria including text search, categories, ratings, and capabilities.',
		inputSchema: SearchServersInputSchema,
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(SearchServersInputSchema, params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.search_servers', error);
				}
				return createErrorResponse(
					'marketplace.search_servers',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
	{
		name: 'marketplace.get_server',
		aliases: ['server_details', 'get_server_info'],
		description:
			'Get detailed information about a specific MCP server including capabilities, installation instructions, and metadata.',
		inputSchema: GetServerInputSchema,
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(GetServerInputSchema, params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.get_server', error);
				}
				return createErrorResponse(
					'marketplace.get_server',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
	{
		name: 'marketplace.get_install_instructions',
		aliases: ['install', 'install_server'],
		description:
			'Get client-specific installation instructions and commands for a MCP server, supporting various AI clients like Claude, Cline, etc.',
		inputSchema: GetInstallInstructionsInputSchema,
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(GetInstallInstructionsInputSchema, params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.get_install_instructions', error);
				}
				return createErrorResponse(
					'marketplace.get_install_instructions',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
	{
		name: 'marketplace.list_categories',
		aliases: ['categories', 'get_categories'],
		description: 'Get all available server categories with their descriptions and server counts.',
		inputSchema: z.object({}), // No input parameters required
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(z.object({}), params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.list_categories', error);
				}
				return createErrorResponse(
					'marketplace.list_categories',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
	{
		name: 'marketplace.get_category_servers',
		aliases: ['category_servers'],
		description: 'Get all servers in a specific category with sorting and pagination options.',
		inputSchema: GetCategoryServersInputSchema,
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(GetCategoryServersInputSchema, params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.get_category_servers', error);
				}
				return createErrorResponse(
					'marketplace.get_category_servers',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
	{
		name: 'marketplace.get_stats',
		aliases: ['stats', 'marketplace_stats'],
		description:
			'Get overall marketplace statistics including total servers, downloads, publishers, and category breakdowns.',
		inputSchema: z.object({}), // No input parameters required
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(z.object({}), params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.get_stats', error);
				}
				return createErrorResponse(
					'marketplace.get_stats',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
	{
		name: 'marketplace.get_trending',
		aliases: ['trending', 'trending_servers'],
		description:
			'Get trending MCP servers based on recent activity, downloads, or updates for a specified time period.',
		inputSchema: GetTrendingInputSchema,
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(GetTrendingInputSchema, params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.get_trending', error);
				}
				return createErrorResponse(
					'marketplace.get_trending',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
	{
		name: 'marketplace.get_popular',
		aliases: ['popular', 'popular_servers'],
		description:
			'Get the most downloaded and popular MCP servers, optionally filtered by category.',
		inputSchema: GetPopularInputSchema,
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(GetPopularInputSchema, params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.get_popular', error);
				}
				return createErrorResponse(
					'marketplace.get_popular',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
	{
		name: 'marketplace.get_top_rated',
		aliases: ['top_rated', 'best_rated'],
		description:
			'Get the highest rated MCP servers, optionally filtered by category and minimum download count.',
		inputSchema: GetTopRatedInputSchema,
		handler: async (params: unknown): Promise<MarketplaceToolResponse> => {
			try {
				// Validate input
				validateInput(GetTopRatedInputSchema, params);

				// TODO: This will be wired to MarketplaceMcpService in next step
				throw new MarketplaceToolError('internal_error', 'MCP service integration required');
			} catch (error) {
				if (error instanceof MarketplaceToolError) {
					return createErrorResponse('marketplace.get_top_rated', error);
				}
				return createErrorResponse(
					'marketplace.get_top_rated',
					new MarketplaceToolError('internal_error', 'Unexpected error occurred'),
				);
			}
		},
	},
];

/**
 * Helper function to list all marketplace MCP tools for registration
 */
export function listMarketplaceMcpTools() {
	return marketplaceMcpTools.map((tool) => ({
		name: tool.name,
		description: tool.description,
		aliases: tool.aliases,
	}));
}

/**
 * Helper function to execute a marketplace MCP tool by name
 */
export async function executeMarketplaceMcpTool(
	toolName: string,
	params: unknown,
): Promise<MarketplaceToolResponse> {
	const tool = marketplaceMcpTools.find(
		(t) => t.name === toolName || t.aliases?.includes(toolName),
	);

	if (!tool) {
		return createErrorResponse(
			toolName,
			new MarketplaceToolError('validation_error', `Unknown tool: ${toolName}`),
		);
	}

	return tool.handler(params);
}

// Export types and classes for use in service implementations
export type { MarketplaceTool, MarketplaceToolResponse, ToolContractInvoker, ToolContractResult };

export { MarketplaceToolError };

// Export individual input schemas for service layer use
export {
	SearchServersInputSchema,
	GetServerInputSchema,
	GetInstallInstructionsInputSchema,
	GetCategoryServersInputSchema,
	GetTrendingInputSchema,
	GetPopularInputSchema,
	GetTopRatedInputSchema,
	validateInput,
	createSuccessResponse,
	createErrorResponse,
};
