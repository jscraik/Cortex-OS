/**
 * Hybrid Tools Module
 *
 * Hybrid search and Pieces integration tools extracted
 * from the main index file for better modularity.
 */

import { performance } from 'node:perf_hooks';
import { observeHybridSearch } from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import { withSpan } from '@cortex-os/mcp-bridge/runtime/telemetry/tracing';
import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { PiecesCopilotMCPProxy } from '../pieces-copilot-proxy.js';
import type { PiecesDriveMCPProxy } from '../pieces-drive-proxy.js';
import { normalizePiecesResults } from '../pieces-normalizer.js';
import type { PiecesMCPProxy } from '../pieces-proxy.js';
import { performLocalHybridSearch } from '../search-utils.js';
import { createBrandedLog } from '../utils/brand.js';
import { loadServerConfig } from '../utils/config.js';

/**
 * Assemble context for Pieces Copilot queries from local and Pieces results
 */
async function assembleCopilotContext(
	localResults: Array<{ id: string; content: string; score: number }>,
	piecesResults: Array<{ id: string; content: string; score: number }>,
	driveResults: Array<{ id: string; content: string; score: number }>,
): Promise<string> {
	const contextParts = [];

	// Add local results if available
	if (localResults.length > 0) {
		contextParts.push('Local Cortex Memory Results:');
		localResults.forEach((result, index) => {
			contextParts.push(
				`${index + 1}. ${result.content.slice(0, 200)}${result.content.length > 200 ? '...' : ''}`,
			);
		});
	}

	// Add Pieces LTM results if available
	if (piecesResults.length > 0) {
		contextParts.push('\\nPieces Long-Term Memory Results:');
		piecesResults.forEach((result, index) => {
			contextParts.push(
				`${index + 1}. ${result.content.slice(0, 200)}${result.content.length > 200 ? '...' : ''}`,
			);
		});
	}

	// Add Pieces Drive results if available
	if (driveResults.length > 0) {
		contextParts.push('\\nPieces Drive Results:');
		driveResults.forEach((result, index) => {
			contextParts.push(
				`${index + 1}. ${result.content.slice(0, 200)}${result.content.length > 200 ? '...' : ''}`,
			);
		});
	}

	return contextParts.join('\\n');
}

interface HybridSearchProxies {
	pieces: PiecesMCPProxy | null;
	drive: PiecesDriveMCPProxy | null;
	copilot: PiecesCopilotMCPProxy | null;
	contextBridge?: { captureHybridSearchEvent(event: unknown): void };
}

/**
 * Execute Pieces LTM search with error handling
 */
async function executePiecesLTMSearch(
	proxies: HybridSearchProxies,
	args: { query: string; limit: number; include_pieces?: boolean; chat_llm?: string },
	config: { piecesEnabled: boolean },
	logger: {
		warn: (message: string, context?: unknown) => void;
		debug: (message: string, context?: unknown) => void;
	},
): ReturnType<typeof normalizePiecesResults> {
	const piecesEligible =
		args.include_pieces !== false && config.piecesEnabled && proxies.pieces?.isConnected();

	if (piecesEligible) {
		try {
			const piecesResponse = await proxies.pieces?.callTool('ask_pieces_ltm', {
				question: args.query,
				chat_llm: args.chat_llm || 'gpt-4',
				topics: [],
				related_questions: [],
			});
			return normalizePiecesResults(piecesResponse);
		} catch (error) {
			const message = (error as Error).message;
			logger.warn(
				createBrandedLog('pieces_ltm_failed', { error: message }),
				'Pieces LTM query failed; continuing',
			);
		}
	} else {
		logger.debug(
			createBrandedLog('pieces_ltm_lookup_skipped'),
			'Pieces LTM lookup skipped (disabled or disconnected)',
		);
	}
	return [];
}

/**
 * Execute Pieces Drive search with error handling
 */
async function executePiecesDriveSearch(
	proxies: HybridSearchProxies,
	args: { query: string; limit: number; include_drive?: boolean },
	logger: {
		warn: (message: string, context?: unknown) => void;
		debug: (message: string, context?: unknown) => void;
	},
): ReturnType<typeof normalizePiecesResults> {
	const driveEligible = args.include_drive !== false && proxies.drive?.isConnected();

	if (driveEligible) {
		try {
			const driveResponse = await proxies.drive?.callTool('search_pieces_drive', {
				query: args.query,
				limit: Math.floor(args.limit / 2), // Split limit across sources
				filters: ['file', 'snippet'],
			});
			return normalizePiecesResults(driveResponse);
		} catch (error) {
			const message = (error as Error).message;
			logger.warn(
				createBrandedLog('pieces_drive_failed', { error: message }),
				'Pieces Drive query failed; continuing',
			);
		}
	} else {
		logger.debug(
			createBrandedLog('pieces_drive_lookup_skipped'),
			'Pieces Drive lookup skipped (disabled or disconnected)',
		);
	}
	return [];
}

/**
 * Execute Pieces Copilot search with error handling
 */
async function executePiecesCopilotSearch(
	proxies: HybridSearchProxies,
	args: { query: string; limit: number; include_copilot?: boolean; chat_llm?: string },
	localResults: Array<{ id: string; content: string; score: number }>,
	piecesResults: Array<{ id: string; content: string; score: number }>,
	driveResults: Array<{ id: string; content: string; score: number }>,
	logger: {
		warn: (message: string, context?: unknown) => void;
		debug: (message: string, context?: unknown) => void;
	},
): ReturnType<typeof normalizePiecesResults> {
	const copilotEligible = args.include_copilot !== false && proxies.copilot?.isConnected();

	if (copilotEligible) {
		try {
			const copilotResponse = await proxies.copilot?.callTool('ask_pieces_copilot', {
				question: args.query,
				chat_llm: args.chat_llm || 'gpt-4',
				context: await assembleCopilotContext(localResults, piecesResults, driveResults),
			});
			return normalizePiecesResults(copilotResponse);
		} catch (error) {
			const message = (error as Error).message;
			logger.warn(
				createBrandedLog('pieces_copilot_failed', { error: message }),
				'Pieces Copilot query failed; continuing',
			);
		}
	} else {
		logger.debug(
			createBrandedLog('pieces_copilot_lookup_skipped'),
			'Pieces Copilot lookup skipped (disabled or disconnected)',
		);
	}
	return [];
}

/**
 * Combine and deduplicate results from all sources
 */
function combineSearchResults(
	localResults: Array<{
		id: string;
		content: string;
		score: number;
		tags?: string[];
		importance?: number;
		metadata?: Record<string, unknown>;
	}>,
	piecesResults: Array<{ id: string; content: string; score: number }>,
	driveResults: Array<{ id: string; content: string; score: number }>,
	copilotResults: Array<{ id: string; content: string; score: number }>,
	args: { include_pieces?: boolean; include_drive?: boolean; include_copilot?: boolean },
	piecesEligible: boolean,
	driveEligible: boolean,
	copilotEligible: boolean,
) {
	// Combine all results with source tagging
	const allResults = [
		...localResults.map((mem) => ({
			id: mem.id,
			content: mem.content,
			score: mem.score,
			source: 'cortex-local',
			tags: mem.tags,
			importance: mem.importance,
			metadata: mem.metadata,
		})),
		...piecesResults.map((result) => ({
			...result,
			source: 'pieces-ltm',
		})),
		...driveResults.map((result) => ({
			...result,
			source: 'pieces-drive',
		})),
		...copilotResults.map((result) => ({
			...result,
			source: 'pieces-copilot',
		})),
	];

	// Simple deduplication by content
	const deduplicatedResults = allResults.reduce(
		(acc, item) => {
			const existing = acc.find((r) => r.content === item.content && r.source === item.source);
			if (!existing) {
				acc.push(item);
			}
			return acc;
		},
		[] as typeof allResults,
	);

	return {
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
		drive: driveResults,
		copilot: copilotResults,
		combined: deduplicatedResults,
		total: deduplicatedResults.length,
		sources: {
			local: localResults.length,
			pieces: piecesResults.length,
			drive: driveResults.length,
			copilot: copilotResults.length,
		},
		warnings: [
			...(!piecesEligible && args.include_pieces !== false ? ['Pieces LTM unavailable'] : []),
			...(!driveEligible && args.include_drive !== false ? ['Pieces Drive unavailable'] : []),
			...(!copilotEligible && args.include_copilot !== false ? ['Pieces Copilot unavailable'] : []),
		].filter(Boolean),
	};
}

/**
 * Capture hybrid search event in context bridge
 */
function captureHybridSearchEvent(
	proxies: HybridSearchProxies,
	args: { query: string },
	localResults: Array<{ id: string; content: string; score: number }>,
	piecesResults: Array<{ id: string; content: string; score: number }>,
	driveResults: Array<{ id: string; content: string; score: number }>,
	copilotResults: Array<{ id: string; content: string; score: number }>,
	deduplicatedCount: number,
	duration: number,
	combinedResults: { warnings: string[] },
	piecesEligible: boolean,
	driveEligible: boolean,
	copilotEligible: boolean,
) {
	const hybridEvent = {
		timestamp: new Date().toISOString(),
		query: args.query,
		sources: {
			local: true,
			pieces: piecesEligible,
			drive: driveEligible,
			copilot: copilotEligible,
		},
		results: {
			local: localResults.length,
			pieces: piecesResults.length,
			drive: driveResults.length,
			copilot: copilotResults.length,
			total: deduplicatedCount,
		},
		duration,
		errors: combinedResults.warnings,
	};

	// Store in context bridge if it was passed in the proxies
	if (proxies.contextBridge) {
		proxies.contextBridge.captureHybridSearchEvent(hybridEvent);
	}
}

/**
 * Register hybrid search tools with the server
 */
export function registerHybridTools(server: FastMCP, logger: any, proxies: HybridSearchProxies) {
	const config = loadServerConfig();

	const runTool = async <T>(toolName: string, execute: () => Promise<T>) => {
		return withSpan(`mcp.tool.${toolName}`, { 'mcp.tool': toolName }, execute);
	};

	// Hybrid Search Tool
	server.addTool({
		name: 'memory.hybrid_search',
		description:
			'Search across both local Cortex memory and remote Pieces LTM. Merges and reranks results.',
		parameters: z.object({
			query: z.string().describe('Search query string'),
			limit: z.number().optional().default(10).describe('Maximum results to return'),
			include_pieces: z.boolean().optional().default(true).describe('Include Pieces LTM results'),
			include_drive: z.boolean().optional().default(true).describe('Include Pieces Drive results'),
			include_copilot: z
				.boolean()
				.optional()
				.default(true)
				.describe('Include Pieces Copilot results'),
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
					createBrandedLog('memory.hybrid_search', { query: args.query }),
					'Hybrid search',
				);

				// Perform local search
				const localResults = await performLocalHybridSearch(args.query, {
					limit: args.limit,
				});

				// Execute parallel searches with error handling
				const [piecesResults, driveResults, copilotResults] = await Promise.all([
					executePiecesLTMSearch(proxies, args, config, logger),
					executePiecesDriveSearch(proxies, args, logger),
					executePiecesCopilotSearch(
						proxies,
						args,
						localResults,
						piecesResults,
						driveResults,
						logger,
					),
				]);

				// Determine eligibility for context bridge
				const piecesEligible =
					args.include_pieces !== false && config.piecesEnabled && proxies.pieces?.isConnected();
				const driveEligible = args.include_drive !== false && proxies.drive?.isConnected();
				const copilotEligible = args.include_copilot !== false && proxies.copilot?.isConnected();

				// Combine and deduplicate results
				const combinedResults = combineSearchResults(
					localResults,
					piecesResults,
					driveResults,
					copilotResults,
					args,
					piecesEligible,
					driveEligible,
					copilotEligible,
				);

				const duration = performance.now() - start;
				observeHybridSearch(duration, localResults.length, piecesResults.length);

				// Capture event in context bridge
				captureHybridSearchEvent(
					proxies,
					args,
					localResults,
					piecesResults,
					driveResults,
					copilotResults,
					combinedResults.total,
					duration,
					combinedResults,
					piecesEligible,
					driveEligible,
					copilotEligible,
				);

				return JSON.stringify(combinedResults, null, 2);
			});
		},
	});
}
