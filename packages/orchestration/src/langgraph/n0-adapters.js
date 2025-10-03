import { createInitialN0State, mergeN0State } from './n0-state.js';
export function agentStateToN0(agentState, session, options = {}) {
	const ctx = {
		currentAgent: agentState.currentAgent,
		taskType: agentState.taskType,
		result: agentState.result,
		error: agentState.error,
	};
	const draft = createInitialN0State(extractInput(agentState.messages), session, {
		ctx,
		messages: agentState.messages,
		output: deriveOutput(agentState.messages, agentState.result),
		budget: options.budget,
	});
	return mergeN0State(draft, options.overrides ?? {});
}
export function cortexStateToN0(cortexState, session, options = {}) {
	const ctx = {
		currentStep: cortexState.currentStep,
		context: cortexState.context,
		tools: cortexState.tools,
		error: cortexState.error,
	};
	const draft = createInitialN0State(extractInput(cortexState.messages), session, {
		ctx,
		messages: cortexState.messages,
		output: deriveOutput(cortexState.messages, cortexState.result),
		budget: options.budget,
	});
	return mergeN0State(draft, options.overrides ?? {});
}
export function workflowStateToN0(workflowState, session, options = {}) {
	const ctx = {
		prpState: workflowState.prpState,
		nextStep: workflowState.nextStep,
		error: workflowState.error,
	};
	const messages = workflowState.messages ?? [];
	const draft = createInitialN0State(extractInput(messages), session, {
		ctx,
		messages,
		output: deriveOutput(messages),
		budget: options.budget,
	});
	return mergeN0State(draft, options.overrides ?? {});
}
function extractInput(messages) {
	if (!messages || messages.length === 0) return '';
	const first = messages[0];
	if (typeof first.content === 'string') return first.content;
	return JSON.stringify(first.content);
}
function deriveOutput(messages, fallback) {
	const last = messages?.[messages.length - 1];
	if (last && typeof last.content === 'string') return last.content;
	if (typeof fallback === 'string') return fallback;
	if (fallback && typeof fallback === 'object') return JSON.stringify(fallback);
	return undefined;
}
//# sourceMappingURL=n0-adapters.js.map
