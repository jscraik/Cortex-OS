import { createAgentToolkit } from '@cortex-os/agent-toolkit';

let singleton: ReturnType<typeof createAgentToolkit> | null = null;

export const getAgentToolkit = () => {
    if (!singleton) {
        singleton = createAgentToolkit({
            enableTreeSitter: process.env.TK_ENABLE_TS === '1',
            defaultTokenBudget: Number(process.env.TK_BUDGET ?? 3000),
        });
    }
    return singleton;
};

export const resetAgentToolkitForTests = () => {
    if (process.env.NODE_ENV === 'test') {
        singleton = null;
    }
};
