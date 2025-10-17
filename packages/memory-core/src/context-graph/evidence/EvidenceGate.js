import { randomUUID } from 'node:crypto';
import { AuditLogger } from '../audit/AuditLogger.js';
import { ABACEngine } from '../security/ABACEngine.js';
export class EvidenceGate {
    abacEngine;
    auditLogger;
    evidenceRecords = new Map();
    auditEntries = new Map();
    constructor(dependencies = {}) {
        this.abacEngine = dependencies.abacEngine ?? new ABACEngine();
        this.auditLogger = dependencies.auditLogger ?? new AuditLogger();
    }
    async validateAccess(context) {
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
    async generateEvidence(context, accessResult) {
        const decisionTime = new Date();
        const id = `evidence-${randomUUID()}`;
        const signature = this.createEvidenceSignature(context, accessResult, decisionTime);
        const violationType = accessResult.violationType ?? this.deriveViolationType(accessResult);
        const violationDetails = this.describeViolation(accessResult);
        const riskLevel = accessResult.riskLevel ?? (accessResult.granted ? 'low' : 'medium');
        const requiresEscalation = accessResult.requiresEscalation || violationType === 'clearance-level';
        const evidence = accessResult.evidence ?? {};
        const policiesApplied = accessResult.policiesApplied ?? [];
        const record = {
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
        const auditPayload = {
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
    async createAuditEntry(accessLog) {
        const entry = await this.auditLogger.logAccessAttempt(accessLog);
        this.persistAuditEntry(entry);
        return entry;
    }
    async verifyEvidenceChain(chain) {
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
    async validateCompliance(context, complianceResult) {
        return this.abacEngine.validateCompliance(context, complianceResult);
    }
    async performSecurityCheck(context, securityScan) {
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
    async logAccessAttempt(context, decision) {
        const payload = {
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
    async logPolicyViolation(context, decision) {
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
    persistAuditEntry(entry) {
        if (!entry) {
            return;
        }
        this.auditEntries.set(entry.id, entry);
    }
    signatureMatches(link) {
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
    isChronological(chain) {
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
    isImmutable(id) {
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
    isBrainwavGenerated(id) {
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
    createEvidenceSignature(context, accessResult, decisionTime) {
        const payload = [
            context.user.id,
            context.resource.id,
            context.action,
            String(accessResult.granted),
            decisionTime.toISOString(),
        ].join(':');
        return Buffer.from(payload).toString('base64');
    }
    describeViolation(accessResult) {
        if (accessResult.granted) {
            return undefined;
        }
        if (accessResult.violationType === 'clearance-level') {
            const required = accessResult.evidence?.requiredClearance;
            const user = accessResult.evidence?.userClearance;
            if (typeof required === 'number' && typeof user === 'number') {
                const baseline = `User clearance ${user} < required clearance ${required}`;
                return accessResult.reason ? `${accessResult.reason}; ${baseline}` : baseline;
            }
        }
        return accessResult.reason;
    }
    describeViolationFromDecision(decision) {
        if (decision.violation?.type === 'clearance-level') {
            const required = decision.evidence?.requiredClearance;
            const user = decision.evidence?.userClearance;
            if (typeof required === 'number' && typeof user === 'number') {
                return `User clearance ${user} < required clearance ${required}`;
            }
        }
        return decision.violation?.details ?? decision.reason ?? 'Policy violation detected';
    }
    deriveViolationType(accessResult) {
        if (accessResult.granted) {
            return undefined;
        }
        return accessResult.violationType ?? 'policy-violation';
    }
}
