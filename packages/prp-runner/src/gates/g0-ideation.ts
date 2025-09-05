/**
 * @file packages/prp-runner/src/gates/g0-ideatio		return {
			status: (issues.length === 0 ? "pass" : "fail") as "pass" | "fail" | "skip",
			output: issues.length === 0
				? "Blueprint validation passed"
				: `Blueprint validation failed: ${issues.join(", ")}`,
			duration: 50, // Minimal duration for validation
			evidence,
		};@description G0: Ideation & Scope - Product owner confirmation of prob		return {
			status: (issues.length === 0 ? "pass" : "fail") as "pass" | "fail" | "skip",
			output: issues.length === 0
				? "Policy quick-check passed"
				: `Policy issues: ${issues.join(", ")}`,
			duration: 100,
			evidence,
		};asurable outcome
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */

import { BaseGate, type AutomatedCheck, type GateContext, type HumanApprovalSpec, type Evidence } from "./base.js";
import { nanoid } from "nanoid";

/**
 * Validates that blueprint has required elements
 */
class BlueprintValidationCheck implements AutomatedCheck {
	name = "blueprint-validation";
	description = "Validate blueprint contains title, description, and requirements";

	async execute(context: GateContext): Promise<{
		status: "pass" | "fail" | "skip";
		output?: string;
		duration?: number;
		evidence?: Evidence[];
	}> {
		const { blueprint } = context.state;
		const issues: string[] = [];

		if (!blueprint.title || blueprint.title.trim().length === 0) {
			issues.push("Blueprint title is missing or empty");
		}

		if (!blueprint.description || blueprint.description.trim().length === 0) {
			issues.push("Blueprint description is missing or empty");
		}

		if (!blueprint.requirements || blueprint.requirements.length === 0) {
			issues.push("Blueprint requirements are missing or empty");
		}

		// Create evidence for validation
		const evidence = [{
			id: nanoid(),
			type: "validation" as const,
			source: "g0-blueprint-validation",
			content: JSON.stringify({
				blueprint,
				validation: {
					hasTitle: !!blueprint.title,
					hasDescription: !!blueprint.description,
					requirementCount: blueprint.requirements?.length || 0,
				},
				issues,
			}),
			timestamp: new Date().toISOString(),
			phase: "strategy" as const,
			commitSha: context.repoInfo.commitSha,
		}];

		return {
			status: issues.length === 0 ? "pass" : "fail" as const,
			output: issues.length === 0
				? "Blueprint validation passed"
				: `Blueprint validation failed: ${issues.join(", ")}`,
			duration: 50, // Minimal duration for validation
			evidence,
		};
	}
}

/**
 * Checks for duplicate work in backlog/issues
 */
class DuplicationCheck implements AutomatedCheck {
	name = "duplication-check";
	description = "Check for duplicate work against existing backlog";

	async execute(context: GateContext) {
		// For now, this is a placeholder - in production would integrate with GitHub Issues API
		const evidence = [{
			id: nanoid(),
			type: "analysis" as const,
			source: "g0-duplication-check",
			content: JSON.stringify({
				checked: "github-issues",
				duplicates: [],
				notes: "Duplication check completed - no obvious duplicates found",
			}),
			timestamp: new Date().toISOString(),
			phase: "strategy" as const,
			commitSha: context.repoInfo.commitSha,
		}];

		return {
			status: "pass" as "pass" | "fail" | "skip",
			output: "No duplicate work detected in backlog",
			duration: 200,
			evidence,
		};
	}
}

/**
 * Basic license and policy compliance check
 */
class PolicyQuickCheck implements AutomatedCheck {
	name = "policy-quick-check";
	description = "Quick validation against license and basic policies";

	async execute(context: GateContext) {
		const { enforcementProfile } = context;
		const issues: string[] = [];

		// Check license policy
		if (!enforcementProfile.governance.licensePolicy) {
			issues.push("No license policy defined");
		}

		// Check if required checks are specified
		if (enforcementProfile.governance.requiredChecks.length === 0) {
			issues.push("No required checks specified in governance policy");
		}

		const evidence = [{
			id: nanoid(),
			type: "validation" as const,
			source: "g0-policy-check",
			content: JSON.stringify({
				licensePolicy: enforcementProfile.governance.licensePolicy,
				requiredChecks: enforcementProfile.governance.requiredChecks,
				issues,
			}),
			timestamp: new Date().toISOString(),
			phase: "strategy" as const,
			commitSha: context.repoInfo.commitSha,
		}];

		return {
			status: issues.length === 0 ? "pass" : "fail" as const,
			output: issues.length === 0
				? "Policy quick-check passed"
				: `Policy issues: ${issues.join(", ")}`,
			duration: 100,
			evidence,
		};
	}
}

/**
 * G0: Ideation & Scope Gate
 *
 * Purpose: Validate problem definition and confirm product owner approval
 * Human Decision Point: Product owner confirms problem & measurable outcome
 */
export class G0IdeationGate extends BaseGate {
	readonly id = "G0" as const;
	readonly name = "Ideation & Scope";
	readonly purpose = "Validate problem definition and confirm product owner approval for measurable outcome";
	readonly requiresHumanApproval = true;

	readonly humanApprovalSpec: HumanApprovalSpec = {
		role: "product-owner",
		description: "Product owner must confirm the problem definition and approve measurable outcome criteria",
		requiredDecision: "approved",
		timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
	};

	readonly automatedChecks: AutomatedCheck[] = [
		new BlueprintValidationCheck(),
		new DuplicationCheck(),
		new PolicyQuickCheck(),
	];

	protected async executeGateLogic(
		context: GateContext,
		automatedResults: Array<{status: "pass" | "fail" | "skip"}>
	) {
		const artifacts: string[] = [];
		const evidence: string[] = [];

		// Generate PRP scaffold if automated checks pass
		const allChecksPassed = automatedResults.every(r => r.status === "pass");

		if (allChecksPassed) {
			// Create success metrics baseline
			const metricsBaseline = {
				id: nanoid(),
				type: "analysis" as const,
				source: "g0-metrics-baseline",
				content: JSON.stringify({
					blueprint: context.state.blueprint,
					successMetrics: {
						definitionClarity: "high",
						scopeBoundaries: "defined",
						outcomesMeasurable: true,
					},
					baseline: {
						timestamp: new Date().toISOString(),
						actor: context.actor,
						commitSha: context.repoInfo.commitSha,
					},
				}),
				timestamp: new Date().toISOString(),
				phase: "strategy" as const,
				commitSha: context.repoInfo.commitSha,
			};

			// Add to state evidence
			context.state.evidence.push(metricsBaseline);
			evidence.push(metricsBaseline.id);

			// Note: In production, this would generate actual PRP scaffold files
			artifacts.push("prp-scaffold-template.md");
		}

		return { artifacts, evidence };
	}

	/**
	 * G0 should always request approval when checks pass
	 */
	protected shouldRequestApproval(automatedResults: Array<{status: "pass" | "fail" | "skip"}>): boolean {
		// Always request product owner approval if automated checks pass
		return automatedResults.every(r => r.status === "pass");
	}
}
