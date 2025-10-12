import { createHash, randomUUID } from 'node:crypto';
import {
        type AccessAttemptLogPayload,
        type AuditLogEntry,
        type EvidenceGenerationPayload,
        type PolicyViolationLogPayload,
        type RiskLevel,
} from '../evidence/types.js';

export class AuditLogger {
        private readonly accessEntries = new Map<string, AuditLogEntry>();
        private readonly violationEntries = new Map<string, AuditLogEntry>();
        private readonly evidenceEntries = new Map<string, AuditLogEntry>();

        async logAccessAttempt(payload: AccessAttemptLogPayload): Promise<AuditLogEntry> {
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

        async logPolicyViolation(payload: PolicyViolationLogPayload): Promise<AuditLogEntry> {
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
                                riskLevel: (payload.riskLevel ?? 'medium') as RiskLevel,
                                requiresEscalation: payload.requiresEscalation ?? false,
                        },
                });

                this.violationEntries.set(entry.id, entry);
                return entry;
        }

        async logEvidenceGeneration(payload: EvidenceGenerationPayload): Promise<AuditLogEntry> {
                const entry = this.createEntry(
                        'evidence',
                        {
                                userId: payload.userId,
                                resourceId: payload.resourceId,
                                action: payload.action,
                                granted: payload.granted,
                                policiesApplied: payload.policiesApplied,
                                timestamp: payload.timestamp,
                                signature: payload.signature,
                                metadata: payload.metadata,
                        },
                        payload.evidenceId,
                );

                this.evidenceEntries.set(entry.id, entry);
                return entry;
        }

        getEntry(id: string): AuditLogEntry | undefined {
                return (
                        this.accessEntries.get(id) ??
                        this.violationEntries.get(id) ??
                        this.evidenceEntries.get(id)
                );
        }

        getEvidenceEntry(id: string): AuditLogEntry | undefined {
                return this.evidenceEntries.get(id);
        }

        private createEntry(
                type: AuditLogEntry['type'],
                payload: Omit<AuditLogEntry, 'id' | 'type' | 'signature' | 'immutable' | 'brainwavAudited'> & {
                        metadata?: Record<string, unknown>;
                        signature?: string;
                },
                entryId?: string,
        ): AuditLogEntry {
                const timestamp = payload.timestamp ?? new Date().toISOString();
                const signature =
                        payload.signature ??
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

        private createSignature(components: string[]): string {
                const hash = createHash('sha256');
                for (const component of components) {
                        hash.update(component);
                        hash.update('|');
                }
                return hash.digest('base64');
        }
}
