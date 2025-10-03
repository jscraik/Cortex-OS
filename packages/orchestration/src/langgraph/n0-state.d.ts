import type { HookResult } from '@cortex-os/hooks';
import type { BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';
export declare const N0SessionSchema: z.ZodObject<
	{
		id: z.ZodString;
		model: z.ZodString;
		user: z.ZodString;
		cwd: z.ZodString;
		brainwavSession: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		model: string;
		id: string;
		cwd: string;
		user: string;
		brainwavSession?: string | undefined;
	},
	{
		model: string;
		id: string;
		cwd: string;
		user: string;
		brainwavSession?: string | undefined;
	}
>;
export declare const N0BudgetSchema: z.ZodObject<
	{
		tokens: z.ZodNumber;
		timeMs: z.ZodNumber;
		depth: z.ZodNumber;
	},
	'strip',
	z.ZodTypeAny,
	{
		tokens: number;
		depth: number;
		timeMs: number;
	},
	{
		tokens: number;
		depth: number;
		timeMs: number;
	}
>;
export declare const N0StateSchema: z.ZodObject<
	{
		input: z.ZodDefault<z.ZodString>;
		session: z.ZodObject<
			{
				id: z.ZodString;
				model: z.ZodString;
				user: z.ZodString;
				cwd: z.ZodString;
				brainwavSession: z.ZodOptional<z.ZodString>;
			},
			'strip',
			z.ZodTypeAny,
			{
				model: string;
				id: string;
				cwd: string;
				user: string;
				brainwavSession?: string | undefined;
			},
			{
				model: string;
				id: string;
				cwd: string;
				user: string;
				brainwavSession?: string | undefined;
			}
		>;
		ctx: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		messages: z.ZodOptional<z.ZodArray<z.ZodType<BaseMessage, z.ZodTypeDef, BaseMessage>, 'many'>>;
		output: z.ZodOptional<z.ZodString>;
		budget: z.ZodOptional<
			z.ZodObject<
				{
					tokens: z.ZodNumber;
					timeMs: z.ZodNumber;
					depth: z.ZodNumber;
				},
				'strip',
				z.ZodTypeAny,
				{
					tokens: number;
					depth: number;
					timeMs: number;
				},
				{
					tokens: number;
					depth: number;
					timeMs: number;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		input: string;
		session: {
			model: string;
			id: string;
			cwd: string;
			user: string;
			brainwavSession?: string | undefined;
		};
		output?: string | undefined;
		messages?: BaseMessage[] | undefined;
		ctx?: Record<string, unknown> | undefined;
		budget?:
			| {
					tokens: number;
					depth: number;
					timeMs: number;
			  }
			| undefined;
	},
	{
		session: {
			model: string;
			id: string;
			cwd: string;
			user: string;
			brainwavSession?: string | undefined;
		};
		input?: string | undefined;
		output?: string | undefined;
		messages?: BaseMessage[] | undefined;
		ctx?: Record<string, unknown> | undefined;
		budget?:
			| {
					tokens: number;
					depth: number;
					timeMs: number;
			  }
			| undefined;
	}
>;
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
export declare function createInitialN0State(
	input: string,
	session: N0Session,
	overrides?: Partial<N0State>,
): N0State;
export declare function mergeN0State(base: N0State, patch: Partial<N0State>): N0State;
export declare function compactN0State(
	state: N0State,
	options?: MemoryCompactionOptions,
): Promise<MemoryCompactionResult>;
//# sourceMappingURL=n0-state.d.ts.map
