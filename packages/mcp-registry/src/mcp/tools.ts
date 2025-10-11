/**
 * MCP tool contract definitions for the mcp-registry package.
 *
 * These definitions provide contract-first metadata, schemas, and
 * validation helpers for exposing Cortex MCP server registry over the Model Context
 * Protocol. Handlers implement the core registry operations: list, register, unregister,
 * and get server configurations.
 */

import { randomUUID } from 'node:crypto';
import type { ServerInfo } from '@cortex-os/mcp-core';
import { ZodError, type ZodIssue, type ZodType, z } from 'zod';
import { readAll, remove, upsert } from '../fs-store.js';
import { fetchMarketplaceServer, MarketplaceProviderError } from '../providers/mcpmarket.js';

interface RegistryToolResponse {
	content: Array<{ type: 'text'; text: string }>;
	metadata: {
		correlationId: string;
		timestamp: string;
		tool: string;
	};
	isError?: boolean;
}

interface RegistryTool {
	name: string;
	aliases?: string[];
	description: string;
	inputSchema: ZodType;
	handler: (params: unknown) => Promise<RegistryToolResponse>;
	invoke?: ToolContractInvoker;
}

class RegistryToolError extends Error {
	constructor(
		public code:
			| 'validation_error'
			| 'security_error'
			| 'not_found'
			| 'internal_error'
			| 'duplicate_server',
		message: string,
		public details: string[] = [],
	) {
		super(message);
		this.name = 'RegistryToolError';
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

export const MAX_SERVER_NAME_LENGTH = 128;
export const MAX_SERVER_DESCRIPTION_LENGTH = 512;
export const MAX_SERVERS_LIST_LIMIT = 100;

const SERVER_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function validateServerName(name: string): void {
	if (!SERVER_NAME_PATTERN.test(name)) {
		throw new RegistryToolError('validation_error', 'Invalid server name format', [
			'Server name must start with alphanumeric and contain only letters, numbers, dots, underscores, and hyphens',
		]);
	}
}

function createCorrelationId(): string {
	return randomUUID();
}

function createTimestamp(): string {
	return new Date().toISOString();
}

async function executeTool<T>(
	toolName: string,
	schema: ZodType<T>,
	params: unknown,
	handler: (validatedParams: T) => Promise<Record<string, unknown>>,
): Promise<RegistryToolResponse> {
	const correlationId = createCorrelationId();
	const timestamp = createTimestamp();

	try {
		const parsed = schema.parse(params);
		const result = await handler(parsed);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(result, null, 2),
				},
			],
			metadata: {
				correlationId,
				timestamp,
				tool: toolName,
			},
		};
	} catch (error) {
		if (error instanceof ZodError) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								error: 'validation_error',
								message: 'Input validation failed',
								issues: error.issues,
							},
							null,
							2,
						),
					},
				],
				metadata: {
					correlationId,
					timestamp,
					tool: toolName,
				},
				isError: true,
			};
		}

		if (error instanceof RegistryToolError) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								error: error.code,
								message: error.message,
								details: error.details,
							},
							null,
							2,
						),
					},
				],
				metadata: {
					correlationId,
					timestamp,
					tool: toolName,
				},
				isError: true,
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							error: 'internal_error',
							message: 'An unexpected error occurred',
							details: [error instanceof Error ? error.message : 'Unknown error'],
						},
						null,
						2,
					),
				},
			],
			metadata: {
				correlationId,
				timestamp,
				tool: toolName,
			},
			isError: true,
		};
	}
}

function createContractInvoker(toolName: string, schema: ZodType): ToolContractInvoker {
	return async (input: unknown): Promise<ToolContractResult> => {
		try {
			const parsed = schema.parse(input);
			return {
				type: 'result',
				result: {
					toolName,
					validatedInput: parsed,
					status: 'validated',
				},
			};
		} catch (error) {
			if (error instanceof ZodError) {
				return {
					type: 'error',
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Input validation failed',
						httpStatus: 400,
						retryable: false,
						details: { issues: error.issues },
					},
				};
			}

			return {
				type: 'error',
				error: {
					code: 'UNKNOWN_ERROR',
					message: 'An unexpected error occurred',
					httpStatus: 500,
					retryable: false,
				},
			};
		}
	};
}

// Schema definitions for MCP registry tools

export const registryListToolSchema = z.object({
	namePattern: z
		.string()
		.optional()
		.describe('Filter servers by name pattern (supports wildcards)'),
	transport: z
		.enum(['stdio', 'sse', 'http', 'ws', 'streamableHttp'])
		.optional()
		.describe('Filter servers by transport type'),
	tags: z.array(z.string()).optional().describe('Filter servers by tags'),
	limit: z
		.number()
		.int()
		.min(1)
		.max(MAX_SERVERS_LIST_LIMIT)
		.default(50)
		.describe('Maximum number of servers to return'),
	includeInactive: z.boolean().default(false).describe('Include servers marked as inactive'),
});

export const registryRegisterToolSchema = z.object({
	server: z
		.object({
			name: z.string().min(1).max(MAX_SERVER_NAME_LENGTH).describe('Unique server name'),
			transport: z
				.enum(['stdio', 'sse', 'http', 'ws', 'streamableHttp'])
				.describe('Transport type'),
			command: z
				.string()
				.optional()
				.describe('Command to execute the server (for stdio transport)'),
			args: z.array(z.string()).optional().describe('Command arguments (for stdio transport)'),
			env: z.record(z.string()).optional().describe('Environment variables (for stdio transport)'),
			endpoint: z.string().optional().describe('Endpoint URL (for http/ws transport)'),
			headers: z.record(z.string()).optional().describe('HTTP headers (for http transport)'),
		})
		.describe('Server configuration to register'),
	overwrite: z
		.boolean()
		.default(false)
		.describe('Whether to overwrite existing server with same name'),
});

export const registryUnregisterToolSchema = z.object({
	name: z.string().min(1).max(MAX_SERVER_NAME_LENGTH).describe('Name of server to unregister'),
	force: z.boolean().default(false).describe('Force removal even if server is active'),
});

export const registryGetToolSchema = z.object({
	name: z.string().min(1).max(MAX_SERVER_NAME_LENGTH).describe('Name of server to retrieve'),
	includeStatus: z.boolean().default(false).describe('Include server status information'),
});

export const registryStatsToolSchema = z.object({
        includeDetails: z.boolean().default(false).describe('Include detailed registry statistics'),
});

export const registryMarketplaceImportToolSchema = z.object({
        slug: z
                .string()
                .min(1)
                .max(MAX_SERVER_NAME_LENGTH)
                .regex(SERVER_NAME_PATTERN, 'Marketplace slug must be alphanumeric with . _ - characters')
                .describe('Slug of the marketplace server to import'),
        overwrite: z
                .boolean()
                .default(false)
                .describe('Overwrite existing registry entry if present'),
        timeoutMs: z
                .number()
                .int()
                .min(1000)
                .max(60000)
                .optional()
                .describe('Abort marketplace request if it exceeds this timeout in milliseconds'),
});

// Tool implementations

export const registryListTool: RegistryTool = {
	name: 'registry.list',
	aliases: ['mcp_registry_list', 'list_servers'],
	description: 'List registered MCP servers with optional filtering',
	inputSchema: registryListToolSchema,
	invoke: createContractInvoker('registry.list', registryListToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'registry.list',
			registryListToolSchema,
			params,
			async ({ namePattern, transport, tags, limit = 50 }) => {
				const servers = await readAll();

				// Apply filters
				let filtered = servers;

				if (namePattern) {
					const regex = new RegExp(namePattern.replace(/\*/g, '.*'), 'i');
					filtered = filtered.filter((server) => regex.test(server.name));
				}

				if (transport) {
					filtered = filtered.filter((server) => server.transport === transport);
				}

				if (tags && tags.length > 0) {
					// For now, filter by command or name containing tags
					filtered = filtered.filter((server) =>
						tags.some(
							(tag) =>
								server.name.toLowerCase().includes(tag.toLowerCase()) ||
								server.command?.toLowerCase().includes(tag.toLowerCase()),
						),
					);
				}

				// Apply limit
				const limited = filtered.slice(0, limit);

				return {
					servers: limited.map((server) => ({
						name: server.name,
						transport: server.transport,
						command: server.command,
						args: server.args,
						env: server.env,
						endpoint: server.endpoint,
						headers: server.headers,
					})),
					total: servers.length,
					filtered: filtered.length,
					returned: limited.length,
				};
			},
		),
};

export const registryRegisterTool: RegistryTool = {
	name: 'registry.register',
	aliases: ['mcp_registry_register', 'register_server'],
	description: 'Register a new MCP server in the registry',
	inputSchema: registryRegisterToolSchema,
	invoke: createContractInvoker('registry.register', registryRegisterToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'registry.register',
			registryRegisterToolSchema,
			params,
			async ({ server, overwrite = false }) => {
				validateServerName(server.name);

				// Check if server already exists
				const existingServers = await readAll();
				const existingServer = existingServers.find((s) => s.name === server.name);

				if (existingServer && !overwrite) {
					throw new RegistryToolError(
						'duplicate_server',
						`Server with name "${server.name}" already exists`,
						['Use overwrite=true to replace existing server'],
					);
				}

				const serverInfo: ServerInfo = {
					name: server.name,
					transport: server.transport,
					command: server.command,
					args: server.args,
					env: server.env,
					endpoint: server.endpoint,
					headers: server.headers,
				};

				await upsert(serverInfo);

				return {
					name: server.name,
					status: existingServer ? 'updated' : 'created',
					message: `Server "${server.name}" successfully ${existingServer ? 'updated' : 'registered'}`,
				};
			},
		),
};

export const registryUnregisterTool: RegistryTool = {
	name: 'registry.unregister',
	aliases: ['mcp_registry_unregister', 'unregister_server'],
	description: 'Unregister an MCP server from the registry',
	inputSchema: registryUnregisterToolSchema,
	invoke: createContractInvoker('registry.unregister', registryUnregisterToolSchema),
	handler: async (params: unknown) =>
		executeTool('registry.unregister', registryUnregisterToolSchema, params, async ({ name }) => {
			validateServerName(name);

			const removed = await remove(name);

			if (!removed) {
				throw new RegistryToolError('not_found', `Server with name "${name}" not found`, [
					'Verify the server name and try again',
				]);
			}

			return {
				name,
				status: 'removed',
				message: `Server "${name}" successfully unregistered`,
			};
		}),
};

export const registryGetTool: RegistryTool = {
	name: 'registry.get',
	aliases: ['mcp_registry_get', 'get_server'],
	description: 'Get details of a specific registered MCP server',
	inputSchema: registryGetToolSchema,
	invoke: createContractInvoker('registry.get', registryGetToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'registry.get',
			registryGetToolSchema,
			params,
			async ({ name, includeStatus = false }) => {
				validateServerName(name);

				const servers = await readAll();
				const server = servers.find((s) => s.name === name);

				if (!server) {
					throw new RegistryToolError('not_found', `Server with name "${name}" not found`, [
						'Verify the server name and try again',
					]);
				}

				return {
					server: {
						name: server.name,
						transport: server.transport,
						command: server.command,
						args: server.args,
						env: server.env,
						endpoint: server.endpoint,
						headers: server.headers,
						...(includeStatus && {
							status: {
								registered: true,
								lastModified: new Date().toISOString(),
							},
						}),
					},
					found: true,
				};
			},
		),
};

export const registryStatsTool: RegistryTool = {
        name: 'registry.stats',
        aliases: ['mcp_registry_stats', 'registry_statistics'],
        description: 'Get MCP registry statistics and health information',
        inputSchema: registryStatsToolSchema,
	invoke: createContractInvoker('registry.stats', registryStatsToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'registry.stats',
			registryStatsToolSchema,
			params,
			async ({ includeDetails = false }) => {
				const servers = await readAll();

				// Calculate statistics
				const transportCounts: Record<string, number> = {};
				const serversByType: Record<string, string[]> = {};

				for (const server of servers) {
					const transportKind = server.transport;
					transportCounts[transportKind] = (transportCounts[transportKind] || 0) + 1;

					if (!serversByType[transportKind]) {
						serversByType[transportKind] = [];
					}
					serversByType[transportKind].push(server.name);
				}

				return {
					totalServers: servers.length,
					transportCounts,
					lastUpdate: new Date().toISOString(),
					...(includeDetails && {
						details: {
							serversByTransport: serversByType,
							averageServersPerTransport:
								servers.length / Math.max(Object.keys(transportCounts).length, 1),
							registryHealth: 'healthy',
						},
					}),
				};
			},
                ),
};

export const registryMarketplaceImportTool: RegistryTool = {
        name: 'registry.marketplaceImport',
        aliases: ['marketplace_import', 'registry.marketplace_import'],
        description: 'Import an MCP server configuration directly from the MCP marketplace',
        inputSchema: registryMarketplaceImportToolSchema,
        invoke: createContractInvoker('registry.marketplaceImport', registryMarketplaceImportToolSchema),
        handler: async (params: unknown) =>
                executeTool(
                        'registry.marketplaceImport',
                        registryMarketplaceImportToolSchema,
                        params,
                        async ({ slug, overwrite = false, timeoutMs }) => {
                                validateServerName(slug);
                                return importMarketplaceServer({ slug, overwrite, timeoutMs });
                        },
                ),
};

// Export all Registry MCP tools
export const registryMcpTools: RegistryTool[] = [
        registryListTool,
        registryRegisterTool,
        registryUnregisterTool,
        registryGetTool,
        registryStatsTool,
        registryMarketplaceImportTool,
];

async function importMarketplaceServer({
        slug,
        overwrite,
        timeoutMs,
}: {
        slug: string;
        overwrite: boolean;
        timeoutMs?: number;
}): Promise<Record<string, unknown>> {
        const { signal, cancel } = createMarketplaceAbortController(timeoutMs);

        try {
                const marketplaceServer = await fetchMarketplaceServer(slug, { signal });
                const status = await upsertMarketplaceServer(marketplaceServer, overwrite);

                return {
                        name: marketplaceServer.name,
                        status,
                        source: 'mcpmarket',
                        importedAt: new Date().toISOString(),
                };
        } catch (error) {
                if (error instanceof MarketplaceProviderError) {
                        handleMarketplaceProviderError(error);
                }

                if (error instanceof DOMException && error.name === 'AbortError') {
                        throw new RegistryToolError('internal_error', 'Marketplace request timed out', [
                                'Increase timeoutMs or retry later',
                        ]);
                }

                throw error;
        } finally {
                cancel();
        }
}

function createMarketplaceAbortController(timeoutMs?: number): {
        signal?: AbortSignal;
        cancel: () => void;
} {
        if (!timeoutMs) {
                return { cancel: () => {} };
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        return {
                signal: controller.signal,
                cancel: () => {
                        clearTimeout(timer);
                },
        };
}

async function upsertMarketplaceServer(server: ServerInfo, overwrite: boolean): Promise<'created' | 'updated'> {
        const existingServers = await readAll();
        const existingServer = existingServers.find((candidate) => candidate.name === server.name);

        if (existingServer && !overwrite) {
                throw new RegistryToolError('duplicate_server', `Server with name "${server.name}" already exists`, [
                        'Use overwrite=true to replace existing server',
                ]);
        }

        await upsert(server);

        return existingServer ? 'updated' : 'created';
}

function handleMarketplaceProviderError(error: MarketplaceProviderError): never {
        const code: RegistryToolError['code'] =
                error.code === 'validation_error'
                        ? 'validation_error'
                        : error.code === 'not_found'
                        ? 'not_found'
                        : 'internal_error';

        throw new RegistryToolError(code, error.message, [...error.details, `marketplace_code:${error.code}`]);
}
