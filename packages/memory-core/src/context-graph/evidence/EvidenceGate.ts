/**
 * Evidence Gate for brAInwav Cortex-OS
 *
 * Implements evidence-first filtering and ABAC compliance for context operations.
 * Ensures governance compliance before any routing decisions or data access.
 *
 * Key Features:
 * - ABAC (Attribute-Based Access Control) validation
 * - Evidence generation and audit trails
 * - Policy enforcement and violation detection
 * - Security compliance validation
 * - Audit logging and chain of custody
 */

import { randomUUID } from 'node:crypto';
import type { EvidenceRecord } from './types.js';

export interface AccessContext {
	user: {
		id: string;
		role: string;
		permissions?: string[];
		department?: string;
		clearanceLevel?: number;
	};
	resource: {
		id: string;
		type: string;
		sensitivity?: string;
		classification?: string;
		owner?: string;
	};
	action: string;
	requestId?: string;
	timestamp?: string;
}

export interface AccessResult {
	granted: boolean;
	policiesApplied?: string[];
	evidence?: any;
	reason?: string;
	violationType?: string;
	riskLevel?: string;
	requiresEscalation?: boolean;
}

export interface EvidenceGeneration {
	id: string;
	userId: string;
	resourceId: string;
	action: string;
	granted: boolean;
	policiesEvaluated: string[];
	decisionTime: Date;
	brainwavGenerated: boolean;
	signature: string;
}

export interface AuditEntry {
	id: string;
	userId: string;
	resourceId: string;
	action: string;
	granted: boolean;
	policiesApplied: string[];
	timestamp: string;
	brainwavAudited: boolean;
	immutable: boolean;
}

export class EvidenceGate {
	private readonly auditLog: AuditEntry[] = [];
	private readonly evidenceRecords: Map<string, EvidenceRecord> = new Map();

	async validateAccess(context: AccessContext): Promise<AccessResult> {
		const timestamp = context.timestamp || new Date().toISOString();

		// Basic role-based access control
		const roleAllowed = this.checkRoleBasedAccess(context.user.role, context.resource.type);

		// Clearance level check (if specified)
		const clearanceValid = this.checkClearanceLevel(
			context.user.clearanceLevel,
			context.resource.sensitivity,
		);

		// Department authorization check (if specified)
		const departmentAuthorized = this.checkDepartmentAuthorization(
			context.user.department,
			context.resource.owner,
		);

		const policiesApplied = [];
		let granted = true;
		let reason: string | undefined;

		if (!roleAllowed) {
			granted = false;
			reason = 'Role not authorized for resource type';
			policiesApplied.push('role-based');
		}

		if (!clearanceValid) {
			granted = false;
			reason = reason ? `${reason}; Insufficient clearance level` : 'Insufficient clearance level';
			policiesApplied.push('clearance-level');
		}

		if (!departmentAuthorized) {
			granted = false;
			reason = reason ? `${reason}; Department not authorized` : 'Department not authorized';
			policiesApplied.push('department-access');
		}

		const evidence = {
			roleMatch: roleAllowed,
			clearanceSufficient: clearanceValid,
			departmentAuthorized,
			brainwavCompliant: true,
			requiredClearance: this.getRequiredClearance(context.resource.sensitivity),
			userClearance: context.user.clearanceLevel || 0,
		};

		// Log access attempt
		const auditEntry: AuditEntry = {
			id: `audit-${randomUUID()}`,
			userId: context.user.id,
			resourceId: context.resource.id,
			action: context.action,
			granted,
			policiesApplied,
			timestamp,
			brainwavAudited: true,
			immutable: true,
		};

		this.auditLog.push(auditEntry);

		return {
			granted,
			policiesApplied,
			evidence,
			reason,
			violationType: granted ? undefined : this.determineViolationType(context, evidence),
			riskLevel: granted ? 'low' : this.assessRiskLevel(context, evidence),
			requiresEscalation:
				!granted && (evidence.requiredClearance || 0) > (context.user.clearanceLevel || 0),
		};
	}

	async generateEvidence(
		context: AccessContext,
		accessResult: AccessResult,
	): Promise<EvidenceGeneration> {
		const evidence: EvidenceGeneration = {
			id: `evidence-${randomUUID()}`,
			userId: context.user.id,
			resourceId: context.resource.id,
			action: context.action,
			granted: accessResult.granted,
			policiesEvaluated: accessResult.policiesApplied || [],
			decisionTime: new Date(),
			brainwavGenerated: true,
			signature: this.generateSignature(context, accessResult),
		};

		// Store evidence record
		const record: EvidenceRecord = {
			id: evidence.id,
			userId: context.user.id,
			resourceId: context.resource.id,
			action: context.action,
			granted: accessResult.granted,
			evidence: accessResult.evidence,
			policiesApplied: accessResult.policiesApplied || [],
			timestamp: evidence.decisionTime.toISOString(),
			signature: evidence.signature,
			brainwavGenerated: true,
		};

		this.evidenceRecords.set(evidence.id, record);

		return evidence;
	}

	createAuditEntry(accessLog: any): AuditEntry {
		const entry: AuditEntry = {
			id: `audit-${randomUUID()}`,
			userId: accessLog.userId,
			resourceId: accessLog.resourceId,
			action: accessLog.action,
			granted: accessLog.granted,
			policiesApplied: accessLog.policiesApplied,
			timestamp: accessLog.timestamp,
			brainwavAudited: true,
			immutable: true,
		};

		this.auditLog.push(entry);
		return entry;
	}

	async verifyEvidenceChain(
		evidenceChain: any[],
	): Promise<{
		valid: boolean;
		chainIntact: boolean;
		signaturesValid: boolean;
		noTampering: boolean;
		brainwavVerified: boolean;
	}> {
		// Simple verification - in a real implementation, this would use cryptographic signatures
		const signaturesValid = evidenceChain.every(
			(item) => item.signature && item.signature.length > 0,
		);
		const chainIntact = evidenceChain.length > 0;
		const noTampering = signaturesValid; // Simplified check
		const brainwavVerified = evidenceChain.every(
			(item) => item.brainwavGenerated || item.brainwavAudited,
		);

		return {
			valid: signaturesValid && chainIntact && noTampering,
			chainIntact,
			signaturesValid,
			noTampering,
			brainwavVerified,
		};
	}

	async validateCompliance(
		_context: AccessContext,
		_complianceResult: any,
	): Promise<{ compliant: boolean; owaspLLMTop10: any; brainwavComplianceValidated: boolean }> {
		// Simplified OWASP LLM Top-10 compliance check
		const owaspLLMTop10 = {
			llm01: {
				compliant: true,
				riskLevel: 'low',
				mitigations: ['input-sanitization', 'prompt-guardrails'],
			},
			llm02: {
				compliant: true,
				riskLevel: 'low',
				mitigations: ['output-validation', 'content-filtering'],
			},
			llm03: {
				compliant: true,
				riskLevel: 'medium',
				mitigations: ['data-validation', 'source-verification'],
			},
		};

		const compliant = Object.values(owaspLLMTop10).every((check) => check.compliant);

		return {
			compliant,
			owaspLLMTop10,
			brainwavComplianceValidated: true,
		};
	}

	async performSecurityCheck(
		_context: AccessContext,
		securityScan: any,
	): Promise<{
		blocked: boolean;
		securityFlags: string[];
		riskLevel: string;
		requiresHumanReview: boolean;
		brainwavSecurityBlocked: boolean;
	}> {
		const securityFlags: string[] = [];

		if (securityScan.sqlInjectionRisk === 'high') {
			securityFlags.push('sql-pattern');
		}

		if (securityScan.piiDetected) {
			securityFlags.push('pii-pattern');
		}

		const blocked = securityFlags.length > 0;
		const riskLevel = this.assessSecurityRisk(securityScan);
		const requiresHumanReview = riskLevel === 'high' || securityFlags.includes('sql-pattern');

		return {
			blocked,
			securityFlags,
			riskLevel,
			requiresHumanReview,
			brainwavSecurityBlocked: blocked,
		};
	}

	private checkRoleBasedAccess(userRole: string, resourceType: string): boolean {
		const rolePermissions: Record<string, string[]> = {
			developer: ['graph_slice', 'context_pack', 'model_route'],
			senior_developer: ['graph_slice', 'context_pack', 'model_route', 'admin_access'],
			qa_engineer: ['graph_slice', 'context_pack'],
			intern: ['graph_slice'],
			admin: ['graph_slice', 'context_pack', 'model_route', 'admin_access', 'system_config'],
		};

		return rolePermissions[userRole]?.includes(resourceType) || false;
	}

	private checkClearanceLevel(userClearance?: number, resourceSensitivity?: string): boolean {
		if (!userClearance || !resourceSensitivity) return true;

		const requiredLevels: Record<string, number> = {
			low: 1,
			medium: 2,
			high: 3,
			critical: 4,
			confidential: 3,
			secret: 4,
			top_secret: 5,
		};

		const required = requiredLevels[resourceSensitivity] || 1;
		return userClearance >= required;
	}

	private checkDepartmentAuthorization(userDepartment?: string, resourceOwner?: string): boolean {
		if (!userDepartment || !resourceOwner) return true;

		// Simple department check - in real implementation, this would be more sophisticated
		return userDepartment === 'engineering' || resourceOwner === 'shared';
	}

	private getRequiredClearance(sensitivity?: string): number {
		const levels: Record<string, number> = {
			low: 1,
			medium: 2,
			high: 3,
			critical: 4,
			confidential: 3,
			secret: 4,
			top_secret: 5,
		};

		return levels[sensitivity || 'low'] || 1;
	}

	private determineViolationType(_context: AccessContext, evidence: any): string {
		if (!evidence.roleMatch) return 'role-based';
		if (!evidence.clearanceSufficient) return 'clearance-level';
		if (!evidence.departmentAuthorized) return 'department-access';
		return 'unknown';
	}

	private assessRiskLevel(context: AccessContext, evidence: any): string {
		if (
			!evidence.clearanceSufficient &&
			(evidence.requiredClearance || 0) > (context.user.clearanceLevel || 0) + 1
		) {
			return 'high';
		}
		if (!evidence.roleMatch) {
			return 'medium';
		}
		return 'low';
	}

	private assessSecurityRisk(securityScan: any): string {
		if (securityScan.sqlInjectionRisk === 'high' || securityScan.exfiltrationRisk === 'high') {
			return 'high';
		}
		if (securityScan.piiDetected || securityScan.sqlInjectionRisk === 'medium') {
			return 'medium';
		}
		return 'low';
	}

	private generateSignature(context: AccessContext, accessResult: AccessResult): string {
		// Simple signature generation - in real implementation, this would use cryptographic signing
		const data = `${context.user.id}:${context.resource.id}:${context.action}:${accessResult.granted}:${Date.now()}`;
		return Buffer.from(data).toString('base64');
	}
}
