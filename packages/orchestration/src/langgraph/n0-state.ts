import type { HookResult } from '@cortex-os/hooks';
import type { BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';

export const N0SessionSchema = z.object({
	id: z.string().min(1),
	model: z.string().min(1),
	user: z.string().min(1),
	cwd: z.string().min(1),
	brainwavSession: z.string().min(1).optional(),
});

export const N0BudgetSchema = z.object({
	tokens: z.number().int().nonnegative(),
	timeMs: z.number().int().nonnegative(),
	depth: z.number().int().nonnegative(),
});

export const N0StateSchema = z.object({
	input: z.string().default(''),
	session: N0SessionSchema,
	ctx: z.record(z.unknown()).optional(),
	messages: z.array(z.custom<BaseMessage>()).optional(),
	output: z.string().optional(),
	budget: N0BudgetSchema.optional(),
});

export type N0Session = z.infer<typeof N0SessionSchema>;
export type N0Budget = z.infer<typeof N0BudgetSchema>;
export type N0State = z.infer<typeof N0StateSchema>;

export interface MemoryCompactionOptions {
	maxMessages?: number;
	retainHead?: number;
	hooks?: {
		run: (event: 'PreCompact', ctx: Record<string, unknown>) => Promise<HookResult[]>;
	};
	session?: N0Session;
	tags?: string[];
}

export interface MemoryCompactionResult {
	state: N0State;
	removed: number;
	skipped: boolean;
}

export function createInitialN0State(
	input: string,
	session: N0Session,
	overrides: Partial<N0State> = {},
): N0State {
	const draft: N0State = {
		input,
		session,
		ctx: overrides.ctx,
		messages: overrides.messages,
		output: overrides.output,
		budget: overrides.budget,
	};
	return N0StateSchema.parse(draft);
}

export function mergeN0State(base: N0State, patch: Partial<N0State>): N0State {
	return N0StateSchema.parse({
		...base,
		...patch,
		ctx: patch.ctx ? { ...base.ctx, ...patch.ctx } : base.ctx,
		budget: patch.budget ?? base.budget,
	});
}

export async function compactN0State(
	state: N0State,
	options: MemoryCompactionOptions = {},
): Promise<MemoryCompactionResult> {
	const messages = state.messages ?? [];
	const configuredMax = Math.max(0, options.maxMessages ?? 120);
	if (messages.length <= configuredMax) {
		return { state, removed: 0, skipped: false };
	}

	let allowCompaction = true;
	let effectiveMax = configuredMax;

	if (options.hooks) {
		const hookCtx = {
			event: 'PreCompact' as const,
			tool: {
				name: 'memory.compact',
				input: {
					totalMessages: messages.length,
					maxMessages: configuredMax,
				},
			},
			session: options.session,
			cwd: options.session?.cwd ?? process.cwd(),
			user: options.session?.user ?? 'system',
			tags: options.tags ?? ['memory', 'compaction'],
		} satisfies Record<string, unknown>;
		const hookResults = await options.hooks.run('PreCompact', hookCtx);
		for (const result of hookResults) {
			if (result.action === 'deny') {
				allowCompaction = false;
				break;
			}
			if (result.action === 'allow' && 'input' in result && result.input) {
				const override = Number((result.input as Record<string, unknown>).maxMessages);
				if (!Number.isNaN(override) && override > 0) {
					effectiveMax = Math.floor(override);
				}
			}
		}
	}

	if (!allowCompaction || messages.length <= effectiveMax) {
		return { state, removed: 0, skipped: !allowCompaction };
	}

	const retainHead = Math.max(0, options.retainHead ?? 1);
	const head = retainHead > 0 ? messages.slice(0, retainHead) : [];
	const tailCount = Math.max(effectiveMax - head.length, 0);
	const tail = tailCount > 0 ? messages.slice(messages.length - tailCount) : [];
	const trimmed = [...head, ...tail];
	const removed = messages.length - trimmed.length;

	return {
		state: {
			...state,
			messages: trimmed,
		},
		removed,
		skipped: false,
	};
}
