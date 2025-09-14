import { describe, expect, it } from 'vitest';
import { createEnhancedClient } from '../src/client.js';

describe('MCP Core Integration', () => {
	it('integrates with registry-style server configurations', async () => {
		// Test that mcp-core can handle server configurations that would come from mcp-registry
		const serverConfig = {
			name: 'integration-test-server',
			transport: 'stdio' as const,
			command: process.execPath,
			args: [
				'-e',
				`
				let id = 0;
				process.stdin.on('data', data => {
					const lines = data.toString().trim().split('\\n');
					lines.forEach(line => {
						if (line.trim()) {
							try {
								const request = JSON.parse(line);
								const response = {
									jsonrpc: '2.0',
									id: request.id || ++id,
									result: {
										success: true,
										method: request.name,
										args: request.arguments
									}
								};
								process.stdout.write(JSON.stringify(response) + '\\n');
							} catch (e) {
								const error = {
									jsonrpc: '2.0',
									id: ++id,
									error: { code: -32700, message: 'Parse error' }
								};
								process.stdout.write(JSON.stringify(error) + '\\n');
							}
						}
					});
				});
				`,
			],
		};

		const client = await createEnhancedClient(serverConfig);

		const result = await client.callTool({
			name: 'test-method',
			arguments: { param1: 'value1', param2: 42 },
		});

		expect(result).toMatchObject({
			jsonrpc: '2.0',
			id: expect.any(Number),
			result: {
				success: true,
				method: 'test-method',
				args: { param1: 'value1', param2: 42 },
			},
		});

		await client.close();
	});

	it('handles bridging-compatible configurations', async () => {
		// Test that mcp-core works with configurations that might be used by mcp-bridge
		const bridgeConfig = {
			name: 'bridge-compatible-test',
			transport: 'stdio' as const,
			command: process.execPath,
			args: [
				'-e',
				`
				process.stdin.on('data', data => {
					const request = JSON.parse(data.toString().trim());
					const response = {
						id: request.id || 'bridge-test',
						result: {
							bridge: true,
							original: request
						}
					};
					process.stdout.write(JSON.stringify(response) + '\\n');
				});
				`,
			],
		};

		const client = await createEnhancedClient(bridgeConfig);

		const result = await client.callTool({
			name: 'bridge-test',
			arguments: { transport: 'stdio' },
		});

		expect(result).toMatchObject({
			id: expect.anything(),
			result: {
				bridge: true,
				original: {
					name: 'bridge-test',
					arguments: { transport: 'stdio' },
				},
			},
		});

		await client.close();
	});

	it('validates cross-package schema compatibility', () => {
		// Ensure that the schemas used across packages are compatible
		const validConfigs = [
			{
				name: 'http-server',
				transport: 'streamableHttp' as const,
				endpoint: 'http://localhost:3000',
			},
			{
				name: 'sse-server',
				transport: 'sse' as const,
				endpoint: 'http://localhost:3001/events',
			},
			{
				name: 'stdio-server',
				transport: 'stdio' as const,
				command: 'echo',
				args: ['test'],
			},
		];

		validConfigs.forEach((config) => {
			expect(() => createEnhancedClient(config)).not.toThrow();
		});
	});
});
