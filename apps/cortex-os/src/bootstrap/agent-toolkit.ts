import { createAgentToolkit } from '@cortex-os/agent-toolkit';

let singleton: ReturnType<typeof createAgentToolkit> | null = null;

export const getAgentToolkit = () => {
	singleton ??= createAgentToolkit();
	return singleton;
};

export const resetAgentToolkitForTests = () => {
	if (process.env.NODE_ENV === 'test') {
		singleton = null;
	}
};
