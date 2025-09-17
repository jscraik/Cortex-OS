import { describe, expect, it, vi } from 'vitest';
import type { MCPClient } from '@/lib/types.js';
import {
	createMCPProvider,
	createMCPProviders,
} from '@/providers/mcp-provider.js';

describe('MCP Provider', () => {
	it('generates via MCP callTool with sane defaults', async () => {
		const mcp: MCPClient = {
			callTool: vi.fn(async (_server, _tool, _args) => ({ text: 'hello' })),
			callToolWithFallback: vi.fn(async () => ({ text: 'hello' })),
			discoverServers: vi.fn(async () => []),
			isConnected: vi.fn(async () => true),
			listTools: vi.fn(async () => [
				{
					name: 'text-generation',
					schema: { properties: { model: { enum: ['foo'] } } },
				},
			]),
		};

		const provider = createMCPProvider({ mcpClient: mcp, modelName: 'foo' });
		const res = await provider.generate('Say hi', {});
		expect(res.text).toBe('hello');
		expect(res.provider).toContain('mcp:');
		expect(mcp.callTool).toHaveBeenCalled();
	});

	it('discovers models from listTools and creates providers', async () => {
		const mcp: MCPClient = {
			callTool: vi.fn(),
			callToolWithFallback: vi.fn(),
			discoverServers: vi.fn(async () => []),
			isConnected: vi.fn(async () => true),
			listTools: vi.fn(async () => [
				{
					name: 'text-generation',
					schema: { properties: { model: { enum: ['a', 'b', 'c'] } } },
				},
			]),
		};

		const providers = await createMCPProviders(mcp);
		expect(providers.length).toBe(3);
		expect(providers[0].name).toContain('mcp:');
	});

	it('returns empty array if no text-generation tool', async () => {
		const mcp: MCPClient = {
			callTool: vi.fn(),
			callToolWithFallback: vi.fn(),
			discoverServers: vi.fn(async () => []),
			isConnected: vi.fn(async () => true),
			listTools: vi.fn(async () => [{ name: 'other' } as any]),
		};

		const providers = await createMCPProviders(mcp);
		expect(providers.length).toBe(0);
	});

	it('throws on invalid MCP response (missing text)', async () => {
		const mcp: MCPClient = {
			callTool: vi.fn(async () => ({})),
			callToolWithFallback: vi.fn(),
			discoverServers: vi.fn(async () => []),
			isConnected: vi.fn(async () => true),
		} as any;

		const provider = createMCPProvider({ mcpClient: mcp, modelName: 'foo' });
		await expect(provider.generate('x', {})).rejects.toThrow(
			'Invalid response from MCP server',
		);
	});
});
