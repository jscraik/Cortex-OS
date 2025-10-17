import type { AccessAttemptLogPayload, AuditLogEntry, EvidenceGenerationPayload, PolicyViolationLogPayload } from '../evidence/types.js';
export declare class AuditLogger {
    private readonly accessEntries;
    private readonly violationEntries;
    private readonly evidenceEntries;
    logAccessAttempt(payload: AccessAttemptLogPayload): Promise<AuditLogEntry>;
    logPolicyViolation(payload: PolicyViolationLogPayload): Promise<AuditLogEntry>;
    logEvidenceGeneration(payload: EvidenceGenerationPayload): Promise<AuditLogEntry>;
    getEntry(id: string): AuditLogEntry | undefined;
    getEvidenceEntry(id: string): AuditLogEntry | undefined;
    private createEntry;
    private createSignature;
}
