/**
 * Hybrid Tools Integration Tests
 *
 * Integration tests for the hybrid search functionality including
 * multi-source aggregation, result deduplication, and error handling.
 */

import type { FastMCP } from 'fastmcp';
import type { Logger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PiecesCopilotMCPProxy } from '../pieces-copilot-proxy.js';
import type { PiecesDriveMCPProxy } from '../pieces-drive-proxy.js';
import type { PiecesMCPProxy } from '../pieces-proxy.js';
import { registerHybridTools } from '../tools/hybrid-tools.js';

// Mock dependencies
vi.mock('../utils/config.js', () => ({
	loadServerConfig: () => ({
		piecesEnabled: true,
		logLevel: 'info',
	}),
}));

vi.mock('../search-utils.js', () => ({
	performLocalHybridSearch: vi.fn().mockResolvedValue([
		{
			id: 'local1',
			content: 'Local result 1',
			score: 0.9,
			tags: [],
			importance: 0.8,
			metadata: {},
		},
		{
			id: 'local2',
			content: 'Local result 2',
			score: 0.7,
			tags: [],
			importance: 0.6,
			metadata: {},
		},
	]),
}));

vi.mock('../pieces-normalizer.js', () => ({
	normalizePiecesResults: vi.fn().mockImplementation((response) => {
		if (response?.results) {
			return response.results.map((result: any, index: number) => ({
				id: `pieces${index + 1}`,
				content: result.content || `Pieces result ${index + 1}`,
				score: result.score || 0.8,
			}));
		}
		return [];
	}),
}));

vi.mock('@cortex-os/mcp-bridge/runtime/telemetry/metrics.js', () => ({
	observeHybridSearch: vi.fn(),
}));

vi.mock('@cortex-os/mcp-bridge/runtime/telemetry/tracing.js', () => ({
	withSpan: vi.fn().mockImplementation((name, attributes, fn) => fn()),
}));

describe('Hybrid Tools Integration', () => {
	let mockServer: FastMCP;
	let mockLogger: Logger;
	let mockPiecesProxy: PiecesMCPProxy;
	let mockDriveProxy: PiecesDriveMCPProxy;
	let mockCopilotProxy: PiecesCopilotMCPProxy;
	let mockContextBridge: any;

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		} as any;

		mockServer = {
			addTool: vi.fn(),
		} as any;

		mockPiecesProxy = {
			isConnected: vi.fn().mockReturnValue(true),
			callTool: vi.fn().mockResolvedValue({
				results: [
					{ content: 'Pieces LTM result 1', score: 0.85 },
					{ content: 'Pieces LTM result 2', score: 0.75 },
				],
			}),
		} as any;

		mockDriveProxy = {
			isConnected: vi.fn().mockReturnValue(true),
			callTool: vi.fn().mockResolvedValue({
				results: [{ content: 'Pieces Drive result 1', score: 0.8 }],
			}),
		} as any;

		mockCopilotProxy = {
			isConnected: vi.fn().mockReturnValue(true),
			callTool: vi.fn().mockResolvedValue({
				answer: 'Pieces Copilot response',
				context: 'Some context',
			}),
		} as any;

		mockContextBridge = {
			captureHybridSearchEvent: vi.fn(),
		};

		// Register hybrid tools
		registerHybridTools(mockServer, mockLogger, {
			pieces: mockPiecesProxy,
			drive: mockDriveProxy,
			copilot: mockCopilotProxy,
			contextBridge: mockContextBridge,
		} as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Tool Registration', () => {
		it('should register hybrid search tool', () => {
			expect(mockServer.addTool).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'memory.hybrid_search',
					description: expect.stringContaining('Search across both local Cortex memory'),
				}),
			);
		});
	});

	describe('Hybrid Search Execution', () => {
		it('should execute hybrid search with all sources', async () => {
			const toolCall = mockServer.addTool.mock.calls[0][0];
			const result = await toolCall.execute({
				query: 'test query',
				limit: 10,
				include_pieces: true,
				include_drive: true,
				include_copilot: true,
			});

			const parsedResult = JSON.parse(result);
			expect(parsedResult.total).toBeGreaterThan(0);
			expect(parsedResult.local).toHaveLength(2);
			expect(parsedResult.pieces).toHaveLength(2);
			expect(parsedResult.drive).toHaveLength(1);
			expect(parsedResult.sources.local).toBe(2);
			expect(parsedResult.sources.pieces).toBe(2);
			expect(parsedResult.sources.drive).toBe(1);
			expect(parsedResult.sources.copilot).toBe(0); // Copilot returns different format

			// Verify all proxies were called
			expect(mockPiecesProxy.callTool).toHaveBeenCalledWith(
				'ask_pieces_ltm',
				expect.objectContaining({
					question: 'test query',
				}),
			);
			expect(mockDriveProxy.callTool).toHaveBeenCalledWith(
				'search_pieces_drive',
				expect.objectContaining({
					query: 'test query',
					limit: 5, // Math.floor(10/2)
				}),
			);
			expect(mockCopilotProxy.callTool).toHaveBeenCalledWith(
				'ask_pieces_copilot',
				expect.objectContaining({
					question: 'test query',
				}),
			);

			// Verify context bridge was called
			expect(mockContextBridge.captureHybridSearchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					query: 'test query',
					sources: expect.objectContaining({
						local: true,
						pieces: true,
						drive: true,
						copilot: true,
					}),
				}),
			);
		});

		it('should handle disabled sources', async () => {
			const toolCall = mockServer.addTool.mock.calls[0][0];
			const result = await toolCall.execute({
				query: 'test query',
				include_pieces: false,
				include_drive: false,
				include_copilot: false,
			});

			const parsedResult = JSON.parse(result);
			expect(parsedResult.total).toBe(2); // Only local results
			expect(parsedResult.pieces).toHaveLength(0);
			expect(parsedResult.drive).toHaveLength(0);
			expect(parsedResult.copilot).toHaveLength(0);

			// Verify proxies were not called
			expect(mockPiecesProxy.callTool).not.toHaveBeenCalled();
			expect(mockDriveProxy.callTool).not.toHaveBeenCalled();
			expect(mockCopilotProxy.callTool).not.toHaveBeenCalled();

			// Check warnings
			expect(parsedResult.warnings).toContain('Pieces LTM unavailable');
			expect(parsedResult.warnings).toContain('Pieces Drive unavailable');
			expect(parsedResult.warnings).toContain('Pieces Copilot unavailable');
		});

		it('should handle disconnected services', async () => {
			mockPiecesProxy.isConnected.mockReturnValue(false);
			mockDriveProxy.isConnected.mockReturnValue(false);
			mockCopilotProxy.isConnected.mockReturnValue(false);

			const toolCall = mockServer.addTool.mock.calls[0][0];
			const result = await toolCall.execute({
				query: 'test query',
			});

			const parsedResult = JSON.parse(result);
			expect(parsedResult.total).toBe(2); // Only local results
			expect(parsedResult.warnings).toHaveLength(3);

			// Verify proxies were not called
			expect(mockPiecesProxy.callTool).not.toHaveBeenCalled();
			expect(mockDriveProxy.callTool).not.toHaveBeenCalled();
			expect(mockCopilotProxy.callTool).not.toHaveBeenCalled();
		});

		it('should handle service errors gracefully', async () => {
			mockPiecesProxy.callTool.mockRejectedValue(new Error('Pieces service error'));
			mockDriveProxy.callTool.mockRejectedValue(new Error('Drive service error'));
			mockCopilotProxy.callTool.mockRejectedValue(new Error('Copilot service error'));

			const toolCall = mockServer.addTool.mock.calls[0][0];
			const result = await toolCall.execute({
				query: 'test query',
			});

			const parsedResult = JSON.parse(result);
			expect(parsedResult.total).toBe(2); // Only local results
			expect(parsedResult.warnings).toHaveLength(0); // No warnings, just continued with local

			// Verify logger was called with warnings
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.any(Object),
				expect.stringContaining('query failed; continuing'),
			);
		});

		it('should limit results appropriately', async () => {
			const toolCall = mockServer.addTool.mock.calls[0][0];
			const result = await toolCall.execute({
				query: 'test query',
				limit: 5,
			});

			const parsedResult = JSON.parse(result);
			expect(parsedResult.total).toBeLessThanOrEqual(5);

			// Verify drive proxy was called with split limit
			expect(mockDriveProxy.callTool).toHaveBeenCalledWith(
				'search_pieces_drive',
				expect.objectContaining({
					limit: 2, // Math.floor(5/2)
				}),
			);
		});

		it('should deduplicate results', async () => {
			// Mock responses with duplicate content
			mockPiecesProxy.callTool.mockResolvedValue({
				results: [
					{ content: 'Local result 1', score: 0.85 }, // Duplicate of local
					{ content: 'Unique Pieces result', score: 0.75 },
				],
			});

			const toolCall = mockServer.addTool.mock.calls[0][0];
			const result = await toolCall.execute({
				query: 'test query',
			});

			const parsedResult = JSON.parse(result);
			expect(parsedResult.total).toBe(3); // 2 local + 1 unique pieces (deduped)
			expect(parsedResult.combined).toHaveLength(3);

			// Verify deduplication by content and source
			const localResult = parsedResult.combined.find(
				(r: any) => r.content === 'Local result 1' && r.source === 'cortex-local',
			);
			const piecesResult = parsedResult.combined.find(
				(r: any) => r.content === 'Local result 1' && r.source === 'pieces-ltm',
			);
			expect(localResult).toBeDefined();
			expect(piecesResult).toBeDefined(); // Should still exist as different source
		});
	});

	describe('Context Assembly', () => {
		it('should assemble context for Copilot queries', async () => {
			const toolCall = mockServer.addTool.mock.calls[0][0];
			await toolCall.execute({
				query: 'test query',
				include_copilot: true,
			});

			// Verify Copilot was called with context
			expect(mockCopilotProxy.callTool).toHaveBeenCalledWith(
				'ask_pieces_copilot',
				expect.objectContaining({
					context: expect.stringContaining('Local Cortex Memory Results:'),
				}),
			);
		});

		it('should handle empty results in context assembly', async () => {
			// Mock empty results
			const { performLocalHybridSearch } = require('../search-utils.js');
			performLocalHybridSearch.mockResolvedValue([]);

			const toolCall = mockServer.addTool.mock.calls[0][0];
			await toolCall.execute({
				query: 'test query',
				include_copilot: true,
			});

			// Should still call Copilot but with minimal context
			expect(mockCopilotProxy.callTool).toHaveBeenCalledWith(
				'ask_pieces_copilot',
				expect.objectContaining({
					context: expect.stringContaining('Pieces Long-Term Memory Results:'),
				}),
			);
		});
	});
});
