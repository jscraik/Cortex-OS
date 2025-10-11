import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteMCPEnhancedStore } from '../src/integrations/remote-mcp.js';
import type { RemoteRAGConfig, StoreLike } from '../src/integrations/remote-mcp.js';

describe('RemoteMCPEnhancedStore Wikidata integration', () => {
        const localStore = {
                upsert: vi.fn(),
                query: vi.fn(),
        };

        const connectorHints = [
                {
                        id: 'wikidata',
                        scopes: ['facts'],
                        tags: ['facts'],
                        remoteTools: [
                                { name: 'wikidata.vector_search', tags: ['vector'] },
                                { name: 'wikidata.get_claims', tags: ['claims'] },
                        ],
                },
        ];

        const config: RemoteRAGConfig = {
                connectorHints,
                fallbackToLocal: false,
                remoteSearchLimit: 5,
        };

        let factoryMock: ReturnType<typeof vi.fn>;
        let searchKnowledgeBase: ReturnType<typeof vi.fn>;

        beforeEach(() => {
                localStore.query.mockReset();
                localStore.upsert.mockReset();

                searchKnowledgeBase = vi.fn().mockResolvedValue([
                        {
                                id: 'remote-1',
                                score: 0.92,
                                content: 'Douglas Adams biography overview',
                                source: 'connector:wikidata',
                                title: 'Douglas Adams',
                                timestamp: '2025-01-01T00:00:00.000Z',
                                metadata: {
                                        tool: 'wikidata.get_claims',
                                        connectorId: 'wikidata',
                                        claims: ['Q42', 'Q42$ABC123'],
                                },
                        },
                ]);

                const stubClient = {
                        initialize: vi.fn().mockResolvedValue(undefined),
                        searchKnowledgeBase,
                        disconnect: vi.fn().mockResolvedValue(undefined),
                };

                factoryMock = vi.fn().mockReturnValue(stubClient);
                (globalThis as { __createAgentMCPClient__?: typeof factoryMock }).__createAgentMCPClient__ = factoryMock;
        });

        afterEach(() => {
                delete (globalThis as { __createAgentMCPClient__?: typeof factoryMock }).__createAgentMCPClient__;
                vi.restoreAllMocks();
        });

        it('enables remote retrieval by default when Wikidata hints are provided and stitches claim metadata', async () => {
                localStore.query
                        .mockResolvedValueOnce([
                                {
                                        id: 'local-neighbour',
                                        text: 'Local context about Douglas Adams',
                                        metadata: { title: 'Douglas Adams', text: 'English author and humourist' },
                                },
                        ])
                        .mockResolvedValue([]);

                const store = new RemoteMCPEnhancedStore(localStore as unknown as StoreLike, config);
                await store.initialize();

                const results = await store.query([0.1, 0.2, 0.3], {
                        remoteOnly: true,
                        scopeHints: ['facts', 'biography'],
                        topK: 3,
                });

                expect(factoryMock).toHaveBeenCalled();
                expect(searchKnowledgeBase).toHaveBeenCalledTimes(1);
                const [, searchOptions] = searchKnowledgeBase.mock.calls[0];
                expect(searchOptions.filters?.source).toContain('connector:wikidata');
                expect(searchOptions.filters?.tags).toEqual(
                        expect.arrayContaining(['connector:wikidata', 'tool:wikidata.vector_search', 'tool:vector']),
                );

                expect(results).toHaveLength(1);
                const metadata = results[0].metadata as Record<string, unknown>;
                const wikidata = metadata.wikidata as Record<string, unknown>;
                expect(wikidata.connectorId).toBe('wikidata');
                expect(wikidata.tool).toBe('wikidata.get_claims');
                expect(wikidata.qids).toContain('Q42');
                expect(wikidata.claimIds).toContain('Q42$ABC123');
        });
});
