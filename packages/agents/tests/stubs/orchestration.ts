export interface ToolDispatchJob {
        id: string;
        name: string;
        metadata?: Record<string, unknown>;
        estimateTokens?: number;
        execute?: (input: unknown) => unknown | Promise<unknown>;
        input?: unknown;
}

export interface ToolDispatchResult {
        id: string;
        name: string;
        status: 'fulfilled' | 'rejected';
        value?: unknown;
        error?: unknown;
        durationMs: number;
        tokensUsed: number;
        metadata?: Record<string, unknown>;
        started: boolean;
}

export function agentStateToN0(agent: any, session: any) {
        return {
                input: agent?.messages?.[0]?.content ?? '',
                session,
                ctx: {
                        currentAgent: agent?.currentAgent,
                        taskType: agent?.taskType,
                },
                messages: agent?.messages ?? [],
                output:
                        typeof agent?.result?.content === 'string'
                                ? agent.result.content
                                : agent?.messages?.at(-1)?.content ?? '',
        };
}

export async function dispatchTools(jobs: ToolDispatchJob[]): Promise<ToolDispatchResult[]> {
        return Promise.all(
                jobs.map(async (job) => {
                        try {
                                const value = await job.execute?.(job.input);
                                return {
                                        id: job.id,
                                        name: job.name,
                                        status: 'fulfilled' as const,
                                        value,
                                        durationMs: 1,
                                        tokensUsed: job.estimateTokens ?? 0,
                                        metadata: job.metadata,
                                        started: true,
                                };
                        } catch (error) {
                                return {
                                        id: job.id,
                                        name: job.name,
                                        status: 'rejected' as const,
                                        error,
                                        durationMs: 1,
                                        tokensUsed: job.estimateTokens ?? 0,
                                        metadata: job.metadata,
                                        started: true,
                                };
                        }
                }),
        );
}

export default {
        agentStateToN0,
        dispatchTools,
};
