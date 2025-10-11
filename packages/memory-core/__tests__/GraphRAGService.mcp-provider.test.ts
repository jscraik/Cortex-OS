/**
 * GraphRAG Service MCP Provider Tests
 *
 * Tests the integration of MCP-based external knowledge providers
 * with GraphRAG service for arXiv citation enrichment.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalCitation } from '../src/services/external/ExternalKnowledge.js';
import { MCPKnowledgeProvider } from '../src/services/external/MCPKnowledgeProvider.js';
import { createGraphRAGService, type GraphRAGService } from '../src/services/GraphRAGService.js';

// Mock the MCP dependencies
vi.mock('@cortex-os/mcp-core/client', () => ({
	createEnhancedClient: vi.fn(),
}));

vi.mock('@cortex-os/mcp-registry/fs-store', () => ({
	readAll: vi.fn(),
}));

describe('GraphRAGService MCP Integration', () => {
	let service: GraphRAGService;
	let mockMcpClient: any;
	let mockRegistry: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock MCP client
		mockMcpClient = {
			callTool: vi.fn(),
			listTools: vi.fn(),
			close: vi.fn(),
		};

		// Mock registry
		mockRegistry = {
			servers: [
				{
					slug: 'arxiv-1',
					name: 'arxiv-1',
					host: 'localhost',
					port: 3000,
					protocol: 'http',
				},
			],
		};

		const { createEnhancedClient } = await import('@cortex-os/mcp-core/client');
		(createEnhancedClient as any).mockReturnValue(mockMcpClient);

		const { readAll } = await import('@cortex-os/mcp-registry/fs-store');
		(readAll as any).mockResolvedValue(mockRegistry);
	});

	afterEach(async () => {
		if (service) {
			await service.close();
		}
	});

	describe('MCP Provider Initialization', () => {
		it('should initialize MCP provider when configured', async () => {
			const config = {
				externalKg: {
					enabled: true,
					provider: 'mcp' as const,
					slug: 'arxiv-1',
					tool: 'search_papers',
					maxResults: 5,
					requestTimeoutMs: 10000,
					maxDepth: 1,
					citationPrefix: 'neo4j',
				},
			};

			service = createGraphRAGService(config);

			// Mock embedding functions
			const mockEmbedDense = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
			const mockEmbedSparse = vi.fn().mockResolvedValue({
				indices: [0, 1, 2],
				values: [0.1, 0.2, 0.3],
			});

			mockMcpClient.listTools.mockResolvedValue({ success: true });

			await service.initialize(mockEmbedDense, mockEmbedSparse);

			expect(createEnhancedClient).toHaveBeenCalledWith({
				name: 'arxiv-1',
				host: 'localhost',
				port: 3000,
				protocol: 'http',
			});
			expect(mockMcpClient.listTools).toHaveBeenCalled();
		});

		it('should handle MCP provider initialization errors gracefully', async () => {
			const config = {
				externalKg: {
					enabled: true,
					provider: 'mcp' as const,
					slug: 'nonexistent-server',
					tool: 'search_papers',
					maxResults: 5,
					requestTimeoutMs: 10000,
					maxDepth: 1,
					citationPrefix: 'neo4j',
				},
			};

			// Mock registry without the requested server
			const { readAll } = await import('@cortex-os/mcp-registry/fs-store');
			(readAll as any).mockResolvedValue({ servers: [] });

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			service = createGraphRAGService(config);

			const mockEmbedDense = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
			const mockEmbedSparse = vi.fn().mockResolvedValue({
				indices: [0, 1, 2],
				values: [0.1, 0.2, 0.3],
			});

			await service.initialize(mockEmbedDense, mockEmbedSparse);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav GraphRAG failed to initialize MCP external provider'),
				expect.objectContaining({
					component: 'memory-core',
					brand: 'brAInwav',
					provider: 'mcp',
				}),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('MCP Citation Fetching', () => {
		beforeEach(async () => {
			const config = {
				externalKg: {
					enabled: true,
					provider: 'mcp' as const,
					slug: 'arxiv-1',
					tool: 'search_papers',
					maxResults: 5,
					requestTimeoutMs: 10000,
					maxDepth: 1,
					citationPrefix: 'neo4j',
				},
			};

			service = createGraphRAGService(config);

			const mockEmbedDense = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
			const mockEmbedSparse = vi.fn().mockResolvedValue({
				indices: [0, 1, 2],
				values: [0.1, 0.2, 0.3],
			});

			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await service.initialize(mockEmbedDense, mockEmbedSparse);
		});

		it('should fetch and merge MCP citations successfully', async () => {
			const mockArxivResponse = {
				success: true,
				data: [
					{
						id: '2301.00001',
						title: 'Test Paper 1',
						summary: 'This is a test paper about machine learning',
						authors: ['John Doe', 'Jane Smith'],
						published: '2023-01-01',
						categories: ['cs.AI', 'cs.LG'],
					},
					{
						id: '2301.00002',
						title: 'Test Paper 2',
						summary: 'This is another test paper about neural networks',
						authors: ['Alice Johnson'],
						published: '2023-01-02',
						categories: ['cs.LG'],
					},
				],
			};

			mockMcpClient.callTool.mockResolvedValue(mockArxivResponse);

			const result = await service.query({
				question: 'What are the latest developments in machine learning?',
				k: 3,
				includeCitations: true,
			});

			expect(mockMcpClient.callTool).toHaveBeenCalledWith('search_papers', {
				query: 'What are the latest developments in machine learning?',
				max_results: 5,
			});

			expect(result.citations).toBeDefined();
			expect(result.citations?.length).toBeGreaterThan(0);
			expect(result.metadata.externalKgEnriched).toBe(true);

			// Check that arXiv citations are properly formatted
			const arxivCitations = result.citations?.filter((c) => c.path.startsWith('arxiv:'));
			expect(arxivCitations?.length).toBe(2);
			expect(arxivCitations?.[0]).toEqual({
				path: 'arxiv:2301.00001',
				nodeType: 'DOC',
				relevanceScore: 0,
				brainwavIndexed: false,
			});
		});

		it('should handle MCP tool errors gracefully', async () => {
			mockMcpClient.callTool.mockRejectedValue(new Error('MCP server unavailable'));

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await service.query({
				question: 'What are the latest developments in machine learning?',
				k: 3,
				includeCitations: true,
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav GraphRAG failed to fetch MCP citations'),
				expect.objectContaining({
					component: 'memory-core',
					brand: 'brAInwav',
					question: 'What are the latest developments in machine learning?',
				}),
			);

			// Should still return results without external citations
			expect(result.citations).toBeDefined();
			expect(result.metadata.externalKgEnriched).toBeUndefined();

			consoleSpy.mockRestore();
		});

		it('should handle MCP timeouts', async () => {
			// Simulate timeout by making the call take longer than the timeout
			mockMcpClient.callTool.mockImplementation(
				() => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000)),
			);

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await service.query({
				question: 'What are the latest developments in machine learning?',
				k: 3,
				includeCitations: true,
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav GraphRAG failed to fetch MCP citations'),
				expect.objectContaining({
					component: 'memory-core',
					brand: 'brAInwav',
				}),
			);

			expect(result.metadata.externalKgEnriched).toBeUndefined();

			consoleSpy.mockRestore();
		});

		it('should handle unsuccessful MCP responses', async () => {
			mockMcpClient.callTool.mockResolvedValue({
				success: false,
				error: 'Invalid query parameters',
			});

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await service.query({
				question: 'Invalid query <<>>',
				k: 3,
				includeCitations: true,
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav GraphRAG failed to fetch MCP citations'),
				expect.objectContaining({
					component: 'memory-core',
					brand: 'brAInwav',
				}),
			);

			expect(result.metadata.externalKgEnriched).toBeUndefined();

			consoleSpy.mockRestore();
		});

		it('should deduplicate citations by path', async () => {
			const mockArxivResponse = {
				success: true,
				data: [
					{
						id: '2301.00001',
						title: 'Test Paper 1',
						summary: 'This is a test paper',
						published: '2023-01-01',
					},
					{
						id: '2301.00001', // Duplicate ID
						title: 'Test Paper 1 (Duplicate)',
						summary: 'This is the same paper',
						published: '2023-01-01',
					},
				],
			};

			mockMcpClient.callTool.mockResolvedValue(mockArxivResponse);

			const result = await service.query({
				question: 'Test query for deduplication',
				k: 3,
				includeCitations: true,
			});

			const arxivCitations = result.citations?.filter((c) => c.path.startsWith('arxiv:'));
			expect(arxivCitations?.length).toBe(1); // Should deduplicate
			expect(arxivCitations?.[0].path).toBe('arxiv:2301.00001');
		});
	});

	describe('Provider Configuration', () => {
		it('should use default MCP settings when not specified', async () => {
			const config = {
				externalKg: {
					enabled: true,
					provider: 'mcp' as const,
					maxDepth: 1,
					citationPrefix: 'neo4j',
				},
			};

			service = createGraphRAGService(config);

			const mockEmbedDense = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
			const mockEmbedSparse = vi.fn().mockResolvedValue({
				indices: [0, 1, 2],
				values: [0.1, 0.2, 0.3],
			});

			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await service.initialize(mockEmbedDense, mockEmbedSparse);

			// Should use defaults
			mockMcpClient.callTool.mockResolvedValue({ success: true, data: [] });

			await service.query({
				question: 'Test query',
				k: 3,
				includeCitations: true,
			});

			expect(mockMcpClient.callTool).toHaveBeenCalledWith('search_papers', {
				query: 'Test query',
				max_results: 5,
			});
		});

		it('should respect custom MCP configuration', async () => {
			const config = {
				externalKg: {
					enabled: true,
					provider: 'mcp' as const,
					slug: 'custom-arxiv',
					tool: 'custom_search',
					maxResults: 10,
					requestTimeoutMs: 20000,
					maxDepth: 1,
					citationPrefix: 'custom',
				},
			};

			// Mock registry with custom server
			const { readAll } = await import('@cortex-os/mcp-registry/fs-store');
			(readAll as any).mockResolvedValue({
				servers: [
					{
						slug: 'custom-arxiv',
						name: 'custom-arxiv',
						host: 'custom-host',
						port: 4000,
						protocol: 'https',
					},
				],
			});

			service = createGraphRAGService(config);

			const mockEmbedDense = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
			const mockEmbedSparse = vi.fn().mockResolvedValue({
				indices: [0, 1, 2],
				values: [0.1, 0.2, 0.3],
			});

			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await service.initialize(mockEmbedDense, mockEmbedSparse);

			expect(createEnhancedClient).toHaveBeenCalledWith({
				name: 'custom-arxiv',
				host: 'custom-host',
				port: 4000,
				protocol: 'https',
			});

			mockMcpClient.callTool.mockResolvedValue({ success: true, data: [] });

			await service.query({
				question: 'Test query',
				k: 3,
				includeCitations: true,
			});

			expect(mockMcpClient.callTool).toHaveBeenCalledWith('custom_search', {
				query: 'Test query',
				max_results: 10,
			});
		});
	});

	describe('Health Check and Cleanup', () => {
		it('should include MCP provider in health check', async () => {
			const config = {
				externalKg: {
					enabled: true,
					provider: 'mcp' as const,
					slug: 'arxiv-1',
					tool: 'search_papers',
					maxResults: 5,
					requestTimeoutMs: 10000,
					maxDepth: 1,
					citationPrefix: 'neo4j',
				},
			};

			service = createGraphRAGService(config);

			const mockEmbedDense = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
			const mockEmbedSparse = vi.fn().mockResolvedValue({
				indices: [0, 1, 2],
				values: [0.1, 0.2, 0.3],
			});

			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await service.initialize(mockEmbedDense, mockEmbedSparse);

			const health = await service.healthCheck();
			expect(health.status).toBe('healthy');
		});

		it('should properly dispose MCP client on close', async () => {
			const config = {
				externalKg: {
					enabled: true,
					provider: 'mcp' as const,
					slug: 'arxiv-1',
					tool: 'search_papers',
					maxResults: 5,
					requestTimeoutMs: 10000,
					maxDepth: 1,
					citationPrefix: 'neo4j',
				},
			};

			service = createGraphRAGService(config);

			const mockEmbedDense = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
			const mockEmbedSparse = vi.fn().mockResolvedValue({
				indices: [0, 1, 2],
				values: [0.1, 0.2, 0.3],
			});

			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await service.initialize(mockEmbedDense, mockEmbedSparse);

			await service.close();

			expect(mockMcpClient.close).toHaveBeenCalled();
		});
	});
});
