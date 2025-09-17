/**
 * MCP integration layer for cortex-marketplace
 *
 * This module provides the MCP server integration for the marketplace app,
 * exposing marketplace functionality as MCP tools.
 */

import type { MarketplaceService } from '../services/marketplace-service.js';
import type { RegistryService } from '../services/registry-service.js';
import {
	marketplaceMcpTools,
	listMarketplaceMcpTools,
	type MarketplaceToolResponse,
	MarketplaceToolError,
	createSuccessResponse,
	createErrorResponse,
} from './tools.js';

export interface MarketplaceMcpDeps {
	marketplaceService: MarketplaceService;
	registryService: RegistryService;
}

/**
 * MCP integration manager for the marketplace
 */
export class MarketplaceMcpIntegration {
	private readonly deps: MarketplaceMcpDeps;

	constructor(deps: MarketplaceMcpDeps) {
		this.deps = deps;
		this.wireToolHandlers();
	}

	/**
	 * Get list of available MCP tools
	 */
	listTools() {
		return listMarketplaceMcpTools();
	}

	/**
	 * Execute an MCP tool by name
	 */
	async executeTool(toolName: string, params: unknown): Promise<MarketplaceToolResponse> {
		try {
			// Find the tool (supporting aliases)
			const tool = listMarketplaceMcpTools().find(t => 
				t.name === toolName || t.aliases?.includes(toolName)
			);

			if (!tool) {
				return createErrorResponse(
					toolName,
					new MarketplaceToolError('validation_error', `Unknown tool: ${toolName}`),
				);
			}

			// Route to appropriate handler method
			let result: MarketplaceToolResponse;
			switch (tool.name) {
				case 'marketplace.search_servers':
					result = await this.handleSearchServers(params);
					break;
				case 'marketplace.get_server':
					result = await this.handleGetServer(params);
					break;
				case 'marketplace.list_categories':
					result = await this.handleListCategories();
					break;
				case 'marketplace.get_stats':
					result = await this.handleGetStats();
					break;
				default:
					return createErrorResponse(
						toolName,
						new MarketplaceToolError('validation_error', `Tool handler not implemented: ${tool.name}`),
					);
			}

			// Update metadata to reflect the tool name that was actually called (alias support)
			if (result.metadata) {
				result.metadata.tool = toolName;
			}

			return result;
		} catch (error) {
			return createErrorResponse(
				toolName,
				new MarketplaceToolError(
						'internal_error',
						error instanceof Error ? error.message : 'Unknown error occurred',
					),
			);
		}
	}	/**
	 * Wire up tool handlers to use the actual marketplace services
	 */
	private wireToolHandlers() {
		// Search servers
		const searchTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.search_servers');
		if (searchTool) {
			searchTool.handler = async (params: unknown): Promise<MarketplaceToolResponse> => {
				return this.handleSearchServers(params);
			};
		}

		// Get server
		const getServerTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.get_server');
		if (getServerTool) {
			getServerTool.handler = async (params: unknown): Promise<MarketplaceToolResponse> => {
				return this.handleGetServer(params);
			};
		}

		// Get install instructions
		const getInstallTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.get_install_instructions');
		if (getInstallTool) {
			getInstallTool.handler = async (params: unknown): Promise<MarketplaceToolResponse> => {
				return this.handleGetInstallInstructions(params);
			};
		}

		// List categories
		const listCategoriesTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.list_categories');
		if (listCategoriesTool) {
			listCategoriesTool.handler = async (): Promise<MarketplaceToolResponse> => {
				return this.handleListCategories();
			};
		}

		// Get category servers
		const getCategoryServersTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.get_category_servers');
		if (getCategoryServersTool) {
			getCategoryServersTool.handler = async (params: unknown): Promise<MarketplaceToolResponse> => {
				return this.handleGetCategoryServers(params);
			};
		}

		// Get stats
		const getStatsTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.get_stats');
		if (getStatsTool) {
			getStatsTool.handler = async (): Promise<MarketplaceToolResponse> => {
				return this.handleGetStats();
			};
		}

		// Get trending
		const getTrendingTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.get_trending');
		if (getTrendingTool) {
			getTrendingTool.handler = async (params: unknown): Promise<MarketplaceToolResponse> => {
				return this.handleGetTrending(params);
			};
		}

		// Get popular
		const getPopularTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.get_popular');
		if (getPopularTool) {
			getPopularTool.handler = async (params: unknown): Promise<MarketplaceToolResponse> => {
				return this.handleGetPopular(params);
			};
		}

		// Get top rated
		const getTopRatedTool = marketplaceMcpTools.find((t) => t.name === 'marketplace.get_top_rated');
		if (getTopRatedTool) {
			getTopRatedTool.handler = async (params: unknown): Promise<MarketplaceToolResponse> => {
				return this.handleGetTopRated(params);
			};
		}
	}

	/**
	 * Handle search servers tool
	 */
	private async handleSearchServers(params: unknown): Promise<MarketplaceToolResponse> {
		try {
			const input = params as {
				query?: string;
				category?: string;
				riskLevel?: 'low' | 'medium' | 'high';
				featured?: boolean;
				publisher?: string;
				minRating?: number;
				tags?: string[];
				capabilities?: Array<'tools' | 'resources' | 'prompts'>;
				limit?: number;
				offset?: number;
				sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
				sortOrder?: 'asc' | 'desc';
			};

			const searchRequest = {
				q: input.query,
				category: input.category,
				riskLevel: input.riskLevel,
				featured: input.featured,
				publisher: input.publisher,
				minRating: input.minRating,
				tags: input.tags,
				capabilities: input.capabilities,
				limit: input.limit ?? 20,
				offset: input.offset ?? 0,
				sortBy: input.sortBy ?? 'relevance',
				sortOrder: input.sortOrder ?? 'desc',
			};

			const result = await this.deps.marketplaceService.search(searchRequest);

			return createSuccessResponse('marketplace.search_servers', {
				success: true,
				servers: result.servers,
				meta: {
					total: result.total,
					offset: result.offset,
					limit: result.limit,
					facets: result.facets,
					query: input.query,
					filters: {
						category: input.category,
						riskLevel: input.riskLevel,
						featured: input.featured,
						publisher: input.publisher,
						minRating: input.minRating,
						tags: input.tags,
						capabilities: input.capabilities,
					},
					sort: {
						by: searchRequest.sortBy,
						order: searchRequest.sortOrder,
					},
				},
			});
		} catch (error) {
			return createErrorResponse(
				'marketplace.search_servers',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Server search failed',
				),
			);
		}
	}

	/**
	 * Handle get server tool
	 */
	private async handleGetServer(params: unknown): Promise<MarketplaceToolResponse> {
		try {
			// Validate input against the same schema used in the tool contract
			const { validateInput, GetServerInputSchema } = await import('./tools.js');
			
			try {
				validateInput(GetServerInputSchema, params);
			} catch (validationError) {
				return createErrorResponse(
					'marketplace.get_server',
					new MarketplaceToolError('validation_error', 
						validationError instanceof Error ? validationError.message : 'Invalid input parameters'
					),
				);
			}

			const input = params as { serverId: string };

			const server = await this.deps.marketplaceService.getServer(input.serverId);

			if (!server) {
				return createErrorResponse(
					'marketplace.get_server',
					new MarketplaceToolError('server_not_found', `Server with ID '${input.serverId}' not found`),
				);
			}

			return createSuccessResponse('marketplace.get_server', {
				success: true,
				server,
				serverId: input.serverId,
			});
		} catch (error) {
			return createErrorResponse(
				'marketplace.get_server',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Server retrieval failed',
				),
			);
		}
	}

	/**
	 * Handle get install instructions tool
	 */
	private async handleGetInstallInstructions(params: unknown): Promise<MarketplaceToolResponse> {
		try {
			const input = params as { serverId: string; client?: string };

			const server = await this.deps.marketplaceService.getServer(input.serverId);

			if (!server) {
				return createErrorResponse(
					'marketplace.get_install_instructions',
					new MarketplaceToolError('server_not_found', `Server with ID '${input.serverId}' not found`),
				);
			}

			// Extract installation data - using any for now as install structure is flexible
			const serverWithInstall = server as unknown as { install?: Record<string, unknown> };
			const installData = serverWithInstall.install ?? {};
			let instructions = '';
			let command = '';
			let config = {};

			if (input.client) {
				// Client-specific instructions
				switch (input.client) {
					case 'claude': {
						const claudeCommand = installData.claude;
						command = typeof claudeCommand === 'string' ? claudeCommand : '';
						instructions = command
							? `Run this command in Claude Desktop: ${command}`
							: 'Install via Claude settings';
						const jsonConfig = installData.json;
						config = (jsonConfig && typeof jsonConfig === 'object') ? jsonConfig : {};
						break;
					}
					case 'cline': {
						const clineCommand = installData.cline;
						command = typeof clineCommand === 'string' ? clineCommand : '';
						instructions = command
							? `Run this command in Cline: ${command}`
							: 'Install via Cline MCP settings';
						break;
					}
					case 'cursor': {
						const cursorCommand = installData.cursor;
						command = typeof cursorCommand === 'string' ? cursorCommand : '';
						instructions = command || 'Add to Cursor MCP configuration';
						break;
					}
					case 'continue': {
						const continueCommand = installData.continue;
						command = typeof continueCommand === 'string' ? continueCommand : '';
						instructions = command || 'Configure in Continue settings';
						break;
					}
					default:
						return createErrorResponse(
							'marketplace.get_install_instructions',
							new MarketplaceToolError('validation_error', `Unsupported client: ${input.client}`),
						);
				}

				return createSuccessResponse('marketplace.get_install_instructions', {
					success: true,
					serverId: input.serverId,
					client: input.client,
					installation: {
						command,
						instructions,
						config,
					},
				});
			} else {
				// Return all available installation options
				return createSuccessResponse('marketplace.get_install_instructions', {
					success: true,
					serverId: input.serverId,
					installation: {
						available: Object.keys(installData).filter((key) => key !== 'json'),
						options: {
							claude: installData.claude,
							cline: installData.cline,
							cursor: installData.cursor,
							continue: installData.continue,
						},
						config: installData.json,
					},
				});
			}
		} catch (error) {
			return createErrorResponse(
				'marketplace.get_install_instructions',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Install instructions retrieval failed',
				),
			);
		}
	}

	/**
	 * Handle list categories tool
	 */
	private async handleListCategories(): Promise<MarketplaceToolResponse> {
		try {
			const categories = await this.deps.marketplaceService.getCategories();

			return createSuccessResponse('marketplace.list_categories', {
				success: true,
				categories,
			});
		} catch (error) {
			return createErrorResponse(
				'marketplace.list_categories',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Categories retrieval failed',
				),
			);
		}
	}

	/**
	 * Handle get category servers tool
	 */
	private async handleGetCategoryServers(params: unknown): Promise<MarketplaceToolResponse> {
		try {
			const input = params as {
				category: string;
				limit?: number;
				offset?: number;
				sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
				sortOrder?: 'asc' | 'desc';
			};

			const searchRequest = {
				category: input.category,
				limit: input.limit ?? 20,
				offset: input.offset ?? 0,
				sortBy: input.sortBy ?? 'relevance',
				sortOrder: input.sortOrder ?? 'desc',
			};

			const result = await this.deps.marketplaceService.search(searchRequest);

			if (result.servers.length === 0) {
				// Check if category exists
				const categories = await this.deps.marketplaceService.getCategories();
				if (!categories[input.category]) {
					return createErrorResponse(
						'marketplace.get_category_servers',
						new MarketplaceToolError('category_not_found', `Category '${input.category}' not found`),
					);
				}
			}

			return createSuccessResponse('marketplace.get_category_servers', {
				success: true,
				category: input.category,
				servers: result.servers,
				meta: {
					total: result.total,
					offset: result.offset,
					limit: result.limit,
					sort: {
						by: searchRequest.sortBy,
						order: searchRequest.sortOrder,
					},
				},
			});
		} catch (error) {
			return createErrorResponse(
				'marketplace.get_category_servers',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Category servers retrieval failed',
				),
			);
		}
	}

	/**
	 * Handle get stats tool
	 */
	private async handleGetStats(): Promise<MarketplaceToolResponse> {
		try {
			const stats = await this.deps.marketplaceService.getStats();

			return createSuccessResponse('marketplace.get_stats', {
				success: true,
				stats,
			});
		} catch (error) {
			return createErrorResponse(
				'marketplace.get_stats',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Stats retrieval failed',
				),
			);
		}
	}

	/**
	 * Handle get trending tool
	 */
	private async handleGetTrending(params: unknown): Promise<MarketplaceToolResponse> {
		try {
			const input = params as { period?: 'day' | 'week' | 'month'; limit?: number };

			// For now, trending is based on recently updated servers
			const searchRequest = {
				sortBy: 'updated' as const,
				sortOrder: 'desc' as const,
				limit: input.limit ?? 10,
				offset: 0,
			};

			const result = await this.deps.marketplaceService.search(searchRequest);

			return createSuccessResponse('marketplace.get_trending', {
				success: true,
				period: input.period ?? 'week',
				servers: result.servers,
				meta: {
					limit: input.limit ?? 10,
					total: result.total,
					algorithm: 'recently_updated',
					note: 'Currently based on recent updates; download velocity tracking planned',
				},
			});
		} catch (error) {
			return createErrorResponse(
				'marketplace.get_trending',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Trending servers retrieval failed',
				),
			);
		}
	}

	/**
	 * Handle get popular tool
	 */
	private async handleGetPopular(params: unknown): Promise<MarketplaceToolResponse> {
		try {
			const input = params as { category?: string; limit?: number };

			const searchRequest = {
				category: input.category,
				sortBy: 'downloads' as const,
				sortOrder: 'desc' as const,
				limit: input.limit ?? 10,
				offset: 0,
			};

			const result = await this.deps.marketplaceService.search(searchRequest);

			return createSuccessResponse('marketplace.get_popular', {
				success: true,
				category: input.category,
				servers: result.servers,
				meta: {
					limit: input.limit ?? 10,
					total: result.total,
					sortedBy: 'download_count',
				},
			});
		} catch (error) {
			return createErrorResponse(
				'marketplace.get_popular',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Popular servers retrieval failed',
				),
			);
		}
	}

	/**
	 * Handle get top rated tool
	 */
	private async handleGetTopRated(params: unknown): Promise<MarketplaceToolResponse> {
		try {
			const input = params as { category?: string; minDownloads?: number; limit?: number };

			// First get more results to filter by download count
			const searchRequest = {
				category: input.category,
				sortBy: 'rating' as const,
				sortOrder: 'desc' as const,
				limit: 100, // Get more results to filter
				offset: 0,
			};

			const result = await this.deps.marketplaceService.search(searchRequest);

			// Filter by minimum downloads and apply final limit
			const minDownloads = input.minDownloads ?? 100;
			const limit = input.limit ?? 10;
			const filtered = result.servers
				.filter((server) => {
					// Type assertion for marketplace-specific properties
					const serverWithStats = server as unknown as { downloads?: number };
					return (serverWithStats.downloads || 0) >= minDownloads;
				})
				.slice(0, limit);

			return createSuccessResponse('marketplace.get_top_rated', {
				success: true,
				category: input.category,
				minDownloads,
				servers: filtered,
				meta: {
					limit,
					totalBeforeFiltering: result.total,
					filteredCount: filtered.length,
					sortedBy: 'rating',
					minDownloadThreshold: minDownloads,
				},
			});
		} catch (error) {
			return createErrorResponse(
				'marketplace.get_top_rated',
				new MarketplaceToolError(
					'internal_error',
					error instanceof Error ? error.message : 'Top rated servers retrieval failed',
				),
			);
		}
	}
}

/**
 * Factory function to create MCP integration with dependencies
 */
export function createMarketplaceMcpIntegration(deps: MarketplaceMcpDeps): MarketplaceMcpIntegration {
	return new MarketplaceMcpIntegration(deps);
}