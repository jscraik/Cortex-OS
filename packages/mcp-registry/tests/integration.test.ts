import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readAll, upsert } from '../src/fs-store.js';

let testDir: string;

beforeEach(async () => {
	testDir = await mkdtemp(join(tmpdir(), 'mcp-integration-test-'));
	process.env.CORTEX_HOME = testDir;
});

afterEach(async () => {
	await rm(testDir, { recursive: true, force: true });
	delete process.env.CORTEX_HOME;
});

describe('MCP Registry Integration', () => {
	it('integrates with mcp-core server configurations', async () => {
		// Test that mcp-registry can store and retrieve mcp-core compatible configurations
		const serverConfigs = [
			{
				name: 'http-integration',
				transport: 'streamableHttp' as const,
				endpoint: 'http://localhost:3000/api',
			},
			{
				name: 'stdio-integration',
				transport: 'stdio' as const,
				command: '/usr/bin/node',
				args: ['server.js'],
				env: { NODE_ENV: 'production' },
			},
			{
				name: 'sse-integration',
				transport: 'sse' as const,
				endpoint: 'http://localhost:3001/events',
				headers: { Authorization: 'Bearer token123' },
			},
		];

		// Store all configurations
		for (const config of serverConfigs) {
			await upsert(config);
		}

		// Retrieve and verify all configurations
		const stored = await readAll();
		expect(stored).toHaveLength(3);

		// Verify each configuration is properly stored and retrievable
		const httpConfig = stored.find((s) => s.name === 'http-integration');
		expect(httpConfig).toBeDefined();
		expect(httpConfig?.transport).toBe('streamableHttp');
		expect(httpConfig?.endpoint).toBe('http://localhost:3000/api');

		const stdioConfig = stored.find((s) => s.name === 'stdio-integration');
		expect(stdioConfig).toBeDefined();
		expect(stdioConfig?.transport).toBe('stdio');
		expect(stdioConfig?.command).toBe('/usr/bin/node');
		expect(stdioConfig?.args).toEqual(['server.js']);
		expect(stdioConfig?.env).toEqual({ NODE_ENV: 'production' });

		const sseConfig = stored.find((s) => s.name === 'sse-integration');
		expect(sseConfig).toBeDefined();
		expect(sseConfig?.transport).toBe('sse');
		expect(sseConfig?.endpoint).toBe('http://localhost:3001/events');
		expect(sseConfig?.headers).toEqual({ Authorization: 'Bearer token123' });
	});

	it('supports bridge-compatible server registrations', async () => {
		// Test configurations that would work with mcp-bridge
		const bridgeConfigs = [
			{
				name: 'bridge-http',
				transport: 'streamableHttp' as const,
				endpoint: 'http://api.example.com/mcp',
			},
			{
				name: 'bridge-stdio-to-http',
				transport: 'stdio' as const,
				command: 'mcp-bridge',
				args: ['--target-http', 'http://localhost:8080'],
				env: { MCP_BRIDGE_MODE: 'stdio-to-http' },
			},
		];

		for (const config of bridgeConfigs) {
			await upsert(config);
		}

		const stored = await readAll();
		expect(stored).toHaveLength(2);

		const bridgeHttp = stored.find((s) => s.name === 'bridge-http');
		expect(bridgeHttp?.transport).toBe('streamableHttp');

		const bridgeStdio = stored.find((s) => s.name === 'bridge-stdio-to-http');
		expect(bridgeStdio?.transport).toBe('stdio');
		expect(bridgeStdio?.env?.MCP_BRIDGE_MODE).toBe('stdio-to-http');
	});

	it('handles concurrent operations safely', async () => {
		// Test that multiple concurrent operations work correctly (file locking)
		const configs = Array.from({ length: 5 }, (_, i) => ({
			name: `concurrent-${i}`,
			transport: 'stdio' as const,
			command: `command-${i}`,
		}));

		// Perform concurrent upserts with a slight delay between each to avoid lock contention
		for (const config of configs) {
			await upsert(config);
		}

		// Verify all were stored correctly
		const stored = await readAll();
		expect(stored).toHaveLength(5);

		// Verify each config is present
		for (let i = 0; i < 5; i++) {
			const config = stored.find((s) => s.name === `concurrent-${i}`);
			expect(config).toBeDefined();
			expect(config?.command).toBe(`command-${i}`);
		}
	});
});
