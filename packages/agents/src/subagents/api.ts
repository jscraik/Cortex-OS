import type {
        Subagent as ContractSubagent,
        SubagentConfig,
        SubagentRunInput,
        SubagentRunResult,
        HealthStatus,
} from '../nO/contracts.js';
import type { SubagentLoadOptions } from './SubagentManager.js';
import { SubagentManager } from './SubagentManager.js';
import type { BaseSubagent } from './BaseSubagent.js';
import { createAutoDelegateTool, materializeSubagentTool, type Tool } from './SubagentTool.js';

export interface LoadSubagentsOptions extends SubagentLoadOptions {
        manager?: SubagentManager;
        initializeProvidedManager?: boolean;
}

export interface LoadedSubagents {
        manager: SubagentManager;
        subagents: Map<string, ContractSubagent>;
}

export interface SubagentToolBinding {
        tool: Tool;
        metadata: Record<string, unknown>;
}

export interface SubagentToolsOptions {
        includeAutoDelegate?: boolean;
        autoDelegateSelector?: (task: string, k: number) => Promise<SubagentConfig[]>;
}

export async function loadSubagents(options: LoadSubagentsOptions = {}): Promise<LoadedSubagents> {
        const { manager: providedManager, initializeProvidedManager = false, ...loadOptions } = options;
        const manager = providedManager ?? new SubagentManager();
        if (!providedManager || initializeProvidedManager) {
                await manager.initialize(loadOptions);
        }
        const loaded = await manager.loadSubagents();
        const subagents = new Map<string, ContractSubagent>();

        for (const [name, instance] of loaded) {
                const config = manager.getSubagentConfig(name);
                if (!config) {
                        console.warn('[brAInwav/subagents] missing configuration for', name);
                        continue;
                }
                const adapted = adaptSubagent(name, instance, config);
                if (adapted) {
                        subagents.set(name, adapted);
                }
        }

        return { manager, subagents };
}

export function subagentTools(
        subagents: Map<string, ContractSubagent>,
        options: SubagentToolsOptions = {},
): SubagentToolBinding[] {
        const bindings: SubagentToolBinding[] = [];
        for (const [name, subagent] of subagents) {
                const tool = materializeSubagentTool(subagent.config, subagent);
                bindings.push({
                        tool,
                        metadata: {
                                provider: 'subagent',
                                agent: name,
                                scope: subagent.config.scope,
                                capabilities: subagent.config.capabilities,
                        },
                });
        }

        if (options.includeAutoDelegate !== false && subagents.size > 0) {
                const autoDelegate = createAutoDelegateTool(subagents, options.autoDelegateSelector);
                bindings.push({
                        tool: autoDelegate,
                        metadata: {
                                provider: 'orchestration',
                                agent: 'agent.autodelegate',
                                scope: 'system',
                                capabilities: ['delegation'],
                        },
                });
        }

        return bindings;
}

function adaptSubagent(
        name: string,
        instance: BaseSubagent,
        config: SubagentConfig,
): ContractSubagent | null {
        const runner = resolveRunner(instance);
        if (!runner) {
                console.warn('[brAInwav/subagents] subagent lacks execute implementation', { name });
                return null;
        }

        return {
                config,
                async execute(input: SubagentRunInput): Promise<SubagentRunResult> {
                        const started = Date.now();
                        try {
                                const raw = await runner(input);
                                return normaliseRunResult(raw, Date.now() - started);
                        } catch (error) {
                                const message = error instanceof Error ? error.message : String(error);
                                return {
                                        output: `brAInwav subagent ${name} failed: ${message}`,
                                        metrics: { tokensUsed: 0, executionTime: Date.now() - started },
                                        error: message,
                                };
                        }
                },
                async initialize(): Promise<void> {
                        if (typeof (instance as { initialize?: () => Promise<void> }).initialize === 'function') {
                                await (instance as { initialize: () => Promise<void> }).initialize();
                        }
                },
                async cleanup(): Promise<void> {
                        if (typeof instance.removeAllListeners === 'function') {
                                instance.removeAllListeners();
                        }
                },
                async getHealth(): Promise<HealthStatus> {
                        if (typeof (instance as { getHealth?: () => Promise<HealthStatus> }).getHealth === 'function') {
                                return await (instance as { getHealth: () => Promise<HealthStatus> }).getHealth();
                        }
                        return {
                                healthy: true,
                                lastCheck: new Date().toISOString(),
                                responseTime: 0,
                                errorRate: 0,
                                consecutiveFailures: 0,
                        } satisfies HealthStatus;
                },
                getAvailableTools(): string[] {
                        return config.tools ?? [];
                },
        } satisfies ContractSubagent;
}

function resolveRunner(
        instance: BaseSubagent,
): ((input: SubagentRunInput) => Promise<unknown>) | null {
        if (typeof (instance as { executeWithValidation?: (input: unknown) => Promise<unknown> }).executeWithValidation === 'function') {
                return async (input: SubagentRunInput) =>
                        await (instance as { executeWithValidation: (input: unknown) => Promise<unknown> }).executeWithValidation(input);
        }
        if (typeof instance.execute === 'function') {
                return async (input: SubagentRunInput) => await instance.execute(input);
        }
        return null;
}

function normaliseRunResult(raw: unknown, duration: number): SubagentRunResult {
        if (raw && typeof raw === 'object') {
                const candidate = raw as {
                        output?: unknown;
                        result?: unknown;
                        artifacts?: Record<string, unknown>;
                        metrics?: {
                                tokensUsed?: number;
                                executionTime?: number;
                                totalTokensUsed?: number;
                                averageResponseTime?: number;
                        };
                        error?: unknown;
                        traceId?: unknown;
                };
                const outputSource = candidate.output ?? candidate.result ?? '';
                const text = renderOutput(outputSource);
                const metrics = candidate.metrics
                        ? {
                                tokensUsed:
                                        typeof candidate.metrics.tokensUsed === 'number'
                                                ? candidate.metrics.tokensUsed
                                                : typeof candidate.metrics.totalTokensUsed === 'number'
                                                ? candidate.metrics.totalTokensUsed
                                                : 0,
                                executionTime:
                                        typeof candidate.metrics.executionTime === 'number'
                                                ? candidate.metrics.executionTime
                                                : typeof candidate.metrics.averageResponseTime === 'number'
                                                ? candidate.metrics.averageResponseTime
                                                : duration,
                        }
                        : { tokensUsed: 0, executionTime: duration };
                return {
                        output: text,
                        artifacts: candidate.artifacts,
                        metrics,
                        error: typeof candidate.error === 'string' ? candidate.error : undefined,
                        traceId: typeof candidate.traceId === 'string' ? candidate.traceId : undefined,
                } satisfies SubagentRunResult;
        }

        return {
                output: renderOutput(raw),
                metrics: { tokensUsed: 0, executionTime: duration },
        } satisfies SubagentRunResult;
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
