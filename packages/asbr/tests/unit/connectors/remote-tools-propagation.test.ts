/**
 * Remote Tools Propagation Tests (TDD Phase A.3 RED)
 * 
 * Phase A.3: ASBR Propagation for Wikidata Semantic Layer Integration
 * Task: tasks/wikidata-semantic-layer-integration
 * Methodology: RED-GREEN-REFACTOR
 * 
 * These tests validate that remoteTools metadata from the connector manifest
 * is properly propagated to the service-map via buildConnectorEntry().
 * 
 * @see tasks/wikidata-semantic-layer-integration/tdd-plan.md - Phase A.3
 * @see tasks/wikidata-semantic-layer-integration/implementation-checklist.md
 */

import { describe, test, expect } from 'vitest';
import { buildConnectorServiceMap } from '../../../src/connectors/manifest.js';

describe('brAInwav Remote Tools Propagation - Phase A.3', () => {
	describe('Test Suite 4: buildConnectorEntry remoteTools Propagation', () => {
		test('should propagate remoteTools from manifest to service entry', () => {
			// Create manifest with fixed timestamp for deterministic output
			const manifest = {
				id: '01HXYZ0000000000000000000',
				manifestVersion: '1.0.0',
				generatedAt: '2025-01-11T20:00:00Z',
				ttlSeconds: 3600,
				connectors: [
					{
						id: 'wikidata',
						name: 'wikidata',
						displayName: 'Wikidata',
						version: '1.0.0',
						endpoint: 'https://mcp.wikidata.org',
						auth: { type: 'none' as const },
						scopes: ['facts'],
						ttlSeconds: 3600,
						remoteTools: [
							{
								name: 'wikidata.vector_search_items',
								description: 'brAInwav vector search for Wikidata items',
								tags: ['vector', 'search'],
								scopes: ['facts'],
							},
							{
								name: 'wikidata.sparql',
								description: 'brAInwav SPARQL query endpoint',
								tags: ['sparql', 'query'],
								scopes: ['provenance'],
							},
						],
					},
				],
			};

			const serviceMap = buildConnectorServiceMap(manifest, {
				now: () => new Date('2025-01-11T20:00:00Z'),
			});

			expect(serviceMap.connectors).toHaveLength(1);
			const wikidataEntry = serviceMap.connectors[0];

			// Main assertion: remoteTools should be propagated
			expect(wikidataEntry.remoteTools).toBeDefined();
			expect(wikidataEntry.remoteTools).toHaveLength(2);

			// Verify first tool
			expect(wikidataEntry.remoteTools?.[0].name).toBe('wikidata.vector_search_items');
			expect(wikidataEntry.remoteTools?.[0].tags).toContain('vector');
			expect(wikidataEntry.remoteTools?.[0].scopes).toContain('facts');

			// Verify second tool
			expect(wikidataEntry.remoteTools?.[1].name).toBe('wikidata.sparql');
			expect(wikidataEntry.remoteTools?.[1].tags).toContain('sparql');
			expect(wikidataEntry.remoteTools?.[1].scopes).toContain('provenance');
		});

		test('should omit remoteTools field when manifest has empty array', () => {
			const manifest = {
				id: '01HXYZ0000000000000000000',
				manifestVersion: '1.0.0',
				generatedAt: '2025-01-11T20:00:00Z',
				ttlSeconds: 3600,
				connectors: [
					{
						id: 'empty-tools',
						name: 'empty-tools',
						displayName: 'Empty Tools Connector',
						version: '1.0.0',
						endpoint: 'https://api.example.com',
						auth: { type: 'none' as const },
						scopes: ['test'],
						ttlSeconds: 3600,
						remoteTools: [],
					},
				],
			};

			const serviceMap = buildConnectorServiceMap(manifest, {
				now: () => new Date('2025-01-11T20:00:00Z'),
			});

			expect(serviceMap.connectors).toHaveLength(1);
			const entry = serviceMap.connectors[0];

			// Empty array should not be included in service-map
			expect(entry.remoteTools).toBeUndefined();
		});

		test('should omit remoteTools field when manifest has undefined', () => {
			const manifest = {
				id: '01HXYZ0000000000000000000',
				manifestVersion: '1.0.0',
				generatedAt: '2025-01-11T20:00:00Z',
				ttlSeconds: 3600,
				connectors: [
					{
						id: 'perplexity',
						name: 'perplexity',
						displayName: 'Perplexity',
						version: '1.0.0',
						endpoint: 'https://api.perplexity.ai',
						auth: { type: 'bearer' as const },
						scopes: ['web'],
						ttlSeconds: 3600,
						// No remoteTools field - legacy connector
					},
				],
			};

			const serviceMap = buildConnectorServiceMap(manifest, {
				now: () => new Date('2025-01-11T20:00:00Z'),
			});

			expect(serviceMap.connectors).toHaveLength(1);
			const perplexityEntry = serviceMap.connectors[0];

			// Undefined remoteTools should not be in service-map
			expect(perplexityEntry.remoteTools).toBeUndefined();
		});

		test('should deep-clone remoteTools array (no mutation)', () => {
			const tool1 = {
				name: 'wikidata.get_claims',
				description: 'brAInwav claims retrieval',
				tags: ['claims'],
				scopes: ['facts'],
			};

			const tool2 = {
				name: 'wikidata.entity_lookup',
				tags: ['lookup'],
			};

			const manifest = {
				id: '01HXYZ0000000000000000000',
				manifestVersion: '1.0.0',
				generatedAt: '2025-01-11T20:00:00Z',
				ttlSeconds: 3600,
				connectors: [
					{
						id: 'wikidata',
						name: 'wikidata',
						displayName: 'Wikidata',
						version: '1.0.0',
						endpoint: 'https://mcp.wikidata.org',
						auth: { type: 'none' as const },
						scopes: ['facts'],
						ttlSeconds: 3600,
						remoteTools: [tool1, tool2],
					},
				],
			};

			const serviceMap = buildConnectorServiceMap(manifest, {
				now: () => new Date('2025-01-11T20:00:00Z'),
			});
			const wikidataEntry = serviceMap.connectors[0];

			// Mutate the service-map tool
			if (wikidataEntry.remoteTools?.[0]) {
				(wikidataEntry.remoteTools[0] as any).name = 'MUTATED';
				if (wikidataEntry.remoteTools[0].tags) {
					wikidataEntry.remoteTools[0].tags.push('MUTATED_TAG');
				}
			}

			// Original manifest tools should remain unchanged
			expect(tool1.name).toBe('wikidata.get_claims');
			expect(tool1.tags).toEqual(['claims']);
			expect(tool1.tags).not.toContain('MUTATED_TAG');

			// Verify mutation worked on service-map copy
			expect(wikidataEntry.remoteTools?.[0].name).toBe('MUTATED');
		});
	});
});
