import type { PRPState } from '../state.js';
export type ExecutionHistory = Map<string, PRPState[]>;
export declare function createHistory(): ExecutionHistory;
export declare function addToHistory(history: ExecutionHistory, runId: string, state: PRPState): void;
export declare function getExecutionHistory(history: ExecutionHistory, runId: string): PRPState[];
//# sourceMappingURL=history.d.ts.map