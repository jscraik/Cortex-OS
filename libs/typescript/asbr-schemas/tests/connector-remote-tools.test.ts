/**
 * Connector Remote Tool Schema Tests (TDD Phase A.2 RED)
 *
 * Phase A.2: Connector Manifest Schema Extension for Wikidata Integration
 * Task: tasks/wikidata-semantic-layer-integration
 * Methodology: RED-GREEN-REFACTOR
 *
 * These tests validate the ConnectorRemoteToolSchema that enables
 * tool metadata in connector manifests for service-map discovery.
 *
 * @see tasks/wikidata-semantic-layer-integration/tdd-plan.md - Phase A.2
 * @see tasks/wikidata-semantic-layer-integration/implementation-checklist.md
 */

import { describe, expect, test } from 'vitest';
import {
	ConnectorManifestEntrySchema,
	type ConnectorRemoteTool,
	ConnectorRemoteToolSchema,
	ConnectorServiceEntrySchema,
} from '../src/index.js';

describe('brAInwav Connector Remote Tool Schema - Phase A.2', () => {
	describe('Test Suite 1: ConnectorRemoteToolSchema Definition', () => {
		test('should accept valid minimal remote tool', () => {
			const tool = {
				name: 'wikidata.vector_search_items',
			};

			const result = ConnectorRemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.name).toBe('wikidata.vector_search_items');
			}
		});

		test('should accept remote tool with all optional fields', () => {
			const tool: ConnectorRemoteTool = {
				name: 'wikidata.sparql',
				description: 'brAInwav SPARQL endpoint for semantic queries',
				tags: ['sparql', 'semantic', 'query'],
				scopes: ['facts', 'provenance'],
			};

			const result = ConnectorRemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.tags).toHaveLength(3);
				expect(result.data.scopes).toHaveLength(2);
			}
		});

		test('should enforce dot-notation naming convention (connector.tool)', () => {
			const validTool = {
				name: 'wikidata.get_claims',
			};

			const invalidTool = {
				name: 'invalid_name_without_dot',
			};

			expect(ConnectorRemoteToolSchema.safeParse(validTool).success).toBe(true);
			expect(ConnectorRemoteToolSchema.safeParse(invalidTool).success).toBe(false);
		});

		test('should reject empty name', () => {
			const tool = {
				name: '',
			};

			const result = ConnectorRemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject name with invalid characters', () => {
			const tool = {
				name: 'wikidata.tool@invalid!',
			};

			const result = ConnectorRemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should accept empty tags array', () => {
			const tool = {
				name: 'wikidata.tool',
				tags: [],
			};

			const result = ConnectorRemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should accept empty scopes array', () => {
			const tool = {
				name: 'wikidata.tool',
				scopes: [],
			};

			const result = ConnectorRemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should reject additional unknown properties (strict mode)', () => {
			const tool = {
				name: 'wikidata.tool',
				unknownField: 'should fail',
			};

			const result = ConnectorRemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should validate TypeScript type inference', () => {
			const tool: ConnectorRemoteTool = {
				name: 'wikidata.vector_search_items',
				description: 'brAInwav vector search',
				tags: ['vector'],
			};

			// Type assertion should work
			expect(tool.name).toBe('wikidata.vector_search_items');
			expect(tool.tags).toContain('vector');
		});

		test('should enforce minimum description length if provided', () => {
			const shortDesc = {
				name: 'wikidata.tool',
				description: 'x',
			};

			const validDesc = {
				name: 'wikidata.tool',
				description: 'brAInwav tool for queries',
			};

			expect(ConnectorRemoteToolSchema.safeParse(shortDesc).success).toBe(false);
			expect(ConnectorRemoteToolSchema.safeParse(validDesc).success).toBe(true);
		});
	});

	describe('Test Suite 2: ConnectorManifestEntry with remoteTools', () => {
		test('should accept manifest entry with remoteTools array', () => {
			const entry = {
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
						tags: ['vector', 'items'],
					},
					{
						name: 'wikidata.sparql',
						description: 'brAInwav SPARQL endpoint',
						tags: ['sparql'],
						scopes: ['provenance'],
					},
				],
			};

			const result = ConnectorManifestEntrySchema.safeParse(entry);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.remoteTools).toHaveLength(2);
				expect(result.data.remoteTools?.[0].name).toBe('wikidata.vector_search_items');
			}
		});

		test('should accept manifest entry without remoteTools (backward compatible)', () => {
			const entry = {
				id: 'perplexity',
				name: 'perplexity',
				displayName: 'Perplexity',
				version: '1.0.0',
				endpoint: 'https://api.perplexity.ai',
				auth: { type: 'bearer' as const },
				scopes: ['web'],
				ttlSeconds: 3600,
			};

			const result = ConnectorManifestEntrySchema.safeParse(entry);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.remoteTools).toBeUndefined();
			}
		});
	});

	describe('Test Suite 3: ConnectorServiceEntry with remoteTools', () => {
		test('should accept service entry with remoteTools array', () => {
			const entry = {
				id: 'wikidata',
				version: '1.0.0',
				displayName: 'Wikidata',
				endpoint: 'https://mcp.wikidata.org',
				auth: { type: 'none' as const },
				scopes: ['facts'],
				ttlSeconds: 3600,
				enabled: true,
				metadata: { brand: 'brAInwav' as const },
				remoteTools: [
					{
						name: 'wikidata.get_claims',
						tags: ['claims'],
						scopes: ['facts'],
					},
				],
			};

			const result = ConnectorServiceEntrySchema.safeParse(entry);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.remoteTools).toHaveLength(1);
				expect(result.data.remoteTools?.[0].name).toBe('wikidata.get_claims');
			}
		});

		test('should accept service entry without remoteTools (backward compatible)', () => {
			const entry = {
				id: 'github',
				version: '1.0.0',
				displayName: 'GitHub Actions',
				endpoint: 'https://api.github.com',
				auth: { type: 'bearer' as const },
				scopes: ['code'],
				ttlSeconds: 3600,
				enabled: true,
				metadata: { brand: 'brAInwav' as const },
			};

			const result = ConnectorServiceEntrySchema.safeParse(entry);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.remoteTools).toBeUndefined();
			}
		});
	});
});
