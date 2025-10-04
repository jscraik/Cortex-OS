import type { AgentResultMeta } from '@cortex-os/protocol';

export function assertPromptMeta(meta: AgentResultMeta): void {
	if (!meta?.prompt_id) {
		throw new Error('prompt_id missing');
	}
}
