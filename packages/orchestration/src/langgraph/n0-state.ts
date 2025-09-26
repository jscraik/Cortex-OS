import { z } from 'zod';
import type { BaseMessage } from '@langchain/core/messages';

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
