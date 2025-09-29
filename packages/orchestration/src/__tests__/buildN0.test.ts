import type { ContractSubagent } from '@cortex-os/agents';
import type { HookResult } from '@cortex-os/hooks';
import { AIMessage, type BaseMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
        type BuildN0Options,
        buildN0,
        type HookRunner,
        type ToolCallableModel,
        type ToolDefinition,
} from '../langgraph/n0-graph.js';
import type { N0Session } from '../langgraph/n0-state.js';

describe('buildN0 orchestration graph', () => {
        it('short-circuits to slash command execution', async () => {
                const runSlash = vi.fn().mockResolvedValue({ text: 'brAInwav command output' });
                const model: ToolCallableModel = new FailingModel();
                const { graph } = await buildN0(
                        createOptions({
                                runSlash,
                                model,
                        }),
                );

                const session = createSession();
                const result = await graph.invoke({ input: '/help', session });

                expect(result.output).toBe('brAInwav command output');
                expect(runSlash).toHaveBeenCalledTimes(1);
        });

        it('executes tool calls and returns model output', async () => {
                const schema = z.object({ text: z.string() });
                const tool: ToolDefinition = {
                        name: 'test.echo',
                        description: 'Echo tool',
                        schema,
                        async execute(input) {
                                const parsed = schema.parse(input);
                                return {
                                        content: `Echo:${parsed.text}`,
                                        status: 'success',
                                };
                        },
                } satisfies ToolDefinition;

                const { graph } = await buildN0(
                        createOptions({
                                model: new ToolLoopModel(),
                                orchestratorTools: [tool],
                        }),
                );

                const session = createSession();
                const result = await graph.invoke({ input: 'please use a tool', session });

                expect(result.output).toBe('Tool said: Echo:hi');
                const toolMessages = (result.messages ?? []).filter((message) => message.getType() === 'tool');
                expect(toolMessages).toHaveLength(1);
                expect((toolMessages[0] as ToolMessage).content).toBe('Echo:hi');
        });

        it('propagates slash command metadata into state context', async () => {
                const runSlash = vi.fn().mockResolvedValue({
                        text: 'metadata result',
                        metadata: {
                                command: {
                                        name: 'deploy',
                                        model: 'cortex-deploy',
                                        allowedTools: ['kernel.bash'],
                                },
                        },
                });

                const kernelBinding = {
                        tools: [],
                        metadata: {
                                brand: 'test kernel',
                                cwd: process.cwd(),
                                defaultModel: 'inherit',
                                allowLists: {
                                        bash: ['echo*'],
                                        filesystem: ['**/*.txt'],
                                        network: [],
                                },
                                timeoutMs: 10_000,
                                surfaces: [],
                                security: undefined,
                        },
                };

                const { graph } = await buildN0(
                        createOptions({
                                runSlash,
                                kernelBinding,
                        }),
                );

                const session = createSession();
                const result = await graph.invoke({ input: '/deploy main', session });

                expect(result.output).toBe('metadata result');
                expect(runSlash).toHaveBeenCalledWith(expect.objectContaining({ cmd: 'deploy' }), expect.any(Object));
                expect(result.ctx?.commandMetadata).toMatchObject({ name: 'deploy', model: 'cortex-deploy' });
                expect(result.ctx?.commandModel).toBe('cortex-deploy');
                expect(result.ctx?.commandAllowedTools).toEqual(['kernel.bash']);
                expect(result.ctx?.kernelToolkit).toEqual(kernelBinding.metadata);
        });
});

function createOptions(overrides: Partial<BuildN0Options>): BuildN0Options {
        return {
                model: overrides.model ?? new ToolLoopModel(),
                hooks: overrides.hooks ?? new NoopHooks(),
                runSlash: overrides.runSlash,
                runSlashOptions: overrides.runSlashOptions,
                kernelBinding:
                        overrides.kernelBinding ??
                        ({
                                tools: [],
                                metadata: {
                                        brand: 'test kernel',
                                        cwd: process.cwd(),
                                        defaultModel: 'inherit',
                                        allowLists: { bash: [], filesystem: [], network: [] },
                                        timeoutMs: 30_000,
                                        surfaces: [],
                                        security: undefined,
                                },
                        } satisfies BuildN0Options['kernelBinding']),
                kernelTools: overrides.kernelTools,
                kernelOptions: overrides.kernelOptions,
                subagents: overrides.subagents ?? new Map<string, ContractSubagent>(),
                orchestratorTools: overrides.orchestratorTools ?? [],
                disableSubagentDiscovery: true,
                toolAllowList: overrides.toolAllowList,
                toolConcurrency: overrides.toolConcurrency,
                systemPrompt: overrides.systemPrompt,
                planResolver: overrides.planResolver,
                compaction: overrides.compaction,
                logger: overrides.logger,
                streamPublisher: overrides.streamPublisher,
        } satisfies BuildN0Options;
}

function createSession(): N0Session {
        return {
                id: 'session-test',
                model: 'test-model',
                user: 'tester',
                cwd: process.cwd(),
        };
}

class NoopHooks implements HookRunner {
        async run(): Promise<HookResult[]> {
                return [];
        }
}

class FailingModel implements ToolCallableModel {
        bindTools(): ToolCallableModel {
                return this;
        }
        async invoke(): Promise<BaseMessage> {
                throw new Error('Model should not be invoked for slash commands');
        }
}

class ToolLoopModel implements ToolCallableModel {
        private callCount = 0;

        bindTools(): ToolCallableModel {
                return this;
        }

        async invoke(messages: BaseMessage[]): Promise<BaseMessage> {
                this.callCount += 1;
                if (this.callCount === 1) {
                        return new AIMessage({
                                content: '',
                                tool_calls: [
                                        {
                                                name: 'test.echo',
                                                args: { text: 'hi' },
                                                id: 'call-1',
                                                type: 'tool_call',
                                        },
                                ],
                        });
                }
                const toolOutput = findToolMessage(messages)?.content ?? 'no tool result';
                return new AIMessage({ content: `Tool said: ${toolOutput}` });
        }
}

function findToolMessage(messages: BaseMessage[]): ToolMessage | undefined {
        for (let index = messages.length - 1; index >= 0; index -= 1) {
                const candidate = messages[index];
                if (candidate instanceof ToolMessage) {
                        return candidate;
                }
        }
        return undefined;
}
