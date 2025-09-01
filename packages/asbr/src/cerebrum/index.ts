/**
 * Cerebrum - Meta-agent layer for Cortex-OS
 * Implements planning, critiquing, simulation, and teaching capabilities
 */

export { Cerebrum } from './cerebrum.js';
export type { CritiqueOptions, CritiqueResult } from './critique.js';
export { Critique } from './critique.js';
export type { SimulationGate, SimulationOptions, SimulationResult } from './simulator.js';
export type { TeachingOptions, TeachingSession } from './teacher.js';
// Export core types
export type { Plan, PlanningContext, PlanOptions, PlanStatus, PlanStep } from './types.js';
