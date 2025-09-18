import { describe, expect, it } from 'vitest';

import {
	assertTextContent,
	assertToolCall,
	createMockMCPServer,
	createTestClient,
	setupMockServer,
} from '../src/testing/index.js';

describe('mcp testing utilities', () => {
	it('captures tool invocations with registered handlers', async () => {
		const server = await createMockMCPServer();
		server.registerTool('echo', async (args: { message?: string }) => ({
			content: [{ type: 'text', text: `echo:${args?.message ?? ''}` }],
		}));

		const client = await createTestClient(server);
		const response = await client.callTool('echo', { message: 'hello' });

		assertTextContent(response, 'echo:hello');
		const calls = assertToolCall(server, 'echo', 1);
		expect(calls[0].args).toEqual({ message: 'hello' });

		await client.close();
		await server.stop();
	});

	it('provides reusable fixture helpers', async () => {
		const fixture = await setupMockServer();
		fixture.server.registerTool('add', async (args: { a?: number; b?: number }) => ({
			structuredContent: { sum: (args?.a ?? 0) + (args?.b ?? 0) },
		}));

		const result = await fixture.client.callTool('add', { a: 4, b: 2 });
		expect(result).toEqual({ structuredContent: { sum: 6 } });

		const calls = assertToolCall(fixture.server, 'add', 1);
		expect(calls[0].args).toEqual({ a: 4, b: 2 });

		await fixture.teardown();
	});
});
