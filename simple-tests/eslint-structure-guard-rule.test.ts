/**
 * @fileoverview TDD Tests for Structure Guard ESLint Rule
 *
 * This module tests the ESLint rule that enforces cross-feature import restrictions
 * to maintain monorepo structure integrity and prevent architectural violations.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, expect, it } from 'vitest';
import { noForbiddenImportsRule } from './eslint-structure-guard-rule';

// Configure RuleTester for TypeScript
RuleTester.afterAll = undefined;
const ruleTester = new RuleTester({
	languageOptions: {
		parser: require('@typescript-eslint/parser'),
		parserOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
		},
	},
});

describe('Structure Guard ESLint Rule', () => {
	describe('no-forbidden-imports rule', () => {
		it('should reject cross-feature sibling imports', () => {
			expect(() => {
				ruleTester.run('no-forbidden-imports', noForbiddenImportsRule, {
					valid: [],
					invalid: [
						{
							code: `
                // In apps/cortex-os/packages/agents/src/index.ts
                import { something } from '../memories/src/domain/memory';
              `,
							filename: 'apps/cortex-os/packages/agents/src/index.ts',
							errors: [
								{
									messageId: 'forbiddenImport',
									data: {
										source: '../memories/src/domain/memory',
										reason:
											'Cross-feature imports are not allowed. Use A2A events or MCP tools instead.',
									},
								},
							],
						},
					],
				});
			}).not.toThrow();
		});

		it('should allow imports from shared libraries', () => {
			expect(() => {
				ruleTester.run('no-forbidden-imports', noForbiddenImportsRule, {
					valid: [
						{
							code: `
                // Allowed: shared utility imports
                import { z } from 'zod';
                import { createEnvelope } from '@cortex-os/a2a-core';
                import { logger } from '@cortex-os/utils';
                import type { CloudEvent } from '@cortex-os/contracts';
              `,
							filename: 'packages/agents/src/index.ts',
						},
					],
					invalid: [],
				});
			}).not.toThrow();
		});

		it('should allow internal feature imports', () => {
			expect(() => {
				ruleTester.run('no-forbidden-imports', noForbiddenImportsRule, {
					valid: [
						{
							code: `
                // Allowed: within same feature
                import { AgentDomain } from './domain/agent';
                import { AgentRepository } from './infra/agent-repository';
                import { validateAgent } from '../validation/agent-validator';
              `,
							filename: 'packages/agents/src/app/agent-service.ts',
						},
					],
					invalid: [],
				});
			}).not.toThrow();
		});

		it('should provide clear error messages with suggested alternatives', () => {
			expect(() => {
				ruleTester.run('no-forbidden-imports', noForbiddenImportsRule, {
					valid: [],
					invalid: [
						{
							code: `
                import { MemoryStore } from '../memories/src/infra/memory-store';
                import { OrchestrationEngine } from '../orchestration/src/domain/engine';
              `,
							filename: 'packages/agents/src/app/agent-service.ts',
							errors: [
								{
									messageId: 'forbiddenImport',
									data: {
										source: '../memories/src/infra/memory-store',
										reason:
											'Cross-feature imports are not allowed. Use A2A events or MCP tools instead.',
									},
								},
								{
									messageId: 'forbiddenImport',
									data: {
										source: '../orchestration/src/domain/engine',
										reason:
											'Cross-feature imports are not allowed. Use A2A events or MCP tools instead.',
									},
								},
							],
						},
					],
				});
			}).not.toThrow();
		});

		it('should detect banned import patterns', () => {
			expect(() => {
				ruleTester.run('no-forbidden-imports', noForbiddenImportsRule, {
					valid: [],
					invalid: [
						{
							code: `
                // Banned pattern: direct access to dist/build artifacts
                import { compiled } from '@cortex-os/agents/dist/compiled';
                import { nodeModules } from '@cortex-os/agents/node_modules/something';
              `,
							filename: 'packages/memories/src/index.ts',
							errors: [
								{
									messageId: 'bannedPattern',
									data: {
										source: '@cortex-os/agents/dist/compiled',
										pattern: '^@cortex-os/.*/dist/.*$',
									},
								},
								{
									messageId: 'bannedPattern',
									data: {
										source: '@cortex-os/agents/node_modules/something',
										pattern: '^@cortex-os/.*/node_modules/.*$',
									},
								},
							],
						},
					],
				});
			}).not.toThrow();
		});

		it('should handle complex feature boundary detection', () => {
			expect(() => {
				ruleTester.run('no-forbidden-imports', noForbiddenImportsRule, {
					valid: [
						{
							// Allowed: importing from parent package structure
							code: `
                import { SharedConfig } from '../../shared/config';
                import { RootUtils } from '../../../utils/common';
              `,
							filename: 'apps/cortex-os/packages/agents/src/domain/agent.ts',
						},
					],
					invalid: [
						{
							// Forbidden: importing from sibling feature
							code: `
                import { MemoryCore } from '../../memories/src/core';
                import { RAGEngine } from '../../rag/src/engine';
              `,
							filename: 'apps/cortex-os/packages/agents/src/domain/agent.ts',
							errors: [
								{
									messageId: 'forbiddenImport',
									data: {
										source: '../../memories/src/core',
										reason:
											'Cross-feature imports are not allowed. Use A2A events or MCP tools instead.',
									},
								},
								{
									messageId: 'forbiddenImport',
									data: {
										source: '../../rag/src/engine',
										reason:
											'Cross-feature imports are not allowed. Use A2A events or MCP tools instead.',
									},
								},
							],
						},
					],
				});
			}).not.toThrow();
		});

		it('should allow MCP and A2A framework imports', () => {
			expect(() => {
				ruleTester.run('no-forbidden-imports', noForbiddenImportsRule, {
					valid: [
						{
							code: `
                // Framework imports are always allowed
                import { MCPTool, createTool } from '@cortex-os/mcp-core';
                import { publishEvent, subscribeToEvents } from '@cortex-os/a2a';
                import { CloudEvent } from '@cortex-os/a2a-contracts';
                import { Logger } from '@cortex-os/observability';
              `,
							filename: 'packages/agents/src/infra/agent-tools.ts',
						},
					],
					invalid: [],
				});
			}).not.toThrow();
		});
	});

	describe('Rule configuration and options', () => {
		it('should support custom banned patterns', () => {
			const customRule = {
				...noForbiddenImportsRule,
				meta: {
					...noForbiddenImportsRule.meta,
					schema: [
						{
							type: 'object',
							properties: {
								bannedPatterns: {
									type: 'array',
									items: { type: 'string' },
								},
								allowedCrossPkgImports: {
									type: 'array',
									items: { type: 'string' },
								},
							},
							additionalProperties: false,
						},
					],
				},
			};

			expect(() => {
				ruleTester.run('no-forbidden-imports with custom config', customRule, {
					valid: [],
					invalid: [
						{
							code: `import { forbidden } from 'custom-banned-pattern';`,
							filename: 'packages/test/src/index.ts',
							options: [
								{
									bannedPatterns: ['custom-banned-pattern'],
									allowedCrossPkgImports: ['@cortex-os/utils'],
								},
							],
							errors: [
								{
									messageId: 'bannedPattern',
									data: {
										source: 'custom-banned-pattern',
										pattern: 'custom-banned-pattern',
									},
								},
							],
						},
					],
				});
			}).not.toThrow();
		});

		it('should integrate with existing ESLint configuration', () => {
			// This test verifies the rule can be properly integrated
			expect(noForbiddenImportsRule).toHaveProperty('meta');
			expect(noForbiddenImportsRule).toHaveProperty('create');
			expect(noForbiddenImportsRule.meta).toHaveProperty('type', 'problem');
			expect(noForbiddenImportsRule.meta).toHaveProperty('docs');
			expect(noForbiddenImportsRule.meta.fixable).toBe(false); // Structural violations shouldn't be auto-fixed
		});
	});

	describe('CLI integration', () => {
		it('should be compatible with just verify command', () => {
			// This test documents the integration point for the agent toolkit
			expect(noForbiddenImportsRule.meta.docs?.description).toContain('structure');
			expect(noForbiddenImportsRule.meta.docs?.category).toBe('Architectural Integrity');
		});
	});
});
