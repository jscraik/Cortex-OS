// Re-export shared schema types from the repo root to avoid deep relative imports elsewhere
export type { SimScenario } from '../../../../../schemas/sim.scenario';
export type {
	SimResult,
	SimBatchResult,
	SimReport,
	SimTurn,
	SimScores,
} from '../../../../../schemas/sim.result';
