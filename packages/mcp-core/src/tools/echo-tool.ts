import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const EchoToolInputSchema = z.object({
	message: z.string().min(1, 'message is required'),
	uppercase: z.boolean().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export type EchoToolInput = z.infer<typeof EchoToolInputSchema>;

export interface EchoToolResult {
	message: string;
	original: EchoToolInput;
	timestamp: string;
}

export class EchoTool implements McpTool<EchoToolInput, EchoToolResult> {
	readonly name = 'echo';
	readonly description =
		'Echoes the provided message with optional transformations for connectivity testing.';
	readonly inputSchema = EchoToolInputSchema;

	async execute(
		input: EchoToolInput,
		context?: ToolExecutionContext,
	): Promise<EchoToolResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('Echo tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		const responseMessage = input.uppercase
			? input.message.toUpperCase()
			: input.message;

		return {
			message: responseMessage,
			original: input,
			timestamp: new Date().toISOString(),
		};
	}
}

export const echoTool = new EchoTool();
