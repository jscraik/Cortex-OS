import { beforeEach, describe, expect, it } from 'vitest';
import type { A2aServicesTool } from '../src/mcp/tools.js';
import { __resetInMemoryA2aServicesRegistry, a2aServicesMcpTools } from '../src/mcp/tools.js';

function tool(name: string): A2aServicesTool {
	const found = a2aServicesMcpTools.find((t: A2aServicesTool) => t.name === name);
	if (!found) throw new Error(`Tool not found: ${name}`);
	return found;
}

describe('a2a-services MCP tools', () => {
	beforeEach(() => {
		__resetInMemoryA2aServicesRegistry();
	});

	it('registers a service', async () => {
		const res = await tool('register_service').handler({
			name: 'search-service',
			version: '1.0.0',
			endpoint: 'https://example.com/api',
			metadata: { capabilities: ['search'], description: 'Search service' },
		});
		expect(res.isError).toBeUndefined();
		expect(res.content[0].text).toContain('Registered service');
	});

	it('prevents duplicate registration without replaceExisting', async () => {
		await tool('register_service').handler({
			name: 'dup',
			version: '1.0.0',
			endpoint: 'https://example.com',
		});
		const dup = await tool('register_service').handler({
			name: 'dup',
			version: '1.0.0',
			endpoint: 'https://example.com',
		});
		expect(dup.isError).toBe(true);
		expect(dup.content[0].text).toContain('ALREADY_EXISTS');
	});

	it('gets a service', async () => {
		await tool('register_service').handler({
			name: 'metrics',
			version: '2.0.0',
			endpoint: 'https://m.example.com',
		});
		const res = await tool('get_service').handler({
			name: 'metrics',
			version: '2.0.0',
		});
		expect(res.isError).toBeUndefined();
		const parsed = JSON.parse(res.content[0].text) as { version: string };
		expect(parsed.version).toBe('2.0.0');
	});

	it('lists services', async () => {
		await tool('register_service').handler({
			name: 'list-a',
			version: '1',
			endpoint: 'https://a.example.com',
		});
		await tool('register_service').handler({
			name: 'list-b',
			version: '1',
			endpoint: 'https://b.example.com',
		});
		const res = await tool('list_services').handler({ limit: 10 });
		expect(res.isError).toBeUndefined();
		const arr = JSON.parse(res.content[0].text) as unknown[];
		expect(Array.isArray(arr)).toBe(true);
		expect(arr.length).toBeGreaterThanOrEqual(2);
	});

	it('discovers a service by name', async () => {
		await tool('register_service').handler({
			name: 'discovery',
			version: '3.1.4',
			endpoint: 'https://d.example.com',
		});
		const res = await tool('discover_service').handler({
			name: 'discovery',
			healthyOnly: false,
		});
		expect(res.isError).toBeUndefined();
		const obj = JSON.parse(res.content[0].text) as { name: string };
		expect(obj.name).toBe('discovery');
	});

	it('manages service (disable + enable)', async () => {
		await tool('register_service').handler({
			name: 'manage',
			version: '1',
			endpoint: 'https://m1.example.com',
		});
		const disable = await tool('manage_service').handler({
			name: 'manage',
			version: '1',
			action: 'disable',
		});
		expect(disable.isError).toBeUndefined();
		const getDisabled = await tool('get_service').handler({
			name: 'manage',
			version: '1',
		});
		expect(getDisabled.isError).toBe(true); // hidden because disabled
		const enable = await tool('manage_service').handler({
			name: 'manage',
			version: '1',
			action: 'enable',
		});
		expect(enable.isError).toBeUndefined();
		const getEnabled = await tool('get_service').handler({
			name: 'manage',
			version: '1',
		});
		expect(getEnabled.isError).toBeUndefined();
	});

	it('sets quota', async () => {
		await tool('register_service').handler({
			name: 'quota',
			version: '1',
			endpoint: 'https://q.example.com',
		});
		const setQuota = await tool('manage_service').handler({
			name: 'quota',
			version: '1',
			action: 'set_quota',
			quota: { limit: 100, windowSeconds: 60 },
		});
		expect(setQuota.isError).toBeUndefined();
		const metrics = await tool('get_service_metrics').handler({
			name: 'quota',
			version: '1',
		});
		const data = JSON.parse(metrics.content[0].text) as {
			quota: { limit: number };
		};
		expect(data.quota.limit).toBe(100);
	});
});
