import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecutionSurfaceAgent } from '../../src/subagents/ExecutionSurfaceAgent.js';

vi.mock('@cortex-os/mcp-bridge/runtime/remote-proxy', () => ({
	RemoteToolProxy: class {},
}));

const createConnector = (callTool: ReturnType<typeof vi.fn>) => {
	const tools = [
		{
			name: 'memory.search',
			description: 'Hybrid search tool',
			inputSchema: {},
		},
	];
	const proxy = {
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		getTools: () => tools,
		callTool: callTool,
	};

	return {
		id: 'memory-hybrid',
		entry: {
			id: 'memory-hybrid',
			displayName: 'Memory Hybrid',
			version: '2025-10-10',
			endpoint: 'https://connectors.local/memory',
			auth: {
				type: 'bearer',
				headerName: 'Authorization',
			},
			scopes: ['memory.read'],
			quotas: { perMinute: 60, perHour: 300 },
			enabled: true,
			metadata: { brand: 'brAInwav' },
			tags: ['surface:database'],
			status: 'online',
			ttlSeconds: 60,
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		},
		proxy,
		tools,
	} as any;
};

describe('ExecutionSurfaceAgent connectors integration', () => {
	const callToolMock = vi.fn().mockResolvedValue({ ok: true });
	const connector = createConnector(callToolMock);
	const stubRegistry: any = {
		listConnectors: vi.fn().mockResolvedValue([connector]),
	};

	beforeEach(() => {
		callToolMock.mockClear();
		(stubRegistry.listConnectors as vi.Mock).mockClear();
	});

	it('invokes remote connector tools during execution', async () => {
		const agent = new ExecutionSurfaceAgent({
			name: 'execution-surface-agent-test',
			maxConcurrentActions: 1,
			actionTimeout: 60000,
			allowedSurfaces: ['filesystem', 'network', 'git', 'deployment', 'database'],
			securityLevel: 'medium',
			connectorsRegistry: stubRegistry,
		});

		const state = await agent.execute('Run a database query for customer records');

		expect(callToolMock).toHaveBeenCalledTimes(1);
		expect(callToolMock).toHaveBeenCalledWith(
			'memory.search',
			expect.objectContaining({ content: expect.any(String) }),
		);
		expect(state.executionResults?.[0]?.status).toBe('success');
		expect(state.executionResults?.[0]?.result).toEqual({ ok: true });
	});
});
