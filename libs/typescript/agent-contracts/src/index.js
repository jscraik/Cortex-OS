// brAInwav agent contracts – interfaces/types used by orchestration without importing implementations
// Placeholder declarations so orchestration can import types.
// Implementations live in @cortex-os/agents.
export const materializeSubagentTool = () => {
	throw new Error(
		'This is a contract-only placeholder. Use implementations from @cortex-os/agents at runtime.',
	);
};
export const createAutoDelegateTool = () => {
	throw new Error(
		'This is a contract-only placeholder. Use implementations from @cortex-os/agents at runtime.',
	);
};
export const subagentTools = () => {
	throw new Error(
		'This is a contract-only placeholder. Use implementations from @cortex-os/agents at runtime.',
	);
};
export const loadSubagents = async () => {
	throw new Error(
		'This is a contract-only placeholder. Use implementations from @cortex-os/agents at runtime.',
	);
};
