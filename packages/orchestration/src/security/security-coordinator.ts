import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import {
	CORTEX_SEC_TOOL_ALLOWLIST,
	type ComplianceSummary,
	type ComplianceViolationEvent,
	createSecurityEventPublisher,
	summarizeCompliance,
} from '@cortex-os/cortex-sec';

import {
	OrchestrationStrategy,
	type PlanningComplianceState,
	type PlanningComplianceViolation,
	type PlanningContext,
} from '../types.js';

export interface SecurityCoordinatorOptions {
	publish: (envelope: Envelope) => Promise<void>;
	policies?: string[];
}

export interface ComplianceEvaluationResult {
	context: PlanningContext;
	strategy: OrchestrationStrategy;
	summary: ComplianceSummary;
}

export class SecurityCoordinator {
	private readonly publisher = createSecurityEventPublisher(this.options.publish);
	private readonly policies: string[];

	constructor(private readonly options: SecurityCoordinatorOptions) {
		this.policies = options.policies ?? ['owasp-top10', 'cwe-25', 'nist', 'iso27001'];
	}

	get toolAllowList(): readonly string[] {
		return CORTEX_SEC_TOOL_ALLOWLIST;
	}

	async evaluate(
		context: PlanningContext,
		violations: ComplianceViolationEvent[],
	): Promise<ComplianceEvaluationResult> {
		const additionalNotes = [`Previous strategy: ${context.preferences.strategy}`];
		const summary = summarizeCompliance(violations, { additionalNotes });

		await Promise.all(
			violations.map((violation) =>
				this.publisher.publishComplianceViolation({
					...violation,
					advisory:
						violation.advisory ?? 'brAInwav compliance coordinator dispatched mitigation guidance.',
				}),
			),
		);

		const complianceState: PlanningComplianceState = {
			policies: this.policies,
			riskLevel: summary.riskLevel,
			lastUpdated: new Date(),
			requiresHumanReview: summary.requiresHumanReview,
			activeViolations: summary.violations.map(mapToPlanningViolation),
			notes: summary.notes,
		};

		const strategy = this.deriveStrategy(summary, context.preferences.strategy);

		const updatedContext: PlanningContext = {
			...context,
			preferences: {
				...context.preferences,
				strategy,
				failureHandling: summary.requiresHumanReview
					? 'strict'
					: context.preferences.failureHandling,
			},
			compliance: complianceState,
		};

		return { context: updatedContext, strategy, summary };
	}

	private deriveStrategy(
		summary: ComplianceSummary,
		current: OrchestrationStrategy,
	): OrchestrationStrategy {
		switch (summary.recommendedStrategy) {
			case 'SEQUENTIAL':
				return OrchestrationStrategy.SEQUENTIAL;
			case 'ADAPTIVE':
				return current === OrchestrationStrategy.SEQUENTIAL
					? OrchestrationStrategy.SEQUENTIAL
					: OrchestrationStrategy.ADAPTIVE;
			case 'PARALLEL':
				return current === OrchestrationStrategy.SEQUENTIAL
					? OrchestrationStrategy.SEQUENTIAL
					: OrchestrationStrategy.PARALLEL;
			default:
				return current;
		}
	}
}

function mapToPlanningViolation(event: {
	violationId: string;
	standard: 'owasp-top10' | 'cwe-25' | 'nist' | 'iso27001';
	rule: string;
	file: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	detectedAt: string;
	advisory?: string;
}): PlanningComplianceViolation {
	return {
		id: event.violationId,
		standard: event.standard,
		rule: event.rule,
		severity: event.severity,
		file: event.file,
		detectedAt: new Date(event.detectedAt),
		advisory: event.advisory,
	};
}
