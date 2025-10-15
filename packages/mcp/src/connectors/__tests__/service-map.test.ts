import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServiceMapSignature } from '@cortex-os/protocol';
import type { Agent } from 'undici';
import * as undici from 'undici';
import { loadConnectorServiceMap, ConnectorManifestError } from '../service-map.js';

const buildManifest = (signatureKey: string) => {
	const payload = {
		id: '01J0ZCEMZV8Y1234TEST000000',
		brand: 'brAInwav' as const,
		generatedAt: new Date('2025-10-15T00:00:00.000Z').toISOString(),
		ttlSeconds: 120,
		connectors: [
			{
				id: 'demo',
				version: '1.0.0',
				name: 'Demo Connector',
				endpoint: 'https://connectors.invalid/v1/mcp',
				auth: { type: 'none' as const },
				scopes: ['demo:read'],
				status: 'enabled' as const,
				ttl: 120,
				metadata: { brand: 'brAInwav' },
			},
		],
	};

	const signature = createServiceMapSignature(payload, signatureKey);
	return { ...payload, signature };
};

describe('loadConnectorServiceMap', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('uses shared undici agent and sets cache-control header', async () => {
		const agent: Agent = new undici.Agent({ connections: 2, pipelining: 1 });
		const manifest = buildManifest('secret-key');
		const fetchSpy = vi
			.spyOn(undici, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify(manifest), { status: 200 }));

		const result = await loadConnectorServiceMap({
			serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
			signatureKey: 'secret-key',
			agent,
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [, init] = fetchSpy.mock.calls[0] ?? [];
		expect(init?.headers).toMatchObject({
			Accept: 'application/json',
			'Cache-Control': 'no-cache',
		});
		expect(init?.dispatcher).toBe(agent);
		expect(result.payload.connectors).toHaveLength(1);

		agent.close();
	});

	it('throws when manifest signature is invalid', async () => {
		const agent: Agent = new undici.Agent();
		const manifest = buildManifest('real-key');
		const tampered = { ...manifest, signature: 'invalid-signature' };

		vi.spyOn(undici, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(tampered), { status: 200 }),
		);

		await expect(
			loadConnectorServiceMap({
				serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
				signatureKey: 'other-key',
				agent,
			}),
		).rejects.toThrow(ConnectorManifestError);

		agent.close();
	});

	it('propagates transport failures as manifest errors', async () => {
		const agent: Agent = new undici.Agent();
		const fetchSpy = vi
			.spyOn(undici, 'fetch')
			.mockRejectedValue(new Error('network unreachable'));

		await expect(
			loadConnectorServiceMap({
				serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
				signatureKey: 'secret',
				agent,
			}),
		).rejects.toThrow(ConnectorManifestError);

		expect(fetchSpy).toHaveBeenCalled();
		agent.close();
	});
});
