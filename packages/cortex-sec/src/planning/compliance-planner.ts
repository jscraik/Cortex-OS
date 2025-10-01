import {
	type ComplianceSignal,
	computeAggregateRisk,
	type RiskComputationResult,
	type SecurityPolicy,
	type SecurityStandard,
	SecurityStandardSchema,
} from '../policies/security-policies.ts';

export interface ComplianceSnapshot {
	standards: string[];
	lastCheckedAt: Date | string | null;
	riskScore: number;
	outstandingViolations: Array<{ id: string; severity: string }>;
}

export interface CompliancePlanningInput {
	taskId: string;
	standards?: SecurityStandard[];
	existingContext?: { compliance?: ComplianceSnapshot };
	lastSecurityActions?: Array<{ action: string; completedAt: Date }>;
}

export interface SecurityActionPlan {
	action: string;
	description: string;
	recommendedTools: string[];
	priority: 'immediate' | 'high' | 'routine';
}

export interface CompliancePlanningResult {
	taskId: string;
	aggregateRisk: number;
	signals: RiskComputationResult['signals'];
	recommendedActions: SecurityActionPlan[];
	standards: SecurityStandard[];
	lastCheckedAt: Date | null;
}

export interface CompliancePlanner {
	evaluate(input: CompliancePlanningInput): CompliancePlanningResult;
}

export function createCompliancePlanner(): CompliancePlanner {
	return {
		evaluate(input: CompliancePlanningInput): CompliancePlanningResult {
			const standards = normalizeStandards(input.standards);
			const compliance = input.existingContext?.compliance;
			const lastCheckedAt = normalizeTimestamp(compliance?.lastCheckedAt);
			const riskScore = clampRisk(compliance?.riskScore ?? 0);
			const violationCount = compliance?.outstandingViolations?.length ?? 0;

			const signals: ComplianceSignal[] = standards.map((standard) => ({
				standard,
				lastScanAt: lastCheckedAt,
				outstandingViolations: violationCount,
				riskScore,
			}));

			const riskResult = computeAggregateRisk({ signals });
			const recommendedActions = deriveActions(riskResult.aggregateRisk, riskResult.signals);

			return {
				taskId: input.taskId,
				aggregateRisk: riskResult.aggregateRisk,
				signals: riskResult.signals,
				recommendedActions,
				standards,
				lastCheckedAt,
			};
		},
	};
}

function normalizeStandards(candidate?: SecurityStandard[]): SecurityStandard[] {
	if (!candidate || candidate.length === 0) {
		return [...SecurityStandardSchema.options];
	}
	const unique = new Set(candidate);
	return Array.from(unique);
}

function normalizeTimestamp(timestamp: Date | string | null | undefined): Date | null {
	if (!timestamp) {
		return null;
	}
	if (timestamp instanceof Date) {
		return timestamp;
	}
	const parsed = new Date(timestamp);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function clampRisk(risk: number): number {
	if (Number.isNaN(risk)) {
		return 0;
	}
	return Math.min(Math.max(risk, 0), 1);
}

function deriveActions(
	riskScore: number,
	signals: Array<ComplianceSignal & { policy: SecurityPolicy }>,
): SecurityActionPlan[] {
	const actions: SecurityActionPlan[] = [];
	const [primary] = signals;

	if (riskScore >= 0.7) {
		actions.push({
			action: 'execute-critical-security-scan',
			description:
				'Run immediate Semgrep and compliance validation scans using cortex-sec MCP tools.',
			recommendedTools: ['security.run_semgrep_scan', 'security.validate_compliance'],
			priority: 'immediate',
		});
	} else if (riskScore >= 0.4) {
		actions.push({
			action: 'schedule-remediation-review',
			description: 'Queue vulnerability analysis and dependency checks to reduce elevated risk.',
			recommendedTools: ['security.analyze_vulnerabilities', 'security.check_dependencies'],
			priority: 'high',
		});
	} else {
		actions.push({
			action: 'maintain-compliance-cadence',
			description: 'Maintain routine dependency and policy checks to preserve audit readiness.',
			recommendedTools: ['security.check_dependencies', 'security.get_security_policy'],
			priority: 'routine',
		});
	}

	if (primary && primary.policy.thresholds.maxOutstandingViolations === 0 && riskScore >= 0.4) {
		actions.unshift({
			action: `review-${primary.standard}-violations`,
			description: `Review outstanding findings for ${primary.standard} and document remediation owners.`,
			recommendedTools: primary.policy.defaultTools,
			priority: 'immediate',
		});
	}

	return actions;
}
