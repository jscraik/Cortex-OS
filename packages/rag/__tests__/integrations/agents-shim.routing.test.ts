/**
 * Phase C.1: Agents Shim Routing Tests (TDD - RED Phase)
 *
 * Test Suite 10: Fact Query Routing
 *
 * Tests the routing logic for fact queries to appropriate wikidata tools
 * with scope filtering and Matryoshka dimension hints.
 *
 * @see tasks/wikidata-semantic-layer-integration/tdd-plan.md - Phase C.1
 * @see tasks/wikidata-semantic-layer-integration/PHASE_C1_IMPLEMENTATION.md
 */

import type { ConnectorEntry } from '@cortex-os/protocol';
import { beforeEach, describe, expect, test } from 'vitest';
import { routeFactQuery } from '../../src/integrations/agents-shim.js';

describe('brAInwav Phase C.1: Agents Shim Routing', () => {
	describe('Test Suite 10: Fact Query Routing', () => {
		let mockWikidataConnector: ConnectorEntry;

		beforeEach(() => {
			// Mock Wikidata connector with remoteTools from Phase A/B implementation
			mockWikidataConnector = {
				id: 'wikidata',
				name: 'Wikidata Semantic Search',
				displayName: 'Wikidata Semantic Search',
				version: '2024.09.18',
				endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
				auth: { type: 'none' },
				scopes: ['wikidata:vector-search', 'wikidata:claims', 'wikidata:sparql'],
				ttlSeconds: 1800,
				metadata: {
					dumpDate: '2024-09-18',
					vectorModel: 'jina-embeddings-v3',
					embeddingDimensions: 1024,
					supportsMatryoshka: true,
					brand: 'brAInwav',
				},
				remoteTools: [
					{
						name: 'vector_search_items',
						description: 'Semantic vector search over Wikidata items using Jina embeddings',
						tags: ['vector', 'search', 'items'],
						scopes: ['wikidata:vector-search'],
					},
					{
						name: 'vector_search_properties',
						description: 'Semantic vector search over Wikidata properties',
						tags: ['vector', 'search', 'properties'],
						scopes: ['wikidata:vector-search'],
					},
					{
						name: 'get_claims',
						description: 'Retrieve structured claims for specific Wikidata entities by QID',
						tags: ['claims', 'entities'],
						scopes: ['wikidata:claims'],
					},
					{
						name: 'sparql',
						description: 'Execute SPARQL queries against the Wikidata knowledge graph',
						tags: ['sparql', 'graph', 'query'],
						scopes: ['wikidata:sparql'],
					},
				],
			};
		});

		test('C.1.1: should route fact queries to wikidata.vector_search_items', async () => {
			// Given: A fact-scoped query about Albert Einstein
			const query = 'Albert Einstein physics discoveries';

			// When: Agents shim routes the query
			const result = await routeFactQuery(query, mockWikidataConnector);

			// Then: Should route to wikidata vector search for items
			expect(result.connectorId).toBe('wikidata');
			expect(result.toolName).toBe('vector_search_items');
			expect(result.parameters.query).toBe(query);
			expect(result.parameters.brand).toBe('brAInwav');
			expect(result.parameters.scope).toBe('facts');
		});

		test('C.1.2: should apply scope filters for facts vs properties', async () => {
			// Given: Different scope requirements
			const factQuery = 'Einstein birth year';
			const propertyQuery = 'birth date property P569';

			// When: Routing with different scopes
			const factResult = await routeFactQuery(factQuery, mockWikidataConnector, {
				scope: 'facts',
			});
			const propertyResult = await routeFactQuery(propertyQuery, mockWikidataConnector, {
				scope: 'properties',
			});

			// Then: Should route to appropriate tools based on scope
			expect(factResult.toolName).toBe('vector_search_items');
			expect(factResult.parameters.scope).toBe('facts');

			expect(propertyResult.toolName).toBe('vector_search_properties');
			expect(propertyResult.parameters.scope).toBe('properties');
		});

		test('C.1.3: should pass Matryoshka dimension hints if available', async () => {
			// Given: Query with Matryoshka dimension hint
			const query = 'complex physics quantum mechanics query';
			const options = {
				matryoshkaDimension: 512,
				embedderHint: 'jina-embeddings-v3',
			};

			// When: Routing with dimension hints
			const result = await routeFactQuery(query, mockWikidataConnector, options);

			// Then: Should include Matryoshka dimension hints in parameters
			expect(result.parameters.matryoshkaDimension).toBe(512);
			expect(result.parameters.embedderHint).toBe('jina-embeddings-v3');
			expect(result.parameters.brand).toBe('brAInwav');

			// Should also extract from connector metadata if not provided
			expect(result.parameters.supportsMatryoshka).toBe(true);
			expect(result.parameters.maxDimensions).toBe(1024);
		});

		test('C.1.4: should handle connector without remoteTools gracefully', async () => {
			// Given: Connector without remoteTools (fallback scenario)
			const connectorWithoutTools = {
				...mockWikidataConnector,
				remoteTools: undefined,
			};

			// When: Attempting to route query
			const result = await routeFactQuery('test query', connectorWithoutTools);

			// Then: Should fallback to inspect_connector_capabilities
			expect(result.toolName).toBe('inspect_connector_capabilities');
			expect(result.parameters.query).toBe('test query');
			expect(result.parameters.brand).toBe('brAInwav');
			expect(result.parameters.fallbackReason).toBe('no_remote_tools');
		});

		test('C.1.5: should include brAInwav branding in all routing results', async () => {
			// Given: Any query routing scenario
			const queries = [
				'Einstein relativity theory',
				'Property P31 instance of',
				'SPARQL complex query',
			];

			// When: Routing multiple queries
			for (const query of queries) {
				const result = await routeFactQuery(query, mockWikidataConnector);

				// Then: All results should include brAInwav branding
				expect(result.parameters.brand).toBe('brAInwav');
				expect(result.connectorId).toBe('wikidata');
			}
		});
	});
});
