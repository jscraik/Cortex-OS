import { z } from 'zod';

export const PromptRiskLevel = z.enum(['L1', 'L2', 'L3', 'L4']);

export const PromptEntrySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	version: z.string().min(1),
	role: z.enum(['system', 'user', 'assistant', 'tool']).default('system'),
	template: z.string().min(1),
	variables: z.array(z.string()).default([]),
	riskLevel: PromptRiskLevel.default('L2'),
	owners: z.array(z.string().email()).min(1, 'owners required'),
	maxLength: z.number().int().positive().optional(),
});

export type PromptEntry = z.infer<typeof PromptEntrySchema>;

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function validatePrompt(entry: PromptEntry): PromptEntry {
	const parsed = PromptEntrySchema.parse(entry);
	const varsInTpl = new Set<string>();
	for (const m of parsed.template.matchAll(VAR_RE)) {
		if (m[1]) varsInTpl.add(m[1]);
	}
	for (const v of varsInTpl) {
		if (!parsed.variables.includes(v)) {
			throw new Error(`Undeclared variable in template: ${v}`);
		}
	}
	if (parsed.maxLength && parsed.template.length > parsed.maxLength) {
		throw new Error(`Template exceeds maxLength (${parsed.maxLength})`);
	}
	const banned = [/\bDAN\b/i, /ignore previous/i];
	if (banned.some((r) => r.test(parsed.template))) {
		throw new Error('Banned phrase detected in template');
	}
	return parsed;
}
