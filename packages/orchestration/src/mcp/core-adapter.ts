import { randomUUID } from 'node:crypto';

import { auditEvent, record } from '../lib/audit.js';
import { provideOrchestration, type OrchestrationFacade } from '../service.js';
import {
        OrchestrationStrategy,
        TaskStatus,
        type Agent,
        type PlanningContext,
        type Task,
} from '../types.js';

export interface WorkflowExecutionPayload {
        cacheKey: string;
        workflowId: string;
        task: Task;
        agents: Agent[];
        planningContext: Partial<PlanningContext>;
        metadata: Record<string, unknown>;
}

export interface WorkflowExecutionResult {
        result: unknown;
        fromCache: boolean;
}

export type OrchestrationMcpConfig = {
        cacheTtlMs: number;
        cacheSize: number;
        rateLimit: {
                maxConcurrent: number;
                windowMs: number;
        };
};

const DEFAULT_CONFIG: OrchestrationMcpConfig = {
        cacheTtlMs: 30_000,
        cacheSize: 32,
        rateLimit: {
                maxConcurrent: 3,
                windowMs: 1_000,
        },
};

class RateLimitError extends Error {
        constructor(readonly retryInMs: number) {
                super('orchestration core rate limit exceeded');
                this.name = 'RateLimitError';
        }
}

const cacheStore = new Map<string, { expiresAt: number; payload: unknown }>();
const cacheOrder: string[] = [];
let cachedFacade: OrchestrationFacade | null = null;
let activeExecutions = 0;
let rateWindowStart = Date.now();
let config: OrchestrationMcpConfig = { ...DEFAULT_CONFIG };

function getFacade(): OrchestrationFacade {
        if (!cachedFacade) {
                cachedFacade = provideOrchestration();
        }
        return cachedFacade;
}

function touchCache(key: string) {
        const idx = cacheOrder.indexOf(key);
        if (idx !== -1) {
                cacheOrder.splice(idx, 1);
        }
        cacheOrder.push(key);
        while (cacheOrder.length > config.cacheSize) {
                const evicted = cacheOrder.shift();
                if (evicted) {
                        cacheStore.delete(evicted);
                }
        }
}

function getFromCache(key: string, now: number) {
        const cached = cacheStore.get(key);
        if (!cached) return null;
        if (cached.expiresAt <= now) {
                cacheStore.delete(key);
                const idx = cacheOrder.indexOf(key);
                if (idx !== -1) cacheOrder.splice(idx, 1);
                return null;
        }
        touchCache(key);
        return cached.payload;
}

function setCache(key: string, payload: unknown, now: number) {
        const entry = { expiresAt: now + config.cacheTtlMs, payload };
        cacheStore.set(key, entry);
        touchCache(key);
}

async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
        const snapshot = new Map(cacheStore);
        const snapshotOrder = [...cacheOrder];
        try {
                return await fn();
        } catch (error) {
                cacheStore.clear();
                for (const [key, value] of snapshot) {
                        cacheStore.set(key, value);
                }
                cacheOrder.splice(0, cacheOrder.length, ...snapshotOrder);
                throw error;
        }
}

function resetRateWindow(now: number) {
        if (now - rateWindowStart > config.rateLimit.windowMs) {
                rateWindowStart = now;
                activeExecutions = 0;
        }
}

async function recordAuditSafely(tool: string, action: string, workflowId: string, data: unknown) {
        try {
                await record(
                        auditEvent(tool, action, { runId: workflowId, traceId: randomUUID() }, data),
                );
        } catch {
                // swallow audit failures to avoid blocking orchestration execution
        }
}

export async function executeWorkflowThroughCore(
        payload: WorkflowExecutionPayload,
): Promise<WorkflowExecutionResult> {
        const now = Date.now();
        resetRateWindow(now);
        if (activeExecutions >= config.rateLimit.maxConcurrent) {
                throw new RateLimitError(Math.max(config.rateLimit.windowMs - (now - rateWindowStart), 1));
        }
        const cached = getFromCache(payload.cacheKey, now);
        if (cached) {
                return { result: cached, fromCache: true };
        }

        activeExecutions += 1;
        try {
                await recordAuditSafely(
                        'orchestration.workflow',
                        'started',
                        payload.workflowId,
                        { taskId: payload.task.id },
                );

                const orchestrator = getFacade();
                const result = await withTransaction(async () =>
                        orchestrator.run(payload.task, payload.agents, payload.planningContext, []),
                );

                setCache(payload.cacheKey, result, now);

                await recordAuditSafely(
                        'orchestration.workflow',
                        'completed',
                        payload.workflowId,
                        {
                                success: Boolean((result as { success?: boolean }).success ?? true),
                                orchestrationId: (result as { orchestrationId?: string }).orchestrationId,
                        },
                );

                return { result, fromCache: false };
        } catch (error) {
                await recordAuditSafely(
                        'orchestration.workflow',
                        'failed',
                        payload.workflowId,
                        {
                                message: error instanceof Error ? error.message : String(error),
                        },
                );
                throw error;
        } finally {
                activeExecutions = Math.max(0, activeExecutions - 1);
        }
}

export function configureOrchestrationMcp(
        overrides: Partial<OrchestrationMcpConfig> & {
                rateLimit?: Partial<OrchestrationMcpConfig['rateLimit']>;
        } = {},
) {
        if (overrides.cacheTtlMs !== undefined) {
                config.cacheTtlMs = Math.max(0, overrides.cacheTtlMs);
        }
        if (overrides.cacheSize !== undefined) {
                config.cacheSize = Math.max(0, overrides.cacheSize);
        }
        if (overrides.rateLimit) {
                config.rateLimit = {
                        ...config.rateLimit,
                        ...overrides.rateLimit,
                };
        }
}

export function __resetOrchestrationMcpState() {
        cacheStore.clear();
        cacheOrder.length = 0;
        activeExecutions = 0;
        rateWindowStart = Date.now();
        if (cachedFacade) {
                const facade = cachedFacade;
                cachedFacade = null;
                try {
                        const shutdownResult = facade.shutdown();
                        if (shutdownResult && typeof (shutdownResult as Promise<unknown>).catch === 'function') {
                                (shutdownResult as Promise<unknown>).catch(() => {});
                        }
                } catch {
                        // ignore shutdown errors during reset
                }
        }
}

export function getDefaultOrchestrationPlanningContext(
        strategy: OrchestrationStrategy,
        estimatedDuration: number,
        agents: Agent[],
): Partial<PlanningContext> {
        const now = new Date();
        return {
                availableAgents: agents,
                preferences: {
                        strategy,
                        quality: 'balanced',
                        failureHandling: 'resilient',
                },
                resources: {
                        memory: 0,
                        compute: 0,
                        storage: 0,
                },
                constraints: {
                        maxDuration: estimatedDuration || 0,
                        maxCost: 0,
                        availabilityWindow: [now, now],
                },
        };
}

export { RateLimitError };
