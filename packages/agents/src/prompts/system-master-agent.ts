import { createHash } from 'node:crypto';
import { getPrompt, renderPrompt, validatePromptUsage } from '@cortex-os/prompts';

export const MASTER_SYSTEM_PROMPT_ID = 'sys.agents.master' as const;

const promptRecord = getPrompt(MASTER_SYSTEM_PROMPT_ID);

if (!promptRecord) {
	throw new Error(
		`brAInwav master agent prompt '${MASTER_SYSTEM_PROMPT_ID}' must be registered in the prompt library`,
	);
}

const renderedPrompt = renderPrompt(promptRecord, {});
validatePromptUsage(renderedPrompt, promptRecord.id);
const promptHash = createHash('sha256').update(renderedPrompt).digest('hex');

export const MASTER_SYSTEM_PROMPT = {
	id: promptRecord.id,
	version: promptRecord.version,
	hash: `sha256:${promptHash}`,
	text: renderedPrompt,
} as const;
