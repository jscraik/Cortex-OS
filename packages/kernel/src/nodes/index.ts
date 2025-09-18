/**
 * @file nodes/index.ts
 * @description Export all PRP workflow nodes
 * @author Cortex-OS Team
 * @version 1.0.1
 */
import type { PRPState } from '../state.js';
import { PRPStateSchema } from '../state.js';
import { BuildNode } from './build.js';
import { EvaluationNode } from './evaluation.js';
import { StrategyNode } from './strategy.js';

export { BuildNode, EvaluationNode, StrategyNode };

/**
 * Convenience wrapper to run the build phase
 */
export async function runBuildNode(state: PRPState, node = new BuildNode()): Promise<PRPState> {
	const validated = PRPStateSchema.parse(state);
	return node.execute(validated);
}

/**
 * Convenience wrapper to run the evaluation phase
 */
export async function runEvaluationNode(
	state: PRPState,
	node = new EvaluationNode(),
): Promise<PRPState> {
	const validated = PRPStateSchema.parse(state);
	return node.execute(validated);
}

/**
 * Convenience wrapper to run the strategy phase
 */
export async function runStrategyNode(
	state: PRPState,
	node = new StrategyNode(),
): Promise<PRPState> {
	const validated = PRPStateSchema.parse(state);
	return node.execute(validated);
}
