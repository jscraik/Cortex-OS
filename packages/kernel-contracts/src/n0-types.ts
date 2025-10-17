/**
 * N0 State Types - Shared contracts between kernel and orchestration
 * @package @cortex-os/kernel-contracts
 * @author brAInwav Team
 */

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

/**
 * N0 Adapter Options for converting workflow state to N0 state
 */
export interface N0AdapterOptions {
	session?: Partial<N0Session>;
	extractInput?: (state: unknown) => string;
	extractOutput?: (state: unknown) => string | undefined;
}
