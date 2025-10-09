import { Ollama } from 'ollama';
import { z } from 'zod';
import type { OllamaConfig } from '../config/ollama.js';
import { BRAND, createBrandedLog } from '../utils/brand.js';

type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

type ChatRequest = {
	model: string;
	stream: boolean;
	messages: ChatMessage[];
	keep_alive: string | number;
	format?: 'json' | Record<string, unknown>;
	options: Record<string, unknown>;
};

type ChatChunk = {
	message?: {
		content?: string;
		tool_calls?: Array<Record<string, unknown>>;
	};
	timings?: Record<string, unknown>;
};

type StreamCallbacks = {
	delta?: (chunk: string) => void;
	complete?: (final?: { text?: string }) => void;
};

type ToolContext = {
	stream?: StreamCallbacks;
	onCancel?: (handler: () => void) => void;
};

const SENTINEL = '</plan>';

export const OllamaChatArgs = z.object({
	model: z.string().default(process.env.OLLAMA_MODEL ?? 'llama3.2'),
	messages: z.array(
		z.object({
			role: z.enum(['system', 'user', 'assistant']),
			content: z.string(),
		}),
	),
	stream: z.boolean().default(true),
	keepAlive: z
		.union([z.string(), z.number()])
		.default(process.env.OLLAMA_KEEP_ALIVE_DEFAULT ?? '5m'),
	format: z.union([z.literal('json'), z.record(z.string(), z.unknown())]).optional(),
	options: z
		.object({
			seed: z.number().int().optional(),
			temperature: z.number().min(0).max(2).optional(),
			num_ctx: z.number().int().positive().optional(),
			num_predict: z.number().int().optional(),
			stop: z.array(z.string()).optional(),
			mirostat: z.number().int().min(0).max(2).optional(),
			mirostat_eta: z.number().optional(),
			mirostat_tau: z.number().optional(),
			top_k: z.number().int().optional(),
			top_p: z.number().min(0).max(1).optional(),
			min_p: z.number().min(0).max(1).optional(),
			thinking: z.union([z.boolean(), z.literal('final')]).optional(),
		})
		.partial()
		.default({}),
});

function addSentinel(stops: string[] | undefined): string[] {
	if (stops && stops.length > 0) {
		return stops;
	}
	return [SENTINEL];
}

function buildChatRequest(args: z.infer<typeof OllamaChatArgs>, config: OllamaConfig): ChatRequest {
	const stop = addSentinel(args.options.stop);
	return {
		model: args.model || config.defaultModel,
		stream: args.stream,
		messages: args.messages,
		keep_alive: args.keepAlive ?? config.keepAlive,
		format: args.format,
		options: { ...args.options, stop },
	};
}

function stripThinkingSegments(text: string, mode: unknown): string {
	if (mode !== 'final') {
		return text;
	}
	return text
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.replace(/<think>/gi, '')
		.replace(/<\/think>/gi, '');
}

function diffDelta(previous: string, next: string): string {
	if (next.length <= previous.length) {
		return '';
	}
	return next.slice(previous.length);
}

function createWatchdog(durationMs: number | undefined, onExpire: () => void) {
	if (!durationMs || durationMs <= 0) {
		return {
			reset: () => undefined,
			stop: () => undefined,
		};
	}
	let timer: NodeJS.Timeout | null = setTimeout(onExpire, durationMs);
	return {
		reset: () => {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(onExpire, durationMs);
		},
		stop: () => {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
		},
	};
}

function consumeContent(
	state: { concat: string; emitted: string },
	content: string,
	request: ChatRequest,
	context: ToolContext,
) {
	if (!content) {
		return;
	}
	state.concat += content;
	const sanitized = stripThinkingSegments(state.concat, request.options.thinking);
	const delta = diffDelta(state.emitted, sanitized);
	if (delta && context.stream?.delta) {
		context.stream.delta(delta);
	}
	state.emitted += delta;
}

async function streamWithWatchdog(
	client: Ollama,
	request: ChatRequest,
	context: ToolContext,
	logger: any,
	config: OllamaConfig,
	signal?: AbortSignal,
): Promise<{
	text: string;
	toolCalls: Array<Record<string, unknown>>;
	timings?: Record<string, unknown>;
}> {
	const response = (await client.chat({
		...request,
		stream: true,
		signal,
	})) as AsyncIterable<ChatChunk>;
	const toolCalls: Array<Record<string, unknown>> = [];
	const state = {
		concat: '',
		emitted: '',
		timings: undefined as Record<string, unknown> | undefined,
		stalled: false,
	};

	const watchdog = createWatchdog(config.watchdogIdleMs, () => {
		state.stalled = true;
	});
	watchdog.reset();

	try {
		for await (const chunk of response) {
			watchdog.reset();
			state.timings = chunk?.timings ?? state.timings;
			if (Array.isArray(chunk?.message?.tool_calls)) {
				toolCalls.push(...chunk.message.tool_calls);
			}
			consumeContent(state, chunk?.message?.content ?? '', request, context);
		}
	} finally {
		watchdog.stop();
	}

	if (state.stalled) {
		logger.warn(
			createBrandedLog('ollama_stream_stall'),
			'Ollama stream stalled; switching to aggregate response',
		);
		const aggregate = await client.chat({ ...request, stream: false });
		const message = (aggregate as ChatChunk)?.message;
		const text = stripThinkingSegments(message?.content ?? '', request.options.thinking);
		if (message?.tool_calls) {
			toolCalls.push(...message.tool_calls);
		}
		const delta = diffDelta(state.emitted, text);
		if (delta && context.stream?.delta) {
			context.stream.delta(delta);
		}
		return { text, toolCalls, timings: (aggregate as ChatChunk)?.timings };
	}

	const finalText = stripThinkingSegments(state.concat, request.options.thinking);
	return { text: finalText, toolCalls, timings: state.timings };
}

async function runNonStreaming(
	client: Ollama,
	request: ChatRequest,
	signal?: AbortSignal,
): Promise<{
	text: string;
	toolCalls: Array<Record<string, unknown>>;
	timings?: Record<string, unknown>;
}> {
	const result = (await client.chat({ ...request, stream: false, signal })) as ChatChunk;
	const message = result.message ?? {};
	const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
	const text = stripThinkingSegments(message.content ?? '', request.options.thinking);
	return { text, toolCalls, timings: result.timings };
}

function buildReturnPayload(
	request: ChatRequest,
	result: {
		text: string;
		toolCalls: Array<Record<string, unknown>>;
		timings?: Record<string, unknown>;
	},
	context: ToolContext,
): { text: string; structuredContent: Record<string, unknown> } {
	if (result.text && context.stream?.complete) {
		context.stream.complete({ text: result.text });
	}
	return {
		text: result.text,
		structuredContent: {
			brand: BRAND.prefix,
			model: request.model,
			toolCalls: result.toolCalls,
			timings: result.timings,
			keep_alive: request.keep_alive,
		},
	};
}

export function registerOllamaChat(server: any, logger: any, config: OllamaConfig) {
	server.tools.add({
		name: 'ollama.chat',
		description: 'brAInwav deterministic chat interface for Ollama models with streaming support',
		inputSchema: OllamaChatArgs,
		handler: async (input: unknown, context: ToolContext = {}) => {
			const args = OllamaChatArgs.parse(input);
			const suppliedModel =
				typeof (input as { model?: unknown })?.model === 'string'
					? (input as { model?: string }).model
					: undefined;
			const resolvedModel =
				suppliedModel ?? config.defaults.chat ?? args.model ?? config.defaultModel;
			const request = buildChatRequest({ ...args, model: resolvedModel }, config);
			const client = new Ollama({ host: config.baseUrl });
			const abort = new AbortController();
			if (context.onCancel) {
				context.onCancel(() => abort.abort());
			}

			logger.info(
				createBrandedLog('ollama_chat_execute', {
					model: request.model,
					stream: request.stream,
					seed: request.options.seed,
				}),
				'Executing ollama.chat tool',
			);

			const exec = request.stream
				? streamWithWatchdog(client, request, context, logger, config, abort.signal)
				: runNonStreaming(client, request, abort.signal);
			const result = await exec;
			return buildReturnPayload(request, result, context);
		},
	});
}
