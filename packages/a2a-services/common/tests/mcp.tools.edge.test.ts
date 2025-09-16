import { beforeEach, describe, expect, it } from 'vitest';
import type { A2aServicesTool } from '../src/mcp/tools';
import {
	__resetInMemoryA2aServicesRegistry,
	a2aServicesMcpTools,
	RegisterServiceInputSchema,
} from '../src/mcp/tools';

function tool(name: string): A2aServicesTool {
	const found = a2aServicesMcpTools.find((t) => t.name === name);
	if (!found) throw new Error(`Tool not found: ${name}`);
	return found;
}

describe('a2a-services MCP tools edge cases', () => {
	beforeEach(() => {
		__resetInMemoryA2aServicesRegistry();
	});

	it('enforces rate limit on register_service', async () => {
		let lastRes: Awaited<ReturnType<A2aServicesTool['handler']>> | undefined;
		for (let i = 0; i < 65; i++) {
			lastRes = await tool('register_service').handler({
				name: `rl${i}`,
				version: '1.0.0',
				endpoint: 'https://example.com/api',
			});
		}
		if (!lastRes) throw new Error('No result from rate limit test');
		expect(lastRes.isError).toBe(true);
		expect(lastRes.content[0].text).toContain('RATE_LIMIT');
	});

	it('returns error for disabled service on get_service', async () => {
		await tool('register_service').handler({
			name: 'disabled',
			version: '1.0.0',
			endpoint: 'https://example.com/api',
		});
		await tool('manage_service').handler({
			name: 'disabled',
			version: '1.0.0',
			action: 'disable',
		});
		const res = await tool('get_service').handler({
			name: 'disabled',
			version: '1.0.0',
		});
		expect(res.isError).toBe(true);
		expect(res.content[0].text).toContain('DISABLED');
	});

	it('contract round-trip: RegisterServiceInputSchema', () => {
		const input = {
			name: 'contract-test',
			version: '2.1.0',
			endpoint: 'https://contract.example.com',
			metadata: {
				description: 'Contract round-trip',
				capabilities: ['test'],
				tags: ['edge'],
				owner: 'tester',
			},
			replaceExisting: true,
		};
		const parsed = RegisterServiceInputSchema.parse(input);
		const output = RegisterServiceInputSchema.parse(parsed);
		expect(output).toEqual(parsed);
	});
});
