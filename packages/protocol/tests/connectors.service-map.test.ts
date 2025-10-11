import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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

describe('connectors service map schema', () => {
        it('should validate connector entries with required brand metadata', () => {
                const payload = loadFixturePayload();
                const result = connectorEntrySchema.safeParse(payload.connectors[0]);

                expect(result.success).toBe(true);
                expect(result.success && result.data.metadata.brand).toBe('brAInwav');
        });

        it('should canonicalize payloads deterministically', () => {
                const payload = loadFixturePayload();
                const canonical = canonicalizeServiceMapPayload(payload);

                expect(canonical).toMatchInlineSnapshot(
                        '"{\"brand\":\"brAInwav\",\"connectors\":[{\"auth\":{\"headerName\":\"Authorization\",\"type\":\"bearer\"},\"description\":\"Remote connector exposing Wikidata SPARQL queries.\",\"displayName\":\"Wikidata SPARQL\",\"enabled\":true,\"endpoint\":\"https://wikidata.example/api\",\"headers\":{\"Authorization\":\"Bearer ${WIKIDATA_TOKEN}\",\"X-Connector-Region\":\"us-central1\"},\"id\":\"wikidata-sparql\",\"metadata\":{\"brand\":\"brAInwav\",\"category\":\"research\",\"owner\":\"knowledge\"},\"quotas\":{\"concurrent\":4,\"perHour\":600,\"perMinute\":60},\"scopes\":[\"knowledge:read\",\"knowledge:query\"],\"tags\":[\"knowledge\",\"sparql\"],\"ttlSeconds\":1800,\"version\":\"1.0.0\"}],\"generatedAt\":\"2025-02-15T12:34:56Z\",\"id\":\"01J0XKQ4R6V7Z9P3S5T7W9YBCD\",\"ttlSeconds\":1800}"',
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
});
