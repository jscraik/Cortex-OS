/**
 * @file MCP Security Validator
 * @description Runtime security validation for MCP servers against governance policies
 */

import { readFile } from 'node:fs/promises';
import type { ServerManifest } from '@cortex-os/mcp-registry';
import { z } from 'zod';

// Policy schema from governance
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
		validation: z.object({
			strictMode: z.boolean(),
			allowPrerelease: z.boolean(),
			minRating: z.number().min(0).max(5),
		}),
	}),
});

type GovernancePolicy = z.infer<typeof GovernancePolicySchema>;

export interface ValidationResult {
	valid: boolean;
	warnings: string[];
	errors: string[];
	requiresApproval: boolean;
	requiresConfirmation: boolean;
}

export interface SecurityContext {
	policy: GovernancePolicy;
	enforcementLevel: 'strict' | 'warn' | 'permissive';
}

/**
 * MCP Security Validator
 * Validates MCP servers against governance policies
 */
export class McpSecurityValidator {
	private policy: GovernancePolicy;
	private enforcementLevel: 'strict' | 'warn' | 'permissive';

	constructor(context: SecurityContext) {
		this.policy = context.policy;
		this.enforcementLevel = context.enforcementLevel;
	}

	/**
	 * Load validator from governance policy file
	 */
	static async fromPolicyFile(
		policyPath: string,
		enforcementLevel: 'strict' | 'warn' | 'permissive' = 'strict',
	): Promise<McpSecurityValidator> {
		const content = await readFile(policyPath, 'utf-8');
		const policy = GovernancePolicySchema.parse(JSON.parse(content));

		return new McpSecurityValidator({
			policy,
			enforcementLevel,
		});
	}

	/**
	 * Validate server manifest against security policies
	 */
	async validateServer(server: ServerManifest): Promise<ValidationResult> {
		const result: ValidationResult = {
			valid: true,
			warnings: [],
			errors: [],
			requiresApproval: false,
			requiresConfirmation: false,
		};

		// Validate risk level
		this.validateRiskLevel(server, result);

		// Validate permissions
		this.validatePermissions(server, result);

		// Validate publisher trust
		this.validatePublisher(server, result);

		// Validate signatures if required
		await this.validateSignatures(server, result);

		// Validate rating requirements
		this.validateRating(server, result);

		// Validate version requirements
		this.validateVersion(server, result);

		// Final validation state
		result.valid =
			result.errors.length === 0 &&
			(this.enforcementLevel !== 'strict' || result.warnings.length === 0);

		return result;
	}

	/**
	 * Validate server risk level against policy
	 */
	private validateRiskLevel(server: ServerManifest, result: ValidationResult): void {
		const riskLevel = server.security?.riskLevel;

		if (!riskLevel) {
			result.errors.push('Server missing security risk level declaration');
			return;
		}

		if (!this.policy.security.riskLevels.allowed.includes(riskLevel)) {
			result.errors.push(`Risk level '${riskLevel}' not allowed by policy`);
			return;
		}

		if (this.policy.security.riskLevels.requireApproval.includes(riskLevel)) {
			result.requiresApproval = true;
			result.warnings.push(`Server requires approval due to '${riskLevel}' risk level`);
		}
	}

	/**
	 * Validate server permissions against policy
	 */
	private validatePermissions(server: ServerManifest, result: ValidationResult): void {
		const permissions = server.permissions || [];
		const dangerous = this.policy.security.permissions.dangerous;
		const requireConfirmation = this.policy.security.permissions.requireConfirmation;

		// Check for dangerous permissions
		const hasDangerous = permissions.some((perm) =>
			dangerous.some((dangerousPerm) => perm.includes(dangerousPerm)),
		);

		if (hasDangerous) {
			const dangerousPerms = permissions.filter((perm) =>
				dangerous.some((dangerousPerm) => perm.includes(dangerousPerm)),
			);

			result.warnings.push(`Server requests dangerous permissions: ${dangerousPerms.join(', ')}`);
		}

		// High risk servers should have dangerous permissions
		if (server.security?.riskLevel === 'high' && !hasDangerous) {
			result.warnings.push('High-risk server should declare dangerous permissions explicitly');
		}

		// Check for confirmation-required permissions
		const needsConfirmation = permissions.some((perm) =>
			requireConfirmation.some((confirmPerm) => perm.includes(confirmPerm)),
		);

		if (needsConfirmation) {
			result.requiresConfirmation = true;
			const confirmPerms = permissions.filter((perm) =>
				requireConfirmation.some((confirmPerm) => perm.includes(confirmPerm)),
			);
			result.warnings.push(
				`Server requires confirmation for permissions: ${confirmPerms.join(', ')}`,
			);
		}

		// Validate permission consistency with risk level
		if (server.security?.riskLevel === 'low' && hasDangerous) {
			result.errors.push('Low-risk server cannot have dangerous permissions');
		}
	}

	/**
	 * Validate publisher trust status
	 */
	private validatePublisher(server: ServerManifest, result: ValidationResult): void {
		const publisher = server.publisher;

		if (!publisher) {
			result.errors.push('Server missing publisher information');
			return;
		}

		const isTrusted = this.policy.security.signatures.trustedPublishers.includes(publisher.name);
		const isVerified = publisher.verified === true;

		if (!isTrusted && !isVerified) {
			result.warnings.push(`Publisher '${publisher.name}' is not trusted or verified`);
		}

		if (isTrusted && !isVerified) {
			result.warnings.push(`Trusted publisher '${publisher.name}' is not marked as verified`);
		}

		// Featured servers should be from trusted publishers
		if (server.featured && !isTrusted) {
			result.warnings.push('Featured servers should be from trusted publishers');
		}
	}

	/**
	 * Validate cryptographic signatures
	 */
	private async validateSignatures(
		server: ServerManifest,
		result: ValidationResult,
	): Promise<void> {
		if (!this.policy.security.signatures.required) {
			return;
		}

		const security = server.security;

		if (!security?.sigstore) {
			result.errors.push('Server missing required Sigstore attestation');
		}

		if (!security?.sbom) {
			result.warnings.push('Server missing Software Bill of Materials (SBOM)');
		}

		if (this.policy.security.signatures.sigstoreValidation && security?.sigstore) {
			try {
				const url = new URL(security.sigstore);
				if (url.protocol !== 'https:') {
					result.errors.push('Sigstore attestation must use HTTPS');
				}
				if (!url.pathname.endsWith('.json')) {
					result.warnings.push('Sigstore attestation should reference a JSON bundle');
				}
			} catch {
				result.warnings.push('Sigstore attestation URL may be invalid');
			}
		}
	}

	/**
	 * Validate server rating against minimum requirements
	 */
	private validateRating(server: ServerManifest, result: ValidationResult): void {
		const minRating = this.policy.marketplace.validation.minRating;

		if (server.rating && server.rating < minRating) {
			result.warnings.push(`Server rating ${server.rating} below minimum ${minRating}`);
		}

		// Featured servers should have high ratings
		if (server.featured && server.rating && server.rating < 4.0) {
			result.warnings.push('Featured servers should have ratings >= 4.0');
		}
	}

	/**
	 * Validate server version against policy
	 */
	private validateVersion(server: ServerManifest, result: ValidationResult): void {
		if (!this.policy.marketplace.validation.allowPrerelease && server.version) {
			const isPrerelease = server.version.includes('-');

			if (isPrerelease) {
				result.warnings.push('Prerelease versions not allowed by policy');
			}
		}

		// Validate MCP version compatibility
		const mcpVersion = server.mcpVersion;
		const supportedVersions = ['2025-06-18', '2025-03-26'];

		if (mcpVersion && !supportedVersions.includes(mcpVersion)) {
			result.warnings.push(`MCP version '${mcpVersion}' may not be supported`);
		}
	}

	/**
	 * Get enforcement level
	 */
	getEnforcementLevel(): 'strict' | 'warn' | 'permissive' {
		return this.enforcementLevel;
	}

	/**
	 * Set enforcement level
	 */
	setEnforcementLevel(level: 'strict' | 'warn' | 'permissive'): void {
		this.enforcementLevel = level;
	}

	/**
	 * Check if server requires manual approval
	 */
	requiresApproval(server: ServerManifest): boolean {
		const riskLevel = server.security?.riskLevel;
		return riskLevel ? this.policy.security.riskLevels.requireApproval.includes(riskLevel) : false;
	}

	/**
	 * Check if server requires user confirmation
	 */
	requiresConfirmation(server: ServerManifest): boolean {
		const permissions = server.permissions || [];
		return permissions.some((perm) =>
			this.policy.security.permissions.requireConfirmation.some((confirmPerm) =>
				perm.includes(confirmPerm),
			),
		);
	}
}
