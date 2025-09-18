/**
 * @file MCP Governance Policy Validation Tests
 * @description TDD tests for governance policy validation
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ServerManifest } from '@cortex-os/mcp-registry';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

const GOVERNANCE_POLICY_PATH = path.join(__dirname, 'mcp-governance.json');

// Governance policy schema
const GovernancePolicySchema = z.object({
	security: z.object({
		riskLevels: z.object({
			allowed: z.array(z.enum(['low', 'medium', 'high'])),
			requireApproval: z.array(z.enum(['medium', 'high'])),
		}),
		signatures: z.object({
			required: z.boolean(),
			trustedPublishers: z.array(z.string()),
			sigstoreValidation: z.boolean(),
		}),
		permissions: z.object({
			dangerous: z.array(z.string()),
			requireConfirmation: z.array(z.string()),
		}),
	}),
	marketplace: z.object({
		registries: z.object({
			official: z.string().url(),
			community: z.string().url(),
			allowCustom: z.boolean(),
		}),
		caching: z.object({
			ttl: z.number().positive(),
			maxSize: z.number().positive(),
		}),
		validation: z.object({
			strictMode: z.boolean(),
			allowPrerelease: z.boolean(),
			minRating: z.number().min(0).max(5),
		}),
	}),
	installation: z.object({
		sandboxed: z.boolean(),
		isolatedEnvironments: z.boolean(),
		resourceLimits: z.object({
			memory: z.string(),
			cpu: z.string(),
			diskSpace: z.string(),
		}),
		networkAccess: z.object({
			allowed: z.array(z.string()),
			blocked: z.array(z.string()),
		}),
	}),
	audit: z.object({
		logging: z.object({
			level: z.enum(['debug', 'info', 'warn', 'error']),
			destinations: z.array(z.string()),
		}),
		monitoring: z.object({
			healthChecks: z.boolean(),
			performanceMetrics: z.boolean(),
			securityEvents: z.boolean(),
		}),
	}),
});

type GovernancePolicy = z.infer<typeof GovernancePolicySchema>;

describe('MCP Governance Policy', () => {
	let policy: GovernancePolicy;

	beforeEach(async () => {
		const content = await readFile(GOVERNANCE_POLICY_PATH, 'utf-8');
		policy = JSON.parse(content);
	});

	describe('Schema Validation', () => {
		it('should validate against governance policy schema', () => {
			const result = GovernancePolicySchema.safeParse(policy);

			if (!result.success) {
				console.error('Governance policy validation failed:', result.error.errors);
			}

			expect(result.success).toBe(true);
		});

		it('should have all required sections', () => {
			expect(policy).toHaveProperty('security');
			expect(policy).toHaveProperty('marketplace');
			expect(policy).toHaveProperty('installation');
			expect(policy).toHaveProperty('audit');
		});
	});

	describe('Security Policies', () => {
		it('should define valid risk levels', () => {
			expect(policy.security.riskLevels.allowed).toBeInstanceOf(Array);
			expect(
				policy.security.riskLevels.allowed.every((level) =>
					['low', 'medium', 'high'].includes(level),
				),
			).toBe(true);
		});

		it('should require approval for high-risk servers', () => {
			expect(policy.security.riskLevels.requireApproval).toContain('high');
		});

		it('should have trusted publishers list', () => {
			expect(policy.security.signatures.trustedPublishers).toBeInstanceOf(Array);
			expect(policy.security.signatures.trustedPublishers).toContain('ModelContextProtocol');
			expect(policy.security.signatures.trustedPublishers).toContain('Anthropic');
		});

		it('should define dangerous permissions', () => {
			const dangerousPerms = policy.security.permissions.dangerous;
			expect(dangerousPerms).toContain('system:exec');
			expect(dangerousPerms).toContain('system:admin');
			expect(dangerousPerms).toContain('files:write:root');
		});

		it('should require signature validation by default', () => {
			expect(policy.security.signatures.required).toBe(true);
			expect(policy.security.signatures.sigstoreValidation).toBe(true);
		});
	});

	describe('Marketplace Configuration', () => {
		it('should have valid registry URLs', () => {
			expect(policy.marketplace.registries.official).toMatch(/^https:\/\//);
			expect(policy.marketplace.registries.community).toMatch(/^https:\/\//);
		});

		it('should have reasonable cache settings', () => {
			expect(policy.marketplace.caching.ttl).toBeGreaterThan(0);
			expect(policy.marketplace.caching.maxSize).toBeGreaterThan(0);
			// 5 minutes default TTL
			expect(policy.marketplace.caching.ttl).toBe(300000);
		});

		it('should enforce strict validation by default', () => {
			expect(policy.marketplace.validation.strictMode).toBe(true);
			expect(policy.marketplace.validation.allowPrerelease).toBe(false);
		});

		it('should have minimum rating requirement', () => {
			expect(policy.marketplace.validation.minRating).toBeGreaterThan(0);
			expect(policy.marketplace.validation.minRating).toBeLessThanOrEqual(5);
		});
	});

	describe('Installation Security', () => {
		it('should enable sandboxing by default', () => {
			expect(policy.installation.sandboxed).toBe(true);
			expect(policy.installation.isolatedEnvironments).toBe(true);
		});

		it('should define resource limits', () => {
			expect(policy.installation.resourceLimits).toHaveProperty('memory');
			expect(policy.installation.resourceLimits).toHaveProperty('cpu');
			expect(policy.installation.resourceLimits).toHaveProperty('diskSpace');
		});

		it('should control network access', () => {
			expect(policy.installation.networkAccess.allowed).toBeInstanceOf(Array);
			expect(policy.installation.networkAccess.blocked).toBeInstanceOf(Array);

			// Should allow common development services
			expect(policy.installation.networkAccess.allowed).toContain('https://api.github.com');
			expect(policy.installation.networkAccess.allowed).toContain('https://registry.npmjs.org');

			// Should block dangerous protocols
			expect(policy.installation.networkAccess.blocked).toContain('file://');
			expect(policy.installation.networkAccess.blocked).toContain('ftp://');
		});
	});

	describe('Audit Configuration', () => {
		it('should have proper logging configuration', () => {
			expect(['debug', 'info', 'warn', 'error']).toContain(policy.audit.logging.level);
			expect(policy.audit.logging.destinations).toBeInstanceOf(Array);
		});

		it('should enable security monitoring', () => {
			expect(policy.audit.monitoring.healthChecks).toBe(true);
			expect(policy.audit.monitoring.performanceMetrics).toBe(true);
			expect(policy.audit.monitoring.securityEvents).toBe(true);
		});
	});

	describe('Policy Enforcement', () => {
		it('should validate server against risk level policy', () => {
			const testServerHighRisk: Partial<ServerManifest> = {
				security: { riskLevel: 'high' },
				permissions: ['system:exec', 'files:write:root'],
			};

			const _testServerLowRisk: Partial<ServerManifest> = {
				security: { riskLevel: 'low' },
				permissions: ['network:https', 'data:read'],
			};

			// High risk should require approval if configured
			if (policy.security.riskLevels.requireApproval.includes('high')) {
				expect(testServerHighRisk.security?.riskLevel).toBe('high');
			}

			// Low risk should be in allowed list
			expect(policy.security.riskLevels.allowed).toContain('low');
		});

		it('should validate dangerous permissions', () => {
			const dangerousServer = {
				permissions: ['system:exec', 'system:admin'],
			};

			const safeDangerous = dangerousServer.permissions.filter((perm) =>
				policy.security.permissions.dangerous.includes(perm),
			);

			expect(safeDangerous.length).toBeGreaterThan(0);
		});

		it('should validate trusted publishers', () => {
			const _trustedServer = {
				publisher: { name: 'ModelContextProtocol', verified: true },
			};

			const _untrustedServer = {
				publisher: { name: 'Unknown Publisher', verified: false },
			};

			expect(policy.security.signatures.trustedPublishers).toContain('ModelContextProtocol');
			expect(policy.security.signatures.trustedPublishers).not.toContain('Unknown Publisher');
		});
	});

	describe('Configuration Consistency', () => {
		it('should have consistent security settings', () => {
			// If signatures are required, sigstore validation should be enabled
			if (policy.security.signatures.required) {
				expect(policy.security.signatures.sigstoreValidation).toBe(true);
			}

			// If strict mode is enabled, prerelease should be disabled
			if (policy.marketplace.validation.strictMode) {
				expect(policy.marketplace.validation.allowPrerelease).toBe(false);
			}
		});

		it('should have reasonable resource limits', () => {
			const { memory, cpu, diskSpace } = policy.installation.resourceLimits;

			// Should have numeric values with units
			expect(memory).toMatch(/^\d+[KMGT]?B$/);
			expect(cpu).toMatch(/^\d+(\.\d+)?$/);
			expect(diskSpace).toMatch(/^\d+[KMGT]?B$/);
		});

		it('should have proper network restrictions', () => {
			const { allowed, blocked } = policy.installation.networkAccess;

			// Should not have conflicting entries
			const intersection = allowed.filter((url) =>
				blocked.some((blocked) => url.includes(blocked)),
			);
			expect(intersection.length).toBe(0);

			// HTTPS should be preferred over HTTP
			const httpsAllowed = allowed.filter((url) => url.startsWith('https://')).length;
			const httpAllowed = allowed.filter((url) => url.startsWith('http://')).length;
			expect(httpsAllowed).toBeGreaterThanOrEqual(httpAllowed);
		});
	});
});
