#!/usr/bin/env node

import type { MemoryProvider, MemorySearchResult } from '@cortex-os/memory-core';
import { createMemoryProviderFromEnv } from '@cortex-os/memory-core';
import {
	MemoryAnalysisInputSchema,
	MemoryRelationshipsInputSchema,
	MemorySearchInputSchema,
	MemoryStatsInputSchema,
	MemoryStoreInputSchema,
} from '@cortex-os/tool-spec';
import { FastMCP } from 'fastmcp';
import type { Logger } from 'pino';
import { pino } from 'pino';
import { z } from 'zod';

// ============================================================================
// Constants & Configuration
// ============================================================================

const BRANDING = {
	name: 'brAInwav Cortex Memory',
	serverName: 'brAInwav Cortex Memory MCP Server',
	prefix: 'brAInwav',
	healthMessage: 'brAInwav Cortex Memory Server - Operational',
	unauthorizedMessage: 'Unauthorized - Invalid API key',
} as const;

const DEFAULT_PORT = 3024;
const SEARCH_LIMIT = 10;
const SEARCH_THRESHOLD = 0.3;
const HYBRID_WEIGHT = 0.7;

// ============================================================================
// Type Definitions
// ============================================================================

interface ChatGPTSearchResult {
	id: string;
	title: string;
	url: string;
}

interface ChatGPTDocument {
	id: string;
	title: string;
	text: string;
	url: string;
	metadata: {
		source: string;
		tags?: string[];
		importance?: number;
		domain?: string;
	};
}

// ============================================================================
// Initialization
// ============================================================================

const logger: Logger = pino({ level: process.env.MEMORY_LOG_LEVEL || 'info' });
const memoryProvider: MemoryProvider = createMemoryProviderFromEnv();

// ============================================================================
// Helper Functions (Keeping functions ≤ 40 lines)
// ============================================================================

function extractTitle(content: string, index: number): string {
	return content.substring(0, 100) || `Memory ${index + 1}`;
}

function buildMemoryUrl(id: string | undefined, index: number): string {
	return `memory://cortex-os/${id || index}`;
}

function transformSearchResultToChatGPT(
	memory: MemorySearchResult,
	index: number,
): ChatGPTSearchResult {
	return {
		id: memory.id || `memory-${index}`,
		title: extractTitle(memory.content, index),
		url: buildMemoryUrl(memory.id, index),
	};
}

function transformMemoryToChatGPTDocument(memory: MemorySearchResult, id: string): ChatGPTDocument {
	return {
		id,
		title: extractTitle(memory.content, 0),
		text: memory.content || 'No content available',
		url: buildMemoryUrl(id, 0),
		metadata: {
			source: 'brainwav-cortex-memory',
			tags: memory.tags,
			importance: memory.importance,
			domain: memory.domain,
		},
	};
}

async function authenticateRequest(req: any): Promise<any> {
	const apiKey = process.env.MCP_API_KEY;
	if (!apiKey) {
		return {
			user: 'anonymous',
			timestamp: new Date().toISOString(),
			branding: BRANDING.prefix,
		};
	}

	const providedKey: string | undefined = req.headers?.['x-api-key'];
	if (providedKey !== apiKey) {
		throw new Response(null, {
			status: 401,
			statusText: BRANDING.unauthorizedMessage,
		});
	}

	return {
		user: req.headers?.['x-user-id'] || 'authenticated',
		timestamp: new Date().toISOString(),
		branding: BRANDING.prefix,
	};
}

function createServerConfig() {
	return {
		name: 'brainwav-cortex-memory',
		version: '3.0.0',
		instructions: `${BRANDING.serverName}

This server provides comprehensive memory management capabilities for AI agents:
- Store and retrieve memories with semantic search
- Analyze patterns and relationships in stored data
- Access memory statistics and analytics
- ChatGPT-compatible search and fetch for deep research

Use 'search' for finding relevant memories, 'fetch' for detailed content,
and memory.* tools for advanced memory operations.`,
		authenticate: authenticateRequest,
		ping: {
			enabled: true,
			intervalMs: 20000,
			logLevel: 'debug' as const,
		},
		health: {
			enabled: true,
			message: BRANDING.healthMessage,
			path: '/health',
			status: 200,
		},
	};
}

function setupGracefulShutdown(server: FastMCP): void {
	const shutdownHandler = async (signal: string) => {
		logger.info(`Received ${signal} - Shutting down ${BRANDING.serverName}...`);
		await server.stop();
		process.exit(0);
	};

	process.on('SIGINT', () => shutdownHandler('SIGINT'));
	process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
}

function setupErrorHandlers(): void {
	process.on('uncaughtException', (err) => {
		logger.error({ err }, 'Uncaught exception');
	});

	process.on('unhandledRejection', (reason, promise) => {
		logger.error({ reason, promise }, 'Unhandled rejection');
	});
}

// ============================================================================
// Server & Tool Registration
// ============================================================================

const server: FastMCP = new FastMCP(createServerConfig());

// Memory Management Tools
server.addTool({
	name: 'memory.store',
	description: 'Store a memory with metadata and optional embedding',
	parameters: MemoryStoreInputSchema,
	annotations: {
		idempotentHint: false,
		title: `${BRANDING.prefix} Memory Storage`,
	},
	async execute(args) {
		logger.info('Storing memory');
		const result = await memoryProvider.store(args);
		return result;
	},
});

server.addTool({
	name: 'memory.search',
	description: 'Search memories using semantic or keyword search',
	parameters: MemorySearchInputSchema,
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: `${BRANDING.prefix} Memory Search`,
	},
	async execute(args) {
		logger.info('Searching memories');
		const result = await memoryProvider.search(args);
		return result;
	},
});

server.addTool({
	name: 'memory.analysis',
	description: 'Analyze memories with AI-powered insights (streaming)',
	parameters: MemoryAnalysisInputSchema,
	annotations: {
		streamingHint: true,
		readOnlyHint: true,
		title: `${BRANDING.prefix} Memory Analysis`,
	},
	async execute(args, { streamContent, reportProgress }) {
		await streamContent({ type: 'text', text: 'Starting analysis...\n' });
		await reportProgress({ progress: 0, total: 3 });

		logger.info('Analyzing memories');

		await streamContent({ type: 'text', text: 'Processing memories...\n' });
		await reportProgress({ progress: 1, total: 3 });

		const result = await memoryProvider.analysis(args);

		await streamContent({ type: 'text', text: 'Analysis complete!\n' });
		await reportProgress({ progress: 3, total: 3 });

		return result;
	},
});

server.addTool({
	name: 'memory.relationships',
	description: 'Manage and query relationships between memories',
	parameters: MemoryRelationshipsInputSchema,
	annotations: {
		destructiveHint: true,
		idempotentHint: false,
		title: `${BRANDING.prefix} Memory Relationships`,
	},
	async execute(args) {
		logger.info('Managing relationships');
		const result = await memoryProvider.relationships(args);
		return result;
	},
});

server.addTool({
	name: 'memory.stats',
	description: 'Get statistics and metrics about stored memories',
	parameters: MemoryStatsInputSchema,
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		title: `${BRANDING.prefix} Memory Statistics`,
	},
	async execute(args) {
		logger.info('Fetching statistics');
		const result = await memoryProvider.stats(args);
		return result;
	},
});

// ChatGPT-Compatible Tools
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
		title: `${BRANDING.prefix} Search (ChatGPT Compatible)`,
	},
	async execute(args) {
		logger.info(`ChatGPT search query: "${args.query}"`);

		const searchResult: MemorySearchResult[] = await memoryProvider.search({
			query: args.query,
			search_type: 'hybrid',
			limit: SEARCH_LIMIT,
			offset: 0,
			session_filter_mode: 'all',
			score_threshold: SEARCH_THRESHOLD,
			hybrid_weight: HYBRID_WEIGHT,
		});

		const results = searchResult.map(transformSearchResultToChatGPT);
		return { results };
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
		title: `${BRANDING.prefix} Fetch (ChatGPT Compatible)`,
	},
	async execute(args) {
		logger.info(`ChatGPT fetch request for ID: "${args.id}"`);

		// TODO: Replace with memoryProvider.get(args.id) once implemented
		const searchResult: MemorySearchResult[] = await memoryProvider.search({
			query: args.id,
			search_type: 'hybrid',
			limit: 1,
			offset: 0,
			session_filter_mode: 'all',
			score_threshold: 0,
			hybrid_weight: 0.5,
		});

		if (searchResult.length === 0) {
			throw new Error(`Document with ID "${args.id}" not found`);
		}

		const document = transformMemoryToChatGPTDocument(searchResult[0], args.id);
		return document;
	},
});

// Server Lifecycle Events
server.on('connect', () => {
	logger.info(`${BRANDING.prefix} MCP client connected`);
});

server.on('disconnect', () => {
	logger.info(`${BRANDING.prefix} MCP client disconnected`);
});

// ============================================================================
// Main Entry Point
// ============================================================================

async function startHttpServer(port: number): Promise<void> {
	server.start({
		transportType: 'httpStream',
		httpStream: {
			port,
			host: '0.0.0.0',
			endpoint: '/mcp',
			enableJsonResponse: true,
			stateless: false,
		},
	});

	logger.info(`${BRANDING.serverName} started with HTTP/SSE transport on port ${port} at /mcp`);
	logger.info(`${BRANDING.prefix} server ready for ChatGPT connections - CORS enabled by default`);
	logger.info(`Health check available at: http://0.0.0.0:${port}/health`);
}

async function main(): Promise<void> {
	const port: number = Number(process.env.PORT || DEFAULT_PORT);

	setupGracefulShutdown(server);
	setupErrorHandlers();

	await startHttpServer(port);

	logger.info(`${BRANDING.serverName} is running`);
}

main().catch((err) => {
	logger.error(`Failed to start ${BRANDING.serverName}`);
	console.error(err);
	process.exit(1);
});
