/**
 * @file nodes/evaluation-refactored.ts
 * @description Refactored Evaluation Phase Node - TDD validation, Code review, Quality gates
 * @author Cortex-OS Team
 * @version 2.0.0
 */

import type { Evidence, PRPState } from '../state.js';
import { validateTDDCycle } from './evaluation/tdd-validator.js';
import { validateCodeReview } from './evaluation/code-review-validator.js';
import { validateQualityBudgets } from './evaluation/quality-budget-validator.js';

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

    // Gate 1: TDD validation (Red → Green cycle)
    const tddValidation = await validateTDDCycle(state);
    if (!tddValidation.passed) {
      blockers.push('TDD cycle not completed - missing tests or failing tests');
    }

    evidence.push({
      id: `eval-tdd-${Date.now()}`,
      type: 'test',
      source: 'tdd_validator',
      content: JSON.stringify(tddValidation),
      timestamp: new Date().toISOString(),
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
      id: `eval-review-${Date.now()}`,
      type: 'analysis',
      source: 'code_reviewer',
      content: JSON.stringify(reviewValidation),
      timestamp: new Date().toISOString(),
      phase: 'evaluation',
    });

    // Gate 3: Quality budget validation
    const qualityValidation = await validateQualityBudgets(state);
    if (!qualityValidation.overall) {
      const failedBudgets = [
        !qualityValidation.accessibility.passed && 'Accessibility',
        !qualityValidation.performance.passed && 'Performance',
        !qualityValidation.security.passed && 'Security',
      ].filter(Boolean);

      majors.push(`Quality budgets failed: ${failedBudgets.join(', ')}`);
    }

    evidence.push({
      id: `eval-quality-${Date.now()}`,
      type: 'quality',
      source: 'quality_validator',
      content: JSON.stringify(qualityValidation),
      timestamp: new Date().toISOString(),
      phase: 'evaluation',
    });

    // Gate 4: Cerebrum consensus evaluation
    const consensus = await evaluateCerebrumConsensus(state, {
      tdd: tddValidation,
      review: reviewValidation,
      quality: qualityValidation,
    });

    evidence.push({
      id: `eval-consensus-${Date.now()}`,
      type: 'decision',
      source: 'cerebrum',
      content: JSON.stringify(consensus),
      timestamp: new Date().toISOString(),
      phase: 'evaluation',
    });

    // Determine final decision
    const shouldShip = blockers.length === 0 && consensus.recommendation === 'ship';
    const decision = shouldShip ? 'ship' : 'recycle';

    return {
      ...state,
      evidence: [...state.evidence, ...evidence],
      status: decision === 'ship' ? 'completed' : 'needs_revision',
      metadata: {
        ...state.metadata,
        evaluation: {
          decision,
          blockers: blockers.length,
          majors: majors.length,
          tddPassed: tddValidation.passed,
          reviewPassed: reviewValidation.blockers === 0 && reviewValidation.majors <= 3,
          qualityPassed: qualityValidation.overall,
          consensus: consensus.recommendation,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
}

/**
 * Evaluates cerebrum consensus for shipping decision
 */
const evaluateCerebrumConsensus = async (
  state: PRPState,
  validationResults: {
    tdd: any;
    review: any;
    quality: any;
  }
) => {
  const { tdd, review, quality } = validationResults;

  // Calculate confidence score
  const tddScore = tdd.passed ? 30 : 0;
  const reviewScore = review.blockers === 0 ? (review.majors <= 3 ? 30 : 15) : 0;
  const qualityScore = quality.overall ? 40 : (getPartialQualityScore(quality));

  const totalScore = tddScore + reviewScore + qualityScore;
  const confidence = Math.min(100, totalScore);

  // Determine recommendation
  let recommendation: 'ship' | 'recycle';
  let reasoning: string[];

  if (confidence >= 80 && tdd.passed && review.blockers === 0) {
    recommendation = 'ship';
    reasoning = [
      'All critical gates passed',
      `High confidence score: ${confidence}%`,
      'Ready for production deployment',
    ];
  } else {
    recommendation = 'recycle';
    reasoning = [
      confidence < 80 && `Low confidence score: ${confidence}%`,
      !tdd.passed && 'TDD cycle incomplete',
      review.blockers > 0 && 'Blocking issues found in review',
      !quality.overall && 'Quality budgets not met',
    ].filter(Boolean) as string[];
  }

  return {
    recommendation,
    confidence,
    reasoning,
    metrics: {
      tddScore,
      reviewScore,
      qualityScore,
      totalScore,
    },
  };
};

/**
 * Calculates partial quality score when not all budgets pass
 */
const getPartialQualityScore = (quality: any): number => {
  let score = 0;
  if (quality.accessibility.passed) score += 15;
  if (quality.performance.passed) score += 15;
  if (quality.security.passed) score += 10;
  return score;
};
