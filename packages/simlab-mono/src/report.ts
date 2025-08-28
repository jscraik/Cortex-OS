/**
 * @fileoverview Report generator for SimLab - creates batch results and summaries
 * @version 1.0.0
 * @author Cortex-OS Team
 */

import type { SimResult, SimBatchResult, SimReport, SimScores } from './types';

/**
 * Generates reports and summaries from simulation results
 */
export class SimReporter {
  /**
   * Create a batch result from individual simulation results
   */
  createBatchResult(batchId: string, scenarios: SimResult[]): SimBatchResult {
    const summary = this.calculateBatchSummary(scenarios);

    return {
      batchId,
      scenarios,
      summary,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a comprehensive report from multiple batch results
   */
  createReport(batchResults: SimBatchResult[]): SimReport {
    const overall = this.calculateOverallMetrics(batchResults);

    return {
      batchResults,
      overall,
      thresholds: {
        minPassRate: 0.9,
        maxP0Failures: 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate summary statistics for a batch of scenarios
   */
  private calculateBatchSummary(scenarios: SimResult[]) {
    const totalScenarios = scenarios.length;
    const passed = scenarios.filter((s) => s.passed).length;
    const failed = totalScenarios - passed;
    const passRate = totalScenarios > 0 ? passed / totalScenarios : 0;

    // Calculate average scores
    const avgScores = this.calculateAverageScores(scenarios);

    return {
      totalScenarios,
      passed,
      failed,
      passRate,
      avgScores,
    };
  }

  /**
   * Calculate average scores across all scenarios
   */
  private calculateAverageScores(scenarios: SimResult[]): SimScores {
    if (scenarios.length === 0) {
      return { goal: 0, sop: 0, brand: 0, factual: 0 };
    }

    const totals = scenarios.reduce(
      (acc, scenario) => ({
        goal: acc.goal + scenario.scores.goal,
        sop: acc.sop + scenario.scores.sop,
        brand: acc.brand + scenario.scores.brand,
        factual: acc.factual + scenario.scores.factual,
      }),
      { goal: 0, sop: 0, brand: 0, factual: 0 },
    );

    const count = scenarios.length;
    return {
      goal: totals.goal / count,
      sop: totals.sop / count,
      brand: totals.brand / count,
      factual: totals.factual / count,
    };
  }

  /**
   * Calculate overall metrics across multiple batches
   */
  private calculateOverallMetrics(batchResults: SimBatchResult[]) {
    const allScenarios = batchResults.flatMap((batch) => batch.scenarios);
    const totalScenarios = allScenarios.length;
    const passedScenarios = allScenarios.filter((s) => s.passed).length;
    const passRate = totalScenarios > 0 ? passedScenarios / totalScenarios : 0;

    // Count critical failures (P0)
    const criticalFailures = allScenarios.filter(
      (s) => s.failures.includes('missing_evidence') || s.failures.includes('sop_violation'),
    ).length;

    // Calculate trends (simplified - compare latest vs previous batch)
    const trends = this.calculateTrends(batchResults);

    return {
      passRate,
      criticalFailures,
      trends,
    };
  }

  /**
   * Calculate trend metrics comparing recent performance
   */
  private calculateTrends(batchResults: SimBatchResult[]): Record<string, number> {
    if (batchResults.length < 2) {
      return {};
    }

    const latest = batchResults[batchResults.length - 1];
    const previous = batchResults[batchResults.length - 2];

    return {
      passRateTrend: latest.summary.passRate - previous.summary.passRate,
      goalTrend: latest.summary.avgScores.goal - previous.summary.avgScores.goal,
      sopTrend: latest.summary.avgScores.sop - previous.summary.avgScores.sop,
      brandTrend: latest.summary.avgScores.brand - previous.summary.avgScores.brand,
      factualTrend: latest.summary.avgScores.factual - previous.summary.avgScores.factual,
    };
  }

  /**
   * Generate a human-readable summary of results
   */
  generateTextSummary(report: SimReport): string {
    const { overall, batchResults } = report;
    const latestBatch = batchResults[batchResults.length - 1];

    const lines = [
      '=== SimLab Report Summary ===',
      `Overall Pass Rate: ${(overall.passRate * 100).toFixed(1)}%`,
      `Critical Failures: ${overall.criticalFailures}`,
      '',
      '=== Latest Batch ===',
      `Scenarios: ${latestBatch?.summary.totalScenarios || 0}`,
      `Passed: ${latestBatch?.summary.passed || 0}`,
      `Failed: ${latestBatch?.summary.failed || 0}`,
      `Pass Rate: ${((latestBatch?.summary.passRate || 0) * 100).toFixed(1)}%`,
      '',
      '=== Average Scores ===',
      `Goal: ${((latestBatch?.summary.avgScores.goal || 0) * 100).toFixed(1)}%`,
      `SOP: ${((latestBatch?.summary.avgScores.sop || 0) * 100).toFixed(1)}%`,
      `Brand: ${((latestBatch?.summary.avgScores.brand || 0) * 100).toFixed(1)}%`,
      `Factual: ${((latestBatch?.summary.avgScores.factual || 0) * 100).toFixed(1)}%`,
    ];

    if (Object.keys(overall.trends).length > 0) {
      lines.push('', '=== Trends ===');
      Object.entries(overall.trends).forEach(([key, value]) => {
        const direction = value > 0 ? '↑' : value < 0 ? '↓' : '→';
        lines.push(`${key}: ${direction} ${(Math.abs(value) * 100).toFixed(1)}%`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Check if results meet quality gates
   */
  checkQualityGates(report: SimReport): { passed: boolean; failures: string[] } {
    const failures: string[] = [];
    const { overall, thresholds } = report;

    if (overall.passRate < thresholds.minPassRate) {
      failures.push(
        `Pass rate ${(overall.passRate * 100).toFixed(1)}% below threshold ${(thresholds.minPassRate * 100).toFixed(1)}%`,
      );
    }

    if (overall.criticalFailures > thresholds.maxP0Failures) {
      failures.push(
        `Critical failures ${overall.criticalFailures} exceed threshold ${thresholds.maxP0Failures}`,
      );
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }
}

export default SimReporter;
