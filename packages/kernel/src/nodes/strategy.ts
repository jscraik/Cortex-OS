import { PRPState, Evidence } from '../state.js';

import { createEvidence, finalizePhase } from '../lib/phase-utils.js';

export async function runStrategyNode(state: PRPState): Promise<PRPState> {
  const evidence: Evidence[] = [];
  const blockers: string[] = [];
  const majors: string[] = [];

  if (!state.blueprint.title || !state.blueprint.description)
    blockers.push('Blueprint missing title or description');

  evidence.push(
    createEvidence(
      state,
      'strategy-blueprint',
      'validation',
      'strategy_node',
      { title: state.blueprint.title },
      'strategy',
    ),
  );

  const security = await validateSecurityBaseline(state);
  if (!security.passed) blockers.push('Security baseline not established');
  evidence.push(
    createEvidence(
      state,
      'strategy-security',
      'analysis',
      'security_baseline',
      security,
      'strategy',
    ),
  );

  if (!(await validateUXAccessibility(state)).passed)
    majors.push('UX design missing or not WCAG 2.2 AA compliant');
  if (!(await validateArchitecture(state)).passed)
    majors.push('Architecture diagram missing or inconsistent');

  return finalizePhase(state, 'strategy', evidence, blockers, majors);
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
