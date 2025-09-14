import { describe, expect, it } from 'vitest';
import { createSchemaCache } from '../src/cache/schemaCache';
import { createSchemaRegistryClient } from '../src/registryClient';

interface MockSchema {
    id: string;
    name: string;
    version: string;
    schema: Record<string, unknown>;
}
interface MockResponse {
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<unknown>;
}

describe('SchemaRegistryClient', () => {
    it('uses cache to avoid duplicate network calls', async () => {
        const responses: Record<string, MockSchema> = {
            'http://example/schemas/Foo/latest': {
                id: '1',
                name: 'Foo',
                version: '1.0.0',
                schema: { type: 'object' },
            },
        };
        let fetches = 0;
        const fetchImpl = async (url: string): Promise<MockResponse> => {
            fetches++;
            const body = responses[url];
            if (!body)
                return {
                    ok: false,
                    status: 404,
                    statusText: 'Not Found',
                    json: async () => ({}),
                };
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => body,
            };
        };
        const cache = createSchemaCache({ ttlMs: 10_000, maxEntries: 100 });
        const client = createSchemaRegistryClient({
            baseUrl: 'http://example',
            fetchImpl: fetchImpl as unknown as typeof fetch,
            cache,
        });
        const s1 = await client.getLatest('Foo');
        const s2 = await client.getLatest('Foo');
        expect(s1).toEqual(s2);
        const m = client.metrics();
        expect(fetches).toBe(1); // only first call hits network
        expect(m.cache?.hits).toBe(1);
        expect(m.cache?.misses).toBe(1);
    });
});
