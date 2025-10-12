/**
 * Evidence Gate Types for brAInwav Cortex-OS
 *
 * Type definitions for evidence gate, ABAC compliance, and audit trail functionality.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AccessSubject {
        id: string;
        role: string;
        permissions?: string[];
        department?: string;
        clearanceLevel?: number;
        [key: string]: unknown;
}

export interface AccessResource {
        id: string;
        type: string;
        sensitivity?: string;
        classification?: string;
        owner?: string;
        requiredClearance?: number;
        requiredRoles?: string[];
        [key: string]: unknown;
}

export interface AccessContext {
        user: AccessSubject;
        resource: AccessResource;
        action: string;
        requestId?: string;
        timestamp?: string;
        complianceChecks?: string[];
        [key: string]: unknown;
}

export type PolicyName =
        | 'role-based'
        | 'clearance-level'
        | 'department-access'
        | 'ownership'
        | 'classification';

export interface PolicyEvaluationResult {
        policy: PolicyName;
        passed: boolean;
        reason?: string;
        evidence: Record<string, unknown>;
}

export interface AccessDecisionMetadata {
        brainwavValidated: boolean;
        evaluationTimestamp: string;
        conflictResolution?: 'deny-by-default' | 'allow';
        additionalNotes?: string;
}

export interface PolicyViolationDetail {
        type: PolicyName | 'security-violation';
        details: string;
        riskLevel: RiskLevel;
        requiresEscalation: boolean;
}

export interface AccessDecisionResult {
        allowed: boolean;
        policiesApplied: PolicyName[];
        reason?: string;
        evidence: Record<string, unknown>;
        metadata: AccessDecisionMetadata;
        violation?: PolicyViolationDetail;
        riskLevel: RiskLevel;
        requiresEscalation: boolean;
}

export interface ComplianceCheckDetail {
        compliant: boolean;
        riskLevel: RiskLevel;
        mitigations: string[];
        summary?: string;
}

export interface ComplianceValidationResult {
        compliant: boolean;
        owaspLLMTop10: Record<string, ComplianceCheckDetail>;
        brainwavComplianceValidated: boolean;
        metadata?: Record<string, unknown>;
}

export interface SecurityScanInput {
        sqlInjectionRisk?: 'low' | 'medium' | 'high';
        piiDetected?: boolean;
        exfiltrationRisk?: 'low' | 'medium' | 'high';
        brainwavSecurityFlags?: string[];
        [key: string]: unknown;
}

export interface SecurityScanResult {
        blocked: boolean;
        securityFlags: string[];
        riskLevel: 'low' | 'medium' | 'high';
        requiresHumanReview: boolean;
        brainwavSecurityBlocked: boolean;
        summary: string;
}

export interface EvidenceRecord {
        id: string;
        userId: string;
        resourceId: string;
        action: string;
        granted: boolean;
        evidence: Record<string, unknown>;
        policiesApplied: string[];
        timestamp: string;
        signature: string;
        brainwavGenerated: boolean;
        violationType?: string;
        violationDetails?: string;
        riskLevel?: RiskLevel;
        requiresEscalation?: boolean;
}

export interface PolicyViolation {
        id: string;
        userId: string;
        resourceId: string;
        violationType: string;
        details: string;
        riskLevel: RiskLevel;
        requiresEscalation: boolean;
        timestamp: string;
        brainwavLogged: boolean;
}

export interface ValidationResult {
        valid: boolean;
        errors: string[];
        warnings?: string[];
        metadata?: Record<string, unknown>;
}

export interface AccessAttemptLogPayload {
        userId: string;
        resourceId: string;
        action: string;
        granted: boolean;
        policiesApplied: string[];
        requestId?: string;
        timestamp?: string;
}

export interface PolicyViolationLogPayload {
        userId: string;
        resourceId: string;
        violation: string;
        details: string;
        riskLevel?: RiskLevel;
        requiresEscalation?: boolean;
        requestId?: string;
        timestamp?: string;
}

export interface EvidenceGenerationPayload {
        evidenceId: string;
        userId: string;
        resourceId: string;
        action: string;
        granted: boolean;
        policiesApplied: string[];
        signature: string;
        timestamp: string;
        metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
        id: string;
        type: 'access' | 'violation' | 'evidence';
        userId: string;
        resourceId: string;
        action?: string;
        granted?: boolean;
        policiesApplied?: string[];
        violation?: string;
        details?: string;
        timestamp: string;
        signature: string;
        immutable: boolean;
        brainwavAudited: boolean;
        metadata?: Record<string, unknown>;
}
