import { describe, expect, it, vi } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import type { ConnectorDefinition, ConnectorRemoteTool } from '../../../src/connectors/registry.js';
import { __INTERNALS__ } from '../../../src/subagents/ExecutionSurfaceAgent.js';
import type { AgentMCPClient } from '@cortex-os/rag';
import * as rag from '@cortex-os/rag';

const { detectTargetSurface, createConnectorPlan, maybeRunWikidataWorkflow } = __INTERNALS__;

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

describe('ExecutionSurfaceAgent Wikidata workflow integration', () => {
	it('executes Wikidata workflow helper and returns structured results', async () => {
		const executeSpy = vi
			.spyOn(rag, 'executeWikidataWorkflow')
			.mockResolvedValue({
				content: 'Alexander Graham Bell was an inventor.',
				source: 'wikidata_workflow',
				metadata: {
					wikidata: {
						qid: 'Q34743',
						claimGuid: 'Q34743$abc123-def456-789',
						vectorResults: [
							{ qid: 'Q34743', score: 0.95, title: 'Alexander Graham Bell', content: 'Inventor' },
						],
						claims: [
							{
								guid: 'Q34743$abc123-def456-789',
								property: 'P569',
								value: '1847-03-03',
							},
						],
						sparql: 'SELECT ?entity WHERE { VALUES ?entity { wd:Q34743 } }',
						sparqlBindings: [{ entity: 'Q34743' }],
					},
					brand: 'brAInwav',
				},
			});

		const connectorDefinition: ConnectorDefinition = {
			id: 'wikidata',
			version: '2025-10-01',
			name: 'Wikidata Semantic Search',
			displayName: 'Wikidata Semantic Search',
			description: 'Wikidata facts connector',
			scopes: ['wikidata:vector-search', 'wikidata:claims', 'wikidata:sparql'],
			status: 'enabled',
			ttl: 1800,
			metadata: { brand: 'brAInwav' },
			endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
			auth: { type: 'none' },
			headers: {},
			expiresAtMs: Date.now() + 1_000_000,
			remoteTools: [
				{ name: 'vector_search_items', description: 'Vector search', tags: ['vector'], scopes: ['facts'] },
				{ name: 'get_claims', description: 'Claims', tags: ['claims'], scopes: ['facts'] },
				{ name: 'sparql', description: 'SPARQL', tags: ['sparql'], scopes: ['facts'] },
			],
		};

		const executionPlan = [
			{
				action: 'invoke_connector_tool',
				target: 'wikidata:vector_search_items',
				parameters: { tool: 'vector_search_items', scope: 'facts', query: 'Tell me about Q34743' },
				order: 1,
			},
			{
				action: 'stitch_connector_claims',
				target: 'wikidata:get_claims',
				parameters: { tool: 'get_claims' },
				order: 2,
			},
			{
				action: 'enrich_with_sparql',
				target: 'wikidata:sparql',
				parameters: { tool: 'sparql' },
				order: 3,
			},
		];

		const targetSurface = {
			type: 'connector' as const,
			connectorId: 'wikidata',
			endpoint: connectorDefinition.endpoint,
			scopes: connectorDefinition.scopes,
			description: connectorDefinition.description,
			remoteTools: connectorDefinition.remoteTools,
		};

		const state = {
			messages: [new HumanMessage({ content: 'Tell me about Q34743' })],
			context: {
				availableConnectors: [
					{
						id: 'wikidata',
						endpoint: connectorDefinition.endpoint,
						scopes: connectorDefinition.scopes,
						description: connectorDefinition.description,
						remoteTools: connectorDefinition.remoteTools,
						definition: connectorDefinition,
					},
				],
			},
		} as unknown as Parameters<typeof maybeRunWikidataWorkflow>[1];

		const hooks = {
			publishEvent: vi.fn(),
			persistInsight: vi.fn(),
		};

		const mcpClientStub = {} as AgentMCPClient;
		const deps = {
			getConnectorDefinition: () => connectorDefinition,
			getWorkflowHooks: async () => hooks,
			getMcpClient: async () => mcpClientStub,
		};

		const results = await maybeRunWikidataWorkflow(
			executionPlan,
			state,
			targetSurface,
			deps,
		);

		expect(executeSpy).toHaveBeenCalledWith(
			'Tell me about Q34743',
			connectorDefinition,
			expect.objectContaining({ mcpClient: mcpClientStub, hooks }),
		);
		expect(results).not.toBeNull();
		expect(results).toHaveLength(3);
		const [vectorStep, claimStep, sparqlStep] = results ?? [];
		expect((vectorStep?.result as any)?.metadata?.wikidata?.vectorResults?.[0]?.qid).toBe('Q34743');
		expect((claimStep?.result as any)?.metadata?.wikidata?.claims?.[0]?.guid).toBe(
			'Q34743$abc123-def456-789',
		);
		expect((sparqlStep?.result as any)?.metadata?.wikidata?.sparql).toContain('SELECT ?entity');
		expect((sparqlStep?.result as any)?.metadata?.workflow?.content).toContain('Alexander Graham Bell');

		executeSpy.mockRestore();
	});
});
