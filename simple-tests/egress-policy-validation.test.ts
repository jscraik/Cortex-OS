import { describe, expect, it } from 'vitest';
import { createEgressPolicyValidator, type EgressPolicy } from './egress-policy-validator-impl.js';

describe('Egress Policy Validation', () => {
	describe('Schema validation', () => {
		it('should validate a complete egress policy schema', () => {
			const validPolicy = {
				version: '1.0',
				defaultAction: 'deny' as const,
				allowlist: {
					domains: ['api.github.com', 'registry.npmjs.org'],
					endpoints: [
						{
							url: 'https://api.openai.com/v1/chat/completions',
							methods: ['POST'],
							description: 'OpenAI API access',
						},
					],
				},
				rules: [
					{
						pattern: 'https://api.github.com/*',
						action: 'allow' as const,
						reason: 'GitHub API access required',
					},
				],
			};

			// This should pass when implemented
			expect(() => {
				// Placeholder - will implement validator
				const validator = createEgressPolicyValidator();
				validator.validateSchema(validPolicy);
			}).not.toThrow();
		});

		it('should reject policy with invalid defaultAction', () => {
			const invalidPolicy = {
				version: '1.0',
				defaultAction: 'maybe', // Invalid value
				allowlist: {
					domains: [],
					endpoints: [],
				},
			};

			expect(() => {
				const validator = createEgressPolicyValidator();
				validator.validateSchema(invalidPolicy);
			}).toThrow('Invalid defaultAction');
		});

		it('should require version field', () => {
			const invalidPolicy = {
				defaultAction: 'deny',
				allowlist: {
					domains: [],
					endpoints: [],
				},
			};

			expect(() => {
				const validator = createEgressPolicyValidator();
				validator.validateSchema(invalidPolicy);
			}).toThrow('version');
		});

		it('should validate endpoint URL format', () => {
			const invalidPolicy = {
				version: '1.0',
				defaultAction: 'deny' as const,
				allowlist: {
					domains: [],
					endpoints: [
						{
							url: 'not-a-valid-url',
							methods: ['GET'],
						},
					],
				},
			};

			expect(() => {
				const validator = createEgressPolicyValidator();
				validator.validateSchema(invalidPolicy);
			}).toThrow('Invalid URL format');
		});
	});

	describe('Policy enforcement', () => {
		it('should deny by default when no allowlist matches', () => {
			const policy: EgressPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					domains: ['allowed.com'],
					endpoints: [],
				},
			};

			const validator = createEgressPolicyValidator();
			validator.loadPolicy(policy);

			expect(validator.isAllowed('https://blocked.com/api')).toBe(false);
		});

		it('should allow requests to allowlisted domains', () => {
			const policy: EgressPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					domains: ['api.github.com'],
					endpoints: [],
				},
			};

			const validator = createEgressPolicyValidator();
			validator.loadPolicy(policy);

			expect(validator.isAllowed('https://api.github.com/user')).toBe(true);
		});

		it('should allow specific endpoint with method restriction', () => {
			const policy: EgressPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					domains: [],
					endpoints: [
						{
							url: 'https://api.openai.com/v1/chat/completions',
							methods: ['POST'],
						},
					],
				},
			};

			const validator = createEgressPolicyValidator();
			validator.loadPolicy(policy);

			expect(validator.isAllowed('https://api.openai.com/v1/chat/completions', 'POST')).toBe(true);
			expect(validator.isAllowed('https://api.openai.com/v1/chat/completions', 'GET')).toBe(false);
		});

		it('should apply custom rules over default allowlist', () => {
			const policy: EgressPolicy = {
				version: '1.0',
				defaultAction: 'deny',
				allowlist: {
					domains: ['api.github.com'],
					endpoints: [],
				},
				rules: [
					{
						pattern: 'https://api.github.com/admin/*',
						action: 'deny',
						reason: 'Admin endpoints are restricted',
					},
				],
			};

			const validator = createEgressPolicyValidator();
			validator.loadPolicy(policy);

			expect(validator.isAllowed('https://api.github.com/user')).toBe(true);
			expect(validator.isAllowed('https://api.github.com/admin/users')).toBe(false);
		});
	});

	describe('Integration with structure guard', () => {
		it('should integrate with existing policy schema', () => {
			const structureGuardPolicy = {
				version: '1.0',
				rules: {
					crossFeatureImports: 'deny',
					allowedPatterns: ['@cortex-os/shared/*'],
				},
				egress: {
					version: '1.0',
					defaultAction: 'deny' as const,
					allowlist: {
						domains: ['api.github.com'],
						endpoints: [],
					},
				},
			};

			// Should validate as part of broader structure guard policy
			expect(() => {
				const validator = createEgressPolicyValidator();
				validator.validateSchema(structureGuardPolicy.egress);
			}).not.toThrow();
		});
	});
});
