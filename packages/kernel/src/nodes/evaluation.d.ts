import type { PRPState } from '../state.js';
/**
 * Evaluation Phase Gates:
 * - ✅ All neurons pass TDD (Red → Green)
 * - ✅ Reviewer neuron issues ≤ 0 blockers, ≤ 3 majors
 * - ✅ A11y, perf, sec budgets all ≥ thresholds
 * - ✅ Cerebrum consensus: ship or recycle
 */
export declare class EvaluationNode {
    execute(state: PRPState): Promise<PRPState>;
    private validateTDDCycle;
    private validateCodeReview;
    private validateQualityBudgets;
    checkPreCerebrumConditions(state: PRPState): boolean;
    private preCerebrumValidation;
}
//# sourceMappingURL=evaluation.d.ts.map