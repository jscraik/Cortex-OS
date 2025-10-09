/**
 * Evidence Gate Types for brAInwav Cortex-OS
 *
 * Type definitions for evidence gate, ABAC compliance, and audit trail functionality.
 */

export interface EvidenceRecord {
	id: string;
	userId: string;
	resourceId: string;
	action: string;
	granted: boolean;
	evidence: any;
	policiesApplied: string[];
	timestamp: string;
	signature: string;
	brainwavGenerated: boolean;
}

export interface PolicyViolation {
	id: string;
	userId: string;
	resourceId: string;
	violationType: string;
	details: string;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	requiresEscalation: boolean;
	timestamp: string;
	brainwavLogged: boolean;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings?: string[];
	metadata?: Record<string, any>;
}
