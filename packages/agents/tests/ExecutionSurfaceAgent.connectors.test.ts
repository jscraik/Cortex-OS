import { describe, expect, it, vi } from 'vitest';
import { createServiceMapSignature } from '@cortex-os/protocol';
import { createExecutionSurfaceAgent } from '../src/subagents/ExecutionSurfaceAgent.js';

const createManifest = (signatureKey: string) => {
        const payload = {
                id: '01J1Z4Y9ZK9V6F5M4T2Q8BNX0C',
                brand: 'brAInwav' as const,
                generatedAt: new Date('2025-05-12T15:24:00.000Z').toISOString(),
                ttlSeconds: 900,
                connectors: [
                        {
                                id: 'alpha',
                                version: '1.0.0',
                                displayName: 'Alpha Connector',
                                endpoint: 'https://connectors.invalid/v1/alpha',
                                auth: { type: 'apiKey' as const, headerName: 'X-Alpha-Key' },
                                scopes: ['alpha:read'],
                                ttlSeconds: 600,
                                enabled: true,
                                headers: { 'X-Trace': 'alpha' },
                                metadata: { brand: 'brAInwav', category: 'baseline' },
                        },
                        {
                                id: 'wikidata',
                                version: '0.2.0',
                                displayName: 'Wikidata Connector',
                                endpoint: 'https://connectors.invalid/v1/wikidata',
                                auth: { type: 'bearer' as const },
                                scopes: ['wikidata:read', 'wikidata:query'],
                                ttlSeconds: 900,
                                enabled: true,
                                metadata: {
                                        brand: 'brAInwav' as const,
                                        category: 'knowledge-graph',
                                        tools: [
                                                { name: 'vector_search', description: 'Semantic entity lookup' },
                                                { name: 'sparql', description: 'Execute SPARQL statements' },
                                        ],
                                },
                        },
                ],
        };

        const signature = createServiceMapSignature(payload, signatureKey);
        return { ...payload, signature };
};

describe('ExecutionSurfaceAgent connectors integration', () => {
        it('loads manifest metadata and routes fact queries through mocked Wikidata tools', async () => {
                const signatureKey = 'test-key';
                const manifest = createManifest(signatureKey);
                const fetchMock = vi.fn().mockResolvedValue(
                        new Response(JSON.stringify(manifest), { status: 200 }),
                );

                const agent = createExecutionSurfaceAgent({
                        allowedSurfaces: ['filesystem', 'connector'],
                        connectors: {
                                serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
                                apiKey: 'asbr-token',
                                signatureKey,
                                connectorsApiKey: 'connectors-token',
                                fetchImpl: fetchMock,
                        },
                });

                const definitions = await agent.getConnectorDefinitions();
                expect(fetchMock).toHaveBeenCalledTimes(1);
                expect(definitions.map((definition) => definition.id).sort()).toEqual([
                        'alpha',
                        'wikidata',
                ]);

                const wikidata = definitions.find((definition) => definition.id === 'wikidata');
                expect(wikidata).toBeDefined();
                expect(wikidata?.headers.Authorization).toBe('Bearer connectors-token');

                const metadata = wikidata?.metadata as
                        | { tools?: Array<{ name: string; description: string }> }
                        | undefined;
                const toolNames = metadata?.tools?.map((tool) => tool.name).sort();
                expect(toolNames).toEqual(['sparql', 'vector_search']);

                const vectorSearch = vi.fn().mockResolvedValue([
                        { id: 'Q42', label: 'Ada Lovelace' },
                ]);
                const sparql = vi.fn().mockResolvedValue([
                        { property: 'P19', value: 'London' },
                ]);

                const simulateFactQuery = async (subject: string, property: string) => {
                        if (!toolNames?.includes('vector_search') || !toolNames?.includes('sparql')) {
                                throw new Error('Wikidata tools unavailable');
                        }

                        const [entity] = await vectorSearch({ subject });
                        const [fact] = await sparql({ id: entity.id, property });
                        return { entity, fact };
                };

                const fact = await simulateFactQuery('Ada Lovelace', 'P19');

                expect(vectorSearch).toHaveBeenCalledWith({ subject: 'Ada Lovelace' });
                expect(sparql).toHaveBeenCalledWith({ id: 'Q42', property: 'P19' });
                expect(fact).toEqual({
                        entity: { id: 'Q42', label: 'Ada Lovelace' },
                        fact: { property: 'P19', value: 'London' },
                });

                const surfaces = agent.getAvailableSurfaces();
                expect(surfaces).toContain('connector:wikidata');
        });
});
