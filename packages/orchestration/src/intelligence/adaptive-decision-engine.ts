import {
	ExecutionFeedbackSchema,
	StrategyAdjustmentSchema,
} from '../../../libs/typescript/contracts/src/orchestration-no/intelligence-scheduler.js';

/**
 * AdaptiveDecisionEngine
 * Minimal heuristic-based strategy adapter with contract validation.
 *
 * Rules (initial):
 * - successRate < 0.5  => 'sequential-safe'
 * - 0.5 <= successRate < 0.8 => 'hybrid'
 * - successRate >= 0.8 => 'parallel-coordinated'
 */
export class AdaptiveDecisionEngine {
	adaptStrategy(feedback: unknown) {
		const fb = ExecutionFeedbackSchema.parse(feedback);

		let newStrategy: 'sequential-safe' | 'hybrid' | 'parallel-coordinated';
		if (fb.successRate < 0.5) {
			newStrategy = 'sequential-safe';
		} else if (fb.successRate < 0.8) {
			newStrategy = 'hybrid';
		} else {
			newStrategy = 'parallel-coordinated';
		}

		// Provide a concise rationale based on the chosen threshold
		let rationale: string;
		if (newStrategy === 'sequential-safe') {
			rationale = 'low successRate; tighten sequencing and safeguards';
		} else if (newStrategy === 'hybrid') {
			rationale = 'moderate successRate; blend parallelism with a safety merge';
		} else {
			rationale = 'high successRate; maximize parallel coordination';
		}

		return StrategyAdjustmentSchema.parse({ newStrategy, rationale });
	}
}

export default AdaptiveDecisionEngine;
