import type {
	ExecutionContext,
	ExecutionState,
	SubAgent,
	SubAgentResult,
} from '../orchestrator.js';

export async function executeSubAgent(
	subAgent: SubAgent,
	state: ExecutionState,
	context: ExecutionContext,
): Promise<SubAgentResult> {
	try {
		return await subAgent.execute(state, context);
	} catch (error) {
		console.error('Error executing sub-agent:', error);
		throw error;
	}
}
