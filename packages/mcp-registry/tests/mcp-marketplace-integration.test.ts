import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ToolRegistry } from '@cortex-os/mcp-core';
import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import { readAll } from '../src/fs-store.js';
import { registryMarketplaceImportTool, registryMcpTools } from '../src/mcp/tools.js';
import { fetchMarketplaceServer } from '../src/providers/mcpmarket.js';

vi.mock('../src/providers/mcpmarket.js', async () => {
	const actual = await vi.importActual<typeof import('../src/providers/mcpmarket.js')>(
		'../src/providers/mcpmarket.js',
	);
	return {
		...actual,
		fetchMarketplaceServer: vi.fn(),
	};
});

const mockedFetchMarketplaceServer = fetchMarketplaceServer as MockedFunction<
	typeof fetchMarketplaceServer
>;

describe('Marketplace import integration', () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), 'mcp-marketplace-integration-'));
		process.env.CORTEX_HOME = testDir;
		mockedFetchMarketplaceServer.mockReset();
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
		delete process.env.CORTEX_HOME;
	});

	it('imports and persists server configuration from marketplace', async () => {
		mockedFetchMarketplaceServer.mockResolvedValue({
			name: 'arxiv-1',
			transport: 'stdio',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-arxiv'],
		});

		const response = await registryMarketplaceImportTool.handler({
			slug: 'arxiv-1',
			overwrite: false,
		});

		expect(response.isError).toBeFalsy();
		const content = JSON.parse(response.content[0].text);
		expect(content.status).toBe('created');
		expect(content.source).toBe('mcpmarket');

		const servers = await readAll();
		expect(servers).toHaveLength(1);
		expect(servers[0].name).toBe('arxiv-1');
	});

	it('executes through ToolRegistry using MCP conventions', async () => {
		mockedFetchMarketplaceServer.mockResolvedValue({
			name: 'arxiv-1',
			transport: 'stdio',
			command: 'npx',
		});

		const toolRegistry = new ToolRegistry();
		const importTool = {
			name: registryMarketplaceImportTool.name,
			description: registryMarketplaceImportTool.description,
			inputSchema: registryMarketplaceImportTool.inputSchema,
			execute: async (input: unknown) => {
				const response = await registryMarketplaceImportTool.handler(input);
				if (response.isError) {
					const errorContent = JSON.parse(response.content[0].text);
					throw new Error(`${errorContent.error}: ${errorContent.message}`);
				}
				return JSON.parse(response.content[0].text);
			},
		};

		toolRegistry.register(importTool);

		const result = (await toolRegistry.execute('registry.marketplaceImport', {
			slug: 'arxiv-1',
			overwrite: true,
		})) as { status: string; source: string };

		expect(result.status).toBe('updated');
		expect(result.source).toBe('mcpmarket');
		expect(mockedFetchMarketplaceServer).toHaveBeenCalledWith('arxiv-1', expect.any(Object));
	});

	it('exposes marketplace tool via registryMcpTools array', () => {
		const marketplaceTool = registryMcpTools.find(
			(tool) => tool.name === 'registry.marketplaceImport',
		);
		expect(marketplaceTool).toBeDefined();
		expect(marketplaceTool?.description).toContain('marketplace');
	});

	it('imports arXiv server with enhanced metadata', async () => {
		mockedFetchMarketplaceServer.mockResolvedValue({
			name: 'arxiv-1',
			transport: 'stdio',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-arxiv'],
			env: {
				ARXIV_EMAIL: 'set-your-registered-email@example.com',
			},
			metadata: {
				description: 'arXiv academic paper search and retrieval server',
				version: '1.0.0',
				author: 'Model Context Protocol',
				tags: ['academic', 'research', 'papers', 'arxiv', 'search'],
				capabilities: ['search_papers', 'download_paper'],
				remoteTools: [
					{
						name: 'search_papers',
						description: 'Search for academic papers on arXiv by query, field, or author',
					},
					{
						name: 'download_paper',
						description: 'Download full text, PDF, or source of an arXiv paper',
					},
				],
			},
		});

		const response = await registryMarketplaceImportTool.handler({
			slug: 'arxiv-1',
			overwrite: false,
		});

		expect(response.isError).toBeFalsy();

		const servers = await readAll();
		expect(servers).toHaveLength(1);
		const arxivServer = servers[0];
		expect(arxivServer.name).toBe('arxiv-1');
		expect(arxivServer.metadata).toBeDefined();
		expect(arxivServer.metadata?.tags).toContain('academic');
		expect(arxivServer.metadata?.remoteTools).toHaveLength(2);
		expect(arxivServer.metadata?.remoteTools[0].name).toBe('search_papers');
	});
});
