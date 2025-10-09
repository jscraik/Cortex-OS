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
import { normalizePiecesResults } from '../pieces-normalizer.js';
import type { PiecesMCPProxy } from '../pieces-proxy.js';
import { performLocalHybridSearch } from '../search-utils.js';
import { createBrandedLog } from '../utils/brand.js';
import { loadServerConfig } from '../utils/config.js';

/**
 * Register hybrid search tools with the server
 */
export function registerHybridTools(
	server: FastMCP,
	logger: any,
	piecesProxy: PiecesMCPProxy | null,
) {
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

				let piecesResults = [] as ReturnType<typeof normalizePiecesResults>;

				// Check if Pieces integration is available and enabled
				const piecesEligible =
					args.include_pieces !== false && config.piecesEnabled && piecesProxy?.isConnected();

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
							createBrandedLog('pieces_ltm_failed', { error: message }),
							'Pieces LTM query failed; continuing',
						);
					}
				} else {
					logger.debug(
						createBrandedLog('pieces_lookup_skipped'),
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
}
