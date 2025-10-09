/**
 * Memory Tools Module
 *
 * All memory-related MCP tools extracted from the main
 * index file for better modularity and maintainability.
 */

import { withSpan } from '@cortex-os/mcp-bridge/runtime/telemetry/tracing';
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
import type { FastMCP } from 'fastmcp';
import { createBrandedLog } from '../utils/brand.js';

const MAX_TITLE_LENGTH = 100;

/**
 * Register all memory tools with the server
 */
export function registerMemoryTools(server: FastMCP, logger: any) {
	const memoryProvider = createMemoryProviderFromEnv();

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

	// Memory Store Tool
	server.addTool({
		name: 'memory.store',
		description: 'Store a memory with metadata and optional embedding',
		parameters: MemoryStoreInputSchema,
		annotations: { idempotentHint: false, title: 'brAInwav Memory Storage' },
		async execute(args) {
			return runTool('memory.store', async () => {
				logger.info(createBrandedLog('memory.store'), 'Storing memory');
				const result = await memoryProvider.store(args);
				return JSON.stringify(result, null, 2);
			});
		},
	});

	// Memory Search Tool
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
				logger.info(createBrandedLog('memory.search'), 'Searching memories');
				const result = await memoryProvider.search(args);
				return JSON.stringify(result, null, 2);
			});
		},
	});

	// Memory Analysis Tool
	server.addTool({
		name: 'memory.analysis',
		description: 'Analyze memories with AI-powered insights',
		parameters: MemoryAnalysisInputSchema,
		annotations: { readOnlyHint: true, title: 'brAInwav Memory Analysis' },
		async execute(args, context) {
			return runTool('memory.analysis', async () => {
				logger.info(createBrandedLog('memory.analysis'), 'Analyzing memories');
				if (context?.streamContent) {
					try {
						await context.streamContent({ type: 'text', text: 'Starting analysis...\n' });
						if (context.reportProgress) {
							await context.reportProgress({ progress: 0, total: 3 });
						}
					} catch {
						logger.debug(
							createBrandedLog('streaming_unsupported'),
							'Streaming unsupported, continuing',
						);
					}
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

	// Memory Relationships Tool
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
				logger.info(createBrandedLog('memory.relationships'), 'Managing relationships');
				const result = await memoryProvider.relationships(args);
				return JSON.stringify(result, null, 2);
			});
		},
	});

	// Memory Stats Tool
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
				logger.info(createBrandedLog('memory.stats'), 'Fetching memory stats');
				const result = await memoryProvider.stats(args);
				return JSON.stringify(result, null, 2);
			});
		},
	});

	// ChatGPT Compatible Search Tool
	server.addTool({
		name: 'search',
		description:
			'Search for relevant documents and memories. Returns citations compatible with ChatGPT.',
		parameters: { query: { type: 'string', description: 'Search query string' } },
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			title: 'brAInwav Search (ChatGPT Compatible)',
		},
		async execute(args) {
			return runTool('search', async () => {
				logger.info(createBrandedLog('search', { query: args.query }), 'ChatGPT search');
				const results = await memoryProvider.search(args);
				return createSearchResponse(results);
			});
		},
	});

	// ChatGPT Compatible Fetch Tool
	server.addTool({
		name: 'fetch',
		description: 'Retrieve complete document content by ID for detailed analysis and citation.',
		parameters: { id: { type: 'string', description: 'Unique identifier to fetch' } },
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			title: 'brAInwav Fetch (ChatGPT Compatible)',
		},
		async execute(args) {
			return runTool('fetch', async () => {
				logger.info(createBrandedLog('fetch', { id: args.id }), 'ChatGPT fetch');
				const memory = await memoryProvider.get(args.id);
				if (!memory) {
					throw new Error(`Document with ID "${args.id}" not found`);
				}
				return createFetchResponse(memory, args.id);
			});
		},
	});
}
