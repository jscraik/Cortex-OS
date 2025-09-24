import { describe, expect, it } from 'vitest';
import { createMCPToolValidator, type MCPToolPolicy } from './mcp-tool-validator-impl.js';

describe('MCP Tool Allowlist Validation', () => {
	describe('Schema validation', () => {
		it('should validate a complete MCP tool policy schema', () => {
			const validPolicy = {
				version: '1.0',
				defaultAction: 'deny' as const,
				allowlist: {
					tools: [
						{
							name: 'file_operations',
							description: 'Safe file operations',
							parameters: {
								maxFileSize: 1000000,
								allowedExtensions: ['.txt', '.md', '.json'],
							},
							restrictions: {
								maxCalls: 100,
								rateLimitPerHour: 50,
								requiredScopes: ['filesystem:read', 'filesystem:write'],
							},
						},
					],
					categories: [
						{
							name: 'development',
							tools: ['file_operations', 'git_operations'],
							description: 'Development tools category',
						},
					],
				},
				denylist: {
					tools: ['dangerous_tool'],
					patterns: ['*_admin', 'system_*'],
				},
			};

			expect(() => {
				const validator = createMCPToolValidator();
				validator.validateSchema(validPolicy);
			}).not.toThrow();
		});

		it('should reject policy with invalid defaultAction', () => {
			const invalidPolicy = {
				version: '1.0',
				defaultAction: 'maybe', // Invalid value
				allowlist: {
					tools: [],
					categories: [],
				},
			};

			expect(() => {
				const validator = createMCPToolValidator();
				validator.validateSchema(invalidPolicy);
			}).toThrow('Invalid defaultAction');
		});

		it('should require version field', () => {
			const invalidPolicy = {
				defaultAction: 'deny',
				allowlist: {
					tools: [],
					categories: [],
				},
			};

			expect(() => {
				const validator = createMCPToolValidator();
				validator.validateSchema(invalidPolicy);
			}).toThrow('version');
		});

		it('should validate tool name format', () => {
			const invalidPolicy = {
				version: '1.0',
				defaultAction: 'deny' as const,
				allowlist: {
					tools: [
						{
							name: '', // Empty name should be invalid
							description: 'Empty name tool',
						},
					],
					categories: [],
				},
			};

			expect(() => {
				const validator = createMCPToolValidator();
				validator.validateSchema(invalidPolicy);
			}).toThrow('Tool name cannot be empty');
		});

		it('should validate required scopes format', () => {
			const invalidPolicy = {
				version: '1.0',
				defaultAction: 'deny' as const,
				allowlist: {
					tools: [
						{
							name: 'test_tool',
							restrictions: {
								requiredScopes: ['invalid scope with spaces'], // Invalid scope format
							},
						},
					],
					categories: [],
				},
			};

			expect(() => {
				const validator = createMCPToolValidator();
				validator.validateSchema(invalidPolicy);
			}).toThrow('Invalid scope format');
		});
	});

	describe('Tool access control', () => {
		it('should deny by default when tool is not in allowlist', () => {
			const policy: MCPToolPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					tools: [{ name: 'allowed_tool' }],
					categories: [],
				},
			};

			const validator = createMCPToolValidator();
			validator.loadPolicy(policy);

			expect(validator.isToolAllowed('unknown_tool')).toBe(false);
			expect(validator.getViolationReason('unknown_tool')).toContain('not in allowlist');
		});

		it('should allow tools explicitly in allowlist', () => {
			const policy: MCPToolPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					tools: [{ name: 'file_reader' }],
					categories: [],
				},
			};

			const validator = createMCPToolValidator();
			validator.loadPolicy(policy);

			expect(validator.isToolAllowed('file_reader')).toBe(true);
		});

		it('should enforce scope requirements', () => {
			const policy: MCPToolPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					tools: [
						{
							name: 'secure_tool',
							restrictions: {
								requiredScopes: ['admin:read', 'admin:write'],
							},
						},
					],
					categories: [],
				},
			};

			const validator = createMCPToolValidator();
			validator.loadPolicy(policy);

			// Without required scopes
			expect(validator.isToolAllowed('secure_tool', { scopes: ['user:read'] })).toBe(false);
			expect(validator.getViolationReason('secure_tool')).toContain('missing required scopes');

			// With required scopes
			expect(
				validator.isToolAllowed('secure_tool', {
					scopes: ['admin:read', 'admin:write'],
				}),
			).toBe(true);
		});

		it('should enforce rate limiting', () => {
			const policy: MCPToolPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					tools: [
						{
							name: 'rate_limited_tool',
							restrictions: {
								maxCalls: 5,
							},
						},
					],
					categories: [],
				},
			};

			const validator = createMCPToolValidator();
			validator.loadPolicy(policy);

			// Within limits
			expect(validator.isToolAllowed('rate_limited_tool', { callCount: 3 })).toBe(true);

			// Over limits
			expect(validator.isToolAllowed('rate_limited_tool', { callCount: 6 })).toBe(false);
			expect(validator.getViolationReason('rate_limited_tool')).toContain('exceeded call limit');
		});

		it('should respect denylist patterns', () => {
			const policy: MCPToolPolicy = {
				version: '1.0',
				defaultAction: 'allow',
				allowlist: {
					tools: [],
					categories: [],
				},
				denylist: {
					tools: ['blocked_tool'],
					patterns: ['*_admin', 'system_*'],
				},
			};

			const validator = createMCPToolValidator();
			validator.loadPolicy(policy);

			// Explicitly denied
			expect(validator.isToolAllowed('blocked_tool')).toBe(false);

			// Pattern matches
			expect(validator.isToolAllowed('user_admin')).toBe(false);
			expect(validator.isToolAllowed('system_config')).toBe(false);

			// Should allow others
			expect(validator.isToolAllowed('safe_tool')).toBe(true);
		});

		it('should allow tools in categories', () => {
			const policy: MCPToolPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					tools: [],
					categories: [
						{
							name: 'safe_category',
							tools: ['cat_tool_1', 'cat_tool_2'],
						},
					],
				},
			};

			const validator = createMCPToolValidator();
			validator.loadPolicy(policy);

			expect(validator.isToolAllowed('cat_tool_1')).toBe(true);
			expect(validator.isToolAllowed('cat_tool_2')).toBe(true);
			expect(validator.isToolAllowed('other_tool')).toBe(false);
		});
	});

	describe('Error handling and reporting', () => {
		it('should provide structured violation errors', () => {
			const policy: MCPToolPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					tools: [
						{
							name: 'restricted_tool',
							restrictions: {
								requiredScopes: ['admin:read'],
								maxCalls: 10,
							},
						},
					],
					categories: [],
				},
			};

			const validator = createMCPToolValidator();
			validator.loadPolicy(policy);

			// Test scope violation
			expect(validator.isToolAllowed('restricted_tool', { scopes: ['user:read'] })).toBe(false);
			const scopeReason = validator.getViolationReason('restricted_tool');
			expect(scopeReason).toContain('missing required scopes');
			expect(scopeReason).toContain('admin:read');

			// Test call limit violation
			expect(
				validator.isToolAllowed('restricted_tool', {
					callCount: 15,
					scopes: ['admin:read'],
				}),
			).toBe(false);
			const callReason = validator.getViolationReason('restricted_tool');
			expect(callReason).toContain('exceeded call limit');
		});

		it('should handle policy not loaded error', () => {
			const validator = createMCPToolValidator();

			expect(() => {
				validator.isToolAllowed('any_tool');
			}).toThrow('No MCP tool policy loaded');
		});
	});

	describe('Integration with existing policies', () => {
		it('should integrate with structure guard policy', () => {
			const structureGuardPolicy = {
				version: '1.0',
				rules: {
					crossFeatureImports: 'deny',
				},
				mcp: {
					version: '1.0',
					defaultAction: 'deny' as const,
					allowlist: {
						tools: [{ name: 'safe_tool' }],
						categories: [],
					},
				},
			};

			expect(() => {
				const validator = createMCPToolValidator();
				validator.validateSchema(structureGuardPolicy.mcp);
			}).not.toThrow();
		});
	});
});
