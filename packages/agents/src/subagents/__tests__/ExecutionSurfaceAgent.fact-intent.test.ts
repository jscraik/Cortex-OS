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

describe('Phase B.3: ExecutionSurfaceAgent Planning (Three-Step Workflow)', () => {
	it('should generate three-step plan (vector → claims → SPARQL)', () => {
		const remoteTools: ConnectorRemoteTool[] = [
			{
				name: 'vector_search_items',
				description: 'Semantic vector search',
				tags: ['vector', 'search'],
				scopes: ['wikidata:vector-search'],
			},
			{
				name: 'get_claims',
				description: 'Retrieve claims',
				tags: ['claims', 'entities'],
				scopes: ['wikidata:claims'],
			},
			{
				name: 'sparql',
				description: 'Execute SPARQL',
				tags: ['sparql', 'graph', 'query'],
				scopes: ['wikidata:sparql'],
			},
		];

		const targetSurface = {
			type: 'connector' as const,
			connectorId: 'wikidata',
			endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
			scopes: ['wikidata:vector-search', 'wikidata:claims', 'wikidata:sparql'],
			remoteTools,
		};

		const plan = createConnectorPlan('Tell me about Ada Lovelace', targetSurface);

		expect(plan).toHaveLength(3);
		expect(plan[0].action).toBe('invoke_connector_tool');
		expect(plan[0].parameters.tool).toBe('vector_search_items');
		expect(plan[0].parameters.prefer).toBe('vector');
		expect(plan[0].parameters.brand).toBe('brAInwav');

		expect(plan[1].action).toBe('stitch_connector_claims');
		expect(plan[1].parameters.tool).toBe('get_claims');
		expect(plan[1].parameters.brand).toBe('brAInwav');

		expect(plan[2].action).toBe('enrich_with_sparql');
		expect(plan[2].parameters.tool).toBe('sparql');
		expect(plan[2].parameters.optional).toBe(true);
		expect(plan[2].parameters.brand).toBe('brAInwav');
	});

	it('should filter by scope (facts vs properties)', () => {
		const remoteTools: ConnectorRemoteTool[] = [
			{
				name: 'vector_search_items',
				description: 'Search items',
				tags: ['vector'],
				scopes: ['wikidata:vector-search', 'facts'],
			},
			{
				name: 'vector_search_properties',
				description: 'Search properties',
				tags: ['vector'],
				scopes: ['wikidata:vector-search', 'properties'],
			},
		];

		const targetSurface = {
			type: 'connector' as const,
			connectorId: 'wikidata',
			endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
			scopes: ['facts'],
			remoteTools,
		};

		const plan = createConnectorPlan('Find facts', targetSurface);

		expect(plan).toHaveLength(1);
		expect(plan[0].parameters.tool).toBe('vector_search_items');
		expect(plan[0].parameters.scopes).toContain('facts');
	});

	it('should degrade gracefully if SPARQL missing', () => {
		const remoteTools: ConnectorRemoteTool[] = [
			{
				name: 'vector_search_items',
				description: 'Vector search',
				tags: ['vector'],
				scopes: ['wikidata:vector-search'],
			},
			{
				name: 'get_claims',
				description: 'Get claims',
				tags: ['claims'],
				scopes: ['wikidata:claims'],
			},
		];

		const targetSurface = {
			type: 'connector' as const,
			connectorId: 'wikidata',
			endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
			scopes: ['wikidata:vector-search', 'wikidata:claims'],
			remoteTools,
		};

		const plan = createConnectorPlan('Tell me about Q42', targetSurface);

		expect(plan).toHaveLength(2);
		expect(plan.map((p) => p.action)).toEqual(['invoke_connector_tool', 'stitch_connector_claims']);
		expect(plan.find((p) => p.action === 'enrich_with_sparql')).toBeUndefined();
	});

	it('should fallback to local if all tools missing', () => {
		const targetSurface = {
			type: 'connector' as const,
			connectorId: 'wikidata',
			endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
			scopes: [],
			remoteTools: [],
		};

		const plan = createConnectorPlan('Tell me about Q42', targetSurface);

		expect(plan).toHaveLength(1);
		expect(plan[0].action).toBe('inspect_connector_capabilities');
	});

	it('should include brAInwav branding in plan metadata', () => {
		const remoteTools: ConnectorRemoteTool[] = [
			{
				name: 'vector_search_items',
				description: 'Vector search',
				tags: ['vector'],
				scopes: ['wikidata:vector-search'],
			},
		];

		const targetSurface = {
			type: 'connector' as const,
			connectorId: 'wikidata',
			endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
			scopes: ['wikidata:vector-search'],
			remoteTools,
		};

		const plan = createConnectorPlan('Find Ada Lovelace', targetSurface);

		expect(plan).toHaveLength(1);
		expect(plan[0].parameters.brand).toBe('brAInwav');
	});
});
