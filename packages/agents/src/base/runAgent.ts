import type { AgentResult, AgentResultMeta } from '@cortex-os/protocol';

import { assertPromptMeta } from '../contracts/assertPromptMeta.js';

export interface AgentRunContext extends Omit<AgentResultMeta, 'ts'> {
	prompt_id: string;
}

export async function runAgent<T>(impl: () => Promise<T>, ctx: AgentRunContext): Promise<AgentResult<T>> {
	const data = await impl();
	const meta: AgentResultMeta = {
		...ctx,
		ts: new Date().toISOString(),
	};
	assertPromptMeta(meta);
	return { data, meta };
}
