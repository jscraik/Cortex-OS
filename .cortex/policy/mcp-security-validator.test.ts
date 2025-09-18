/**
 * @file MCP Security Validator Tests
 * @description TDD tests for security validator implementation
 */

import type { ServerManifest } from '@cortex-os/mcp-registry';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SecurityContext } from './mcp-security-validator.js';
import { McpSecurityValidator } from './mcp-security-validator.js';

describe('McpSecurityValidator', () => {
	let validator: McpSecurityValidator;
	let mockPolicy: SecurityContext['policy'];

	beforeEach(() => {
		mockPolicy = {
			security: {
				riskLevels: {
					allowed: ['low', 'medium'],
					requireApproval: ['high'],
				},
				signatures: {
					required: true,
					trustedPublishers: ['ModelContextProtocol', 'Anthropic', 'GitHub'],
					sigstoreValidation: true,
				},
				permissions: {
					dangerous: ['system:exec', 'system:admin', 'files:write:root'],
					requireConfirmation: ['files:write', 'system:exec', 'network:external'],
				},
			},
			marketplace: {
				validation: {
					strictMode: true,
					allowPrerelease: false,
					minRating: 3.0,
				},
			},
		};

		validator = new McpSecurityValidator({
			policy: mockPolicy,
			enforcementLevel: 'strict',
		});
	});

	describe('Risk Level Validation', () => {
		it('should validate allowed risk levels', async () => {
			const server: ServerManifest = createMockServer({
				security: { riskLevel: 'low' },
			});

			const result = await validator.validateServer(server);
			expect(result.valid).toBe(true);
			expect(result.requiresApproval).toBe(false);
		});

		it('should reject disallowed risk levels', async () => {
			const server: ServerManifest = createMockServer({
				security: { riskLevel: 'high' },
			});

			const result = await validator.validateServer(server);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Risk level 'high' not allowed by policy");
		});

		it('should require approval for high-risk servers', async () => {
			// Update policy to allow high risk
			mockPolicy.security.riskLevels.allowed.push('high');
			validator = new McpSecurityValidator({
				policy: mockPolicy,
				enforcementLevel: 'strict',
			});

			const server: ServerManifest = createMockServer({
				security: { riskLevel: 'high' },
			});

			const result = await validator.validateServer(server);
			expect(result.requiresApproval).toBe(true);
			expect(result.warnings).toContain("Server requires approval due to 'high' risk level");
		});

		it('should error on missing risk level', async () => {
			const server: ServerManifest = createMockServer({
				security: undefined,
			});

			const result = await validator.validateServer(server);
			expect(result.errors).toContain('Server missing security risk level declaration');
		});
	});

	describe('Permission Validation', () => {
		it('should detect dangerous permissions', async () => {
			const server: ServerManifest = createMockServer({
				permissions: ['system:exec', 'network:https'],
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('dangerous permissions'))).toBe(true);
		});

		it('should require confirmation for sensitive permissions', async () => {
			const server: ServerManifest = createMockServer({
				permissions: ['files:write', 'data:read'],
			});

			const result = await validator.validateServer(server);
			expect(result.requiresConfirmation).toBe(true);
			expect(result.warnings.some((w) => w.includes('requires confirmation'))).toBe(true);
		});

		it('should reject dangerous permissions on low-risk servers', async () => {
			const server: ServerManifest = createMockServer({
				security: { riskLevel: 'low' },
				permissions: ['system:exec'],
			});

			const result = await validator.validateServer(server);
			expect(result.errors).toContain('Low-risk server cannot have dangerous permissions');
		});

		it('should warn when high-risk server lacks dangerous permissions', async () => {
			mockPolicy.security.riskLevels.allowed.push('high');
			validator = new McpSecurityValidator({
				policy: mockPolicy,
				enforcementLevel: 'strict',
			});

			const server: ServerManifest = createMockServer({
				security: { riskLevel: 'high' },
				permissions: ['network:https'],
			});

			const result = await validator.validateServer(server);
			expect(result.warnings).toContain(
				'High-risk server should declare dangerous permissions explicitly',
			);
		});

		it('should validate permission consistency', async () => {
			// High risk servers should have dangerous permissions
			mockPolicy.security.riskLevels.allowed.push('high');
			validator = new McpSecurityValidator({
				policy: mockPolicy,
				enforcementLevel: 'warn',
			});

			const server: ServerManifest = createMockServer({
				security: { riskLevel: 'high' },
				permissions: ['network:https'], // No dangerous permissions
			});

			const result = await validator.validateServer(server);
			expect(
				result.warnings.some((w) =>
					w.includes('High-risk server should declare dangerous permissions'),
				),
			).toBe(true);
		});
	});

	describe('Publisher Validation', () => {
		it('should validate trusted publishers', async () => {
			const server: ServerManifest = createMockServer({
				publisher: {
					name: 'ModelContextProtocol',
					email: 'mcp@anthropic.com',
					verified: true,
				},
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('not trusted'))).toBe(false);
		});

		it('should warn about untrusted publishers', async () => {
			const server: ServerManifest = createMockServer({
				publisher: {
					name: 'Unknown Publisher',
					email: 'test@example.com',
					verified: false,
				},
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('not trusted or verified'))).toBe(true);
		});

		it('should warn about unverified trusted publishers', async () => {
			const server: ServerManifest = createMockServer({
				publisher: {
					name: 'GitHub',
					email: 'test@github.com',
					verified: false,
				},
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('not marked as verified'))).toBe(true);
		});

		it('should validate featured server publishers', async () => {
			const server: ServerManifest = createMockServer({
				publisher: {
					name: 'Unknown Publisher',
					email: 'test@example.com',
					verified: false,
				},
				featured: true,
			});

			const result = await validator.validateServer(server);
			expect(
				result.warnings.some((w) =>
					w.includes('Featured servers should be from trusted publishers'),
				),
			).toBe(true);
		});

		it('should error on missing publisher', async () => {
			const server: ServerManifest = createMockServer({
				publisher: undefined,
			});

			const result = await validator.validateServer(server);
			expect(result.errors).toContain('Server missing publisher information');
		});
	});

	describe('Signature Validation', () => {
		it('should require sigstore attestations', async () => {
			const server: ServerManifest = createMockServer({
				security: { riskLevel: 'low' }, // Missing sigstore
			});

			const result = await validator.validateServer(server);
			expect(result.errors).toContain('Server missing required Sigstore attestation');
		});

		it('should warn about missing SBOM', async () => {
			const server: ServerManifest = createMockServer({
				security: {
					riskLevel: 'low',
					sigstore: 'https://registry.mcp.dev/attestations/test.sigstore.json',
					// Missing sbom
				},
			});

			const result = await validator.validateServer(server);
			expect(result.warnings).toContain('Server missing Software Bill of Materials (SBOM)');
		});

		it('should validate sigstore URL format', async () => {
			const server: ServerManifest = createMockServer({
				security: {
					riskLevel: 'low',
					sigstore: 'invalid-url',
				},
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('may be invalid'))).toBe(true);
		});

		it('should skip signature validation when not required', async () => {
			mockPolicy.security.signatures.required = false;
			validator = new McpSecurityValidator({
				policy: mockPolicy,
				enforcementLevel: 'strict',
			});

			const server: ServerManifest = createMockServer({
				security: { riskLevel: 'low' }, // No signatures
			});

			const result = await validator.validateServer(server);
			expect(result.errors.some((e) => e.includes('Sigstore'))).toBe(false);
		});
	});

	describe('Rating Validation', () => {
		it('should validate minimum rating', async () => {
			const server: ServerManifest = createMockServer({
				rating: 2.5, // Below 3.0 minimum
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('below minimum'))).toBe(true);
		});

		it('should validate featured server ratings', async () => {
			const server: ServerManifest = createMockServer({
				rating: 3.5,
				featured: true,
			});

			const result = await validator.validateServer(server);
			expect(
				result.warnings.some((w) => w.includes('Featured servers should have ratings >= 4.0')),
			).toBe(true);
		});

		it('should pass high ratings', async () => {
			const server: ServerManifest = createMockServer({
				rating: 4.8,
				featured: true,
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('rating'))).toBe(false);
		});
	});

	describe('Version Validation', () => {
		it('should reject prerelease versions when disabled', async () => {
			const server: ServerManifest = createMockServer({
				version: '1.0.0-beta.1',
			});

			const result = await validator.validateServer(server);
			expect(result.warnings).toContain('Prerelease versions not allowed by policy');
		});

		it('should allow prerelease when enabled', async () => {
			mockPolicy.marketplace.validation.allowPrerelease = true;
			validator = new McpSecurityValidator({
				policy: mockPolicy,
				enforcementLevel: 'strict',
			});

			const server: ServerManifest = createMockServer({
				version: '1.0.0-beta.1',
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('Prerelease'))).toBe(false);
		});

		it('should validate MCP version compatibility', async () => {
			const server: ServerManifest = createMockServer({
				mcpVersion: '2024-01-01', // Unsupported version
			});

			const result = await validator.validateServer(server);
			expect(result.warnings.some((w) => w.includes('may not be supported'))).toBe(true);
		});
	});

	describe('Enforcement Levels', () => {
		it('should fail strict validation with warnings', async () => {
			validator.setEnforcementLevel('strict');

			const server: ServerManifest = createMockServer({
				rating: 2.0, // Causes warning
			});

			const result = await validator.validateServer(server);
			expect(result.valid).toBe(false);
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it('should pass warn validation with warnings', async () => {
			validator.setEnforcementLevel('warn');

			const server: ServerManifest = createMockServer({
				rating: 2.0, // Causes warning
			});

			const result = await validator.validateServer(server);
			expect(result.valid).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it('should pass permissive validation', async () => {
			validator.setEnforcementLevel('permissive');

			const server: ServerManifest = createMockServer({
				rating: 1.0, // Multiple warnings
				version: '1.0.0-beta',
			});

			const result = await validator.validateServer(server);
			expect(result.valid).toBe(true);
		});
	});

	describe('Helper Methods', () => {
		it('should check approval requirements', () => {
			mockPolicy.security.riskLevels.allowed.push('high');
			validator = new McpSecurityValidator({
				policy: mockPolicy,
				enforcementLevel: 'strict',
			});

			const highRiskServer: ServerManifest = createMockServer({
				security: { riskLevel: 'high' },
			});

			const lowRiskServer: ServerManifest = createMockServer({
				security: { riskLevel: 'low' },
			});

			expect(validator.requiresApproval(highRiskServer)).toBe(true);
			expect(validator.requiresApproval(lowRiskServer)).toBe(false);
		});

		it('should check confirmation requirements', () => {
			const dangerousServer: ServerManifest = createMockServer({
				permissions: ['files:write', 'system:exec'],
			});

			const safeServer: ServerManifest = createMockServer({
				permissions: ['network:https', 'data:read'],
			});

			expect(validator.requiresConfirmation(dangerousServer)).toBe(true);
			expect(validator.requiresConfirmation(safeServer)).toBe(false);
		});

		it('should get and set enforcement levels', () => {
			expect(validator.getEnforcementLevel()).toBe('strict');

			validator.setEnforcementLevel('warn');
			expect(validator.getEnforcementLevel()).toBe('warn');
		});
	});
});

/**
 * Helper function to create mock server manifests
 */
function createMockServer(overrides: Partial<ServerManifest> = {}): ServerManifest {
	return {
		id: 'test-server',
		name: 'Test Server',
		description: 'A test server for validation',
		mcpVersion: '2025-06-18',
		capabilities: { tools: true, resources: false, prompts: false },
		publisher: {
			name: 'Test Publisher',
			email: 'test@example.com',
			verified: false,
		},
		category: 'utility',
		license: 'MIT',
		transport: {
			stdio: { command: 'test-command' },
		},
		install: {
			claude: 'test-command',
			json: { mcpServers: { 'test-server': { command: 'test-command' } } },
		},
		permissions: [],
		security: { riskLevel: 'low' },
		featured: false,
		downloads: 100,
		updatedAt: '2025-01-01T00:00:00Z',
		...overrides,
	};
}
