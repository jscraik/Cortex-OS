import { describe, expect, it } from 'vitest';

import { mergeComplianceState, summarizeCompliance } from '../../src/index.js';

describe('compliance-driven planning signals', () => {
        it('elevates risk and strategy for critical violations', () => {
                const now = new Date().toISOString();
                const events = [
                        {
                                scanId: 'scan-1',
                                violationId: 'violation-critical',
                                standard: 'nist' as const,
                                rule: 'AC-3',
                                file: 'src/auth.ts',
                                severity: 'critical' as const,
                                violatedAt: now,
                        },
                        {
                                scanId: 'scan-1',
                                violationId: 'violation-medium',
                                standard: 'owasp-top10' as const,
                                rule: 'A02',
                                file: 'src/api.ts',
                                severity: 'medium' as const,
                                violatedAt: now,
                        },
                ];

                const summary = summarizeCompliance(events, {
                        additionalNotes: ['brAInwav planner will pause execution until mitigation completes.'],
                });

                expect(summary.riskLevel).toBe('critical');
                expect(summary.recommendedStrategy).toBe('SEQUENTIAL');
                expect(summary.notes.some((note) => note.includes('brAInwav'))).toBe(true);

                const state = mergeComplianceState(summary, ['nist', 'owasp-top10']);
                expect(state.riskLevel).toBe('critical');
                expect(state.requiresHumanReview).toBe(true);
                expect(state.notes).toEqual(summary.notes);
        });
});
