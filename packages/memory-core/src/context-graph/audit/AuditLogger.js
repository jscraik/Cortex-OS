import { createHash, randomUUID } from 'node:crypto';
export class AuditLogger {
    accessEntries = new Map();
    violationEntries = new Map();
    evidenceEntries = new Map();
    async logAccessAttempt(payload) {
        const timestamp = payload.timestamp ?? new Date().toISOString();
        const entry = this.createEntry('access', {
            userId: payload.userId,
            resourceId: payload.resourceId,
            action: payload.action,
            granted: payload.granted,
            policiesApplied: payload.policiesApplied,
            timestamp,
            metadata: {
                requestId: payload.requestId,
            },
        });
        this.accessEntries.set(entry.id, entry);
        return entry;
    }
    async logPolicyViolation(payload) {
        const timestamp = payload.timestamp ?? new Date().toISOString();
        const entry = this.createEntry('violation', {
            userId: payload.userId,
            resourceId: payload.resourceId,
            details: payload.details,
            violation: payload.violation,
            granted: false,
            timestamp,
            metadata: {
                requestId: payload.requestId,
                riskLevel: (payload.riskLevel ?? 'medium'),
                requiresEscalation: payload.requiresEscalation ?? false,
            },
        });
        this.violationEntries.set(entry.id, entry);
        return entry;
    }
    async logEvidenceGeneration(payload) {
        const entry = this.createEntry('evidence', {
            userId: payload.userId,
            resourceId: payload.resourceId,
            action: payload.action,
            granted: payload.granted,
            policiesApplied: payload.policiesApplied,
            timestamp: payload.timestamp,
            signature: payload.signature,
            metadata: payload.metadata,
        }, payload.evidenceId);
        this.evidenceEntries.set(entry.id, entry);
        return entry;
    }
    getEntry(id) {
        return (this.accessEntries.get(id) ?? this.violationEntries.get(id) ?? this.evidenceEntries.get(id));
    }
    getEvidenceEntry(id) {
        return this.evidenceEntries.get(id);
    }
    createEntry(type, payload, entryId) {
        const timestamp = payload.timestamp ?? new Date().toISOString();
        const signature = payload.signature ??
            this.createSignature([
                type,
                payload.userId,
                payload.resourceId,
                payload.action ?? '',
                String(payload.granted ?? ''),
                timestamp,
            ]);
        const id = entryId ?? `${type === 'evidence' ? 'evidence' : 'audit'}-${randomUUID()}`;
        return {
            id,
            type,
            userId: payload.userId,
            resourceId: payload.resourceId,
            action: payload.action,
            granted: payload.granted,
            policiesApplied: payload.policiesApplied,
            violation: payload.violation,
            details: payload.details,
            timestamp,
            signature,
            immutable: true,
            brainwavAudited: true,
            metadata: payload.metadata,
        };
    }
    createSignature(components) {
        const hash = createHash('sha256');
        for (const component of components) {
            hash.update(component);
            hash.update('|');
        }
        return hash.digest('base64');
    }
}
