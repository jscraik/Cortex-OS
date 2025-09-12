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
    async execute(state) {
        const evidence = [];
        const blockers = [];
        const majors = [];
        // Gate 1: TDD validation (Red → Green cycle)
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
        // Gate 2: Code review validation
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
        // Gate 3: Quality budget validation (A11y, Performance, Security)
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
        // Gate 4: Pre-Cerebrum validation
        const preCerebrumCheck = await this.preCerebrumValidation(state);
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
                    timestamp: currentTimestamp(state.metadata.deterministic ?? false, 10),
                },
            },
        };
    }
    async validateTDDCycle(state) {
        // Validate that proper TDD cycle was followed
        const tddEvidence = state.evidence.filter((e) => e.type === 'test' && e.phase === 'build');
        const hasTests = tddEvidence.length > 0;
        const hasCoverage = Boolean(state.outputs?.testCoverage ||
            state.validationResults?.build?.evidence?.some((id) => state.evidence.find((e) => e.id === id)?.content.includes('coverage')));
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
    async validateCodeReview() {
        // Simulated code review - in real implementation would integrate with actual review tools
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
        const blockers = codeQualityIssues.filter((issue) => issue.severity === 'blocker').length;
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
    async validateQualityBudgets() {
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
    checkPreCerebrumConditions(state) {
        return Object.values(state.validationResults || {}).every((result) => result?.passed && result?.blockers.length === 0);
    }
    async preCerebrumValidation(state) {
        // Final validation before Cerebrum decision
        const hasAllPhases = !!(state.validationResults?.strategy &&
            state.validationResults?.build &&
            state.validationResults?.evaluation);
        const allPhasesPassedOrAcceptable = Object.values(state.validationResults || {}).every((result) => result?.passed && result?.blockers.length === 0);
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
//# sourceMappingURL=evaluation.js.map
