import { AuditLogger } from '../audit/AuditLogger.js';
import { ABACEngine } from '../security/ABACEngine.js';
import type { AccessAttemptLogPayload, AccessContext, AuditLogEntry, ComplianceValidationResult, PolicyName, RiskLevel, SecurityScanInput, SecurityScanResult } from './types.js';
export interface EvidenceGateDependencies {
    abacEngine?: ABACEngine;
    auditLogger?: AuditLogger;
}
export interface AccessValidationResult {
    granted: boolean;
    policiesApplied: PolicyName[];
    evidence: Record<string, unknown>;
    reason?: string;
    violationType?: string;
    riskLevel: RiskLevel;
    requiresEscalation: boolean;
    metadata: {
        brainwavValidated: boolean;
        evaluationTimestamp: string;
        conflictResolution?: 'deny-by-default' | 'allow';
        additionalNotes?: string;
    };
}
export interface GeneratedEvidence {
    id: string;
    userId: string;
    resourceId: string;
    action: string;
    granted: boolean;
    policiesEvaluated: string[];
    decisionTime: Date;
    brainwavGenerated: boolean;
    signature: string;
    violationType?: string;
    violationDetails?: string;
    riskLevel?: RiskLevel;
    requiresEscalation?: boolean;
}
interface EvidenceChainLink {
    id: string;
    signature?: string;
    timestamp?: string;
}
export declare class EvidenceGate {
    private readonly abacEngine;
    private readonly auditLogger;
    private readonly evidenceRecords;
    private readonly auditEntries;
    constructor(dependencies?: EvidenceGateDependencies);
    validateAccess(context: AccessContext): Promise<AccessValidationResult>;
    generateEvidence(context: AccessContext, accessResult: AccessValidationResult): Promise<GeneratedEvidence>;
    createAuditEntry(accessLog: AccessAttemptLogPayload): Promise<AuditLogEntry | undefined>;
    verifyEvidenceChain(chain: EvidenceChainLink[]): Promise<{
        valid: boolean;
        chainIntact: boolean;
        signaturesValid: boolean;
        noTampering: boolean;
        brainwavVerified: boolean;
    }>;
    validateCompliance(context: AccessContext, complianceResult: Record<string, {
        compliant: boolean;
        riskLevel: RiskLevel;
        mitigations: string[];
    }>): Promise<ComplianceValidationResult>;
    performSecurityCheck(context: AccessContext, securityScan: SecurityScanInput): Promise<SecurityScanResult>;
    private logAccessAttempt;
    private logPolicyViolation;
    private persistAuditEntry;
    private signatureMatches;
    private isChronological;
    private isImmutable;
    private isBrainwavGenerated;
    private createEvidenceSignature;
    private describeViolation;
    private describeViolationFromDecision;
    private deriveViolationType;
}
export {};
