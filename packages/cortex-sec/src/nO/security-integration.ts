import {
	type CompliancePlanner,
	type CompliancePlanningResult,
	createCompliancePlanner,
	type SecurityActionPlan,
} from '../planning/compliance-planner.js';

export interface SecurityIntegrationInput {
	taskId: string;
	description: string;
	complianceContext?: Parameters<CompliancePlanner['evaluate']>[0]['existingContext'];
	preferredStandards?: Parameters<CompliancePlanner['evaluate']>[0]['standards'];
}

export interface SecurityIntegrationResult extends CompliancePlanningResult {
	playbook: SecurityActionPlan[];
	summary: string;
}

export interface SecurityIntegrationService {
	evaluate(input: SecurityIntegrationInput): SecurityIntegrationResult;
}

export function createSecurityIntegrationService(
	planner: CompliancePlanner = createCompliancePlanner(),
): SecurityIntegrationService {
	return {
		evaluate(input: SecurityIntegrationInput): SecurityIntegrationResult {
			const complianceResult = planner.evaluate({
				taskId: input.taskId,
				standards: input.preferredStandards,
				existingContext: input.complianceContext,
			});

			return {
				...complianceResult,
				playbook: complianceResult.recommendedActions,
				summary: buildSummary(input.description, complianceResult),
			};
		},
	};
}

function buildSummary(description: string, result: CompliancePlanningResult): string {
	const severity = determineSeverity(result.aggregateRisk);
	const primaryAction = result.recommendedActions[0];
	const actionDetail = primaryAction
		? `${primaryAction.action} via ${primaryAction.recommendedTools.join(', ')}`
		: 'maintain standard compliance cadence';
	return `brAInwav security summary for task "${description}": risk ${severity} (${result.aggregateRisk.toFixed(2)}). Recommended action: ${actionDetail}.`;
}

function determineSeverity(score: number): 'critical' | 'elevated' | 'nominal' {
	if (score >= 0.7) {
		return 'critical';
	}
	if (score >= 0.4) {
		return 'elevated';
	}
	return 'nominal';
}
