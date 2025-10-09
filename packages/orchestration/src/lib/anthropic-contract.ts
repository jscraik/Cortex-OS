import { ZodError, z } from 'zod';

const ToolUseContentSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		type: z.literal('tool_use'),
		input: z.record(z.unknown()).default({}),
		response: z
			.object({
				output_text: z.string().min(1, 'response.output_text must be non-empty'),
			})
			.optional()
			.describe('Anthropic beta tool response envelope'),
	})
	.superRefine((value, ctx) => {
		if (!value.response) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'response.output_text must be provided for tool_use blocks',
				path: ['response', 'output_text'],
			});
		}
	});

const TextContentSchema = z.object({
	type: z.literal('text'),
	text: z.string(),
});

const ToolResultContentSchema = z.object({
	type: z.literal('tool_result'),
	tool_use_id: z.string(),
	content: z
		.array(
			z.object({
				type: z.union([z.literal('output_text'), z.literal('text')]),
				text: z.string().optional(),
				output_text: z.string().optional(),
			}),
		)
		.optional(),
});

const AnthropicMessageSchema = z.object({
	id: z.string().optional(),
	role: z.enum(['assistant', 'user', 'tool']).optional(),
	content: z
		.array(z.union([ToolUseContentSchema, TextContentSchema, ToolResultContentSchema]))
		.min(1, 'content array must include at least one block'),
	response: z
		.object({
			output_text: z.string().min(1, 'response.output_text must be non-empty'),
		})
		.optional(),
});

export interface AnthropicToolCall {
	id: string;
	name: string;
	input: Record<string, unknown>;
	outputText: string;
}

export interface AnthropicContractSnapshot {
	toolCalls: AnthropicToolCall[];
	messageOutputText?: string;
}

const normalizeToolInput = (input: Record<string, unknown>): Record<string, unknown> => {
	if (!('seed' in input)) return input;
	const cloned = { ...input };
	const seed = cloned.seed;
	if (typeof seed === 'number' && (!Number.isInteger(seed) || seed <= 0)) {
		throw new Error(
			'brAInwav Anthropic contract violation: input.seed must be a positive integer for deterministic runs',
		);
	}
	return cloned;
};

export const parseAnthropicToolResponse = (payload: unknown): AnthropicContractSnapshot => {
	try {
		const message = AnthropicMessageSchema.parse(payload);
		const toolBlocks = message.content.filter(
			(block): block is z.infer<typeof ToolUseContentSchema> => {
				return block.type === 'tool_use';
			},
		);

		if (toolBlocks.length === 0) {
			throw new Error(
				'brAInwav Anthropic contract violation: tool_use block missing from response',
			);
		}

		const toolCalls = toolBlocks.map((block) => {
			const outputText = block.response?.output_text;
			if (!outputText) {
				throw new Error(
					'brAInwav Anthropic contract violation: response.output_text missing after validation',
				);
			}
			return {
				id: block.id,
				name: block.name,
				input: normalizeToolInput(block.input),
				outputText,
			};
		});

		return {
			toolCalls,
			messageOutputText: message.response?.output_text ?? toolCalls[0]?.outputText,
		};
	} catch (error) {
		if (error instanceof ZodError) {
			const reason = error.issues.map((issue) => issue.message).join('; ');
			throw new Error(`brAInwav Anthropic contract violation: ${reason}`);
		}
		throw error;
	}
};
