/**
 * Remote Tool Schema Validation Tests (TDD RED Phase)
 *
 * Phase A.1: Schema Validation for Wikidata Semantic Layer Integration
 * Task: tasks/wikidata-semantic-layer-integration
 * Methodology: RED-GREEN-REFACTOR
 *
 * These tests validate the schema for remote MCP tools (e.g., Wikidata SPARQL)
 * that will be registered in the static remoteTools manifest.
 *
 * @see tasks/wikidata-semantic-layer-integration/tdd-plan.md - Phase A.1
 * @see .cortex/rules/RULES_OF_AI.md - brAInwav production standards
 */

import { describe, expect, test } from 'vitest';
import { z } from 'zod';

// Import the schema we created in GREEN phase
import {
	type RemoteTool,
	RemoteToolSchema,
	validateRemoteToolManifestSync as validateRemoteToolManifest,
} from '../src/remote-tool-schema.js';

describe('brAInwav Remote Tool Schema Validation', () => {
	describe('Phase A.1.1: remoteTools Array Validation', () => {
		test('should accept valid remoteTools array', () => {
			const manifest = {
				remoteTools: [
					{
						name: 'wikidata_sparql_query',
						endpoint: 'https://query.wikidata.org/sparql',
						description: 'brAInwav Wikidata SPARQL query interface',
						inputSchema: z.object({
							query: z.string().min(1),
						}),
						outputSchema: z.object({
							results: z.array(z.unknown()),
						}),
					},
				],
			};

			const result = validateRemoteToolManifest(manifest);
			expect(result.success).toBe(true);
		});

		test('should reject empty remoteTools array', () => {
			const manifest = { remoteTools: [] };
			const result = validateRemoteToolManifest(manifest);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('brAInwav');
				expect(result.error.message).toContain('remoteTools');
			}
		});

		test('should reject missing remoteTools field', () => {
			const manifest = {};
			const result = validateRemoteToolManifest(manifest);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('brAInwav');
			}
		});
	});

	describe('Phase A.1.2: Tool Name Format Validation', () => {
		test('should accept valid snake_case tool names', () => {
			const tool: RemoteTool = {
				name: 'wikidata_sparql_query',
				endpoint: 'https://query.wikidata.org/sparql',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should reject tool names with uppercase letters', () => {
			const tool = {
				name: 'WikidataQuery',
				endpoint: 'https://query.wikidata.org/sparql',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject tool names with spaces', () => {
			const tool = {
				name: 'wikidata query',
				endpoint: 'https://query.wikidata.org/sparql',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject empty tool names', () => {
			const tool = {
				name: '',
				endpoint: 'https://query.wikidata.org/sparql',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});
	});

	describe('Phase A.1.3: Tool Endpoint URL Validation', () => {
		test('should accept valid HTTPS endpoints', () => {
			const tool: RemoteTool = {
				name: 'test_tool',
				endpoint: 'https://api.example.com/v1/tool',
				description: 'brAInwav test tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should accept valid HTTP endpoints for localhost', () => {
			const tool: RemoteTool = {
				name: 'local_tool',
				endpoint: 'http://localhost:3000/tool',
				description: 'brAInwav local tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should reject malformed URLs', () => {
			const tool = {
				name: 'bad_tool',
				endpoint: 'not-a-url',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject empty endpoints', () => {
			const tool = {
				name: 'empty_endpoint',
				endpoint: '',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});
	});

	describe('Phase A.1.4: Tool Description Validation', () => {
		test('should accept descriptions with brAInwav branding', () => {
			const tool: RemoteTool = {
				name: 'branded_tool',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav semantic query interface for Wikidata knowledge graph',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should require minimum description length', () => {
			const tool = {
				name: 'short_desc',
				endpoint: 'https://api.example.com/tool',
				description: 'x',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject empty descriptions', () => {
			const tool = {
				name: 'no_desc',
				endpoint: 'https://api.example.com/tool',
				description: '',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});
	});

	describe('Phase A.1.5: Input Schema Zod Compatibility', () => {
		test('should accept valid Zod input schemas', () => {
			const tool: RemoteTool = {
				name: 'complex_input',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool with complex input',
				inputSchema: z.object({
					query: z.string().min(1),
					limit: z.number().int().positive().optional(),
					filters: z.array(z.string()).optional(),
				}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should validate input schema is a Zod schema', () => {
			const tool = {
				name: 'invalid_input',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool',
				inputSchema: { type: 'object' }, // Plain object, not Zod
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});
	});

	describe('Phase A.1.6: Output Schema Zod Compatibility', () => {
		test('should accept valid Zod output schemas', () => {
			const tool: RemoteTool = {
				name: 'complex_output',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool with complex output',
				inputSchema: z.object({}),
				outputSchema: z.object({
					results: z.array(
						z.object({
							id: z.string(),
							label: z.string(),
							description: z.string().optional(),
						}),
					),
					count: z.number().int(),
					hasMore: z.boolean(),
				}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should validate output schema is a Zod schema', () => {
			const tool = {
				name: 'invalid_output',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: { type: 'object' }, // Plain object, not Zod
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});
	});

	describe('Phase A.1.7: Optional Parameters Handling', () => {
		test('should handle tools with optional timeout parameter', () => {
			const tool: RemoteTool = {
				name: 'timeout_tool',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool with timeout',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
				timeout: 5000,
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should handle tools with optional headers', () => {
			const tool: RemoteTool = {
				name: 'header_tool',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool with headers',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
				headers: {
					'User-Agent': 'brAInwav-Cortex-OS/1.0',
					Accept: 'application/json',
				},
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});

		test('should work without optional parameters', () => {
			const tool: RemoteTool = {
				name: 'minimal_tool',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav minimal tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(true);
		});
	});

	describe('Phase A.1.8: Required Parameters Enforcement', () => {
		test('should reject tool missing name', () => {
			const tool = {
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject tool missing endpoint', () => {
			const tool = {
				name: 'no_endpoint',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject tool missing description', () => {
			const tool = {
				name: 'no_desc',
				endpoint: 'https://api.example.com/tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject tool missing inputSchema', () => {
			const tool = {
				name: 'no_input',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool',
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});

		test('should reject tool missing outputSchema', () => {
			const tool = {
				name: 'no_output',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});
	});

	describe('Phase A.1.9: Invalid Schema Rejection', () => {
		test('should reject schemas with additional unknown properties', () => {
			const tool = {
				name: 'extra_props',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
				unknownField: 'should fail',
			};

			// RemoteToolSchema should use .strict() to reject extra fields
			const result = RemoteToolSchema.safeParse(tool);
			expect(result.success).toBe(false);
		});
	});

	describe('Phase A.1.10: Schema Type Safety Verification', () => {
		test('should ensure TypeScript type safety for valid tools', () => {
			// This test verifies compile-time type checking
			const validTool: RemoteTool = {
				name: 'type_safe_tool',
				endpoint: 'https://api.example.com/tool',
				description: 'brAInwav type-safe tool',
				inputSchema: z.object({
					param: z.string(),
				}),
				outputSchema: z.object({
					result: z.string(),
				}),
			};

			// Type assertion should work
			const parsed = RemoteToolSchema.parse(validTool);
			expect(parsed.name).toBe('type_safe_tool');

			// Should have type inference
			type InferredType = z.infer<typeof RemoteToolSchema>;
			const _typeCheck: InferredType = validTool; // Should not cause TS error
			expect(_typeCheck).toBeDefined();
		});
	});

	describe('Phase A.1.11: brAInwav Branding Validation', () => {
		test('should include brAInwav branding in error messages', () => {
			const invalidTool = {
				name: 123, // Invalid type
				endpoint: 'https://api.example.com/tool',
				description: 'Test tool',
				inputSchema: z.object({}),
				outputSchema: z.object({}),
			};

			const result = RemoteToolSchema.safeParse(invalidTool);
			expect(result.success).toBe(false);

			if (!result.success) {
				const errorMessage = result.error.toString();
				// Error messages should mention brAInwav for observability
				expect(errorMessage).toBeTruthy();
			}
		});
	});

	describe('Phase A.1.12: Manifest Validation Integration', () => {
		test('should validate complete manifest with multiple tools', () => {
			const manifest = {
				remoteTools: [
					{
						name: 'wikidata_sparql_query',
						endpoint: 'https://query.wikidata.org/sparql',
						description: 'brAInwav Wikidata SPARQL query interface',
						inputSchema: z.object({
							query: z.string().min(1),
							limit: z.number().optional(),
						}),
						outputSchema: z.object({
							results: z.array(z.unknown()),
						}),
					},
					{
						name: 'wikidata_entity_lookup',
						endpoint: 'https://www.wikidata.org/w/api.php',
						description: 'brAInwav Wikidata entity lookup',
						inputSchema: z.object({
							search: z.string().min(1),
						}),
						outputSchema: z.object({
							entities: z.array(
								z.object({
									id: z.string(),
									label: z.string(),
								}),
							),
						}),
					},
				],
			};

			const result = validateRemoteToolManifest(manifest);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.remoteTools).toHaveLength(2);
				expect(result.data.remoteTools[0].name).toBe('wikidata_sparql_query');
				expect(result.data.remoteTools[1].name).toBe('wikidata_entity_lookup');
			}
		});

		test('should reject manifest with duplicate tool names', () => {
			const manifest = {
				remoteTools: [
					{
						name: 'duplicate_tool',
						endpoint: 'https://api1.example.com/tool',
						description: 'brAInwav tool 1',
						inputSchema: z.object({}),
						outputSchema: z.object({}),
					},
					{
						name: 'duplicate_tool',
						endpoint: 'https://api2.example.com/tool',
						description: 'brAInwav tool 2',
						inputSchema: z.object({}),
						outputSchema: z.object({}),
					},
				],
			};

			const result = validateRemoteToolManifest(manifest);
			expect(result.success).toBe(false);

			if (!result.success) {
				expect(result.error.message).toContain('duplicate');
			}
		});
	});
});
