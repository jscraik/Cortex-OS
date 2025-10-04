#!/usr/bin/env node

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
import { FastMCP } from 'fastmcp';
import { pino } from 'pino';
import { z } from 'zod';
import { PiecesMCPProxy } from './pieces-proxy.js';

const logger = pino({ level: process.env.MEMORY_LOG_LEVEL ?? 'info' });

const BRAND = {
	prefix: 'brAInwav',
	serverName: 'brAInwav Cortex Memory Server',
	healthMessage: 'brAInwav Cortex Memory Server - Operational',
	connectLog: 'brAInwav MCP client connected',
	disconnectLog: 'brAInwav MCP client disconnected',
} as const;

const DEFAULT_HTTP_HOST = process.env.MCP_HOST ?? '0.0.0.0';
const DEFAULT_HTTP_ENDPOINT = process.env.MCP_HTTP_ENDPOINT ?? '/mcp';
const MAX_TITLE_LENGTH = 100;

// Pieces MCP configuration
const PIECES_MCP_ENDPOINT =
	process.env.PIECES_MCP_ENDPOINT ?? 'http://localhost:39300/model_context_protocol/2024-11-05/sse';
const PIECES_MCP_ENABLED = process.env.PIECES_MCP_ENABLED !== 'false';

const memoryProvider = createMemoryProviderFromEnv();

// Initialize Pieces MCP proxy
const piecesProxy = new PiecesMCPProxy({
	endpoint: PIECES_MCP_ENDPOINT,
	enabled: PIECES_MCP_ENABLED,
	logger,
});

const server = new FastMCP({
	name: 'brainwav-cortex-memory',
	version: '3.0.0',
	authenticate: async (req) => {
		const apiKey = process.env.MCP_API_KEY;
		const header = req.headers?.['x-api-key'];
		const providedKey = Array.isArray(header) ? header[0] : header;

		if (!apiKey) {
			return {
				user: req.headers?.['x-user-id'] || 'anonymous',
				timestamp: new Date().toISOString(),
				branding: BRAND.prefix,
			};
		}

		if (providedKey !== apiKey) {
			throw new Error(`${BRAND.serverName} - Invalid API key`);
		}

		return {
			user: req.headers?.['x-user-id'] || 'authenticated',
			timestamp: new Date().toISOString(),
			branding: BRAND.prefix,
		};
	},
	ping: {
		enabled: true,
		intervalMs: 20000,
		logLevel: 'debug',
	},
	health: {
		enabled: true,
		message: BRAND.healthMessage,
		path: '/health',
		status: 200,
	},
});

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
	annotations: {
		idempotentHint: false,
		title: 'brAInwav Memory Storage',
	},
	async execute(args) {
		logger.info({ branding: BRAND.prefix, tool: 'memory.store' }, 'brAInwav storing memory');
		const result = await memoryProvider.store(args);
		return JSON.stringify(result, null, 2);
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
		logger.info({ branding: BRAND.prefix, tool: 'memory.search' }, 'brAInwav searching memories');
		const result = await memoryProvider.search(args);
		return JSON.stringify(result, null, 2);
	},
});

server.addTool({
	name: 'memory.analysis',
	description: 'Analyze memories with AI-powered insights (streaming)',
	parameters: MemoryAnalysisInputSchema,
	annotations: {
		streamingHint: true,
		readOnlyHint: true,
		title: 'brAInwav Memory Analysis',
	},
	async execute(args, { streamContent, reportProgress }) {
		logger.info({ branding: BRAND.prefix, tool: 'memory.analysis' }, 'brAInwav analyzing memories');
		await streamContent({ type: 'text', text: 'Starting analysis...\n' });
		await reportProgress({ progress: 0, total: 3 });

		await streamContent({ type: 'text', text: 'Processing memories...\n' });
		await reportProgress({ progress: 1, total: 3 });

		const result = await memoryProvider.analysis(args);

		await streamContent({ type: 'text', text: 'Analysis complete!\n' });
		await reportProgress({ progress: 3, total: 3 });

		return JSON.stringify(result, null, 2);
	},
});

server.addTool({
	name: 'memory.relationships',
	description: 'Manage and query relationships between memories',
	parameters: MemoryRelationshipsInputSchema,
	annotations: {
		destructiveHint: true,
		idempotentHint: false,
		title: 'brAInwav Memory Relationships',
	},
	async execute(args) {
		logger.info(
			{ branding: BRAND.prefix, tool: 'memory.relationships' },
			'brAInwav managing relationships',
		);
		const result = await memoryProvider.relationships(args);
		return JSON.stringify(result, null, 2);
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
		logger.info(
			{ branding: BRAND.prefix, tool: 'memory.stats' },
			'brAInwav fetching memory statistics',
		);
		const result = await memoryProvider.stats(args);
		return JSON.stringify(result, null, 2);
	},
});

server.addTool({
	name: 'search',
	description:
		'Search for relevant documents and memories. Returns a list of results with id, title, and url for citation.',
	parameters: z.object({
		query: z.string().describe('Search query string'),
	}),
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: 'brAInwav Search (ChatGPT Compatible)',
	},
	async execute(args) {
		logger.info(
			{ branding: BRAND.prefix, tool: 'search', query: args.query },
			'brAInwav ChatGPT search request',
		);
		const searchResult = await memoryProvider.search({
			query: args.query,
			search_type: 'hybrid',
			limit: 10,
			offset: 0,
			session_filter_mode: 'all',
			score_threshold: 0.3,
			hybrid_weight: 0.7,
		});

		return createSearchResponse(searchResult);
	},
});

server.addTool({
	name: 'fetch',
	description: 'Retrieve complete document content by ID for detailed analysis and citation.',
	parameters: z.object({
		id: z.string().describe('Unique identifier for the document to fetch'),
	}),
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: 'brAInwav Fetch (ChatGPT Compatible)',
	},
	async execute(args) {
		logger.info(
			{ branding: BRAND.prefix, tool: 'fetch', id: args.id },
			'brAInwav ChatGPT fetch request',
		);
		const memory = await memoryProvider.get(args.id);

		if (!memory) {
			throw new Error(`Document with ID "${args.id}" not found`);
		}

		return createFetchResponse(memory, args.id);
	},
});

// Hybrid memory aggregator - queries both local and remote Pieces memory
server.addTool({
	name: 'memory.hybrid_search',
	description:
		'Search across both local Cortex memory and remote Pieces LTM. Merges and reranks results for comprehensive context retrieval.',
	parameters: z.object({
		query: z.string().describe('Search query string'),
		limit: z.number().optional().default(10).describe('Maximum results to return'),
		include_pieces: z
			.boolean()
			.optional()
			.default(true)
			.describe('Include Pieces LTM results in search'),
		chat_llm: z.string().optional().describe('LLM model being used (for Pieces context)'),
	}),
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: 'brAInwav Hybrid Memory Search',
	},
	async execute(args) {
		logger.info(
			{ branding: BRAND.prefix, tool: 'memory.hybrid_search', query: args.query },
			'brAInwav hybrid search across local + Pieces',
		);

		// Always search local memory
		const localResults = await memoryProvider.search({
			query: args.query,
			search_type: 'hybrid',
			limit: args.limit,
			offset: 0,
			session_filter_mode: 'all',
			score_threshold: 0.3,
			hybrid_weight: 0.7,
		});

		// If Pieces is enabled and connected, also search remote
		let piecesResults: unknown[] = [];
		if (args.include_pieces && piecesProxy.isConnected()) {
			try {
				const piecesResponse = await piecesProxy.callTool('ask_pieces_ltm', {
					question: args.query,
					chat_llm: args.chat_llm || 'gpt-4',
					topics: [],
					related_questions: [],
				});

				// Parse Pieces response and extract relevant memories
				if (piecesResponse && typeof piecesResponse === 'object') {
					piecesResults = [
						{
							id: `pieces-${Date.now()}`,
							content: JSON.stringify(piecesResponse),
							source: 'pieces-ltm',
							score: 0.8,
						},
					];
				}
			} catch (error) {
				logger.warn(
					{ error: (error as Error).message },
					'Failed to query Pieces LTM - continuing with local results only',
				);
			}
		}

		// Merge and format results
		const combinedResults = {
			local: localResults.map((mem) => ({
				id: mem.id,
				content: mem.content,
				score: mem.score,
				source: 'cortex-local',
				tags: mem.tags,
				importance: mem.importance,
			})),
			pieces: piecesResults,
			total: localResults.length + piecesResults.length,
		};

		return JSON.stringify(combinedResults, null, 2);
	},
});

server.on('connect', () => {
	logger.info({ branding: BRAND.prefix }, BRAND.connectLog);
});
server.on('disconnect', () => {
	logger.info({ branding: BRAND.prefix }, BRAND.disconnectLog);
});

async function main(): Promise<void> {
	const parsedPort = Number.parseInt(process.env.PORT ?? '', 10);
	const port = Number.isNaN(parsedPort) ? 3024 : parsedPort;
	const host = DEFAULT_HTTP_HOST;

	// Connect to Pieces MCP proxy before starting server
	await piecesProxy.connect();

	// Register remote Pieces tools dynamically
	if (piecesProxy.isConnected()) {
		const remoteTools = piecesProxy.getTools();
		logger.info(
			{ toolCount: remoteTools.length, tools: remoteTools.map((t) => t.name) },
			'Registering remote Pieces MCP tools',
		);

		for (const tool of remoteTools) {
			server.addTool({
				name: `pieces.${tool.name}`,
				description: `[Remote Pieces] ${tool.description}`,
				parameters: tool.inputSchema as unknown as z.ZodTypeAny,
				annotations: {
					readOnlyHint: true,
					title: `Pieces: ${tool.name}`,
				},
				async execute(args) {
					logger.info(
						{ branding: BRAND.prefix, tool: tool.name, args },
						'Proxying call to remote Pieces tool',
					);
					const result = await piecesProxy.callTool(tool.name, args);
					return JSON.stringify(result, null, 2);
				},
			});
		}

		logger.info({ toolCount: remoteTools.length }, 'Successfully registered remote Pieces tools');
	}

	await server.start({
		transportType: 'httpStream',
		httpStream: {
			port,
			host,
			endpoint: DEFAULT_HTTP_ENDPOINT as `/${string}`,
			enableJsonResponse: true,
			stateless: false,
		},
	});
	logger.info(
		{ branding: BRAND.prefix, port, host, endpoint: DEFAULT_HTTP_ENDPOINT },
		`${BRAND.prefix} FastMCP v3 server started with HTTP/SSE transport`,
	);
	logger.info(
		{ branding: BRAND.prefix },
		`${BRAND.prefix} server ready for ChatGPT connections - CORS enabled by default`,
	);
	logger.info(
		{ branding: BRAND.prefix, port, host },
		`${BRAND.healthMessage} - http://${host}:${port}/health`,
	);

	process.on('SIGINT', async () => {
		logger.info({ branding: BRAND.prefix }, 'Received SIGINT - shutting down brAInwav MCP server');
		await piecesProxy.disconnect();
		await server.stop();
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		logger.info({ branding: BRAND.prefix }, 'Received SIGTERM - shutting down brAInwav MCP server');
		await piecesProxy.disconnect();
		await server.stop();
		process.exit(0);
	});
	logger.info({ branding: BRAND.prefix }, `${BRAND.prefix} FastMCP v3 server is running`);
}

main().catch((err) => {
	logger.error({ branding: BRAND.prefix, err }, `${BRAND.prefix} failed to start MCP server`);
	process.exit(1);
});

process.on('uncaughtException', (err) => {
	logger.error({ branding: BRAND.prefix, err }, 'Uncaught exception in brAInwav MCP server');
});

process.on('unhandledRejection', (reason, promise) => {
	logger.error(
		{ branding: BRAND.prefix, reason, promise },
		'Unhandled rejection in brAInwav MCP server',
	);
});
