import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	canonicalizeServiceMapPayload,
	connectorEntrySchema,
	createServiceMapSignature,
	serviceMapResponseSchema,
	verifyServiceMapSignature,
} from '../src/connectors/service-map.js';

const TEST_DIR = dirname(fileURLToPath(new URL(import.meta.url)));
const FIXTURES_DIR = resolve(TEST_DIR, '../../../testdata/connectors');

const loadFixturePayload = () => {
	const raw = readFileSync(resolve(FIXTURES_DIR, 'wikidata-service-map.json'), 'utf-8');
	return JSON.parse(raw);
};

const createSamplePayload = () => ({
	id: '01HZ7ZWJ5XJ8W4T7N6MZ2V1PQB',
	brand: 'brAInwav' as const,
	generatedAt: new Date('2025-10-12T12:00:00.000Z').toISOString(),
	ttlSeconds: 120,
	connectors: [
		{
			id: 'connector-example',
			version: '1.0.0',
			name: 'Example Connector',
			endpoint: 'https://example.invalid/v1/mcp',
			auth: { type: 'apiKey', headerName: 'Authorization' },
			scopes: ['sample:read'],
			status: 'enabled' as const,
			ttl: 1760270520,
			metadata: { brand: 'brAInwav', surface: 'remote' },
			quotas: { perMinute: 60 },
		},
	],
});

describe('connectors service map schema', () => {
	it('should validate connector entries with required brand metadata', () => {
		const result = connectorEntrySchema.safeParse({
			id: 'example',
			version: '1.0.0',
			name: 'Example',
			scopes: ['demo'],
			status: 'enabled',
			ttl: 60,
			metadata: { brand: 'brAInwav', category: 'demo' },
			auth: { type: 'none' },
		});

		expect(result.success).toBe(true);
		expect(result.success && result.data.metadata.brand).toBe('brAInwav');
	});

	it('should canonicalize payloads deterministically', () => {
		const payload = loadFixturePayload();
		const canonical = canonicalizeServiceMapPayload(payload);

		expect(canonical).toMatchInlineSnapshot(
			'"{"brand":"brAInwav","connectors":[{"auth":{"headerName":"Authorization","type":"bearer"},"description":"Remote connector exposing Wikidata SPARQL queries.","displayName":"Wikidata SPARQL","enabled":true,"endpoint":"https://wikidata.example/api","headers":{"Authorization":"Bearer ${WIKIDATA_TOKEN}","X-Connector-Region":"us-central1"},"id":"wikidata-sparql","metadata":{"brand":"brAInwav","category":"research","owner":"knowledge"},"quotas":{"concurrent":4,"perHour":600,"perMinute":60},"scopes":["knowledge:read","knowledge:query"],"tags":["knowledge","sparql"],"ttlSeconds":1800,"version":"1.0.0"}],"generatedAt":"2025-02-15T12:34:56Z","id":"01J0XKQ4R6V7Z9P3S5T7W9YBCD","ttlSeconds":1800}"',
			'"{"brand":"brAInwav","connectors":[{"auth":{"type":"apiKey"},"id":"connector-example","metadata":{"brand":"brAInwav","surface":"remote"},"name":"Example Connector","quotas":{"perMinute":60},"scopes":["sample:read"],"status":"enabled","ttl":1760270520,"version":"1.0.0"}],"generatedAt":"2025-10-12T12:00:00.000Z","id":"01HZ7ZWJ5XJ8W4T7N6MZ2V1PQB","ttlSeconds":120}"',
		);
	});

	it('should verify signatures using shared helper', () => {
		const payload = loadFixturePayload();
		const signatureKey = 'test-key';
		const signature = createServiceMapSignature(payload, signatureKey);
		const signed = { ...payload, signature };

		const parsed = serviceMapResponseSchema.parse(signed);

		expect(verifyServiceMapSignature(parsed, parsed.signature, signatureKey)).toBe(true);
	});

	it('should parse remoteTools from service-map connector entries', () => {
		const payload = {
			id: '01HZ7ZWJ5XJ8W4T7N6MZ2V1PQB',
			brand: 'brAInwav' as const,
			generatedAt: new Date('2025-10-12T12:00:00.000Z').toISOString(),
			ttlSeconds: 120,
			connectors: [
				{
					id: 'wikidata',
					version: '2024.09.18',
					displayName: 'Wikidata',
					endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
					auth: { type: 'none' },
					scopes: ['wikidata:vector-search'],
					enabled: true,
					tags: ['knowledge'],
					timeouts: {},
					ttlSeconds: 1800,
					expiresAt: '2025-10-12T12:30:00.000Z',
					availability: { status: 'unknown' as const },
					status: 'online' as const,
					remoteTools: [
						{
							name: 'vector_search_items',
							description: 'Semantic vector search',
							tags: ['vector', 'search'],
							scopes: ['wikidata:vector-search'],
						},
					],
				},
			],
		};

		const result = serviceMapResponseSchema.safeParse(payload);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.connectors[0].remoteTools).toHaveLength(1);
			expect(result.data.connectors[0].remoteTools?.[0].name).toBe('vector_search_items');
		}
	});

	it('should handle missing remoteTools gracefully', () => {
		const payload = createSamplePayload();

		const result = serviceMapResponseSchema.safeParse(payload);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.connectors[0].remoteTools).toBeUndefined();
		}
	});
});
