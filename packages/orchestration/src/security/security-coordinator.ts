import type {
        CoordinationAssignment,
        CoordinationRequest,
        CoordinationTelemetry,
} from '../coordinator/adaptive-coordinator.js';
import type { Strategy } from '../intelligence/strategy-selector.js';

export interface SecurityReviewInput {
        request: CoordinationRequest;
        strategy: Strategy;
        assignments: CoordinationAssignment[];
        confidence: number;
        timestamp: string;
}

export interface SecurityReview {
        telemetry: CoordinationTelemetry[];
        statePatch: Record<string, unknown>;
}

export class SecurityCoordinator {
        review(input: SecurityReviewInput): SecurityReview {
                const security = input.request.planningResult?.security;
                if (!security) {
                        return { telemetry: [], statePatch: {} };
                }

                const severity = this.classifyRisk(security.aggregateRisk);
                const telemetry: CoordinationTelemetry[] = [
                        {
                                branding: 'brAInwav',
                                timestamp: input.timestamp,
                                message: `Security posture ${severity} for task ${input.request.task.id}`,
                                metadata: {
                                        risk: security.aggregateRisk,
                                        summary: security.summary,
                                        standards: security.standards,
                                        firstAction: security.playbook[0]?.action,
                                        confidence: input.confidence,
                                },
                        },
                ];

                if (security.playbook.length > 0) {
                        telemetry.push({
                                branding: 'brAInwav',
                                timestamp: input.timestamp,
                                message: `Security playbook queued: ${security.playbook[0].action}`,
                                metadata: {
                                        action: security.playbook[0],
                                        totalActions: security.playbook.length,
                                },
                        });
                }

                const statePatch: Record<string, unknown> = {
                        security: {
                                risk: security.aggregateRisk,
                                summary: security.summary,
                                standards: security.standards,
                                playbook: security.playbook,
                                lastCheckedAt: security.lastCheckedAt,
                        },
                };

                return { telemetry, statePatch };
        }

        private classifyRisk(risk: number): 'critical' | 'elevated' | 'nominal' {
                if (risk >= 0.7) {
                        return 'critical';
                }
                if (risk >= 0.4) {
                        return 'elevated';
                }
                return 'nominal';
        }
}
