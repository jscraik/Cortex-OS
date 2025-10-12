/**
 * ArxivMCPTools Tests
 *
 * Tests the arXiv MCP tools integration with the agent system.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArxivMCPTools } from '../../src/mcp/ArxivMCPTools.js';

// Mock the MCP dependencies
vi.mock('@cortex-os/mcp-core/client', () => ({
	createEnhancedClient: vi.fn(),
}));

vi.mock('@cortex-os/mcp-registry/fs-store', () => ({
	readAll: vi.fn(),
}));

describe('ArxivMCPTools', () => {
	let arxivTools: ArxivMCPTools;
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

		// Mock console methods
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Initialization', () => {
		it('should initialize with default configuration', async () => {
			arxivTools = new ArxivMCPTools();

			mockMcpClient.listTools.mockResolvedValue({ success: true });

			await arxivTools.initialize();

			expect(createEnhancedClient).toHaveBeenCalledWith({
				name: 'arxiv-1',
				host: 'localhost',
				port: 3000,
				protocol: 'http',
			});
			expect(mockMcpClient.listTools).toHaveBeenCalled();
		});

		it('should initialize with custom configuration', async () => {
			const config = {
				serverSlug: 'custom-arxiv',
				searchToolName: 'custom_search',
				downloadToolName: 'custom_download',
				defaultMaxResults: 10,
				requestTimeoutMs: 20000,
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

			arxivTools = new ArxivMCPTools(config);

			mockMcpClient.listTools.mockResolvedValue({ success: true });

			await arxivTools.initialize();

			expect(createEnhancedClient).toHaveBeenCalledWith({
				name: 'custom-arxiv',
				host: 'custom-host',
				port: 4000,
				protocol: 'https',
			});
		});

		it('should throw error when server not found in registry', async () => {
			arxivTools = new ArxivMCPTools({ serverSlug: 'nonexistent' });

			// Mock registry without the requested server
			const { readAll } = await import('@cortex-os/mcp-registry/fs-store');
			(readAll as any).mockResolvedValue({ servers: [] });

			await expect(arxivTools.initialize()).rejects.toThrow(
				'arXiv MCP server not found in registry: nonexistent',
			);
		});

		it('should handle connection errors gracefully', async () => {
			arxivTools = new ArxivMCPTools();

			mockMcpClient.listTools.mockRejectedValue(new Error('Connection failed'));

			await expect(arxivTools.initialize()).rejects.toThrow('Connection failed');
		});
	});

	describe('Tool Registration', () => {
		beforeEach(async () => {
			arxivTools = new ArxivMCPTools();
			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await arxivTools.initialize();
		});

		it('should provide correct tool descriptors', () => {
			const tools = arxivTools.getTools();

			expect(tools).toHaveLength(2);

			const searchTool = tools.find((t) => t.name === 'arxiv_search');
			expect(searchTool).toBeDefined();
			expect(searchTool?.description).toContain('Search for academic papers');
			expect(searchTool?.schema.parse).toBeDefined();

			const downloadTool = tools.find((t) => t.name === 'arxiv_download');
			expect(downloadTool).toBeDefined();
			expect(downloadTool?.description).toContain('Download the full text');
			expect(downloadTool?.schema.parse).toBeDefined();
		});

		it('should validate search tool parameters', () => {
			const tools = arxivTools.getTools();
			const searchTool = tools.find((t) => t.name === 'arxiv_search');

			expect(
				searchTool?.schema.parse({
					query: 'machine learning',
					max_results: 5,
					field: 'all',
					sort_by: 'relevance',
				}),
			).toEqual({
				query: 'machine learning',
				max_results: 5,
				field: 'all',
				sort_by: 'relevance',
			});

			// Test required parameter
			expect(() => searchTool?.schema.parse({})).toThrow();

			// Test parameter constraints
			expect(() =>
				searchTool?.schema.parse({
					query: 'test',
					max_results: 0, // Should be at least 1
				}),
			).toThrow();

			expect(() =>
				searchTool?.schema.parse({
					query: 'test',
					max_results: 25, // Should be at most 20
				}),
			).toThrow();
		});

		it('should validate download tool parameters', () => {
			const tools = arxivTools.getTools();
			const downloadTool = tools.find((t) => t.name === 'arxiv_download');

			expect(
				downloadTool?.schema.parse({
					paper_id: '2301.00001',
					format: 'pdf',
				}),
			).toEqual({
				paper_id: '2301.00001',
				format: 'pdf',
			});

			// Test required parameter
			expect(() => downloadTool?.schema.parse({})).toThrow();

			// Test enum values
			expect(() =>
				downloadTool?.schema.parse({
					paper_id: '2301.00001',
					format: 'invalid', // Should be one of the enum values
				}),
			).toThrow();
		});
	});

	describe('Tool Execution', () => {
		beforeEach(async () => {
			arxivTools = new ArxivMCPTools();
			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await arxivTools.initialize();
		});

		describe('arxiv_search tool', () => {
			it('should execute search tool successfully', async () => {
				const mockSearchResponse = {
					success: true,
					data: [
						{
							id: '2301.00001',
							title: 'Machine Learning Advances',
							summary: 'Recent advances in ML',
							authors: ['John Doe'],
							published: '2023-01-01',
						},
					],
				};

				mockMcpClient.callTool.mockResolvedValue(mockSearchResponse);

				const tools = arxivTools.getTools();
				const searchTool = tools.find((t) => t.name === 'arxiv_search')!;

				const result = await searchTool.handler({
					query: 'machine learning',
					max_results: 5,
				});

				expect(mockMcpClient.callTool).toHaveBeenCalledWith('search_papers', {
					query: 'machine learning',
					max_results: 5,
				});

				expect(result).toEqual({
					success: true,
					data: mockSearchResponse.data,
					source: 'arxiv_mcp',
					server: 'arxiv-1',
					timestamp: expect.any(String),
				});

				expect(console.log).toHaveBeenCalledWith(
					expect.stringContaining('brAInwav arXiv tool executed successfully'),
					expect.objectContaining({
						component: 'agents',
						brand: 'brAInwav',
						tool: 'arxiv_search',
					}),
				);
			});

			it('should handle search tool errors', async () => {
				mockMcpClient.callTool.mockRejectedValue(new Error('Search failed'));

				const tools = arxivTools.getTools();
				const searchTool = tools.find((t) => t.name === 'arxiv_search')!;

				const result = await searchTool.handler({
					query: 'invalid query',
				});

				expect(result).toEqual({
					success: false,
					error: 'Search failed',
					source: 'arxiv_mcp',
					timestamp: expect.any(String),
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

			it('should handle unsuccessful search responses', async () => {
				mockMcpClient.callTool.mockResolvedValue({
					success: false,
					error: 'Invalid query',
				});

				const tools = arxivTools.getTools();
				const searchTool = tools.find((t) => t.name === 'arxiv_search')!;

				const result = await searchTool.handler({
					query: 'invalid query',
				});

				expect(result).toEqual({
					success: false,
					error: 'Search tool returned unsuccessful result: Invalid query',
					source: 'arxiv_mcp',
					timestamp: expect.any(String),
				});
			});

			it('should apply default parameters', async () => {
				mockMcpClient.callTool.mockResolvedValue({ success: true, data: [] });

				const tools = arxivTools.getTools();
				const searchTool = tools.find((t) => t.name === 'arxiv_search')!;

				await searchTool.handler({
					query: 'test query',
					// max_results not specified
				});

				expect(mockMcpClient.callTool).toHaveBeenCalledWith('search_papers', {
					query: 'test query',
					max_results: 5, // Default value
				});
			});
		});

		describe('arxiv_download tool', () => {
			it('should execute download tool successfully', async () => {
				const mockDownloadResponse = {
					success: true,
					data: {
						paper_id: '2301.00001',
						format: 'pdf',
						content: 'base64encodedpdf...',
						size: 1024000,
					},
				};

				mockMcpClient.callTool.mockResolvedValue(mockDownloadResponse);

				const tools = arxivTools.getTools();
				const downloadTool = tools.find((t) => t.name === 'arxiv_download')!;

				const result = await downloadTool.handler({
					paper_id: '2301.00001',
					format: 'pdf',
				});

				expect(mockMcpClient.callTool).toHaveBeenCalledWith('download_paper', {
					paper_id: '2301.00001',
					format: 'pdf',
				});

				expect(result).toEqual({
					success: true,
					data: mockDownloadResponse.data,
					source: 'arxiv_mcp',
					server: 'arxiv-1',
					timestamp: expect.any(String),
				});
			});

			it('should handle download tool errors', async () => {
				mockMcpClient.callTool.mockRejectedValue(new Error('Paper not found'));

				const tools = arxivTools.getTools();
				const downloadTool = tools.find((t) => t.name === 'arxiv_download')!;

				const result = await downloadTool.handler({
					paper_id: 'nonexistent',
					format: 'pdf',
				});

				expect(result).toEqual({
					success: false,
					error: 'Paper not found',
					source: 'arxiv_mcp',
					timestamp: expect.any(String),
				});
			});

			it('should use longer timeout for downloads', async () => {
				// Create a promise that resolves after a short delay
				const slowPromise = new Promise((resolve) =>
					setTimeout(() => resolve({ success: true, data: {} }), 1000),
				);
				mockMcpClient.callTool.mockReturnValue(slowPromise);

				const tools = arxivTools.getTools();
				const downloadTool = tools.find((t) => t.name === 'arxiv_download')!;

				const startTime = Date.now();
				await downloadTool.handler({
					paper_id: '2301.00001',
					format: 'pdf',
				});
				const endTime = Date.now();

				// Should take at least 1 second (the slow promise delay)
				expect(endTime - startTime).toBeGreaterThan(900);
			});

			it('should apply default download format', async () => {
				mockMcpClient.callTool.mockResolvedValue({ success: true, data: {} });

				const tools = arxivTools.getTools();
				const downloadTool = tools.find((t) => t.name === 'arxiv_download')!;

				await downloadTool.handler({
					paper_id: '2301.00001',
					// format not specified
				});

				expect(mockMcpClient.callTool).toHaveBeenCalledWith('download_paper', {
					paper_id: '2301.00001',
					format: 'pdf', // Default value
				});
			});
		});
	});

	describe('Health Check', () => {
		beforeEach(async () => {
			arxivTools = new ArxivMCPTools();
			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await arxivTools.initialize();
		});

		it('should return healthy when MCP client is responsive', async () => {
			mockMcpClient.listTools.mockResolvedValue({ success: true });

			const health = await arxivTools.healthCheck();

			expect(health).toBe(true);
			expect(mockMcpClient.listTools).toHaveBeenCalled();
		});

		it('should return unhealthy when MCP client fails', async () => {
			mockMcpClient.listTools.mockRejectedValue(new Error('Connection lost'));

			const health = await arxivTools.healthCheck();

			expect(health).toBe(false);
			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav ArxivMCPTools health check failed'),
				expect.objectContaining({
					component: 'agents',
					brand: 'brAInwav',
				}),
			);
		});
	});

	describe('Cleanup', () => {
		beforeEach(async () => {
			arxivTools = new ArxivMCPTools();
			mockMcpClient.listTools.mockResolvedValue({ success: true });
			await arxivTools.initialize();
		});

		it('should close MCP client on dispose', async () => {
			await arxivTools.dispose();

			expect(mockMcpClient.close).toHaveBeenCalled();
		});

		it('should handle disposal errors gracefully', async () => {
			mockMcpClient.close.mockRejectedValue(new Error('Close failed'));

			// Should not throw
			await expect(arxivTools.dispose()).resolves.toBeUndefined();

			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav ArxivMCPTools disposal error'),
				expect.objectContaining({
					component: 'agents',
					brand: 'brAInwav',
				}),
			);
		});
	});

	describe('Error Handling and Logging', () => {
		it('should log initialization success', async () => {
			arxivTools = new ArxivMCPTools();
			mockMcpClient.listTools.mockResolvedValue({ success: true });

			await arxivTools.initialize();

			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav ArxivMCPTools initialized successfully'),
				expect.objectContaining({
					component: 'agents',
					brand: 'brAInwav',
					server: 'arxiv-1',
					slug: 'arxiv-1',
				}),
			);
		});

		it('should log initialization errors', async () => {
			arxivTools = new ArxivMCPTools();
			mockMcpClient.listTools.mockRejectedValue(new Error('Init failed'));

			await expect(arxivTools.initialize()).rejects.toThrow('Init failed');

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav ArxivMCPTools initialization failed'),
				expect.objectContaining({
					component: 'agents',
					brand: 'brAInwav',
					slug: 'arxiv-1',
				}),
			);
		});
	});
});
