import { PRPState, Evidence } from '../state.js';
import { generateId } from '../utils/id.js';

/** Create standardized evidence entry */
export function createEvidence(
  state: PRPState,
  idPrefix: string,
  type: Evidence['type'],
  source: string,
  content: unknown,
  phase: Evidence['phase'],
): Evidence {
  return {
    id: generateId(idPrefix, state.metadata.deterministic),
    type,
    source,
    content: JSON.stringify(content),
    timestamp: new Date().toISOString(),
    phase,
  };
}

/** Merge phase results into state */
export function finalizePhase(
  state: PRPState,
  phase: keyof PRPState['validationResults'],
  evidence: Evidence[],
  blockers: string[],
  majors: string[],
): PRPState {
  return {
    ...state,
    evidence: [...state.evidence, ...evidence],
    validationResults: {
      ...state.validationResults,
      [phase]: {
        passed: blockers.length === 0 && majors.length <= 3,
        blockers,
        majors,
        evidence: evidence.map((e) => e.id),
        timestamp: new Date().toISOString(),
      },
    },
  };
}
