#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createAgentToolkitMcpTools } from '@cortex-os/agent-toolkit';
import {
	initializeMetrics,
	observeHybridSearch,
} from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import {
	type MetricsServerHandle,
	startMetricsServer,
} from '@cortex-os/mcp-bridge/runtime/telemetry/metrics-server';
import {
	initializeTracing,
	shutdownTracing,
	withSpan,
} from '@cortex-os/mcp-bridge/runtime/telemetry/tracing';
import { resolveTransport } from '@cortex-os/mcp-bridge/runtime/transport';
import {
	createMemoryProviderFromEnv,
	type Memory,
	type MemorySearchResult,
} from '@cortex-os/memory-core';
import {
	MemoryAnalysisInputSchema,
	MemoryRelationshipsInputSchema,
	MemorySearchInputSchema,
	MemoryStatsInputSchema,
	MemoryStoreInputSchema,
} from '@cortex-os/tool-spec';
import { execa } from 'execa';
import { FastMCP } from 'fastmcp';
import { pino } from 'pino';
import { z } from 'zod';
import {
	adaptStoreInput,
	adaptSearchInput,
	adaptGetInput,
	hasAnalysis,
	hasRelationships,
	hasStats,
} from './adapters/memory-adapters.js';
import { normalizePiecesResults } from './pieces-normalizer.js';
import { PiecesMCPProxy } from './pieces-proxy.js';
import { performLocalHybridSearch } from './search-utils.js';
import { createHttpAuthenticator, type HttpAuthContext } from './security/http-auth.js';

const logger = pino({
	level: process.env.MCP_LOG_LEVEL ?? 'info',
	redact: {
		paths: [
			'req.headers.authorization',
			'req.headers.Authorization',
			'req.headers.x-api-key',
			'req.headers.X-API-Key',
			'*.token',
			'*.secret',
			'*.apiKey',
			'*.password',
		],
		remove: true,
	},
});

const BRAND = {
	prefix: 'brAInwav',
	serverName: 'brAInwav Cortex Memory Server',
	healthMessage: 'brAInwav Cortex Memory Server - Operational',
	connectLog: 'brAInwav MCP client connected',
} as const;

initializeMetrics(BRAND.prefix);
const parseBooleanEnv = (value: string | undefined, defaultValue: boolean) => {
	if (value === undefined) {
		return defaultValue;
	}
	const normalized = value.trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(normalized)) {
		return true;
	}
	if (['0', 'false', 'no', 'off'].includes(normalized)) {
		return false;
	}
	return defaultValue;
};

const METRICS_ENABLED = parseBooleanEnv(process.env.MCP_METRICS_ENABLED, false);
const METRICS_HOST = process.env.MCP_METRICS_HOST ?? '127.0.0.1';
const metricsPortEnv = Number.parseInt(process.env.MCP_METRICS_PORT ?? '', 10);
const METRICS_PORT = Number.isNaN(metricsPortEnv) ? 9464 : metricsPortEnv;
let metricsServer: MetricsServerHandle | null = null;

const DEFAULT_HTTP_HOST = process.env.MCP_HOST ?? '0.0.0.0';
const DEFAULT_HTTP_ENDPOINT = process.env.MCP_HTTP_ENDPOINT ?? '/mcp';
const DEFAULT_SSE_ENDPOINT = process.env.MCP_SSE_ENDPOINT ?? '/sse';
const MAX_TITLE_LENGTH = 100;
const CLOUDFLARED_CONFIG_PATH = 'config/cloudflared/mcp-tunnel.yml';

const PIECES_MCP_ENDPOINT =
	process.env.PIECES_MCP_ENDPOINT ?? 'http://localhost:39300/model_context_protocol/2024-11-05/sse';
const PIECES_MCP_ENABLED = process.env.PIECES_MCP_ENABLED !== 'false';

const memoryProvider = createMemoryProviderFromEnv();
const authLogIntervalEnv = Number.parseInt(process.env.MCP_AUTH_LOG_INTERVAL ?? '', 10);

const httpAuthenticator = createHttpAuthenticator({
	brandPrefix: BRAND.prefix,
	connectLogMessage: BRAND.connectLog,
	logger,
	logInterval: Number.isNaN(authLogIntervalEnv) ? undefined : authLogIntervalEnv,
});

httpAuthenticator.logAcceptedHeaders();

const piecesProxy = PIECES_MCP_ENABLED
	? new PiecesMCPProxy({ endpoint: PIECES_MCP_ENDPOINT, enabled: true, logger })
	: null;

const server = new FastMCP<HttpAuthContext>({
	authenticate: httpAuthenticator.authenticate,
	name: 'brainwav-cortex-memory',
	version: '3.0.0',
	ping: { enabled: true, intervalMs: 20_000, logLevel: 'debug' },
	health: {
		enabled: true,
		message: BRAND.healthMessage,
		path: '/health',
		status: 200,
	},
});

const runTool = async <T>(toolName: string, execute: () => Promise<T>) => {
	return withSpan(`mcp.tool.${toolName}`, { 'mcp.tool': toolName }, execute);
};

const createSearchResponse = (memories: MemorySearchResult[]) => ({
	content: [
		{
			type: 'text' as const,
			text: JSON.stringify(
				{
					results: memories.map((memory, index) => ({
						id: memory.id,
						title: memory.content?.slice(0, MAX_TITLE_LENGTH) ?? `Memory ${index + 1}`,
						url: `memory://cortex-os/${memory.id}`,
					})),
				},
				null,
				2,
			),
		},
	],
});

const createFetchResponse = (memory: Memory, id: string) => ({
	content: [
		{
			type: 'text' as const,
			text: JSON.stringify(
				{
					id,
					title: memory.content?.slice(0, MAX_TITLE_LENGTH) ?? `Memory ${id}`,
					text: memory.content ?? 'No content available',
					url: `memory://cortex-os/${id}`,
					metadata: {
						source: 'brainwav-cortex-memory',
						tags: memory.tags,
						importance: memory.importance,
						domain: memory.domain,
					},
				},
				null,
				2,
			),
		},
	],
});

server.addTool({
	name: 'memory.store',
	description: 'Store a memory with metadata and optional embedding',
	parameters: MemoryStoreInputSchema,
	annotations: { idempotentHint: false, title: 'brAInwav Memory Storage' },
	async execute(args) {
		return runTool('memory.store', async () => {
			logger.info({ branding: BRAND.prefix, tool: 'memory.store' }, 'Storing memory');
			// Adapt schema: content -> text for memory provider
			const adapted = adaptStoreInput(args as any);
			const result = await memoryProvider.store(adapted);
			return JSON.stringify(result, null, 2);
		});
	},
});

server.addTool({
	name: 'memory.search',
	description: 'Search memories using semantic or keyword search',
	parameters: MemorySearchInputSchema,
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: 'brAInwav Memory Search',
	},
	async execute(args) {
		return runTool('memory.search', async () => {
			logger.info({ branding: BRAND.prefix, tool: 'memory.search' }, 'Searching memories');
			// Adapt schema: searchType -> search_type, remove limit from provider call
			const adapted = adaptSearchInput(args as any);
			const result = await memoryProvider.search(adapted);
			return JSON.stringify(result, null, 2);
		});
	},
});

server.addTool({
	name: 'memory.analysis',
	description: 'Analyze memories with AI-powered insights',
	parameters: MemoryAnalysisInputSchema,
	annotations: { readOnlyHint: true, title: 'brAInwav Memory Analysis' },
	async execute(args, context) {
		return runTool('memory.analysis', async () => {
			logger.info({ branding: BRAND.prefix, tool: 'memory.analysis' }, 'Analyzing memories');
			if (context?.streamContent) {
				try {
					await context.streamContent({ type: 'text', text: 'Starting analysis...\n' });
					if (context.reportProgress) {
						await context.reportProgress({ progress: 0, total: 3 });
					}
				} catch {
					logger.debug({ branding: BRAND.prefix }, 'Streaming unsupported, continuing');
				}
			}
			// Type guard: check if provider has analysis capability
			if (!hasAnalysis(memoryProvider)) {
				throw new Error('Memory provider does not support analysis');
			}
			const result = await memoryProvider.analysis(args);
			if (context?.streamContent) {
				try {
					await context.streamContent({ type: 'text', text: 'Analysis complete!\n' });
					if (context.reportProgress) {
						await context.reportProgress({ progress: 3, total: 3 });
					}
				} catch {
					// ignore streaming errors
				}
			}
			return JSON.stringify(result, null, 2);
		});
	},
});

server.addTool({
	name: 'memory.relationships',
	description: 'Manage and query relationships between memories',
	parameters: MemoryRelationshipsInputSchema,
	annotations: {
		destructiveHint: true,
		title: 'brAInwav Memory Relationships',
	},
	async execute(args) {
		return runTool('memory.relationships', async () => {
			logger.info(
				{ branding: BRAND.prefix, tool: 'memory.relationships' },
				'Managing relationships',
			);
			// Type guard: check if provider has relationships capability
			if (!hasRelationships(memoryProvider)) {
				throw new Error('Memory provider does not support relationships');
			}
			const result = await memoryProvider.relationships(args);
			return JSON.stringify(result, null, 2);
		});
	},
});

server.addTool({
	name: 'memory.stats',
	description: 'Get statistics and metrics about stored memories',
	parameters: MemoryStatsInputSchema,
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: 'brAInwav Memory Statistics',
	},
	async execute(args) {
		return runTool('memory.stats', async () => {
			logger.info({ branding: BRAND.prefix, tool: 'memory.stats' }, 'Retrieving stats');
			// Type guard: check if provider has stats capability
			if (!hasStats(memoryProvider)) {
				throw new Error('Memory provider does not support stats');
			}
			const result = await memoryProvider.stats(args);
			return JSON.stringify(result, null, 2);
		});
	},
});

server.addTool({
	name: 'search',
	description:
		'Search for relevant documents and memories. Returns citations compatible with ChatGPT.',
	parameters: z.object({ query: z.string().describe('Search query string') }),
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: 'brAInwav Search (ChatGPT Compatible)',
	},
	async execute(args) {
		return runTool('search', async () => {
			logger.info({ branding: BRAND.prefix, tool: 'search', query: args.query }, 'ChatGPT search');
			const results = await performLocalHybridSearch(memoryProvider, args.query, { limit: 10 });
			return createSearchResponse(results);
		});
	},
});

server.addTool({
	name: 'fetch',
	description: 'Retrieve complete document content by ID for detailed analysis and citation.',
	parameters: z.object({ id: z.string().describe('Unique identifier to fetch') }),
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: 'brAInwav Fetch (ChatGPT Compatible)',
	},
	async execute(args) {
		return runTool('fetch', async () => {
			logger.info({ branding: BRAND.prefix, tool: 'fetch', id: args.id }, 'ChatGPT fetch');
			// Adapt GetMemoryInput to string for provider
			const memoryId = adaptGetInput(args as any);
			const memory = await memoryProvider.get(memoryId);
			if (!memory) {
				throw new Error(`Document with ID "${args.id}" not found`);
			}
			// Memory interface already matches the expected return type
			return memory;
		});
	},
});

const CODEBASE_SEARCH_ENABLED = process.env.CODEBASE_SEARCH_ENABLED !== 'false';
const CODEBASE_ROOT = process.env.CODEBASE_ROOT || process.cwd();

if (CODEBASE_SEARCH_ENABLED) {
	server.addTool({
		name: 'codebase.search',
		description: 'Search codebase using ripgrep for patterns or snippets',
		parameters: z.object({
			pattern: z.string().describe('Search pattern or regex'),
			path: z.string().optional().describe('Optional path within repo'),
			fileType: z.string().optional().describe('Optional file extension filter'),
			ignoreCase: z.boolean().optional().default(false).describe('Case-insensitive search'),
			maxResults: z.number().optional().default(50).describe('Maximum number of results'),
		}),
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			title: 'brAInwav Codebase Search',
		},
		async execute(args) {
			return runTool('codebase.search', async () => {
				logger.info(
					{ branding: BRAND.prefix, tool: 'codebase.search', args },
					'Searching codebase',
				);
				const searchPath = args.path ? `${CODEBASE_ROOT}/${args.path}` : CODEBASE_ROOT;
				const rgArgs = ['--json', '--max-count', String(args.maxResults)];
				if (args.ignoreCase) rgArgs.push('--ignore-case');
				if (args.fileType) rgArgs.push('--type', args.fileType);
				rgArgs.push(args.pattern, searchPath);
				try {
					const { stdout } = await execa('rg', rgArgs, { timeout: 30_000, reject: false });
					const results = stdout
						.split('\n')
						.filter((line) => line.trim())
						.map((line) => {
							try {
								return JSON.parse(line);
							} catch {
								return null;
							}
						})
						.filter((entry) => entry?.type === 'match')
						.map((entry) => ({
							file: entry.data.path.text,
							line: entry.data.line_number,
							content: entry.data.lines.text.trim(),
						}));
					return JSON.stringify(
						{
							pattern: args.pattern,
							matches: results.length,
							results: results.slice(0, args.maxResults),
						},
						null,
						2,
					);
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error);
					logger.error({ branding: BRAND.prefix, error: msg }, 'Codebase search failed');
					return JSON.stringify(
						{ error: 'Search failed', message: msg, pattern: args.pattern },
						null,
						2,
					);
				}
			});
		},
	});

	server.addTool({
		name: 'codebase.files',
		description: 'List files in the codebase matching a pattern',
		parameters: z.object({
			pattern: z.string().optional().describe('Optional filename regex'),
			path: z.string().optional().describe('Optional path within repo'),
			fileType: z.string().optional().describe('Optional file extension filter'),
			maxResults: z.number().optional().default(100).describe('Maximum number of results'),
		}),
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			title: 'brAInwav List Files',
		},
		async execute(args) {
			return runTool('codebase.files', async () => {
				logger.info({ branding: BRAND.prefix, tool: 'codebase.files', args }, 'Listing files');
				const searchPath = args.path ? `${CODEBASE_ROOT}/${args.path}` : CODEBASE_ROOT;
				const rgArgs = ['--files'];
				if (args.fileType) rgArgs.push('--type', args.fileType);
				rgArgs.push(searchPath);
				try {
					const { stdout } = await execa('rg', rgArgs, { timeout: 10_000, reject: false });
					let files = stdout.split('\n').filter((file) => file.trim());
					if (args.pattern) {
						const regex = new RegExp(args.pattern, 'i');
						files = files.filter((file) => regex.test(file));
					}
					return JSON.stringify(
						{
							path: searchPath,
							count: files.length,
							files: files.slice(0, args.maxResults),
						},
						null,
						2,
					);
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error);
					logger.error({ branding: BRAND.prefix, error: msg }, 'File listing failed');
					return JSON.stringify({ error: 'File listing failed', message: msg }, null, 2);
				}
			});
		},
	});

	logger.info({ branding: BRAND.prefix, root: CODEBASE_ROOT }, 'Codebase tools enabled');
}

server.addTool({
	name: 'memory.hybrid_search',
	description:
		'Search across both local Cortex memory and remote Pieces LTM. Merges and reranks results.',
	parameters: z.object({
		query: z.string().describe('Search query string'),
		limit: z.number().optional().default(10).describe('Maximum results to return'),
		include_pieces: z.boolean().optional().default(true).describe('Include Pieces LTM results'),
		chat_llm: z.string().optional().describe('LLM model name for Pieces context'),
	}),
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: 'brAInwav Hybrid Memory Search',
	},
	async execute(args) {
		return runTool('memory.hybrid_search', async () => {
			const start = performance.now();
			logger.info(
				{ branding: BRAND.prefix, tool: 'memory.hybrid_search', query: args.query },
				'Hybrid search',
			);
			const localResults = await performLocalHybridSearch(memoryProvider, args.query, {
				limit: args.limit,
			});
			let piecesResults = [] as ReturnType<typeof normalizePiecesResults>;
			const piecesEligible =
				args.include_pieces !== false && PIECES_MCP_ENABLED && piecesProxy?.isConnected();
			if (piecesEligible) {
				try {
					const piecesResponse = await piecesProxy?.callTool('ask_pieces_ltm', {
						question: args.query,
						chat_llm: args.chat_llm || 'gpt-4',
						topics: [],
						related_questions: [],
					});
					piecesResults = normalizePiecesResults(piecesResponse);
				} catch (error) {
					const message = (error as Error).message;
					logger.warn(
						{ branding: BRAND.prefix, error: message },
						'Pieces LTM query failed; continuing',
					);
				}
			} else {
				logger.debug(
					{ branding: BRAND.prefix },
					'Pieces lookup skipped (disabled or disconnected)',
				);
			}
			const combinedResults = {
				local: localResults.map((mem) => ({
					id: mem.id,
					content: mem.content,
					score: mem.score,
					source: 'cortex-local',
					tags: mem.tags,
					importance: mem.importance,
					metadata: mem.metadata,
				})),
				pieces: piecesResults,
				total: localResults.length + piecesResults.length,
			};
			const duration = performance.now() - start;
			observeHybridSearch(duration, localResults.length, piecesResults.length);
			return JSON.stringify(combinedResults, null, 2);
		});
	},
});

const enableAgentToolkit = () => {
	const tools = createAgentToolkitMcpTools();
	logger.info(
		{ branding: BRAND.prefix, toolCount: tools.length },
		'Registering agent-toolkit tools',
	);
	for (const tool of tools) {
		server.addTool({
			name: tool.name,
			description: `${BRAND.prefix} ${tool.description}`,
			parameters: tool.inputSchema as unknown as z.ZodTypeAny,
			annotations: {
				readOnlyHint: tool.name.includes('search') || tool.name.includes('codemap'),
				title: `${BRAND.prefix} ${tool.name.replace('agent_toolkit_', '')}`,
			},
			async execute(args) {
				return runTool(tool.name, async () => {
					logger.info({ branding: BRAND.prefix, tool: tool.name }, 'Executing agent toolkit tool');
					const result = await tool.handler(args);
					return result.content?.[0]?.text ?? JSON.stringify(result, null, 2);
				});
			},
		});
	}
	logger.info({ branding: BRAND.prefix }, 'Agent-toolkit tools registered');
};

const maybeEnableAgentToolkit = () => {
	if (process.env.AGENT_TOOLKIT_ENABLED === 'false') {
		logger.info({ branding: BRAND.prefix }, 'Agent-toolkit tools disabled');
		return;
	}
	try {
		enableAgentToolkit();
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		logger.warn({ branding: BRAND.prefix, error: msg }, 'Failed to load agent-toolkit tools');
	}
};

const startMetrics = async () => {
	if (!METRICS_ENABLED || metricsServer) {
		return;
	}
	try {
		metricsServer = startMetricsServer({
			brandPrefix: BRAND.prefix,
			host: METRICS_HOST,
			logger,
			port: METRICS_PORT,
		});
	} catch (error) {
		const message = (error as Error).message;
		logger.error({ branding: BRAND.prefix, error: message }, 'Failed to start metrics endpoint');
	}
};

const connectPieces = async () => {
	if (!piecesProxy) {
		logger.info({ branding: BRAND.prefix }, 'Pieces proxy disabled');
		return;
	}
	await piecesProxy.connect();
	if (piecesProxy.isConnected()) {
		const remoteTools = piecesProxy.getTools();
		logger.info(
			{ branding: BRAND.prefix, toolCount: remoteTools.length },
			'Registering Pieces tools',
		);
		for (const tool of remoteTools) {
			server.addTool({
				name: `pieces.${tool.name}`,
				description: `[Pieces] ${tool.description}`,
				parameters: tool.inputSchema as unknown as z.ZodTypeAny,
				annotations: { readOnlyHint: true, title: `Pieces: ${tool.name}` },
				async execute(args) {
					return runTool(`pieces.${tool.name}`, async () => {
						logger.info({ branding: BRAND.prefix, tool: tool.name }, 'Proxying Pieces tool');
						const result = await piecesProxy.callTool(tool.name, args);
						return JSON.stringify(result, null, 2);
					});
				},
			});
		}
	} else {
		logger.info({ branding: BRAND.prefix }, 'Pieces proxy unavailable; skipping remote tools');
	}
};

const startServer = async () => {
	await initializeTracing(BRAND.prefix);
	await startMetrics();
	maybeEnableAgentToolkit();
	await connectPieces();

	const rawTransportOverride = process.env.MCP_TRANSPORT;
	const transportDecision = resolveTransport(rawTransportOverride);

	for (const warning of transportDecision.warnings) {
		if (warning === 'preferAll') {
			logger.warn(
				{ branding: BRAND.prefix },
				'MCP_TRANSPORT=all requested; FastMCP supports one transport per process. Defaulting to HTTP/SSE and suggest launching a dedicated STDIO instance.',
			);
		}
		if (warning === 'unknownOverride') {
			logger.warn(
				{ branding: BRAND.prefix, override: rawTransportOverride?.toLowerCase() },
				'Unknown MCP_TRANSPORT override; defaulting to HTTP/SSE transport',
			);
		}
	}

	const shouldStartStdio = transportDecision.selected === 'stdio';
	const shouldStartHttp = transportDecision.selected === 'http';

	if (shouldStartHttp && !process.env.MCP_API_KEY?.trim()) {
		const message = 'MCP_API_KEY must be set when using HTTP transport';
		logger.fatal({ branding: BRAND.prefix }, message);
		throw new Error(message);
	}

	const parsedPort = Number.parseInt(process.env.PORT ?? '', 10);
	const port = Number.isNaN(parsedPort) ? 3024 : parsedPort;
	const host = DEFAULT_HTTP_HOST;

	if (shouldStartStdio) {
		await server.start({ transportType: 'stdio' });
		logger.info(
			{ branding: BRAND.prefix },
			`${BRAND.prefix} FastMCP v3 server started with STDIO transport`,
		);
	} else {
		await server.start({
			transportType: 'httpStream',
			httpStream: {
				port,
				host,
				endpoint: DEFAULT_HTTP_ENDPOINT as `/${string}`,
				enableJsonResponse: true,
				stateless: true,
			},
		});
		const baseUrl = `http://${host}:${port}`;
		logger.info(
			{ branding: BRAND.prefix, port, host, endpoint: DEFAULT_HTTP_ENDPOINT },
			`${BRAND.prefix} FastMCP v3 server started with HTTP/SSE transport`,
		);
		logger.info(
			{
				branding: BRAND.prefix,
				stream: `${baseUrl}${DEFAULT_HTTP_ENDPOINT}`,
				sse: `${baseUrl}${DEFAULT_SSE_ENDPOINT}`,
			},
			'HTTP stream and SSE endpoints are ready',
		);
		if (existsSync(CLOUDFLARED_CONFIG_PATH)) {
			logger.info(
				{ branding: BRAND.prefix, config: CLOUDFLARED_CONFIG_PATH },
				'Cloudflared tunnel configuration detected',
			);
		} else {
			logger.warn(
				{ branding: BRAND.prefix, config: CLOUDFLARED_CONFIG_PATH },
				'Cloudflared tunnel configuration not found',
			);
		}
		if (port !== 3024) {
			logger.warn(
				{ branding: BRAND.prefix, port, expectedPort: 3024 },
				'HTTP port differs from default 3024; update tunnel config if necessary',
			);
		}
		logger.info(
			{ branding: BRAND.prefix, port, host },
			`${BRAND.healthMessage} - ${baseUrl}/health`,
		);
	}

	const shutdown = async (signal: NodeJS.Signals) => {
		logger.info(
			{ branding: BRAND.prefix, signal },
			`Received ${signal} - shutting down MCP server`,
		);
		if (piecesProxy) {
			await piecesProxy.disconnect();
		}
		if (metricsServer) {
			await metricsServer.close();
			metricsServer = null;
		}
		await shutdownTracing();
		await server.stop();
		process.exit(0);
	};

	process.on('SIGINT', () => void shutdown('SIGINT'));
	process.on('SIGTERM', () => void shutdown('SIGTERM'));

	logger.info({ branding: BRAND.prefix }, `${BRAND.prefix} FastMCP v3 server is running`);
};

startServer().catch(async (err) => {
	logger.error({ branding: BRAND.prefix, err }, `${BRAND.prefix} failed to start MCP server`);
	if (metricsServer) {
		await metricsServer.close().catch(() => undefined);
	}
	await shutdownTracing();
	process.exit(1);
});

process.on('uncaughtException', (err) => {
	logger.error({ branding: BRAND.prefix, err }, 'Uncaught exception in MCP server');
});

process.on('unhandledRejection', (reason, promise) => {
	logger.error({ branding: BRAND.prefix, reason, promise }, 'Unhandled rejection in MCP server');
});
