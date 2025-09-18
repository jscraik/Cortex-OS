import type { PRPState } from '../state.js';

export type ExecutionHistory = Map<string, PRPState[]>;

export function createHistory(): ExecutionHistory {
	return new Map();
}

export function addToHistory(history: ExecutionHistory, runId: string, state: PRPState): void {
	const states = history.get(runId) || [];
	states.push(state);
	history.set(runId, states);
}

export function getExecutionHistory(history: ExecutionHistory, runId: string): PRPState[] {
	return history.get(runId) || [];
}
