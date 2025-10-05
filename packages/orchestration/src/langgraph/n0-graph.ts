import { randomUUID } from 'node:crypto';
import {
	type Subagent as ContractSubagent,
	loadSubagents as discoverSubagents,
	type LoadedSubagents,
	type LoadSubagentsOptions,
	type SubagentToolBinding,
	type SubagentToolsOptions,
	subagentTools,
} from '@cortex-os/agent-contracts';
import {
	runSlash as defaultRunSlash,
	parseSlash,
	type RunSlashOptions,
	type SlashParseResult,
} from '@cortex-os/commands';
import { CortexHooks, type HookContext, type HookEvent, type HookResult } from '@cortex-os/hooks';
import type { LoadOptions as HookLoadOptions } from '@cortex-os/hooks/loaders.js';
import {
	type BindKernelToolsOptions,
	bindKernelTools,
	type KernelTool,
	type KernelToolBinding,
} from '@cortex-os/kernel';
import {
	capturePromptUsage,
	getPrompt,
	getSafePrompt,
	loadDefaultPrompts,
	type PromptCapture,
	renderPrompt,
	validatePromptUsage,
} from '@cortex-os/prompts';
import {
	AIMessage,
	type BaseMessage,
	HumanMessage,
	isAIMessage,
	SystemMessage,
	ToolMessage,
} from '@langchain/core/messages';
import { DynamicStructuredTool, type StructuredTool } from '@langchain/core/tools';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import type { z } from 'zod';
import type { N0Budget, N0Session, N0State } from './n0-state.js';
import {
	dispatchTools,
	type ToolDispatchHooks,
	type ToolDispatchJob,
	type ToolDispatchResult,
} from './tool-dispatch.js';

loadDefaultPrompts();

const DEFAULT_SYSTEM_PROMPT_ID = 'sys.n0-master';

export const N0Annotation = Annotation.Root({
	...MessagesAnnotation.spec,
	input: Annotation<string>({ reducer: (_prev, next) => next }),
	session: Annotation<N0Session>({ reducer: (_prev, next) => next }),
	ctx: Annotation<Record<string, unknown>>({
		reducer: (prev, next) => ({ ...(prev ?? {}), ...(next ?? {}) }),
	}),
	output: Annotation<string | undefined>({ reducer: (_prev, next) => next }),
	budget: Annotation<N0Budget | undefined>({ reducer: (_prev, next) => next }),
});

export interface ToolCallableModel {
	bindTools(tools: StructuredTool[]): ToolCallableModel;
	invoke(messages: BaseMessage[], options?: unknown): Promise<BaseMessage>;
}

export interface ToolExecutionContext {
	session: N0Session;
	state: N0State;
	callId: string;
}

export interface ToolExecutionOutput {
	content: string;
	status?: 'success' | 'error';
	metadata?: Record<string, unknown>;
	artifact?: unknown;
}

export interface ToolDefinition {
	name: string;
	description: string;
	schema: z.ZodTypeAny;
	execute: (input: unknown, context: ToolExecutionContext) => Promise<ToolExecutionOutput>;
	metadata?: Record<string, unknown>;
}

export interface HookRunner {
	run(event: HookEvent, ctx: HookContext | Record<string, unknown>): Promise<HookResult[]>;
	init?(options?: HookLoadOptions): Promise<void>;
}

export interface PlanDecision {
	strategy: 'plan' | 'direct';
	rationale?: string;
}

export type StreamEvent = { type: 'chunk'; content: string } | { type: 'final'; content: string };

export interface BuildN0Options {
	model: ToolCallableModel;
	hooks?: HookRunner;
	hookLoadOptions?: HookLoadOptions;
	runSlash?: typeof defaultRunSlash;
	runSlashOptions?: RunSlashOptions;
	kernelBinding?: KernelToolBinding;
	kernelTools?: KernelTool[];
	kernelOptions?: BindKernelToolsOptions;
	subagents?: Map<string, ContractSubagent>;
	subagentOptions?: LoadSubagentsOptions;
	subagentToolOptions?: SubagentToolsOptions;
	disableSubagentDiscovery?: boolean;
	orchestratorTools?: ToolDefinition[];
	toolHooks?: ToolDispatchHooks;
	toolAllowList?: string[];
	toolConcurrency?: number;
	systemPromptId?: string;
	systemPromptVariables?: Record<string, unknown>;
	planResolver?: (state: N0State) => PlanDecision;
	compaction?: { maxMessages?: number; maxChars?: number };
	logger?: Pick<Console, 'info' | 'warn' | 'error'>;
	streamPublisher?: (event: StreamEvent) => Promise<void> | void;
}

export interface BuildN0Result {
	// The compiled graph shape can vary across StateGraph instantiations
	// because node names and waiting-edge tuple literal shapes are
	// embedded into the compiled type. To avoid brittle cross-package
	// mismatches we expose the compiled graph as `unknown` at this
	// boundary. Callers that need to inspect the compiled graph should
	// perform a guarded parse or cast to a more specific shape.
	graph: unknown;
	hooks: HookRunner;
	tools: Map<string, ToolDefinition>;
	subagentManager?: LoadedSubagents['manager'];
}

export async function buildN0(options: BuildN0Options): Promise<BuildN0Result> {
	const hooks = await ensureHooks(options.hooks, options.hookLoadOptions);
	const logger = options.logger ?? console;
	const runSlashImpl = options.runSlash ?? defaultRunSlash;
	const systemPromptInfo = resolveSystemPrompt({
		id: options.systemPromptId,
		variables: options.systemPromptVariables,
	});
	const systemPrompt = systemPromptInfo.prompt;
	const planResolver = options.planResolver ?? defaultPlanResolver;
	const compactionConfig = options.compaction ?? {};
	const dispatchHooks = options.toolHooks ?? createToolHookAdapter(hooks);

	const kernelBinding = resolveKernelBinding(options);
	const kernelTools = kernelBinding?.tools ?? options.kernelTools ?? [];
	const kernelDefinitions: ToolDefinition[] = kernelTools.map((tool: KernelTool) =>
		kernelToolToDefinition(tool),
	);
	const renderDefaults = pickDefined({
		runBashSafe: createKernelRunBash(kernelTools),
		readFileCapped: createKernelReadFile(kernelTools),
		fileAllowlist: deriveKernelFileAllowlist(kernelBinding, options.kernelOptions),
		maxIncludeBytes: options.kernelOptions?.maxReadBytes,
	});

	let subagentManager: LoadedSubagents['manager'] | undefined;
	let subagentMap: Map<string, ContractSubagent> = options.subagents ?? new Map();
	if (!options.subagents && !options.disableSubagentDiscovery) {
		const discovered = await discoverSubagents(options.subagentOptions ?? {});
		subagentManager = discovered.manager;
		subagentMap = discovered.subagents;
	}

	const subagentDefinitions = subagentMap.size
		? subagentTools(subagentMap).map((binding: SubagentToolBinding) =>
				subagentToolToDefinition(binding),
			)
		: [];

	const allDefinitions = [
		...kernelDefinitions,
		...subagentDefinitions,
		...(options.orchestratorTools ?? []),
	];
	const toolMap = new Map<string, ToolDefinition>();
	for (const definition of allDefinitions) {
		if (toolMap.has(definition.name)) {
			throw new Error(`Duplicate tool registration detected for ${definition.name}`);
		}
		toolMap.set(definition.name, definition);
	}

	const structuredTools = Array.from(toolMap.values()).map(toStructuredTool);
	const toolModel = options.model.bindTools(structuredTools);

	const graph = new StateGraph(N0Annotation)
		.addNode('parse_or_command', async (state: N0State) => {
			const promptCaptures = mergePromptCaptures(state.ctx, systemPromptInfo.capture);
			const ctxPatch: Record<string, unknown> = { sessionStarted: true, promptCaptures };
			if (kernelBinding?.metadata) {
				ctxPatch.kernelToolkit = kernelBinding.metadata;
			}
			const ctx = extendCtx(state.ctx, ctxPatch);
			await safeRunHook(hooks, 'SessionStart', sessionHookContext(state), logger);

			const baseMessages = [...(state.messages ?? []), new HumanMessage({ content: state.input })];
			const parsed = tryParseSlash(state.input);
			if (!parsed) {
				return { messages: baseMessages, ctx };
			}

			const slashOptions: RunSlashOptions = {
				...options.runSlashOptions,
				session: {
					...options.runSlashOptions?.session,
					id: state.session.id,
					cwd: state.session.cwd,
					projectDir: options.runSlashOptions?.session?.projectDir ?? state.session.cwd,
					userDir: options.runSlashOptions?.session?.userDir,
					modelStore: options.runSlashOptions?.session?.modelStore,
				},
				renderContext: {
					...renderDefaults,
					...(options.runSlashOptions?.renderContext ?? {}),
					cwd: state.session.cwd,
				},
			};
			const result = await runSlashImpl(parsed, slashOptions);
			const commandMetadata = extractCommandMetadata(result.metadata);
			const commandModel = extractString(commandMetadata?.['model']) ?? 'inherit';
			const commandAllowedTools = extractStringArray(commandMetadata?.['allowedTools']);
			const outputText = typeof result.text === 'string' ? result.text : '';
			const response = new AIMessage({ content: outputText });
			if (outputText) {
				try {
					await options.streamPublisher?.({ type: 'chunk', content: outputText });
				} catch (error) {
					logger.error?.('brAInwav slash stream failed', {
						sessionId: state.session.id,
						error,
					});
				}
			}
			logger.info?.('brAInwav slash command executed', {
				sessionId: state.session.id,
				command: parsed.cmd,
			});
			return {
				messages: [...baseMessages, response],
				output: outputText,
				ctx: extendCtx(ctx, {
					lastCommand: parsed.cmd,
					commandResult: result,
					commandMetadata,
					commandModel,
					commandAllowedTools,
				}),
			};
		})
		.addNode('pre_prompt_hooks', async (state: N0State) => {
			const results = await safeRunHook(
				hooks,
				'UserPromptSubmit',
				{
					event: 'UserPromptSubmit',
					cwd: state.session.cwd,
					user: state.session.user,
					model: state.session.model,
					input: state.input,
				},
				logger,
			);

			if (!results) {
				return { ctx: state.ctx, messages: state.messages, input: state.input };
			}

			let input = state.input;
			for (const result of results) {
				if (result.action === 'deny') {
					const denial = result.reason ?? 'brAInwav prompt denied by policy';
					logger.warn?.('brAInwav prompt denied by hook', {
						sessionId: state.session.id,
						hook: 'UserPromptSubmit',
						reason: result.reason,
					});
					const denialMessage = new AIMessage({ content: denial });
					return {
						output: denial,
						messages: [...(state.messages ?? []), denialMessage],
						ctx: extendCtx(state.ctx, {
							promptDenied: true,
							hookResults: results,
						}),
					};
				}
				if (result.action === 'allow' && 'input' in result && typeof result.input === 'string') {
					if (result.input !== state.input) {
						logger.info?.('brAInwav prompt mutated by hook', {
							sessionId: state.session.id,
							hook: 'UserPromptSubmit',
						});
					}
					input = result.input;
				}
			}

			let updatedMessages = state.messages ?? [];
			if (updatedMessages.length > 0) {
				const lastIndex = updatedMessages.length - 1;
				const last = updatedMessages[lastIndex];
				if (last.getType() === 'human' && input !== state.input) {
					updatedMessages = [
						...updatedMessages.slice(0, lastIndex),
						new HumanMessage({ content: input }),
					];
				}
			}

			return {
				input,
				messages: updatedMessages,
				ctx: extendCtx(state.ctx, { hookResults: results }),
			};
		})
		.addNode('plan_or_direct', async (state: N0State) => {
			const decision = planResolver(state);
			logger.info?.('brAInwav plan_or_direct decision', {
				sessionId: state.session.id,
				strategy: decision.strategy,
				rationale: decision.rationale,
			});
			return {
				ctx: extendCtx(state.ctx, {
					strategy: decision.strategy,
					planRationale: decision.rationale,
				}),
			};
		})
		.addNode('llm_with_tools', async (state: N0State) => {
			const prepared = ensureSystemPrompt(state.messages ?? [], systemPrompt, state.ctx);
			const response = await toolModel.invoke(prepared);
			const aiMessage = normaliseToAIMessage(response);
			const toolCalls = aiMessage.tool_calls ?? [];
			const messages = [...(state.messages ?? []), aiMessage];
			const output =
				toolCalls.length === 0 ? renderMessageContent(aiMessage.content) : state.output;
			if (toolCalls.length === 0 && output) {
				try {
					await options.streamPublisher?.({ type: 'chunk', content: output });
				} catch (error) {
					logger.error?.('brAInwav model stream failed', {
						sessionId: state.session.id,
						error,
					});
				}
			}
			return {
				messages,
				output,
				ctx: extendCtx(state.ctx, {
					toolLoopPending: toolCalls.length > 0,
					lastModelResponse: {
						toolCalls: toolCalls.length,
						timestamp: new Date().toISOString(),
					},
				}),
			};
		})
		.addNode('tool_dispatch', async (state: N0State) => {
			const messages = state.messages ?? [];
			const last = messages[messages.length - 1];
			if (!last || !isAIMessage(last) || !last.tool_calls || last.tool_calls.length === 0) {
				return {
					ctx: extendCtx(state.ctx, { toolLoopPending: false }),
				};
			}

			const jobs: ToolDispatchJob<ToolExecutionOutput>[] = [];
			const toolMessages: ToolMessage[] = [];
			const loopContext: Record<string, unknown> = {
				toolLoopPending: false,
				lastToolResults: [],
			};

			for (const call of last.tool_calls) {
				const definition = toolMap.get(call.name);
				const callId = call.id ?? randomUUID();
				if (!definition) {
					logger.warn?.('brAInwav tool missing for call', {
						sessionId: state.session.id,
						toolCall: call.name,
					});
					toolMessages.push(
						new ToolMessage({
							tool_call_id: callId,
							status: 'error',
							content: `brAInwav tool ${call.name} is not available`,
							metadata: { tool: call.name },
						}),
					);
					continue;
				}
				jobs.push({
					id: callId,
					name: definition.name,
					metadata: {
						...(definition.metadata ?? {}),
						tool: definition.name,
					},
					input: call.args,
					execute: async (input) =>
						await definition.execute(input, {
							session: state.session,
							state,
							callId,
						}),
				});
			}

			if (jobs.length === 0) {
				return {
					messages: [...messages, ...toolMessages],
					ctx: extendCtx(state.ctx, loopContext),
				};
			}

			const results: ToolDispatchResult<ToolExecutionOutput>[] = await dispatchTools(jobs, {
				session: state.session,
				budget: state.budget,
				concurrency: options.toolConcurrency,
				allowList: options.toolAllowList,
				hooks: dispatchHooks,
			});

			for (let index = 0; index < results.length; index++) {
				const job = jobs[index];
				const settled = results[index];
				if (settled.status === 'fulfilled' && settled.value) {
					const payload = settled.value;
					toolMessages.push(
						new ToolMessage({
							tool_call_id: job.id,
							status: payload.status ?? 'success',
							content: payload.content,
							metadata: {
								...(job.metadata ?? {}),
								...(payload.metadata ?? {}),
								durationMs: settled.durationMs,
								tokensUsed: settled.tokensUsed,
							},
							artifact: payload.artifact,
						}),
					);
				} else {
					const reason = settled.reason?.message ?? 'unknown error';
					toolMessages.push(
						new ToolMessage({
							tool_call_id: job.id,
							status: 'error',
							content: `brAInwav tool ${job.name} failed: ${reason}`,
							metadata: {
								...(job.metadata ?? {}),
								durationMs: settled.durationMs,
								tokensUsed: settled.tokensUsed,
							},
						}),
					);
				}
			}

			loopContext.toolLoopPending = true;
			loopContext.lastToolResults = toolMessages.map((msg) => ({
				tool: msg.metadata?.tool ?? msg.tool_call_id,
				status: msg.status,
			}));

			logger.info?.('brAInwav tool dispatch complete', {
				sessionId: state.session.id,
				jobs: jobs.length,
				results: loopContext.lastToolResults,
			});

			return {
				messages: [...messages, ...toolMessages],
				ctx: extendCtx(state.ctx, loopContext),
			};
		})
		.addNode('compact_if_needed', async (state: N0State) => {
			const messages = state.messages ?? [];
			const maxMessages = compactionConfig.maxMessages ?? 30;
			const maxChars = compactionConfig.maxChars ?? 16_000;
			if (messages.length <= maxMessages && totalCharacters(messages) <= maxChars) {
				return {
					ctx: extendCtx(state.ctx, { compacted: false }),
				};
			}
			await safeRunHook(
				hooks,
				'PreCompact',
				{
					event: 'PreCompact',
					cwd: state.session.cwd,
					user: state.session.user,
					model: state.session.model,
				},
				logger,
			);
			const compacted = compactMessages(messages, maxMessages, maxChars);
			logger.warn?.('brAInwav memory compaction applied', {
				sessionId: state.session.id,
				originalCount: messages.length,
				compactedCount: compacted.length,
			});
			return {
				messages: compacted,
				ctx: extendCtx(state.ctx, {
					compacted: true,
					compactedAt: new Date().toISOString(),
				}),
			};
		})
		.addNode('stream_and_log', async (state: N0State) => {
			const finalOutput = state.output ?? deriveOutputFromMessages(state.messages);
			if (finalOutput) {
				try {
					await options.streamPublisher?.({ type: 'final', content: finalOutput });
				} catch (error) {
					logger.error?.('brAInwav final stream failed', {
						sessionId: state.session.id,
						error,
					});
				}
			}
			logger.info?.('brAInwav n0 run complete', {
				sessionId: state.session.id,
				outputLength: finalOutput?.length ?? 0,
			});
			if (!state.ctx?.sessionCompleted) {
				const payload = stopHookContext(state, finalOutput);
				await safeRunHook(hooks, 'Stop', payload, logger);
				await safeRunHook(hooks, 'SessionEnd', payload, logger);
			}
			return {
				output: finalOutput,
				ctx: extendCtx(state.ctx, {
					sessionCompleted: true,
					finalisedAt: new Date().toISOString(),
				}),
			};
		});

	graph.addEdge(START, 'parse_or_command');
	graph.addConditionalEdges('parse_or_command', (state: N0State) =>
		state.output ? 'stream_and_log' : 'pre_prompt_hooks',
	);
	graph.addEdge('pre_prompt_hooks', 'plan_or_direct');
	graph.addEdge('plan_or_direct', 'llm_with_tools');
	graph.addConditionalEdges('llm_with_tools', (state: N0State) => {
		const messages = state.messages ?? [];
		const last = messages[messages.length - 1];
		if (last && isAIMessage(last) && last.tool_calls && last.tool_calls.length > 0) {
			return 'tool_dispatch';
		}
		return 'compact_if_needed';
	});
	graph.addConditionalEdges('tool_dispatch', (state: N0State) => {
		return state.ctx?.toolLoopPending ? 'llm_with_tools' : 'compact_if_needed';
	});
	graph.addEdge('compact_if_needed', 'stream_and_log');
	graph.addEdge('stream_and_log', END);

	return {
		graph: graph.compile(),
		hooks,
		tools: toolMap,
		subagentManager,
	};
}

function resolveKernelBinding(options: BuildN0Options): KernelToolBinding | undefined {
	if (options.kernelBinding) {
		return options.kernelBinding;
	}
	if (options.kernelOptions) {
		return bindKernelTools(options.kernelOptions);
	}
	if (options.kernelTools) {
		return createKernelBindingFromTools(options.kernelTools, options.kernelOptions);
	}
	return undefined;
}

function createKernelBindingFromTools(
	tools: KernelTool[],
	options?: BindKernelToolsOptions,
): KernelToolBinding {
	const allowLists = {
		bash: collectAllowList(tools, 'bash'),
		filesystem: collectAllowList(tools, 'filesystem'),
		network: collectAllowList(tools, 'network'),
	};
	const timeoutMs = tools.reduce(
		(acc, tool) => (tool.metadata.timeoutMs > acc ? tool.metadata.timeoutMs : acc),
		options?.timeoutMs ?? 30000,
	);
	return {
		tools,
		metadata: {
			brand: 'brAInwav kernel toolkit',
			cwd: options?.cwd ?? process.cwd(),
			defaultModel: options?.defaultModel ?? 'inherit',
			allowLists,
			timeoutMs,
			surfaces: tools.map((tool) => tool.name),
			security: undefined,
		},
	};
}

function collectAllowList(
	tools: KernelTool[],
	surface: 'bash' | 'filesystem' | 'network',
): string[] {
	const entries = new Set<string>();
	for (const tool of tools) {
		if (tool.metadata.surface === surface) {
			for (const item of tool.metadata.allowList) {
				entries.add(item);
			}
		}
	}
	return Array.from(entries);
}

async function ensureHooks(
	hooks: HookRunner | undefined,
	options?: HookLoadOptions,
): Promise<HookRunner> {
	if (hooks) {
		return Promise.resolve(hooks);
	}
	const instance = new CortexHooks();
	// Some implementations of CortexHooks.init do not accept options; invoke defensively
	if (typeof instance.init === 'function') {
		await (instance.init as unknown as (opts?: unknown) => Promise<void>)(options as unknown);
	}
	return instance;
}

type KernelRunBash = (
	cmd: string,
	allowlist: string[],
) => Promise<{ stdout: string; stderr: string; code: number }>;

type KernelReadFile = (target: string, maxBytes: number, allowlist: string[]) => Promise<string>;

function createKernelRunBash(tools: KernelTool[]): KernelRunBash | undefined {
	const tool = findKernelTool(tools, ['kernel.bash', 'shell.exec']);
	if (!tool) return undefined;
	return async (cmd: string, _allowlist: string[]) => {
		const payload = await tool.invoke({ command: cmd });
		const stdout =
			typeof payload === 'object' &&
			payload &&
			'stdout' in payload &&
			typeof payload.stdout === 'string'
				? payload.stdout
				: '';
		const stderr =
			typeof payload === 'object' &&
			payload &&
			'stderr' in payload &&
			typeof payload.stderr === 'string'
				? payload.stderr
				: '';
		return {
			stdout,
			stderr,
			code: normaliseKernelExitCode(payload),
		} satisfies { stdout: string; stderr: string; code: number };
	};
}

function createKernelReadFile(tools: KernelTool[]): KernelReadFile | undefined {
	const tool = findKernelTool(tools, [
		'kernel.readFile',
		'kernel.fs.read',
		'kernel.filesystem.read',
		'fs.read',
	]);
	if (!tool) return undefined;
	return async (target, maxBytes, allowlist) => {
		// If allowlist is provided, check if target is allowed
		if (Array.isArray(allowlist) && allowlist.length > 0) {
			const isAllowed = allowlist.some((allowedPath) => target.startsWith(allowedPath));
			if (!isAllowed) {
				throw new Error(
					`[brAInwav] kernel policy violation: access to file "${target}" is not allowed by the current allowlist.`,
				);
			}
		}
		const payload = await tool.invoke(
			tool.name === 'fs.read' ? { path: target } : { path: target, maxBytes },
		);
		const content = extractKernelFileContent(payload);
		return typeof maxBytes === 'number' ? content.slice(0, maxBytes) : content;
	};
}

function deriveKernelFileAllowlist(
	binding?: KernelToolBinding,
	options?: BindKernelToolsOptions,
): string[] | undefined {
	const fromBinding = binding?.metadata.allowLists.filesystem;
	if (fromBinding && fromBinding.length > 0) {
		return [...fromBinding];
	}
	const allow = options?.fsAllow;
	if (!allow || allow.length === 0) return undefined;
	return [...allow];
}

function pickDefined<T extends Record<string, unknown>>(source: T): Partial<T> {
	const defined: Partial<T> = {};
	for (const [key, value] of Object.entries(source)) {
		if (value !== undefined) {
			(defined as Record<string, unknown>)[key] = value;
		}
	}
	return defined;
}

function findKernelTool(tools: KernelTool[], names: string[]): KernelTool | undefined {
	return tools.find((tool) => names.includes(tool.name));
}

function normaliseKernelExitCode(payload: unknown): number {
	if (typeof payload === 'object' && payload) {
		const record = payload as Record<string, unknown>;
		const exit = record['exitCode'];
		if (typeof exit === 'number') {
			return exit;
		}
		const code = record['code'];
		if (typeof code === 'number') {
			return code;
		}
	}
	return 0;
}

function extractKernelFileContent(payload: unknown): string {
	if (typeof payload === 'string') {
		return payload;
	}
	if (typeof payload === 'object' && payload) {
		const record = payload as Record<string, unknown>;
		const content = record['content'];
		if (typeof content === 'string') {
			return content;
		}
		const body = record['body'];
		if (typeof body === 'string') {
			return body;
		}
	}
	return '';
}

function createToolHookAdapter(hooks: HookRunner): ToolDispatchHooks {
	return {
		run: async (event, ctx) => hooks.run(event, ctx),
	};
}

function kernelToolToDefinition(tool: KernelTool): ToolDefinition {
	return {
		name: tool.name,
		description: tool.description,
		schema: tool.schema,
		metadata: {
			provider: 'kernel',
			surface: tool.metadata.surface,
			allowList: [...tool.metadata.allowList],
			timeoutMs: tool.metadata.timeoutMs,
		},
		async execute(input) {
			const parsed = tool.schema.parse(input);
			const result = await tool.invoke(parsed);
			return {
				content: renderOutput(result),
				status: 'success',
				metadata: {
					provider: 'kernel',
					surface: tool.metadata.surface,
					allowList: [...tool.metadata.allowList],
					timeoutMs: tool.metadata.timeoutMs,
				},
				artifact: result,
			} satisfies ToolExecutionOutput;
		},
	} satisfies ToolDefinition;
}

function subagentToolToDefinition(binding: SubagentToolBinding): ToolDefinition {
	const schema = ensureZodSchema(binding.tool.schema);
	return {
		name: binding.tool.name,
		description: binding.tool.description,
		schema,
		metadata: binding.metadata,
		async execute(input) {
			const response = await binding.tool.call(input, { caller: 'n0', depth: 0 });
			const status: 'success' | 'error' = response.success ? 'success' : 'error';
			const content =
				response.text ?? (response.error ? `brAInwav subagent error: ${response.error}` : '');
			return {
				content,
				status,
				metadata: {
					...(binding.metadata ?? {}),
					traceId: response.traceId,
					metrics: response.metrics,
				},
				artifact: response,
			} satisfies ToolExecutionOutput;
		},
	} satisfies ToolDefinition;
}

function toStructuredTool(definition: ToolDefinition): StructuredTool {
	return new DynamicStructuredTool({
		name: definition.name,
		description: definition.description,
		schema: definition.schema,
		func: async () => {
			throw new Error(
				`brAInwav tool ${definition.name} must be invoked via the LangGraph tool_dispatch pipeline`,
			);
		},
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureZodSchema(schema: unknown): z.ZodTypeAny {
	if (
		schema !== null &&
		typeof schema === 'object' &&
		'parse' in schema &&
		typeof (schema as { parse?: unknown }).parse === 'function'
	) {
		return schema as z.ZodTypeAny;
	}
	if (
		schema !== null &&
		typeof schema === 'object' &&
		'safeParse' in schema &&
		typeof (schema as { safeParse?: unknown }).safeParse === 'function'
	) {
		return schema as z.ZodTypeAny;
	}
	throw new Error('[brAInwav] subagent schema must be a valid Zod schema');
}

function extractCommandMetadata(metadata: unknown): Record<string, unknown> | undefined {
	if (!metadata) {
		return undefined;
	}
	if (isRecord(metadata)) {
		const command = Object.hasOwn(metadata as object, 'command')
			? (metadata as { command?: unknown }).command
			: undefined;
		if (isRecord(command)) {
			return command;
		}
		if (typeof metadata['name'] === 'string') {
			return metadata;
		}
	}
	return undefined;
}

function extractString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function extractStringArray(value: unknown): string[] | undefined {
	if (Array.isArray(value)) {
		const strings = value
			.map((item) => (typeof item === 'string' ? item.trim() : undefined))
			.filter((item): item is string => Boolean(item));
		return strings.length ? strings : undefined;
	}
	const single = extractString(value);
	return single ? [single] : undefined;
}

function extendCtx(
	base: Record<string, unknown> | undefined,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	return { ...(base ?? {}), ...patch };
}

function ensureSystemPrompt(
	messages: BaseMessage[],
	prompt: string,
	ctx?: Record<string, unknown>,
): BaseMessage[] {
	const cloned = [...messages];
	if (cloned.length === 0 || cloned[0].getType() !== 'system') {
		cloned.unshift(new SystemMessage({ content: prompt }));
	}
	const hasPlanInstruction = cloned.some(
		(message) => message.getType() === 'system' && message.additional_kwargs?.['brAInwav-plan'],
	);
	if (ctx?.strategy && !hasPlanInstruction) {
		const instruction =
			ctx.strategy === 'plan'
				? 'You must outline a brief plan before executing tools. Use subagents when helpful.'
				: 'Respond directly while using tools only when they materially improve the answer.';
		cloned.splice(
			1,
			0,
			new SystemMessage({
				content: instruction,
				additional_kwargs: { 'brAInwav-plan': true },
			}),
		);
	}
	return cloned;
}

function normaliseToAIMessage(message: BaseMessage): AIMessage {
	if (isAIMessage(message)) return message;
	return new AIMessage({ content: renderMessageContent(message.content) });
}

function renderMessageContent(content: BaseMessage['content']): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		return content
			.map((part) => {
				if (typeof part === 'string') return part;
				if (typeof part === 'object' && part && 'text' in part) {
					const textValue = (part as { text?: unknown }).text;
					if (typeof textValue === 'string') return textValue;
					if (typeof textValue === 'number' || typeof textValue === 'boolean') {
						return String(textValue);
					}
					try {
						return JSON.stringify(textValue);
					} catch {
						return '[unserializable-text]';
					}
				}
				try {
					return JSON.stringify(part);
				} catch {
					return '[unserializable-part]';
				}
			})
			.join('\n');
	}
	try {
		return JSON.stringify(content);
	} catch {
		return '[unserializable-content]';
	}
}

function renderOutput(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return '[unserializable-artifact]';
	}
}

async function safeRunHook(
	hooks: HookRunner,
	event: HookEvent,
	ctx: Record<string, unknown>,
	logger: Pick<Console, 'warn'>,
): Promise<HookResult[] | undefined> {
	try {
		return await hooks.run(event, ctx as HookContext);
	} catch (error) {
		logger.warn?.('brAInwav hook execution failed', { event, error });
		return undefined;
	}
}

function sessionHookContext(state: N0State): Record<string, unknown> {
	return {
		event: 'SessionStart',
		cwd: state.session.cwd,
		user: state.session.user,
		model: state.session.model,
		session: state.session,
		tags: ['n0'],
	};
}

function stopHookContext(state: N0State, output?: string): Record<string, unknown> {
	return {
		event: 'Stop',
		cwd: state.session.cwd,
		user: state.session.user,
		model: state.session.model,
		session: state.session,
		output,
		tags: ['n0'],
	};
}

function totalCharacters(messages: BaseMessage[]): number {
	return messages.reduce((sum, message) => sum + renderMessageContent(message.content).length, 0);
}

function compactMessages(
	messages: BaseMessage[],
	maxMessages: number,
	maxChars: number,
): BaseMessage[] {
	const preserved: BaseMessage[] = [];
	if (messages.length > 0) preserved.push(messages[0]);
	const remainder = messages.slice(-Math.max(0, maxMessages - preserved.length));
	const result = [...preserved, ...remainder];
	while (totalCharacters(result) > maxChars && result.length > 2) {
		result.splice(1, 1);
	}
	return result;
}

function deriveOutputFromMessages(messages?: BaseMessage[]): string | undefined {
	if (!messages || messages.length === 0) return undefined;
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const candidate = messages[index];
		const type = candidate.getType();
		if (type === 'ai' || type === 'tool') {
			return renderMessageContent(candidate.content);
		}
	}
	return undefined;
}

function mergePromptCaptures(
	ctx: Record<string, unknown> | undefined,
	capture?: PromptCapture,
): PromptCapture[] {
	const candidate = ctx?.promptCaptures;
	const existing: PromptCapture[] = Array.isArray(candidate)
		? [...(candidate as PromptCapture[])]
		: [];
	if (capture) {
		const already = existing.some(
			(entry) => entry.id === capture.id && entry.version === capture.version,
		);
		if (!already) existing.push(capture);
	}
	return existing;
}

function tryParseSlash(input: string): SlashParseResult | null {
	try {
		return parseSlash(input);
	} catch {
		return null;
	}
}

function defaultPlanResolver(state: N0State): PlanDecision {
	const content = state.input.toLowerCase();
	const shouldPlan =
		state.input.length > 240 ||
		state.input.split('\n').length > 3 ||
		['plan', 'steps', 'strategy', 'investigate', 'analysis', 'roadmap'].some((keyword) =>
			content.includes(keyword),
		);
	return shouldPlan
		? {
				strategy: 'plan',
				rationale: 'Detected long or multi-part request requiring coordination.',
			}
		: { strategy: 'direct', rationale: 'Prompt is concise; direct execution preferred.' };
}

interface SystemPromptConfig {
	id?: string;
	variables?: Record<string, unknown>;
}

function resolveSystemPrompt(config: SystemPromptConfig): {
	prompt: string;
	capture?: PromptCapture;
} {
	if (config.id) {
		const record = getPrompt(config.id);
		if (!record) {
			throw new Error(
				`brAInwav orchestration: Unknown system prompt '${config.id}'. Register the prompt before invoking the orchestrator.`,
			);
		}

		const rendered = renderPrompt(record, config.variables ?? {});
		validatePromptUsage(rendered, config.id);
		return {
			prompt: rendered,
			capture: capturePromptUsage(record),
		};
	}

	// Enforce that the default prompt remains registered with the prompt library
	const safeTemplate = getSafePrompt(DEFAULT_SYSTEM_PROMPT_ID);
	const record = getPrompt(DEFAULT_SYSTEM_PROMPT_ID);
	if (record) {
		return {
			prompt: renderPrompt(record, {}),
			capture: capturePromptUsage(record),
		};
	}

	if (safeTemplate) {
		validatePromptUsage(safeTemplate, DEFAULT_SYSTEM_PROMPT_ID);
		return { prompt: safeTemplate };
	}

	// Fall back to a minimal safe prompt when no record metadata is available
	return { prompt: fallbackSystemPrompt() };
}

function fallbackSystemPrompt(): string {
	return [
		'You are brAInwav n0, the master orchestration loop for Cortex-OS.',
		'Coordinate kernel tools, workspace commands, and subagents to produce accurate, secure results.',
		'Always respect hook policies, filesystem/network allow-lists, and budget constraints.',
		'Explain tool usage briefly in natural language while keeping sensitive data protected.',
		'Log session information and relevant context for debugging when errors or unexpected behavior occur, following best practices for observability.',
		'Handle errors gracefully and provide clear, actionable feedback to users and developers.',
	].join(' ');
}
