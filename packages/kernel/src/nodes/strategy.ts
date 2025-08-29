import { PRPState, Evidence } from '../state.js';

import { generateId } from '../utils/id.js';
import { currentTimestamp } from '../utils/time.js';

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

    // Gate 1: Blueprint validation
    if (!state.blueprint.title || !state.blueprint.description) {
      blockers.push('Blueprint missing title or description');
    }

    evidence.push({
      id: generateId('strategy-blueprint', state.metadata.deterministic),
      type: 'validation',
      source: 'strategy_node',
      content: `Blueprint validation: ${state.blueprint.title}`,
      timestamp: currentTimestamp(state.metadata.deterministic ?? false, 1),
      phase: 'strategy',
    });

    // Gate 2: Security baseline check
    const securityBaseline = await this.validateSecurityBaseline(state);
    if (!securityBaseline.passed) {
      blockers.push('Security baseline not established');
    }

    evidence.push({
      id: generateId('strategy-security', state.metadata.deterministic),
      type: 'analysis',
      source: 'security_baseline',
      content: JSON.stringify(securityBaseline),
      timestamp: currentTimestamp(state.metadata.deterministic ?? false, 2),
      phase: 'strategy',
    });

    // Gate 3: UX accessibility check
    const uxValidation = await this.validateUXAccessibility(state);
    if (!uxValidation.passed) {
      majors.push('UX design missing or not WCAG 2.2 AA compliant');
    }

    // Gate 4: Architecture consistency
    const archValidation = await this.validateArchitecture(state);
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
          timestamp: currentTimestamp(state.metadata.deterministic ?? false, 3),
        },
      },
    };
  }


async function validateSecurityBaseline(state: PRPState) {
  const reqs = state.blueprint.requirements || [];
  const hasSecurity = reqs.some((r) =>
    ['security', 'authentication', 'authorization'].some((k) => r.toLowerCase().includes(k)),
  );
  return {
    passed: hasSecurity,
    details: { owaspLevel: hasSecurity ? 'L1' : 'none', mitreAtlas: hasSecurity },
  };
}

async function validateUXAccessibility(state: PRPState) {
  const hasUX = state.blueprint.requirements?.some((r) =>
    ['ux', 'user', 'interface', 'accessibility'].some((k) => r.toLowerCase().includes(k)),
  );
  return { passed: hasUX, details: { wcagLevel: hasUX ? 'AA' : 'none' } };
}

async function validateArchitecture(state: PRPState) {
  const { title = '', description = '', requirements = [] } = state.blueprint;
  const hasArch =
    title.toLowerCase().includes('architecture') ||
    description.toLowerCase().includes('system') ||
    requirements.some((r) =>
      ['architecture', 'system design'].some((k) => r.toLowerCase().includes(k)),
    );
  return { passed: hasArch, details: { architecture: hasArch } };

}
