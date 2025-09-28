import { describe, expect, it, vi } from 'vitest';
import { loadSubagents, subagentTools } from '../../src/subagents/api.js';
import { BaseSubagent } from '../../src/subagents/BaseSubagent.js';
import { SubagentManager, type SubagentLoadOptions } from '../../src/subagents/SubagentManager.js';
import type {
        SubagentConfig as LegacySubagentConfig,
        SubagentRunInput,
        SubagentRunResult,
} from '../../src/lib/types.js';
import type { SubagentConfig as ContractSubagentConfig } from '../../src/nO/contracts.js';

class EchoSubagent extends BaseSubagent {
        constructor(config: LegacySubagentConfig) {
                super(config);
        }

        async execute(input: SubagentRunInput): Promise<SubagentRunResult> {
                return {
                        success: true,
                        result: `echo:${input.task}`,
                        metrics: {
                                messagesProcessed: 1,
                                totalTokensUsed: 10,
                                averageResponseTime: 15,
                                errorRate: 0,
                                lastUpdated: new Date().toISOString(),
                        },
                } satisfies SubagentRunResult;
        }
}

class StubSubagentManager extends SubagentManager {
        public initializeCalledWith?: SubagentLoadOptions;

        constructor(
                private readonly instances: Map<string, BaseSubagent>,
                private readonly configs: Map<string, ContractSubagentConfig>,
        ) {
                super();
        }

        override async initialize(options: SubagentLoadOptions): Promise<void> {
                this.initializeCalledWith = options;
        }

        override async loadSubagents(): Promise<Map<string, BaseSubagent>> {
                return new Map(this.instances);
        }

        override getSubagentConfig(name: string): ContractSubagentConfig | undefined {
                return this.configs.get(name);
        }
}

describe('subagent integration surface', () => {
        it('adapts provided manager instances and exposes orchestration tools', async () => {
                const baseConfig: LegacySubagentConfig = {
                        name: 'echo',
                        description: 'Echo test agent',
                        capabilities: ['analysis'],
                        tools: ['shell.exec'],
                        path: '/tmp/echo.md',
                        maxConcurrency: 1,
                        timeout: 30_000,
                        systemPrompt: 'You are echo.',
                        scope: 'project',
                        model: 'inherit',
                } satisfies LegacySubagentConfig;

                const contractConfig: ContractSubagentConfig = {
                        name: 'echo',
                        description: 'Echo test agent',
                        capabilities: ['analysis'],
                        tools: ['shell.exec'],
                        path: '/tmp/echo.md',
                        maxConcurrency: 1,
                        timeout: 30_000,
                        systemPrompt: 'You are echo.',
                        scope: 'project',
                        model: 'inherit',
                } satisfies ContractSubagentConfig;

                const manager = new StubSubagentManager(
                        new Map([[baseConfig.name, new EchoSubagent(baseConfig)]]),
                        new Map([[contractConfig.name, contractConfig]]),
                );

                const { subagents, manager: returnedManager } = await loadSubagents({ manager });

                expect(returnedManager).toBe(manager);
                expect(manager.initializeCalledWith).toBeUndefined();

                const contract = subagents.get('echo');
                expect(contract).toBeDefined();

                const runResult = await contract!.execute({ task: 'ping' });
                expect(runResult.output).toBe('echo:ping');
                expect(runResult.metrics).toMatchObject({ tokensUsed: 10, executionTime: 15 });

                const directBindings = subagentTools(subagents, { includeAutoDelegate: false });
                expect(directBindings).toHaveLength(1);
                expect(directBindings[0]?.tool.name).toBe('agent.echo');
                expect(directBindings[0]?.metadata).toMatchObject({
                        provider: 'subagent',
                        agent: 'echo',
                        capabilities: ['analysis'],
                });

                const selector = vi.fn().mockResolvedValue([contract!.config]);
                const bindingsWithAuto = subagentTools(subagents, {
                        includeAutoDelegate: true,
                        autoDelegateSelector: selector,
                });
                expect(bindingsWithAuto).toHaveLength(2);

                const autoBinding = bindingsWithAuto.find((binding) => binding.tool.name === 'agent.autodelegate');
                expect(autoBinding?.metadata).toMatchObject({
                        provider: 'orchestration',
                        capabilities: ['delegation'],
                });

                const autoResult = await autoBinding!.tool.call({ task: 'ping', k: 1 });
                expect(selector).toHaveBeenCalledWith('ping', 1);
                expect(autoResult.success).toBe(true);
                expect(autoResult.text).toContain('[echo]');
        });
});
