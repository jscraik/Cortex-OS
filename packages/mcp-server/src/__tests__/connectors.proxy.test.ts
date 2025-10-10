import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectorsProxyManager } from '../connectors-proxy.js';

const connectMock = vi.fn();
const callToolMock = vi.fn().mockResolvedValue({ ok: true });
const disconnectMock = vi.fn();

const remoteProxyInstances: any[] = [];

vi.mock('@cortex-os/mcp-bridge/runtime/telemetry/metrics', () => ({
	setConnectorProxyStatus: vi.fn(),
}));

vi.mock('@cortex-os/mcp-bridge/runtime/remote-proxy', () => ({
	RemoteToolProxy: class {
		public options: Record<string, unknown>;

		constructor(options: Record<string, unknown>) {
			this.options = options;
			remoteProxyInstances.push(this);
		}

		async connect() {
			connectMock(this.options);
		}

		getTools() {
			return [
				{
					name: 'memory.search',
					description: 'Hybrid search',
					inputSchema: {},
				},
			];
		}

		async callTool(_name: string, args: Record<string, unknown>) {
			callToolMock(args);
			return { ok: true };
		}

		async disconnect() {
			disconnectMock();
		}
	},
}));

describe('ConnectorsProxyManager', () => {
	const manifest = {
		brand: 'brAInwav',
		version: '2025.10.10',
		ttlSeconds: 300,
		connectors: [
			{
				id: 'memory-hybrid',
				displayName: 'Memory Hybrid',
				version: '2025-10-10',
				endpoint: 'https://connectors.local/memory',
				auth: {
					type: 'bearer',
					headerName: 'Authorization',
				},
				scopes: ['memory.read'],
				quotas: { perMinute: 60, perHour: 600 },
				enabled: true,
				metadata: { brand: 'brAInwav' },
				tags: ['surface:database'],
				timeouts: undefined,
				availability: undefined,
			},
		],
	};

	const logger: any = {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		child: vi.fn().mockImplementation(() => logger),
	};

	const server = {
		addTool: vi.fn(),
	};

	beforeEach(() => {
		remoteProxyInstances.length = 0;
		connectMock.mockClear();
		callToolMock.mockClear();
		disconnectMock.mockClear();
		server.addTool.mockClear();
		logger.info.mockClear();
		logger.warn.mockClear();
	});

	it('connects connectors and registers tools', async () => {
		const manager = new ConnectorsProxyManager({
			manifest,
			logger,
			enabled: true,
			apiKey: 'test-key',
		});

		await manager.connectAll();
		manager.registerTools(server as any, logger);

		expect(connectMock).toHaveBeenCalledTimes(1);
		expect(server.addTool).toHaveBeenCalledTimes(1);

		const [{ execute }] = server.addTool.mock.calls[0];
		await execute({ query: 'hello' });
		expect(callToolMock).toHaveBeenCalledTimes(1);
		expect(callToolMock).toHaveBeenCalledWith({ query: 'hello' });

		await manager.disconnectAll();
		expect(disconnectMock).toHaveBeenCalledTimes(1);
	});
});
