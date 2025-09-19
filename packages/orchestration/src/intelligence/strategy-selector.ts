export type TaskProfile = {
	description: string;
	complexity: number; // 0..1
	canParallelize: boolean;
	estimatedBranches: number; // rough count of independent branches
	dataSize: number; // arbitrary unit
};

export type Strategy = 'parallel-coordinated' | 'sequential-safe' | 'hybrid';

/**
 * Minimal heuristic selector for Phase 1.2
 * - Prefer parallel-coordinated when complex and parallelizable with multiple branches
 * - Otherwise default to sequential-safe
 */
export class StrategySelector {
	selectStrategy(task: TaskProfile): Strategy {
		const isComplex = task.complexity >= 0.7;
		const isModerate = task.complexity >= 0.5 && task.complexity < 0.7;
		const manyBranches = task.estimatedBranches >= 3;
		const someBranches = task.estimatedBranches >= 2;
		const bigData = task.dataSize >= 50_000;

		// Prefer full parallel coordination for high complexity with many independent branches
		if (task.canParallelize && isComplex && manyBranches) return 'parallel-coordinated';

		// Hybrid: moderate complexity or some branching or large datasets that benefit from fan-out then merge
		if (task.canParallelize && (isModerate || someBranches || bigData)) return 'hybrid';

		// Default: safer sequential path
		return 'sequential-safe';
	}
}
