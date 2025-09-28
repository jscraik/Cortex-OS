import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import {
        AIMessage,
        HumanMessage,
        SystemMessage,
        ToolMessage,
        isAIMessage,
        type BaseMessage,
} from '@langchain/core/messages';
import { DynamicStructuredTool, type StructuredTool } from '@langchain/core/tools';
import {
        parseSlash,
        runSlash as defaultRunSlash,
        type RunSlashOptions,
        type SlashParseResult,
} from '@cortex-os/commands';
import {
        bindKernelTools,
        type BindKernelToolsOptions,
        type BoundKernelTool,
} from '@cortex-os/kernel';
import {
        loadSubagents as discoverSubagents,
        subagentTools,
        type LoadSubagentsOptions,
        type LoadedSubagents,
        type SubagentToolBinding,
        type ContractSubagent,
} from '@cortex-os/agents';
import { CortexHooks, type HookContext, type HookEvent, type HookResult } from '@cortex-os/hooks';
import type { LoadOptions as HookLoadOptions } from '@cortex-os/hooks/src/loaders.js';
import {
        dispatchTools,
        type ToolDispatchHooks,
        type ToolDispatchJob,
        type ToolDispatchResult,
} from './tool-dispatch.js';
import { type N0Budget, type N0Session, type N0State } from './n0-state.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

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

export type StreamEvent =
        | { type: 'chunk'; content: string }
        | { type: 'final'; content: string };

export interface BuildN0Options {
        model: ToolCallableModel;
        hooks?: HookRunner;
        hookLoadOptions?: HookLoadOptions;
        runSlash?: typeof defaultRunSlash;
        runSlashOptions?: RunSlashOptions;
        kernelTools?: BoundKernelTool[];
        kernelOptions?: BindKernelToolsOptions;
        subagents?: Map<string, ContractSubagent>;
        subagentOptions?: LoadSubagentsOptions;
        disableSubagentDiscovery?: boolean;
        orchestratorTools?: ToolDefinition[];
        toolHooks?: ToolDispatchHooks;
        toolAllowList?: string[];
        toolConcurrency?: number;
        systemPrompt?: string;
        planResolver?: (state: N0State) => PlanDecision;
        compaction?: { maxMessages?: number; maxChars?: number };
        logger?: Pick<Console, 'info' | 'warn' | 'error'>;
        streamPublisher?: (event: StreamEvent) => Promise<void> | void;
}

export interface BuildN0Result {
        graph: ReturnType<StateGraph<typeof N0Annotation>['compile']>;
        hooks: HookRunner;
        tools: Map<string, ToolDefinition>;
        subagentManager?: LoadedSubagents['manager'];
}

export async function buildN0(options: BuildN0Options): Promise<BuildN0Result> {
        const hooks = await ensureHooks(options.hooks, options.hookLoadOptions);
        const logger = options.logger ?? console;
        const runSlashImpl = options.runSlash ?? defaultRunSlash;
        const systemPrompt = options.systemPrompt ?? defaultSystemPrompt();
        const planResolver = options.planResolver ?? defaultPlanResolver;
        const compactionConfig = options.compaction ?? {};
        const dispatchHooks = options.toolHooks ?? createToolHookAdapter(hooks);

        const kernelDefinitions = (options.kernelTools ?? bindKernelTools(options.kernelOptions ?? {})).map((tool) =>
                kernelToolToDefinition(tool),
        );

        let subagentManager: LoadedSubagents['manager'] | undefined;
        let subagentMap: Map<string, ContractSubagent> = options.subagents ?? new Map();
        if (!options.subagents && !options.disableSubagentDiscovery) {
                const discovered = await discoverSubagents(options.subagentOptions ?? {});
                subagentManager = discovered.manager;
                subagentMap = discovered.subagents;
        }

        const subagentDefinitions = subagentMap.size
                ? subagentTools(subagentMap).map((binding) => subagentToolToDefinition(binding))
                : [];

        const allDefinitions = [...kernelDefinitions, ...subagentDefinitions, ...(options.orchestratorTools ?? [])];
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
                        const ctx = extendCtx(state.ctx, { sessionStarted: true });
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
                                        cwd: state.session.cwd,
                                        ...options.runSlashOptions?.renderContext,
                                },
                        };
                        const result = await runSlashImpl(parsed, slashOptions);
                        const outputText = typeof result.text === 'string' ? result.text : '';
                        const response = new AIMessage({ content: outputText });
                        await options.streamPublisher?.({ type: 'chunk', content: outputText });
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
                                }),
                        };
                })
                .addNode('pre_prompt_hooks', async (state: N0State) => {
                        const results = await safeRunHook(hooks, 'UserPromptSubmit', {
                                event: 'UserPromptSubmit',
                                cwd: state.session.cwd,
                                user: state.session.user,
                                model: state.session.model,
                                input: state.input,
                        }, logger);

                        if (!results) {
                                return { ctx: state.ctx, messages: state.messages, input: state.input };
                        }

                        let input = state.input;
                        for (const result of results) {
                                if (result.action === 'deny') {
                                        const denial = result.reason ?? 'brAInwav prompt denied by policy';
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
                        const output = toolCalls.length === 0 ? renderMessageContent(aiMessage.content) : state.output;
                        if (toolCalls.length === 0 && output) {
                                await options.streamPublisher?.({ type: 'chunk', content: output });
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

                        const results = await dispatchTools(jobs, {
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
                        await safeRunHook(hooks, 'PreCompact', {
                                event: 'PreCompact',
                                cwd: state.session.cwd,
                                user: state.session.user,
                                model: state.session.model,
                        }, logger);
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
                                await options.streamPublisher?.({ type: 'final', content: finalOutput });
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
        graph.addConditionalEdges('parse_or_command', (state: N0State) => (state.output ? 'stream_and_log' : 'pre_prompt_hooks'));
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

function ensureHooks(hooks: HookRunner | undefined, options?: HookLoadOptions): Promise<HookRunner> {
        if (hooks) {
                                return Promise.resolve(hooks);
        }
        const instance = new CortexHooks();
        return instance.init(options).then(() => instance);
}

function createToolHookAdapter(hooks: HookRunner): ToolDispatchHooks {
        return {
                run: async (event, ctx) => hooks.run(event, ctx),
        };
}

function kernelToolToDefinition(tool: BoundKernelTool): ToolDefinition {
        return {
                name: tool.name,
                description: tool.description,
                schema: tool.schema,
                metadata: {
                        provider: 'kernel',
                        surface: tool.name,
                },
                async execute(input) {
                        const result = await tool.execute(input);
                        return {
                                content: renderOutput(result),
                                status: 'success',
                                metadata: { provider: 'kernel', surface: tool.name },
                                artifact: result,
                        } satisfies ToolExecutionOutput;
                },
        } satisfies ToolDefinition;
}

function subagentToolToDefinition(binding: SubagentToolBinding): ToolDefinition {
        return {
                name: binding.tool.name,
                description: binding.tool.description,
                schema: binding.tool.schema,
                metadata: binding.metadata,
                async execute(input) {
                        const response = await binding.tool.call(input, { caller: 'n0', depth: 0 });
                        const status: 'success' | 'error' = response.success ? 'success' : 'error';
                        const content = response.text ?? (response.error ? `brAInwav subagent error: ${response.error}` : '');
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

function extendCtx(base: Record<string, unknown> | undefined, patch: Record<string, unknown>): Record<string, unknown> {
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
                cloned.splice(1, 0, new SystemMessage({
                        content: instruction,
                        additional_kwargs: { 'brAInwav-plan': true },
                }));
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
                                        return String((part as { text?: unknown }).text ?? '');
                                }
                                try {
                                        return JSON.stringify(part);
                                } catch {
                                        return String(part);
                                }
                        })
                        .join('\n');
        }
        try {
                return JSON.stringify(content);
        } catch {
                return String(content);
        }
}

function renderOutput(value: unknown): string {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        try {
                return JSON.stringify(value);
        } catch {
                return String(value);
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

function compactMessages(messages: BaseMessage[], maxMessages: number, maxChars: number): BaseMessage[] {
        const preserved: BaseMessage[] = [];
        if (messages.length > 0) preserved.push(messages[0]);
        const remainder = messages.slice(-Math.max(0, maxMessages - preserved.length));
        let result = [...preserved, ...remainder];
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
                ? { strategy: 'plan', rationale: 'Detected long or multi-part request requiring coordination.' }
                : { strategy: 'direct', rationale: 'Prompt is concise; direct execution preferred.' };
}

function defaultSystemPrompt(): string {
        return [
                'You are brAInwav n0, the master orchestration loop for Cortex-OS.',
                'Coordinate kernel tools, workspace commands, and subagents to produce accurate, secure results.',
                'Always respect hook policies, filesystem/network allow-lists, and budget constraints.',
                'Explain tool usage briefly in natural language while keeping sensitive data protected.',
        ].join(' ');
}
