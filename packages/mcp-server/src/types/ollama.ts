/**
 * Ollama API Types
 *
 * Type definitions for Ollama streaming integration
 * including chat requests, responses, and tool calling support.
 */

import { z } from 'zod';

/**
 * Ollama message role types
 */
export const OllamaMessageRoleSchema = z.enum(['system', 'user', 'assistant']);

/**
 * Individual message in conversation
 */
export const OllamaMessageSchema = z.object({
	role: OllamaMessageRoleSchema,
	content: z.string(),
});

/**
 * Tool definition for Ollama
 */
export const OllamaToolSchema = z.object({
	type: z.literal('function'),
	function: z.object({
		name: z.string(),
		description: z.string(),
		parameters: z.record(z.any()),
	}),
});

/**
 * Tool call from Ollama response
 */
export const OllamaToolCallSchema = z.object({
	id: z.string(),
	type: z.literal('function'),
	function: z.object({
		name: z.string(),
		arguments: z.string(), // JSON string
	}),
});

/**
 * Streaming chunk from Ollama
 */
export const OllamaChunkSchema = z.object({
	model: z.string(),
	created_at: z.string(),
	message: z
		.object({
			role: OllamaMessageRoleSchema.optional(),
			content: z.string().optional(),
			tool_calls: z.array(OllamaToolCallSchema).optional(),
		})
		.optional(),
	done: z.boolean(),
	// Additional fields that may appear in responses
	total_duration: z.number().optional(),
	load_duration: z.number().optional(),
	prompt_eval_count: z.number().optional(),
	prompt_eval_duration: z.number().optional(),
	eval_count: z.number().optional(),
	eval_duration: z.number().optional(),
});

/**
 * Complete Ollama chat response (non-streaming)
 */
export const OllamaChatResponseSchema = z.object({
	model: z.string(),
	created_at: z.string(),
	message: z.object({
		role: OllamaMessageRoleSchema,
		content: z.string(),
		tool_calls: z.array(OllamaToolCallSchema).optional(),
	}),
	done: z.boolean(),
	total_duration: z.number().optional(),
	load_duration: z.number().optional(),
	prompt_eval_count: z.number().optional(),
	prompt_eval_duration: z.number().optional(),
	eval_count: z.number().optional(),
	eval_duration: z.number().optional(),
});

/**
 * Ollama chat request parameters
 */
export const OllamaChatRequestSchema = z.object({
	model: z.string(),
	messages: z.array(OllamaMessageSchema),
	tools: z.array(OllamaToolSchema).optional(),
	stream: z.boolean().default(false),
	options: z
		.object({
			temperature: z.number().optional(),
			top_p: z.number().optional(),
			think: z.boolean().optional(),
			// Additional Ollama options can be added here
		})
		.optional(),
	format: z.string().optional(), // json, etc.
	template: z.string().optional(),
	keep_alive: z.union([z.string(), z.number()]).optional(),
});

/**
 * Streaming event types for our wrapper
 */
export const OllamaStreamEventSchema = z.union([
	z.object({
		type: z.literal('delta'),
		content: z.string(),
	}),
	z.object({
		type: z.literal('tool_call'),
		toolCall: OllamaToolCallSchema,
	}),
	z.object({
		type: z.literal('done'),
		timings: z.record(z.number()).optional(),
	}),
	z.object({
		type: z.literal('error'),
		error: z.string(),
	}),
]);

/**
 * Export type aliases for cleaner imports
 */
export type OllamaMessageRole = z.infer<typeof OllamaMessageRoleSchema>;
export type OllamaMessage = z.infer<typeof OllamaMessageSchema>;
export type OllamaTool = z.infer<typeof OllamaToolSchema>;
export type OllamaToolCall = z.infer<typeof OllamaToolCallSchema>;
export type OllamaChunk = z.infer<typeof OllamaChunkSchema>;
export type OllamaChatResponse = z.infer<typeof OllamaChatResponseSchema>;
export type OllamaChatRequest = z.infer<typeof OllamaChatRequestSchema>;
export type OllamaStreamEvent = z.infer<typeof OllamaStreamEventSchema>;

/**
 * Async generator type for streaming responses
 */
export type OllamaStreamGenerator = AsyncGenerator<OllamaChunk, void, unknown>;

/**
 * Configuration for Ollama client
 */
export interface OllamaConfig {
	host?: string;
	timeout?: number;
	keepAlive?: string | number;
}

/**
 * Stall detection configuration
 */
export interface OllamaStallConfig {
	enabled: boolean;
	timeoutMs: number;
	onStall: 'abort' | 'aggregate' | 'continue';
}
