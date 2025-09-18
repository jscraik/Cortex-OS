import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { z } from 'zod';

export type PromptBlocks = {
	task?: string;
	tone?: string;
	background?: string;
	rules?: string[];
	examples?: string[];
	history?: string;
	request?: string;
	deliberation?: string;
	output?: string;
	prefill?: string;
};

export type PromptBuilderOptions = {
	packName?: string;
	baseDir?: string;
	blocks?: PromptBlocks;
	enforcePolicy?: boolean;
};

export const PromptBlocksSchema = z.object({
	task: z.string().min(1),
	tone: z.string().min(1),
	background: z.string().optional().default(''),
	rules: z.array(z.string()).optional().default([]),
	examples: z.array(z.string()).optional().default([]),
	history: z.string().optional().default(''),
	request: z.string().min(1),
	deliberation: z.string().min(1),
	output: z.string().min(1),
	prefill: z.string().optional().default(''),
});

export function buildPromptInstructions(
	options: PromptBuilderOptions = {},
): string {
	const enforce = options.enforcePolicy ?? true;
	const baseDir =
		options.baseDir || path.resolve(process.cwd(), '.cortex/library/packs');
	const pack = options.packName ? loadPack(baseDir, options.packName) : null;

	const merged: PromptBlocks = {
		task: pack?.task ?? options.blocks?.task ?? 'You are a Cortex-OS AI agent.',
		tone:
			pack?.tone ??
			options.blocks?.tone ??
			'Professional, concise, actionable.',
		background: pack?.background ?? options.blocks?.background ?? '',
		rules: pack?.rules ??
			options.blocks?.rules ?? [
				'Follow Cortex-OS architecture principles.',
				'Use tools when beneficial and safe.',
				'Avoid inline unstructured prompts; adhere to the 10-block standard.',
			],
		examples: pack?.examples ?? options.blocks?.examples ?? [],
		history: pack?.history ?? options.blocks?.history ?? '',
		request:
			pack?.request ??
			options.blocks?.request ??
			'Respond to the user request.',
		deliberation:
			pack?.deliberation ??
			options.blocks?.deliberation ??
			'reasoning_effort=medium',
		output:
			pack?.output ??
			options.blocks?.output ??
			'Respond using clear Markdown. Include required schemas when applicable.',
		prefill: pack?.prefill ?? options.blocks?.prefill ?? '',
	};

	const blocks = PromptBlocksSchema.parse(merged);
	if (enforce) validateBlocks(blocks);

	const lines: string[] = [];
	lines.push(`[[1] Task context]\n${blocks.task}`);
	lines.push(`[[2] Tone context]\n${blocks.tone}`);
	if (blocks.background) lines.push(`[[3] Background]\n${blocks.background}`);
	if (blocks.rules?.length)
		lines.push(`[[4] Rules]\n- ${blocks.rules.join('\n- ')}`);
	if (blocks.examples?.length)
		lines.push(`[[5] Examples]\n${blocks.examples.join('\n---\n')}`);
	if (blocks.history)
		lines.push(`[[6] Conversation history]\n${blocks.history}`);
	lines.push(`[[7] Immediate request]\n${blocks.request}`);
	lines.push(`[[8] Deliberation]\n${blocks.deliberation}`);
	lines.push(`[[9] Output formatting]\n${blocks.output}`);
	if (blocks.prefill) lines.push(`[[10] Prefill]\n${blocks.prefill}`);
	return lines.join('\n\n');
}

function validateBlocks(blocks: z.infer<typeof PromptBlocksSchema>): void {
	const mandatory: (keyof PromptBlocks)[] = [
		'task',
		'tone',
		'request',
		'deliberation',
		'output',
	];
	for (const k of mandatory) {
		const val = blocks[k];
		if (
			val === undefined ||
			val === null ||
			(typeof val === 'string' && val.trim().length === 0)
		) {
			throw new Error(
				`Prompt policy violation: missing mandatory block "${k}"`,
			);
		}
	}
	if (!Array.isArray(blocks.rules))
		throw new Error('Prompt policy violation: rules must be an array');
	if (!Array.isArray(blocks.examples))
		throw new Error('Prompt policy violation: examples must be an array');
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function loadPack(
	baseDir: string,
	packName: string,
): Partial<PromptBlocks> | null {
	const tryFiles = [
		path.join(baseDir, `${packName}.json`),
		path.join(baseDir, `${packName}.yaml`),
		path.join(baseDir, `${packName}.yml`),
	];
	const require = createRequire(import.meta.url);
	let yamlParser: { parse: (s: string) => unknown } | null = null;
	try {
		const mod = require('yaml');
		if (mod && typeof mod.parse === 'function')
			yamlParser = mod as { parse: (s: string) => unknown };
	} catch {
		// yaml not installed
	}
	if (!yamlParser) {
		try {
			const mod = require('js-yaml');
			if (mod && typeof mod.load === 'function') {
				yamlParser = {
					parse: (s: string) =>
						(mod as { load: (s: string) => unknown }).load(s),
				};
			}
		} catch {
			// js-yaml not installed
		}
	}

	for (const file of tryFiles) {
		if (!fs.existsSync(file)) continue;
		const raw = fs.readFileSync(file, 'utf-8');
		try {
			if (file.endsWith('.json'))
				return JSON.parse(raw) as Partial<PromptBlocks>;
			if (yamlParser) return yamlParser.parse(raw) as Partial<PromptBlocks>;
			return JSON.parse(raw) as Partial<PromptBlocks>;
		} catch {
			return null;
		}
	}
	return null;
}
