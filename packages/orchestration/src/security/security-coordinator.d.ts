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
export type ComplianceEvaluationResult = SecurityReview;
export interface SecurityReview {
	telemetry: CoordinationTelemetry[];
	statePatch: Record<string, unknown>;
}
export declare class SecurityCoordinator {
	review(input: SecurityReviewInput): SecurityReview;
	private classifyRisk;
}
//# sourceMappingURL=security-coordinator.d.ts.map
