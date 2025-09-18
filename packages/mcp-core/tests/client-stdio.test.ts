import { describe, expect, it } from 'vitest';
import { createEnhancedClient } from '../src/client.js';

describe('createEnhancedClient stdio buffering', () => {
	it('handles multiple sequential calls without interleaving', async () => {
		const serverConfig = {
			name: 'multi',
			transport: 'stdio' as const,
			command: process.execPath,
			args: [require.resolve('./fixtures/echo-server.js')],
		};
		const client = await createEnhancedClient(serverConfig);
		const results = await Promise.all([
			client.callTool({ name: 'a' }),
			client.callTool({ name: 'b' }),
			client.callTool({ name: 'c' }),
		]);
		const echoes = results
			.map((r) => (typeof r === 'object' && r && 'echo' in r ? (r as { echo: string }).echo : ''))
			.sort();
		expect(echoes).toEqual(['a', 'b', 'c']);
		await client.close();
	});
});
