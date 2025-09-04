/**
 * @file lib/build-node.ts
 * @description Build Node wrapper for kernel imports
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { BuildNode } from "../nodes/index.js";

const buildNode = new BuildNode();

export async function executeBuildNode(state: any): Promise<any> {
	return await buildNode.execute(state);
}
