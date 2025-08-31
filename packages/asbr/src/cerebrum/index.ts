/**
 * Cerebrum - Meta-agent layer for Cortex-OS
 * Implements planning, critiquing, simulation, and teaching capabilities
 */

export { Cerebrum } from './cerebrum.js';
export type { Plan } from './types.js';
export type { SimulationResult } from './simulator.js';
export { Critique } from './critique.js';
export type { TeachingSession } from './teacher.js';

// Export core types
export type {
  PlanOptions,
  PlanningContext,
  PlanStep,
  PlanStatus,
} from './types.js';

export type {
  SimulationOptions,
  SimulationGate,
} from './simulator.js';

export type {
  CritiqueOptions,
  CritiqueResult,
} from './critique.js';

export type {
  TeachingOptions,
} from './teacher.js';