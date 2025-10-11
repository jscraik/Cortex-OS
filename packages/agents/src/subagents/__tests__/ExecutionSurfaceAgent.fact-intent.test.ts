import { describe, expect, it } from 'vitest';
import type { ConnectorRemoteTool } from '../../connectors/registry.js';
import { __INTERNALS__ } from '../ExecutionSurfaceAgent.js';

const { detectTargetSurface, createConnectorPlan } = __INTERNALS__;

describe('ExecutionSurfaceAgent fact intent handling', () => {
        const remoteTools: ConnectorRemoteTool[] = [
                {
                        name: 'wikidata.vector_search',
                        description: 'Vector retrieval for Wikidata',
                        tags: ['vector', 'facts'],
                        scopes: ['facts'],
                },
                {
                        name: 'wikidata.get_claims',
                        description: 'Fetch structured claims',
                        tags: ['claims'],
                        scopes: ['facts'],
                },
        ];

        it('maps fact-centric content to the wikidata connector when hints align', () => {
                const detectionContext = {
                        connectors: [
                                {
                                        id: 'wikidata',
                                        endpoint: 'https://example.invalid/wikidata',
                                        scopes: ['facts'],
                                        description: 'Wikidata knowledge base',
                                        remoteTools,
                                        tags: ['facts'],
                                        enabled: true,
                                },
                        ],
                        scopeHints: ['facts', 'context:factual'],
                } as unknown as Parameters<typeof detectTargetSurface>[1];

                const surface = detectTargetSurface('Find facts about Q42', detectionContext);

                expect(surface).toMatchObject({
                        type: 'connector',
                        connectorId: 'wikidata',
                        remoteTools,
                });
        });

        it('creates a connector execution plan that prioritizes vector search then claims stitching', () => {
                const targetSurface = {
                        type: 'connector' as const,
                        connectorId: 'wikidata',
                        endpoint: 'https://example.invalid/wikidata',
                        scopes: ['facts'],
                        remoteTools,
                };

                const plan = createConnectorPlan('Tell me about Q42', targetSurface);

                expect(plan).toHaveLength(2);
                expect(plan[0]).toMatchObject({
                        action: 'invoke_connector_tool',
                        target: 'wikidata:wikidata.vector_search',
                        parameters: expect.objectContaining({
                                prefer: 'vector',
                                tool: 'wikidata.vector_search',
                        }),
                });
                expect(plan[1]).toMatchObject({
                        action: 'stitch_connector_claims',
                        target: 'wikidata:wikidata.get_claims',
                });
        });
});
