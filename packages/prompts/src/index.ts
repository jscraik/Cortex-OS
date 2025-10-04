import crypto from 'node:crypto';
import { z } from 'zod';
import { DEFAULT_PROMPTS } from './registry.js';
import { type PromptEntry, PromptEntrySchema, validatePrompt } from './schema.js';

export interface PromptRecord extends PromptEntry {}

const registry = new Map<string, PromptRecord>(); // key: `${id}@${version}`

export function registerPrompt(entry: PromptEntry) {
	const p = validatePrompt(entry);
	const key = `${p.id}@${p.version}`;
	registry.set(key, p);
}

export function getPrompt(id: string, version?: string): PromptRecord | undefined {
	if (version) return registry.get(`${id}@${version}`);
	const candidates = [...registry.keys()].filter((k) => k.startsWith(`${id}@`));
	const latestKey = candidates.sort().at(-1);
	return latestKey ? registry.get(latestKey) : undefined;
}

export function renderPrompt(p: PromptRecord, vars: Record<string, unknown>): string {
	let out = p.template;
	for (const v of p.variables) {
		const val = vars[v];
		if (val === undefined || val === null) {
			throw new Error(`Missing variable: ${v}`);
		}
		out = out.replaceAll(`{{${v}}}`, String(val)).replaceAll(`{{ ${v} }}`, String(val));
	}
	return out;
}

export function hashPromptTemplate(template: string): string {
	return crypto.createHash('sha256').update(template).digest('hex');
}

export const PromptCaptureSchema = z.object({
	id: z.string(),
	version: z.string(),
	sha256: z.string(),
	variables: z.array(z.string()).default([]),
});
export type PromptCapture = z.infer<typeof PromptCaptureSchema>;

export function capturePromptUsage(p: PromptRecord): PromptCapture {
	return {
		id: p.id,
		version: p.version,
		sha256: hashPromptTemplate(p.template),
		variables: p.variables ?? [],
	};
}

export function listPrompts(): PromptRecord[] {
	return [...registry.values()];
}

let defaultsLoaded = false;
export function loadDefaultPrompts(): void {
	if (defaultsLoaded) return;
	for (const entry of DEFAULT_PROMPTS) {
		registerPrompt(entry);
	}
	defaultsLoaded = true;
}

loadDefaultPrompts();

export { PromptEntrySchema, validatePrompt };
