/**
 * @file nodes/evaluation.ts
 * @description Evaluation Phase Node - TDD validation, Code review, Final quality gates
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { PRPState, Evidence } from '../state.js';
import { generateId } from '../utils/id.js';
import { fixedTimestamp } from '../lib/determinism.js';
import {
  validateTDDCycle,
  validateCodeReview,
  validateQualityBudgets,
  preCerebrumValidation,
} from '../lib/gates/evaluation.js';

/**
 * Evaluation Phase Gates:
 * - ✅ All neurons pass TDD (Red → Green)
 * - ✅ Reviewer neuron issues ≤ 0 blockers, ≤ 3 majors
 * - ✅ A11y, perf, sec budgets all ≥ thresholds
 * - ✅ Cerebrum consensus: ship or recycle
 */
export class EvaluationNode {
  async execute(state: PRPState): Promise<PRPState> {
    const evidence: Evidence[] = [];
    const blockers: string[] = [];
    const majors: string[] = [];

    const deterministic = !!state.metadata.deterministic;

    // Gate 1: TDD validation (Red → Green cycle)
    const tddValidation = await validateTDDCycle(state);
    if (!tddValidation.passed) {
      blockers.push('TDD cycle not completed - missing tests or failing tests');
    }
    evidence.push({
      id: generateId('eval-tdd', deterministic),
      type: 'test',
      source: 'tdd_validator',
      content: JSON.stringify(tddValidation),
      timestamp: deterministic ? fixedTimestamp('evaluation-tdd') : new Date().toISOString(),
      phase: 'evaluation',
    });

    // Gate 2: Code review validation
    const reviewValidation = await validateCodeReview(state);
    if (reviewValidation.blockers > 0) {
      blockers.push(`Code review found ${reviewValidation.blockers} blocking issues`);
    }
    if (reviewValidation.majors > 3) {
      majors.push(`Code review found ${reviewValidation.majors} major issues (limit: 3)`);
    }
    evidence.push({
      id: generateId('eval-review', deterministic),
      type: 'analysis',
      source: 'code_reviewer',
      content: JSON.stringify(reviewValidation),
      timestamp: deterministic ? fixedTimestamp('evaluation-review') : new Date().toISOString(),
      phase: 'evaluation',
    });

    // Gate 3: Quality budget validation (A11y, Performance, Security)
    const budgetValidation = await validateQualityBudgets(state);
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
      id: generateId('eval-budgets', deterministic),
      type: 'validation',
      source: 'quality_budgets',
      content: JSON.stringify(budgetValidation),
      timestamp: deterministic ? fixedTimestamp('evaluation-budgets') : new Date().toISOString(),
      phase: 'evaluation',
    });

    // Gate 4: Pre-Cerebrum validation
    const preCerebrumCheck = await preCerebrumValidation(state);
    if (!preCerebrumCheck.readyForCerebrum) {
      blockers.push('System not ready for Cerebrum decision');
    }

    return {
      ...state,
      evidence: [...state.evidence, ...evidence],
      validationResults: {
        ...state.validationResults,
        evaluation: {
          passed: blockers.length === 0 && majors.length <= 3,
          blockers,
          majors,
          evidence: evidence.map((e) => e.id),
          timestamp: deterministic
            ? fixedTimestamp('evaluation-validation')
            : new Date().toISOString(),
        },
      },
    };
  }
}
