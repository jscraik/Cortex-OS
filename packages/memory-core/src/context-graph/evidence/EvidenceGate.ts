import { randomUUID } from 'node:crypto';
import { AuditLogger } from '../audit/AuditLogger.js';
import { ABACEngine } from '../security/ABACEngine.js';
import type {
        AccessAttemptLogPayload,
        AccessContext,
        AccessDecisionResult,
        AuditLogEntry,
        ComplianceValidationResult,
        EvidenceGenerationPayload,
        EvidenceRecord,
        PolicyName,
        RiskLevel,
        SecurityScanInput,
        SecurityScanResult,
} from './types.js';

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

export class EvidenceGate {
        private readonly abacEngine: ABACEngine;
        private readonly auditLogger: AuditLogger;
        private readonly evidenceRecords = new Map<string, EvidenceRecord>();
        private readonly auditEntries = new Map<string, AuditLogEntry>();

        constructor(dependencies: EvidenceGateDependencies = {}) {
                this.abacEngine = dependencies.abacEngine ?? new ABACEngine();
                this.auditLogger = dependencies.auditLogger ?? new AuditLogger();
        }

        async validateAccess(context: AccessContext): Promise<AccessValidationResult> {
                const decision = await this.abacEngine.checkAccess(context);
                const baseMetadata = decision.metadata ?? {
                        evaluationTimestamp: context.timestamp ?? new Date().toISOString(),
                };
                const metadata = {
                        ...baseMetadata,
                        brainwavValidated: true,
                };

                await this.logAccessAttempt(context, decision);

                if (!decision.allowed && decision.violation) {
                        await this.logPolicyViolation(context, decision);
                }

                return {
                        granted: decision.allowed,
                        policiesApplied: decision.policiesApplied ?? [],
                        evidence: decision.evidence,
                        reason: decision.reason,
                        violationType: decision.violation?.type,
                        riskLevel: decision.riskLevel ?? (decision.allowed ? 'low' : 'medium'),
                        requiresEscalation: decision.requiresEscalation ?? false,
                        metadata,
                };
        }

        async generateEvidence(
                context: AccessContext,
                accessResult: AccessValidationResult,
        ): Promise<GeneratedEvidence> {
                const decisionTime = new Date();
                const id = `evidence-${randomUUID()}`;
                const signature = this.createEvidenceSignature(context, accessResult, decisionTime);
                const violationType = accessResult.violationType ?? this.deriveViolationType(accessResult);
                const violationDetails = this.describeViolation(accessResult);
                const riskLevel = accessResult.riskLevel ?? (accessResult.granted ? 'low' : 'medium');
                const requiresEscalation =
                        accessResult.requiresEscalation || violationType === 'clearance-level';
                const evidence = accessResult.evidence ?? {};
                const policiesApplied = accessResult.policiesApplied ?? [];

                const record: EvidenceRecord = {
                        id,
                        userId: context.user.id,
                        resourceId: context.resource.id,
                        action: context.action,
                        granted: accessResult.granted,
                        evidence,
                        policiesApplied,
                        timestamp: decisionTime.toISOString(),
                        signature,
                        brainwavGenerated: true,
                        violationType,
                        violationDetails,
                        riskLevel,
                        requiresEscalation,
                };

                this.evidenceRecords.set(id, record);

                const auditPayload: EvidenceGenerationPayload = {
                        evidenceId: id,
                        userId: context.user.id,
                        resourceId: context.resource.id,
                        action: context.action,
                        granted: accessResult.granted,
                        policiesApplied,
                        signature,
                        timestamp: record.timestamp,
                        metadata: {
                                violationType,
                                violationDetails,
                        },
                };

                const entry = await this.auditLogger.logEvidenceGeneration(auditPayload);
                this.persistAuditEntry(entry);

                return {
                        id,
                        userId: context.user.id,
                        resourceId: context.resource.id,
                        action: context.action,
                        granted: accessResult.granted,
                        policiesEvaluated: policiesApplied,
                        decisionTime,
                        brainwavGenerated: true,
                        signature,
                        violationType,
                        violationDetails,
                        riskLevel,
                        requiresEscalation,
                };
        }

        async createAuditEntry(accessLog: AccessAttemptLogPayload): Promise<AuditLogEntry | undefined> {
                const entry = await this.auditLogger.logAccessAttempt(accessLog);
                this.persistAuditEntry(entry);
                return entry;
        }

        async verifyEvidenceChain(chain: EvidenceChainLink[]): Promise<{
                valid: boolean;
                chainIntact: boolean;
                signaturesValid: boolean;
                noTampering: boolean;
                brainwavVerified: boolean;
        }> {
                const chainIntact = this.isChronological(chain);
                const signaturesValid = chain.every((link) => this.signatureMatches(link));
                const noTampering = signaturesValid && chain.every((link) => this.isImmutable(link.id));
                const brainwavVerified = chain.every((link) => this.isBrainwavGenerated(link.id));

                return {
                        valid: chainIntact && signaturesValid && noTampering,
                        chainIntact,
                        signaturesValid,
                        noTampering,
                        brainwavVerified,
                };
        }

        async validateCompliance(
                context: AccessContext,
                complianceResult: Record<string, { compliant: boolean; riskLevel: RiskLevel; mitigations: string[] }>,
        ): Promise<ComplianceValidationResult> {
                return this.abacEngine.validateCompliance(context, complianceResult);
        }

        async performSecurityCheck(
                context: AccessContext,
                securityScan: SecurityScanInput,
        ): Promise<SecurityScanResult> {
                const result = this.abacEngine.performSecurityScan(context, securityScan);

                if (result.blocked) {
                        const entry = await this.auditLogger.logPolicyViolation({
                                userId: context.user.id,
                                resourceId: context.resource.id,
                                violation: 'security-violation',
                                details: result.summary,
                                riskLevel: result.riskLevel,
                                requiresEscalation: result.requiresHumanReview,
                                requestId: context.requestId,
                        });
                        this.persistAuditEntry(entry);
                }

                return result;
        }

        private async logAccessAttempt(context: AccessContext, decision: AccessDecisionResult): Promise<void> {
                const payload: AccessAttemptLogPayload = {
                        userId: context.user.id,
                        resourceId: context.resource.id,
                        action: context.action,
                        granted: decision.allowed,
                        policiesApplied: decision.policiesApplied ?? [],
                        requestId: context.requestId,
                        timestamp: context.timestamp,
                };
                const entry = await this.auditLogger.logAccessAttempt(payload);
                this.persistAuditEntry(entry);
        }

        private async logPolicyViolation(context: AccessContext, decision: AccessDecisionResult): Promise<void> {
                if (!decision.violation) {
                        return;
                }

                const details = this.describeViolationFromDecision(decision);
                const entry = await this.auditLogger.logPolicyViolation({
                        userId: context.user.id,
                        resourceId: context.resource.id,
                        violation: decision.violation.type,
                        details,
                        riskLevel: decision.violation.riskLevel ?? 'medium',
                        requiresEscalation: decision.violation.requiresEscalation,
                        requestId: context.requestId,
                        timestamp: context.timestamp,
                });
                this.persistAuditEntry(entry);
        }

        private persistAuditEntry(entry?: AuditLogEntry): void {
                if (!entry) {
                        return;
                }
                this.auditEntries.set(entry.id, entry);
        }

        private signatureMatches(link: EvidenceChainLink): boolean {
                const record = this.evidenceRecords.get(link.id);
                const auditEntry = this.auditEntries.get(link.id);
                if (record && link.signature) {
                        return record.signature === link.signature;
                }
                if (auditEntry && link.signature) {
                        return auditEntry.signature === link.signature;
                }
                return Boolean(link.signature);
        }

        private isChronological(chain: EvidenceChainLink[]): boolean {
                if (chain.length === 0) {
                        return false;
                }
                for (let index = 1; index < chain.length; index += 1) {
                        const previous = chain[index - 1]?.timestamp;
                        const current = chain[index]?.timestamp;
                        if (previous && current && new Date(previous) > new Date(current)) {
                                return false;
                        }
                }
                return true;
        }

        private isImmutable(id: string): boolean {
                const entry = this.auditEntries.get(id);
                if (entry) {
                        return entry.immutable;
                }
                const record = this.evidenceRecords.get(id);
                if (record) {
                        return true;
                }
                return true;
        }

        private isBrainwavGenerated(id: string): boolean {
                const record = this.evidenceRecords.get(id);
                if (record) {
                        return record.brainwavGenerated === true;
                }
                const entry = this.auditEntries.get(id);
                if (entry) {
                        return entry.brainwavAudited === true;
                }
                return true;
        }

        private createEvidenceSignature(
                context: AccessContext,
                accessResult: AccessValidationResult,
                decisionTime: Date,
        ): string {
                const payload = [
                        context.user.id,
                        context.resource.id,
                        context.action,
                        String(accessResult.granted),
                        decisionTime.toISOString(),
                ].join(':');
                return Buffer.from(payload).toString('base64');
        }

        private describeViolation(accessResult: AccessValidationResult): string | undefined {
                if (accessResult.granted) {
                        return undefined;
                }
                if (accessResult.violationType === 'clearance-level') {
                        const required = accessResult.evidence?.requiredClearance;
                        const user = accessResult.evidence?.userClearance;
                        if (typeof required === 'number' && typeof user === 'number') {
                                const baseline = `User clearance ${user} < required clearance ${required}`;
                                return accessResult.reason
                                        ? `${accessResult.reason}; ${baseline}`
                                        : baseline;
                        }
                }
                return accessResult.reason;
        }

        private describeViolationFromDecision(decision: AccessDecisionResult): string {
                if (decision.violation?.type === 'clearance-level') {
                        const required = decision.evidence?.requiredClearance;
                        const user = decision.evidence?.userClearance;
                        if (typeof required === 'number' && typeof user === 'number') {
                                return `User clearance ${user} < required clearance ${required}`;
                        }
                }
                return decision.violation?.details ?? decision.reason ?? 'Policy violation detected';
        }

        private deriveViolationType(accessResult: AccessValidationResult): string | undefined {
                if (accessResult.granted) {
                        return undefined;
                }
                return accessResult.violationType ?? 'policy-violation';
        }
}
