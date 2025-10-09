import type { Evidence, PRPState } from '../state.js';

import { generateId } from '../utils/id.js';
import { currentTimestamp } from '../utils/time.js';

/**
 * Evaluation Phase Gates:
 * - ✅ All neurons pass TDD (Red → Green)
 * - ✅ Reviewer neuron issues ≤ 0 blockers, ≤ 3 majors
 * - ✅ A11y, perf, sec budgets all ≥ thresholds
 * - ✅ Cerebrum consensus: ship or recycle
 */
export class EvaluationNode {
	async execute(state: PRPState): Promise<PRPState> {
		const evaluationResult = await this.runEvaluationValidations(state);
		return this.createEvaluationState(state, evaluationResult);
	}

	/**
	 * Run all evaluation validations
	 */
	private async runEvaluationValidations(state: PRPState): Promise<EvaluationValidationResult> {
		const evidence: Evidence[] = [];
		const blockers: string[] = [];
		const majors: string[] = [];

		// Execute all evaluation gates
		await this.validateTDDGate(state, evidence, blockers);
		await this.validateCodeReviewGate(state, evidence, blockers, majors);
		await this.validateQualityBudgetsGate(state, evidence, blockers, majors);
		await this.validatePreCerebrumGate(state, evidence, blockers);

		return { evidence, blockers, majors };
	}

	/**
	 * Validate TDD cycle
	 */
	private async validateTDDGate(
		state: PRPState,
		evidence: Evidence[],
		blockers: string[],
	): Promise<void> {
		const tddValidation = await this.validateTDDCycle(state);
		if (!tddValidation.passed) {
			blockers.push('TDD cycle not completed - missing tests or failing tests');
		}

		evidence.push({
			id: generateId('eval-tdd', state.metadata.deterministic),
			type: 'test',
			source: 'tdd_validator',
			content: JSON.stringify(tddValidation),
			timestamp: currentTimestamp(state.metadata.deterministic ?? false, 7),
			phase: 'evaluation',
		});
	}

	/**
	 * Validate code review
	 */
	private async validateCodeReviewGate(
		state: PRPState,
		evidence: Evidence[],
		blockers: string[],
		majors: string[],
	): Promise<void> {
		const reviewValidation = await this.validateCodeReview(state);
		if (reviewValidation.blockers > 0) {
			blockers.push(`Code review found ${reviewValidation.blockers} blocking issues`);
		}
		if (reviewValidation.majors > 3) {
			majors.push(`Code review found ${reviewValidation.majors} major issues (limit: 3)`);
		}

		evidence.push({
			id: generateId('eval-review', state.metadata.deterministic),
			type: 'analysis',
			source: 'code_reviewer',
			content: JSON.stringify(reviewValidation),
			timestamp: currentTimestamp(state.metadata.deterministic ?? false, 8),
			phase: 'evaluation',
		});
	}

	/**
	 * Validate quality budgets
	 */
	private async validateQualityBudgetsGate(
		state: PRPState,
		evidence: Evidence[],
		blockers: string[],
		majors: string[],
	): Promise<void> {
		const budgetValidation = await this.validateQualityBudgets(state);
		if (!budgetValidation.accessibility.passed) {
			majors.push(`Accessibility score ${budgetValidation.accessibility.score} below threshold`);
		}
		if (!budgetValidation.performance.passed) {
			majors.push(`Performance score ${budgetValidation.performance.score} below threshold`);
		}
		if (!budgetValidation.security.passed) {
			blockers.push(`Security score ${budgetValidation.security.score} below threshold`);
		}

		evidence.push({
			id: generateId('eval-budgets', state.metadata.deterministic),
			type: 'validation',
			source: 'quality_budgets',
			content: JSON.stringify(budgetValidation),
			timestamp: currentTimestamp(state.metadata.deterministic ?? false, 9),
			phase: 'evaluation',
		});
	}

	/**
	 * Validate pre-Cerebrum readiness
	 */
	private async validatePreCerebrumGate(
		state: PRPState,
		_evidence: Evidence[],
		blockers: string[],
	): Promise<void> {
		const preCerebrumCheck = await this.preCerebrumValidation(state);
		if (!preCerebrumCheck.readyForCerebrum) {
			blockers.push('System not ready for Cerebrum decision');
		}
	}

	/**
	 * Create updated evaluation state
	 */
	private createEvaluationState(state: PRPState, result: EvaluationValidationResult): PRPState {
		return {
			...state,
			evidence: [...state.evidence, ...result.evidence],
			gates: {
				...state.gates,
				G5: {
					id: 'G5',
					name: 'TDD Validation Gate',
					status: result.blockers.length === 0 ? 'passed' : 'failed',
					requiresHumanApproval: false,
					automatedChecks: [
						{
							name: 'TDD Cycle Check',
							status: result.blockers.length === 0 ? 'pass' : 'fail',
							output: `Found ${result.blockers.length} blockers, ${result.majors.length} majors`,
						},
					],
					artifacts: [],
					evidence: result.evidence.map((e) => e.id),
					timestamp: currentTimestamp(state.metadata.deterministic ?? false, 10),
				},
			},
		};
	}

	private async validateTDDCycle(state: PRPState): Promise<ValidationResult<TDDDetails>> {
		// Validate that proper TDD cycle was followed
		const tddEvidence = state.evidence.filter((e) => e.type === 'test' && e.phase === 'build');

		const hasTests = tddEvidence.length > 0;
		const hasCoverage = Boolean(
			state.exports?.testCoverage || state.evidence.some((e) => e.content.includes('coverage')),
		);

		return {
			passed: hasTests && hasCoverage,
			details: {
				testCount: tddEvidence.length,
				coverage: hasCoverage ? 85 : 0, // Mock coverage
				redGreenCycle: hasTests,
				refactoring: true, // Assume refactoring happened
			},
		};
	}

	// Mock implementation - will use state parameter in real implementation

	private async validateCodeReview(state: PRPState): Promise<ReviewResult<ReviewDetails>> {
		// Simulated code review - in real implementation would integrate with actual review tools
		// Using state for context
		const contextualIssues = state.evidence.length > 10 ? 1 : 0;
		const codeQualityIssues = [
			{
				severity: 'major',
				type: 'code-complexity',
				message: 'Function complexity exceeds threshold in module X',
				file: 'src/complex-module.ts',
			},
			{
				severity: 'minor',
				type: 'naming-convention',
				message: 'Variable names not following camelCase convention',
				file: 'src/utils.ts',
			},
		];

		const blockers =
			codeQualityIssues.filter((issue) => issue.severity === 'blocker').length + contextualIssues;
		const majors = codeQualityIssues.filter((issue) => issue.severity === 'major').length;

		return {
			blockers,
			majors,
			details: {
				totalIssues: codeQualityIssues.length,
				issues: codeQualityIssues,
				codeQualityScore: 82, // Mock score
				maintainabilityIndex: 78,
			},
		};
	}

	// Mock implementation - will use state parameter in real implementation
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private async validateQualityBudgets(_state: PRPState): Promise<{
		accessibility: { passed: boolean; score: number };
		performance: { passed: boolean; score: number };
		security: { passed: boolean; score: number };
	}> {
		// Extract scores from build phase validation
		// Mock quality scores - in real implementation would extract from actual tools
		const accessibilityScore = 95; // From Axe results
		const performanceScore = 94; // From Lighthouse results
		const securityScore = 88; // From security scan results

		return {
			accessibility: {
				passed: accessibilityScore >= 95,
				score: accessibilityScore,
			},
			performance: {
				passed: performanceScore >= 90,
				score: performanceScore,
			},
			security: {
				passed: securityScore >= 85,
				score: securityScore,
			},
		};
	}

	checkPreCerebrumConditions(state: PRPState): boolean {
		// Defensive check for null/undefined state
		if (!state) {
			return false;
		}

		// Check gates if available, otherwise fall back to validationResults
		if (state.gates && Object.keys(state.gates).length > 0) {
			return Object.values(state.gates).every((gate) => gate.status === 'passed');
		}

		// Legacy support for validationResults
		if (state.validationResults) {
			return Object.values(state.validationResults).every((result) => result.passed);
		}

		// If neither is present, assume not ready
		return false;
	}

	private async preCerebrumValidation(
		state: PRPState,
	): Promise<ReadinessResult<PreCerebrumDetails>> {
		// Final validation before Cerebrum decision - use gates instead of validationResults
		const hasAllPhases = state.gates && !!(state.gates.G0 && state.gates.G2 && state.gates.G5);

		const allPhasesPassedOrAcceptable =
			state.gates &&
			Object.values(state.gates).every(
				(gate) => gate.status === 'passed' || gate.status === 'skipped',
			);

		return {
			readyForCerebrum: hasAllPhases && allPhasesPassedOrAcceptable,
			details: {
				phasesComplete: hasAllPhases,
				phasesAcceptable: allPhasesPassedOrAcceptable,
				evidenceCount: state.evidence.length,
				evidenceThreshold: 10, // Minimum evidence required
			},
		};
	}
}

interface EvaluationValidationResult {
	evidence: Evidence[];
	blockers: string[];
	majors: string[];
}

// Type definitions for validation methods

interface ValidationResult<T> {
	passed: boolean;
	details: T;
}

interface TDDDetails {
	testCount: number;
	coverage: number;
	redGreenCycle: boolean;
	refactoring: boolean;
}

interface ReviewResult<T> {
	blockers: number;
	majors: number;
	details: T;
}

interface ReviewDetails {
	totalIssues: number;
	issues: { severity: string; type: string; message: string; file: string }[];
	codeQualityScore: number;
	maintainabilityIndex: number;
}

interface ReadinessResult<T> {
	readyForCerebrum: boolean;
	details: T;
}

interface PreCerebrumDetails {
	phasesComplete: boolean;
	phasesAcceptable: boolean;
	evidenceCount: number;
	evidenceThreshold: number;
}
