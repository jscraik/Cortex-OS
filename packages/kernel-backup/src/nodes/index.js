import { PRPStateSchema } from '../state.js';
import { BuildNode } from './build.js';
import { EvaluationNode } from './evaluation.js';
import { StrategyNode } from './strategy.js';
export { BuildNode, EvaluationNode, StrategyNode };
/**
 * Convenience wrapper to run the build phase
 */
export async function runBuildNode(state, node = new BuildNode()) {
	const validated = PRPStateSchema.parse(state);
	return node.execute(validated);
}
/**
 * Convenience wrapper to run the evaluation phase
 */
export async function runEvaluationNode(state, node = new EvaluationNode()) {
	const validated = PRPStateSchema.parse(state);
	return node.execute(validated);
}
/**
 * Convenience wrapper to run the strategy phase
 */
export async function runStrategyNode(state, node = new StrategyNode()) {
	const validated = PRPStateSchema.parse(state);
	return node.execute(validated);
}
//# sourceMappingURL=index.js.map
