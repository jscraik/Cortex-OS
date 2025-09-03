/**
 * @fileoverview Judge module for SimLab - evaluates simulation results
 * @version 1.0.0
 * @author Cortex-OS Team
 */

import type { SimResult, SimScenario, SimScores, SimTurn } from "./types";

export interface JudgeConfig {
	strictMode?: boolean;
	requireEvidence?: boolean;
	weights?: {
		goal: number;
		sop: number;
		brand: number;
		factual: number;
	};
}

/**
 * Evaluates simulation conversations against scenarios and SOPs
 */
export class Judge {
	private readonly config: JudgeConfig;

	constructor(config: JudgeConfig = {}) {
		this.config = {
			strictMode: true,
			requireEvidence: true,
			weights: { goal: 0.4, sop: 0.3, brand: 0.2, factual: 0.1 },
			...config,
		};
	}

	/**
	 * Evaluate a conversation against the scenario requirements
	 */
	evaluate(
		scenario: SimScenario,
		turns: SimTurn[],
	): Promise<Omit<SimResult, "runId" | "timestamp">> {
		const scores = this.calculateScores(scenario, turns);
		const failures = this.identifyFailures(scenario, turns, scores);
		const passed = this.determineOverallPass(scores, failures);
		const judgeNotes = this.generateJudgeNotes(
			scenario,
			turns,
			scores,
			failures,
		);

		return Promise.resolve({
			scenarioId: scenario.id,
			passed,
			scores,
			judgeNotes,
			failures,
			turns,
		});
	}

	/**
	 * Calculate individual scores for each evaluation dimension
	 */
	private calculateScores(scenario: SimScenario, turns: SimTurn[]): SimScores {
		const goalScore = this.evaluateGoalAchievement(scenario, turns);
		const sopScore = this.evaluateSOPAdherence(scenario, turns);
		const brandScore = this.evaluateBrandConsistency(scenario, turns);
		const factualScore = this.evaluateFactualAccuracy(scenario, turns);

		return {
			goal: Math.max(0, Math.min(1, goalScore)),
			sop: Math.max(0, Math.min(1, sopScore)),
			brand: Math.max(0, Math.min(1, brandScore)),
			factual: Math.max(0, Math.min(1, factualScore)),
		};
	}

	/**
	 * Evaluate how well the conversation achieved the stated goal
	 */
	private evaluateGoalAchievement(
		scenario: SimScenario,
		turns: SimTurn[],
	): number {
		const agentTurns = turns.filter((turn) => turn.role === "agent");
		const successCriteria = scenario.success_criteria || [];

		if (successCriteria.length === 0) {
			return 0.5; // Default score if no criteria specified
		}

		let criteriaMetCount = 0;

		for (const criteria of successCriteria) {
			const criteriaLower = criteria.toLowerCase();
			const metInConversation = agentTurns.some((turn) =>
				turn.content.toLowerCase().includes(criteriaLower),
			);

			if (metInConversation) {
				criteriaMetCount++;
			}
		}

		return criteriaMetCount / successCriteria.length;
	}

	/**
	 * Evaluate adherence to Standard Operating Procedures
	 */
	private evaluateSOPAdherence(
		scenario: SimScenario,
		turns: SimTurn[],
	): number {
		const agentTurns = turns.filter((turn) => turn.role === "agent");
		const sopRefs = scenario.sop_refs || [];

		if (sopRefs.length === 0) {
			return 1.0; // No SOP violations if no SOPs specified
		}

		// Check for common SOP violations
		let violations = 0;
		let totalChecks = 0;

		for (const turn of agentTurns) {
			const content = turn.content.toLowerCase();

			// Check for professional tone
			totalChecks++;
			if (this.hasUnprofessionalLanguage(content)) {
				violations++;
			}

			// Check for proper information handling
			totalChecks++;
			if (this.hasImproperInformationHandling(content)) {
				violations++;
			}

			// Check for proper escalation procedures
			totalChecks++;
			if (this.missesEscalationOpportunity(content)) {
				violations++;
			}
		}

		return totalChecks > 0 ? 1 - violations / totalChecks : 1.0;
	}

	/**
	 * Evaluate brand consistency in responses
	 */
	private evaluateBrandConsistency(
		_scenario: SimScenario,
		turns: SimTurn[],
	): number {
		const agentTurns = turns.filter((turn) => turn.role === "agent");

		let brandScore = 1.0;

		for (const turn of agentTurns) {
			const content = turn.content.toLowerCase();

			// Check for helpful and supportive tone
			if (!this.hasHelpfulTone(content)) {
				brandScore -= 0.1;
			}

			// Check for clarity and conciseness
			if (!this.isClearAndConcise(content)) {
				brandScore -= 0.1;
			}

			// Check for appropriate empathy
			if (!this.showsAppropriateEmpathy(content)) {
				brandScore -= 0.05;
			}
		}

		return Math.max(0, brandScore);
	}

	/**
	 * Evaluate factual accuracy of information provided
	 */
	private evaluateFactualAccuracy(
		_scenario: SimScenario,
		turns: SimTurn[],
	): number {
		const agentTurns = turns.filter((turn) => turn.role === "agent");

		// For initial implementation, assume factual accuracy unless obvious errors
		let accuracyScore = 1.0;

		for (const turn of agentTurns) {
			const content = turn.content.toLowerCase();

			// Check for obvious factual errors or uncertainties
			if (this.containsFactualUncertainty(content)) {
				accuracyScore -= 0.1;
			}

			// Check for contradictions within the conversation
			if (this.contradictsEarlierStatements(content, agentTurns)) {
				accuracyScore -= 0.2;
			}
		}

		return Math.max(0, accuracyScore);
	}

	/**
	 * Identify specific failures in the conversation
	 */
	private identifyFailures(
		_scenario: SimScenario,
		turns: SimTurn[],
		scores: SimScores,
	): string[] {
		const failures: string[] = [];

		if (scores.goal < 0.7) {
			failures.push("goal_not_achieved");
		}

		if (scores.sop < 0.8) {
			failures.push("sop_violation");
		}

		if (scores.brand < 0.8) {
			failures.push("brand_inconsistency");
		}

		if (scores.factual < 0.9) {
			failures.push("factual_inaccuracy");
		}

		// Check for required evidence if in strict mode
		if (this.config.requireEvidence && !this.hasEvidence(turns)) {
			failures.push("missing_evidence");
		}

		return failures;
	}

	/**
	 * Determine overall pass/fail based on scores and failures
	 */
	private determineOverallPass(scores: SimScores, failures: string[]): boolean {
		// Fail if any critical failures
		const criticalFailures = ["missing_evidence", "sop_violation"];
		if (failures.some((failure) => criticalFailures.includes(failure))) {
			return false;
		}

		// Calculate weighted score
		const weights = this.config.weights ?? {
			goal: 0.4,
			sop: 0.3,
			brand: 0.2,
			factual: 0.1,
		};
		const weightedScore =
			scores.goal * weights.goal +
			scores.sop * weights.sop +
			scores.brand * weights.brand +
			scores.factual * weights.factual;

		return weightedScore >= 0.8;
	}

	/**
	 * Generate detailed judge notes
	 */
	private generateJudgeNotes(
		_scenario: SimScenario,
		turns: SimTurn[],
		scores: SimScores,
		failures: string[],
	): string {
		const notes = [
			`Goal Achievement: ${(scores.goal * 100).toFixed(1)}%`,
			`SOP Adherence: ${(scores.sop * 100).toFixed(1)}%`,
			`Brand Consistency: ${(scores.brand * 100).toFixed(1)}%`,
			`Factual Accuracy: ${(scores.factual * 100).toFixed(1)}%`,
		];

		if (failures.length > 0) {
			notes.push(`Failures: ${failures.join(", ")}`);
		}

		notes.push(`Conversation Length: ${turns.length} turns`);

		return notes.join(" | ");
	}

	// Helper methods for evaluation criteria

	private hasUnprofessionalLanguage(content: string): boolean {
		const unprofessionalTerms = ["stupid", "dumb", "whatever", "ugh"];
		return unprofessionalTerms.some((term) => content.includes(term));
	}

	private hasImproperInformationHandling(content: string): boolean {
		const improperPhrases = ["i guess", "probably", "i think maybe"];
		return improperPhrases.some((phrase) => content.includes(phrase));
	}

	private missesEscalationOpportunity(content: string): boolean {
		const lower = content.toLowerCase();
		if (
			lower.includes("can't") ||
			lower.includes("cannot") ||
			lower.includes("unable")
		) {
			return !(
				lower.includes("escalate") ||
				lower.includes("transfer") ||
				lower.includes("manager")
			);
		}
		return false;
	}

	private hasHelpfulTone(content: string): boolean {
		const helpfulIndicators = [
			"happy to help",
			"glad to assist",
			"let me help",
		];
		return helpfulIndicators.some((indicator) => content.includes(indicator));
	}

	private isClearAndConcise(content: string): boolean {
		// Basic check: not too long, has clear structure
		return content.length < 500 && content.includes(".");
	}

	private showsAppropriateEmpathy(content: string): boolean {
		const empathyIndicators = [
			"sorry",
			"understand",
			"apologize",
			"appreciate",
		];
		return empathyIndicators.some((indicator) => content.includes(indicator));
	}

	private containsFactualUncertainty(content: string): boolean {
		const uncertaintyIndicators = ["i'm not sure", "maybe", "i think"];
		return uncertaintyIndicators.some((indicator) =>
			content.includes(indicator),
		);
	}

	private contradictsEarlierStatements(
		content: string,
		agentTurns: SimTurn[],
	): boolean {
		const lower = content.toLowerCase();
		for (const turn of agentTurns) {
			const prev = turn.content.toLowerCase();
			if (prev.includes("i can") && lower.includes("i cannot")) {
				return true;
			}
			if (prev.includes("i cannot") && lower.includes("i can")) {
				return true;
			}
		}
		return false;
	}

	private hasEvidence(turns: SimTurn[]): boolean {
		const agentTurns = turns.filter((turn) => turn.role === "agent");
		return agentTurns.some(
			(turn) =>
				turn.content.toLowerCase().includes("evidence") ||
				turn.content.toLowerCase().includes("source") ||
				turn.content.toLowerCase().includes("reference"),
		);
	}
}

export default Judge;
