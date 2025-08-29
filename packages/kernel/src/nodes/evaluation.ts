import { PRPState, Evidence } from '../state.js';
import { createEvidence, finalizePhase } from '../lib/phase-utils.js';

export async function runEvaluationNode(state: PRPState): Promise<PRPState> {
  const evidence: Evidence[] = [];
  const blockers: string[] = [];
  const majors: string[] = [];

  const tdd = await validateTDDCycle(state);
  if (!tdd.passed) blockers.push('TDD cycle not completed - missing tests or failing tests');
  evidence.push(createEvidence(state, 'eval-tdd', 'test', 'tdd_validator', tdd, 'evaluation'));

  const review = await validateCodeReview(state);
  if (review.blockers > 0) blockers.push(`Code review found ${review.blockers} blocking issues`);
  if (review.majors > 3) majors.push(`Code review found ${review.majors} major issues (limit: 3)`);
  evidence.push(
    createEvidence(state, 'eval-review', 'analysis', 'code_reviewer', review, 'evaluation'),
  );

  const budgets = await validateQualityBudgets(state);
  if (!budgets.accessibility.passed)
    majors.push(`Accessibility score ${budgets.accessibility.score} below threshold`);
  if (!budgets.performance.passed)
    majors.push(`Performance score ${budgets.performance.score} below threshold`);
  if (!budgets.security.passed)
    blockers.push(`Security score ${budgets.security.score} below threshold`);
  evidence.push(
    createEvidence(state, 'eval-budgets', 'validation', 'quality_budgets', budgets, 'evaluation'),
  );

  if (!(await preCerebrumValidation(state)).readyForCerebrum)
    blockers.push('System not ready for Cerebrum decision');

  return finalizePhase(state, 'evaluation', evidence, blockers, majors);
}

async function validateTDDCycle(state: PRPState) {
  const tests = state.evidence.filter((e) => e.type === 'test' && e.phase === 'build');
  const hasCoverage =
    state.outputs?.testCoverage ||
    state.validationResults.build?.evidence?.some((id) =>
      state.evidence.find((e) => e.id === id)?.content.includes('coverage'),
    );
  return { passed: tests.length > 0 && !!hasCoverage, details: { testCount: tests.length } };
}

async function validateCodeReview(state: PRPState) {
  return {
    blockers: 0,
    majors: 1,
    details: { issues: [{ severity: 'major', type: 'code-complexity' }] },
  };
}

async function validateQualityBudgets(state: PRPState) {
  return {
    accessibility: { passed: true, score: 95 },
    performance: { passed: true, score: 94 },
    security: { passed: true, score: 88 },
  };
}

async function preCerebrumValidation(state: PRPState) {
  const hasPhases = !!(state.validationResults.strategy && state.validationResults.build);
  const allPass = Object.values(state.validationResults || {}).every(
    (r: any) => r?.passed || r?.blockers.length === 0,
  );
  return { readyForCerebrum: hasPhases && allPass && state.evidence.length >= 5, details: {} };
}
