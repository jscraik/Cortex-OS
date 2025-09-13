/**
 * @file lib/evaluation-node.ts
 * @description Evaluation Node wrapper for kernel imports
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { EvaluationNode } from '@cortex-os/kernel';

const evaluationNode = new EvaluationNode();

export async function executeEvaluationNode(state: any): Promise<any> {
	return await evaluationNode.execute(state);
}
