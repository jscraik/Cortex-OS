/**
 * @file nodes/strategy.ts
 * @description Strategy Phase Node - Security baseline, UX sketches, Architecture
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { PRPState, Evidence } from '../state.js';
import { generateId } from '../utils/id.js';
import { fixedTimestamp } from '../lib/determinism.js';
import {
  validateBlueprint,
  validateSecurityBaseline,
  validateUXAccessibility,
  validateArchitecture,
} from '../lib/gates/strategy.js';

/**
 * Strategy Phase Gates:
 * - ✅ Blueprint linked in PRP doc
 * - ✅ Security baseline (OWASP ASVS L1 + MITRE ATLAS)
 * - ✅ UX sketches accessible (WCAG 2.2 AA)
 * - ✅ Architecture diagram consistent with repo structure
 */
export class StrategyNode {
  async execute(state: PRPState): Promise<PRPState> {
    const evidence: Evidence[] = [];
    const blockers: string[] = [];
    const majors: string[] = [];

    const deterministic = !!state.metadata.deterministic;

    // Gate 1: Blueprint validation
    const blueprint = validateBlueprint(state);
    if (!blueprint.passed) {
      blockers.push('Blueprint missing title or description');
    }
    evidence.push({
      id: generateId('strategy-blueprint', deterministic),
      type: 'validation',
      source: 'strategy_node',
      content: `Blueprint validation: ${state.blueprint.title}`,
      timestamp: deterministic ? fixedTimestamp('strategy-blueprint') : new Date().toISOString(),
      phase: 'strategy',
    });

    // Gate 2: Security baseline check
    const securityBaseline = await validateSecurityBaseline(state);
    if (!securityBaseline.passed) {
      blockers.push('Security baseline not established');
    }
    evidence.push({
      id: generateId('strategy-security', deterministic),
      type: 'analysis',
      source: 'security_baseline',
      content: JSON.stringify(securityBaseline),
      timestamp: deterministic ? fixedTimestamp('strategy-security') : new Date().toISOString(),
      phase: 'strategy',
    });

    // Gate 3: UX accessibility check
    const uxValidation = await validateUXAccessibility(state);
    if (!uxValidation.passed) {
      majors.push('UX design missing or not WCAG 2.2 AA compliant');
    }

    // Gate 4: Architecture consistency
    const archValidation = await validateArchitecture(state);
    if (!archValidation.passed) {
      majors.push('Architecture diagram missing or inconsistent');
    }

    return {
      ...state,
      evidence: [...state.evidence, ...evidence],
      validationResults: {
        ...state.validationResults,
        strategy: {
          passed: blockers.length === 0 && majors.length <= 3,
          blockers,
          majors,
          evidence: evidence.map((e) => e.id),
          timestamp: deterministic
            ? fixedTimestamp('strategy-validation')
            : new Date().toISOString(),
        },
      },
    };
  }
}
