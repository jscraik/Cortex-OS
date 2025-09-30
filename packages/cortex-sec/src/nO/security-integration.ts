import type { SecurityActionPlan } from '../planning/compliance-planner.js';
import {
	type CompliancePlanner,
	type CompliancePlanningResult,
	createCompliancePlanner,
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
	const severity =
		result.aggregateRisk >= 0.7 ? 'critical' : result.aggregateRisk >= 0.4 ? 'elevated' : 'nominal';
	const primaryAction = result.recommendedActions[0];
	const actionDetail = primaryAction
		? `${primaryAction.action} via ${primaryAction.recommendedTools.join(', ')}`
		: 'maintain standard compliance cadence';
	return `brAInwav security summary for task "${description}": risk ${severity} (${result.aggregateRisk.toFixed(2)}). Recommended action: ${actionDetail}.`;
}
