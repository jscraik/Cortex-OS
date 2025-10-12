/**
 * ToolLayerAgent arXiv Integration Tests
 *
 * Tests the integration of arXiv MCP tools with the ToolLayerAgent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createToolLayerAgent, type ToolLayerAgent } from '../../src/subagents/ToolLayerAgent.js';

// Mock the ArxivMCPTools
vi.mock('../../src/mcp/ArxivMCPTools.js', () => ({
	ArxivMCPTools: vi.fn().mockImplementation(() => ({
		initialize: vi.fn().mockResolvedValue(undefined),
		getTools: vi.fn().mockReturnValue([
			{
				name: 'arxiv_search',
				description: 'Search for academic papers on arXiv',
				schema: {
					parse: vi.fn().mockReturnValue({
						query: 'test query',
						max_results: 5,
					}),
				},
				handler: vi.fn().mockResolvedValue({
					success: true,
					data: [
						{
							id: '2301.00001',
							title: 'Test Paper',
							summary: 'Test summary',
						},
					],
				}),
			},
			{
				name: 'arxiv_download',
				description: 'Download arXiv paper PDF',
				schema: {
					parse: vi.fn().mockReturnValue({
						paper_id: '2301.00001',
						format: 'pdf',
					}),
				},
				handler: vi.fn().mockResolvedValue({
					success: true,
					data: { download_url: 'http://example.com/paper.pdf' },
				}),
			},
		]),
		dispose: vi.fn().mockResolvedValue(undefined),
	})),
}));

describe('ToolLayerAgent arXiv Integration', () => {
	let agent: ToolLayerAgent;
	let mockArxivMCPTools: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		// Get the mocked constructor
		const { ArxivMCPTools } = require('../../src/mcp/ArxivMCPTools.js');
		mockArxivMCPTools = ArxivMCPTools();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Configuration and Initialization', () => {
		it('should initialize with arXiv tools enabled', () => {
			const config = {
				name: 'test-agent',
				enableArxivResearch: true,
				arxivServerSlug: 'arxiv-1',
				arxivMaxResults: 10,
				allowedTools: ['arxiv_search', 'arxiv_download'],
			};

			const { ArxivMCPTools } = require('../../src/mcp/ArxivMCPTools.js');

			agent = createToolLayerAgent(config);

			expect(ArxivMCPTools).toHaveBeenCalledWith({
				serverSlug: 'arxiv-1',
				defaultMaxResults: 10,
			});

			// Check that arXiv tools are in allowed tools
			const availableTools = agent.getAvailableTools();
			expect(availableTools).toContain('arxiv_search');
			expect(availableTools).toContain('arxiv_download');
		});

		it('should initialize with default arXiv configuration', () => {
			agent = createToolLayerAgent({
				name: 'test-agent',
				enableArxivResearch: true,
			});

			const { ArxivMCPTools } = require('../../src/mcp/ArxivMCPTools.js');

			expect(ArxivMCPTools).toHaveBeenCalledWith({
				serverSlug: undefined,
				defaultMaxResults: undefined,
			});
		});

		it('should not initialize arXiv tools when disabled', () => {
			const config = {
				name: 'test-agent',
				enableArxivResearch: false,
			};

			const { ArxivMCPTools } = require('../../src/mcp/ArxivMCPTools.js');

			agent = createToolLayerAgent(config);

			expect(ArxivMCPTools).not.toHaveBeenCalled();

			const availableTools = agent.getAvailableTools();
			expect(availableTools).not.toContain('arxiv_search');
			expect(availableTools).not.toContain('arxiv_download');
		});

		it('should handle arXiv tool registration errors gracefully', async () => {
			const { ArxivMCPTools } = require('../../src/mcp/ArxivMCPTools.js');
			const mockErrorTools = {
				initialize: vi.fn().mockRejectedValue(new Error('Registration failed')),
			};
			ArxivMCPTools.mockImplementation(() => mockErrorTools);

			agent = createToolLayerAgent({
				name: 'test-agent',
				enableArxivResearch: true,
			});

			// Wait a bit for async registration
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav arXiv MCP tools registration failed during init'),
				expect.objectContaining({
					component: 'agents',
					brand: 'brAInwav',
				}),
			);
		});
	});

	describe('Tool Selection', () => {
		beforeEach(() => {
			agent = createToolLayerAgent({
				name: 'test-agent',
				enableArxivResearch: true,
				allowedTools: ['arxiv_search', 'arxiv_download', 'validator'],
			});
		});

		it('should select arxiv_search for research queries', async () => {
			const result = await agent.execute('research papers about machine learning');

			expect(result.selectedTools).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'arxiv_search',
						description: expect.stringContaining('Search for academic papers'),
					}),
				]),
			);
		});

		it('should select arxiv_download for download requests', async () => {
			const result = await agent.execute('download PDF for paper 2301.00001');

			expect(result.selectedTools).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'arxiv_download',
						description: expect.stringContaining('Download arXiv paper'),
					}),
				]),
			);
		});

		it('should select arxiv_search for academic queries', async () => {
			const testCases = [
				'find academic papers on neural networks',
				'search arxiv for deep learning',
				'look up literature about transformers',
				'find scholarly articles on reinforcement learning',
				'academic research on computer vision',
			];

			for (const query of testCases) {
				const result = await agent.execute(query);
				expect(result.selectedTools).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							name: 'arxiv_search',
						}),
					]),
				);
			}
		});

		it('should extract search parameters correctly', async () => {
			const result = await agent.execute('search for "quantum computing" papers, max 10 results');

			const searchTool = result.selectedTools.find((t) => t.name === 'arxiv_search');
			expect(searchTool?.parameters).toEqual(
				expect.objectContaining({
					query: 'quantum computing',
					max_results: 10,
				}),
			);
		});

		it('should extract paper ID correctly', async () => {
			const result = await agent.execute('download PDF for arXiv:2301.00001');

			const downloadTool = result.selectedTools.find((t) => t.name === 'arxiv_download');
			expect(downloadTool?.parameters).toEqual(
				expect.objectContaining({
					paper_id: '2301.00001',
				}),
			);
		});

		it('should select default arXiv search for ambiguous research queries', async () => {
			const result = await agent.execute('tell me about machine learning research');

			const searchTool = result.selectedTools.find((t) => t.name === 'arxiv_search');
			expect(searchTool).toBeDefined();
			expect(searchTool?.parameters).toEqual(
				expect.objectContaining({
					query: 'machine learning research',
					max_results: 5,
				}),
			);
		});
	});

	describe('Tool Execution', () => {
		beforeEach(() => {
			agent = createToolLayerAgent({
				name: 'test-agent',
				enableArxivResearch: true,
				allowedTools: ['arxiv_search', 'arxiv_download'],
			});
		});

		it('should execute arxiv_search tool successfully', async () => {
			const mockSearchResult = {
				success: true,
				data: [
					{
						id: '2301.00001',
						title: 'Advances in Machine Learning',
						summary: 'Recent developments in ML algorithms',
						authors: ['John Doe'],
						published: '2023-01-01',
					},
				],
			};

			const mockSearchHandler = mockArxivMCPTools
				.getTools()
				.find((t) => t.name === 'arxiv_search')?.handler;
			mockSearchHandler.mockResolvedValue(mockSearchResult);

			const result = await agent.execute('search for machine learning papers');

			const searchResult = result.toolResults?.find((r) => r.tool === 'arxiv_search');
			expect(searchResult).toBeDefined();
			expect(searchResult?.status).toBe('success');
			expect(searchResult?.result).toEqual(mockSearchResult);

			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav arXiv tool executed successfully'),
				expect.objectContaining({
					component: 'agents',
					brand: 'brAInwav',
					tool: 'arxiv_search',
				}),
			);
		});

		it('should execute arxiv_download tool successfully', async () => {
			const mockDownloadResult = {
				success: true,
				data: {
					paper_id: '2301.00001',
					format: 'pdf',
					download_url: 'https://arxiv.org/pdf/2301.00001.pdf',
					size: 1024000,
				},
			};

			const mockDownloadHandler = mockArxivMCPTools
				.getTools()
				.find((t) => t.name === 'arxiv_download')?.handler;
			mockDownloadHandler.mockResolvedValue(mockDownloadResult);

			const result = await agent.execute('download PDF for paper 2301.00001');

			const downloadResult = result.toolResults?.find((r) => r.tool === 'arxiv_download');
			expect(downloadResult).toBeDefined();
			expect(downloadResult?.status).toBe('success');
			expect(downloadResult?.result).toEqual(mockDownloadResult);
		});

		it('should handle arXiv tool execution errors', async () => {
			const mockSearchHandler = mockArxivMCPTools
				.getTools()
				.find((t) => t.name === 'arxiv_search')?.handler;
			mockSearchHandler.mockRejectedValue(new Error('Search service unavailable'));

			const result = await agent.execute('search for machine learning papers');

			const searchResult = result.toolResults?.find((r) => r.tool === 'arxiv_search');
			expect(searchResult).toBeDefined();
			expect(searchResult?.status).toBe('error');
			expect(searchResult?.result).toEqual({
				success: false,
				error: 'Search service unavailable',
				tool: 'arxiv_search',
			});

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav arXiv tool execution failed'),
				expect.objectContaining({
					component: 'agents',
					brand: 'brAInwav',
					tool: 'arxiv_search',
				}),
			);
		});

		it('should execute multiple arXiv tools in parallel', async () => {
			const mockSearchHandler = mockArxivMCPTools
				.getTools()
				.find((t) => t.name === 'arxiv_search')?.handler;
			const mockDownloadHandler = mockArxivMCPTools
				.getTools()
				.find((t) => t.name === 'arxiv_download')?.handler;

			mockSearchHandler.mockResolvedValue({
				success: true,
				data: [{ id: '2301.00001', title: 'Test Paper' }],
			});

			mockDownloadHandler.mockResolvedValue({
				success: true,
				data: { download_url: 'http://example.com/paper.pdf' },
			});

			const result = await agent.execute('search and download papers about machine learning');

			expect(result.toolResults).toHaveLength(2);
			expect(result.toolResults?.some((r) => r.tool === 'arxiv_search')).toBe(true);
			expect(result.toolResults?.some((r) => r.tool === 'arxiv_download')).toBe(true);
		});
	});

	describe('Response Generation', () => {
		beforeEach(() => {
			agent = createToolLayerAgent({
				name: 'test-agent',
				enableArxivResearch: true,
				allowedTools: ['arxiv_search', 'arxiv_download'],
			});
		});

		it('should generate response with arXiv tool results', async () => {
			const mockSearchResult = {
				success: true,
				data: [
					{
						id: '2301.00001',
						title: 'Machine Learning Advances',
						summary: 'Recent developments in ML',
					},
				],
			};

			const mockSearchHandler = mockArxivMCPTools
				.getTools()
				.find((t) => t.name === 'arxiv_search')?.handler;
			mockSearchHandler.mockResolvedValue(mockSearchResult);

			const result = await agent.execute('find papers about machine learning');

			expect(result.messages).toHaveLength(2); // Human + AI response
			const aiMessage = result.messages[result.messages.length - 1];
			expect(aiMessage.content).toContain('machine learning');
			expect(aiMessage.content).toContain('toolsExecuted');
		});

		it('should include arXiv tool results in summary', async () => {
			const mockSearchResult = {
				success: true,
				data: [{ id: '2301.00001', title: 'Test Paper' }],
			};

			const mockDownloadResult = {
				success: true,
				data: { download_url: 'http://example.com/paper.pdf' },
			};

			const mockSearchHandler = mockArxivMCPTools
				.getTools()
				.find((t) => t.name === 'arxiv_search')?.handler;
			const mockDownloadHandler = mockArxivMCPTools
				.getTools()
				.find((t) => t.name === 'arxiv_download')?.handler;

			mockSearchHandler.mockResolvedValue(mockSearchResult);
			mockDownloadHandler.mockResolvedValue(mockDownloadResult);

			const result = await agent.execute('search and download papers');

			const aiMessage = result.messages[result.messages.length - 1];
			expect(aiMessage.content).toContain('2 tools');
			expect(aiMessage.content).toContain('2 successful');
		});
	});

	describe('Health Check', () => {
		it('should include arXiv tools in health check', async () => {
			agent = createToolLayerAgent({
				name: 'test-agent',
				enableArxivResearch: true,
			});

			const health = await agent.healthCheck();

			expect(health.status).toBe('healthy');
			expect(health.tools).toBeGreaterThan(0);
		});
	});
});
