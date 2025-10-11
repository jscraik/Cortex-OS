import { hashPromptTemplate, registerPrompt } from '@cortex-os/prompts';

const OWNER = 'agents@brainwav.dev';

const sanitize = (value: string) => {
	// Security: Validate input length to prevent ReDoS
	if (value.length > 500) {
		throw new Error('brAInwav prompt name exceeds maximum length (500 chars)');
	}
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
};

export function ensureAgentPromptRegistered(
	name: string,
	scope: 'project' | 'user',
	template: string,
): string {
	const sanitizedName = sanitize(name);
	const id = `sys.agents.${scope}.${sanitizedName}`;
	const version = `v${hashPromptTemplate(template).slice(0, 12)}`;

	registerPrompt({
		id,
		name: `Agent::${sanitizedName}`,
		version,
		role: 'system',
		template,
		variables: [],
		riskLevel: 'L2',
		owners: [OWNER],
	});

	return id;
}
