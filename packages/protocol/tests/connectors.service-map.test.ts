import { describe, expect, it } from 'vitest';
import {
        canonicalizeServiceMapPayload,
        connectorEntrySchema,
        createServiceMapSignature,
        serviceMapResponseSchema,
        verifyServiceMapSignature,
} from '../src/connectors/service-map.js';

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
                const payload = createSamplePayload();
                const canonical = canonicalizeServiceMapPayload(payload);

                expect(canonical).toMatchInlineSnapshot(
                        '"{\"brand\":\"brAInwav\",\"connectors\":[{\"auth\":{\"type\":\"apiKey\"},\"id\":\"connector-example\",\"metadata\":{\"brand\":\"brAInwav\",\"surface\":\"remote\"},\"name\":\"Example Connector\",\"quotas\":{\"perMinute\":60},\"scopes\":[\"sample:read\"],\"status\":\"enabled\",\"ttl\":1760270520,\"version\":\"1.0.0\"}],\"generatedAt\":\"2025-10-12T12:00:00.000Z\",\"id\":\"01HZ7ZWJ5XJ8W4T7N6MZ2V1PQB\",\"ttlSeconds\":120}"',
                );
        });

        it('should verify signatures using shared helper', () => {
                const payload = createSamplePayload();
                const signatureKey = 'test-key';
                const signature = createServiceMapSignature(payload, signatureKey);
                const signed = { ...payload, signature };

                const parsed = serviceMapResponseSchema.parse(signed);

                expect(verifyServiceMapSignature(parsed, parsed.signature, signatureKey)).toBe(true);
        });
});
