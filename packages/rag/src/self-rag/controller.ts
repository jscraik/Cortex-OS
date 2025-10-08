import type { GraphRagQuery, GraphRagResult } from '@cortex-os/memory-core';

export interface SelfRagPolicy {
        enabled: boolean;
        maxRounds: number;
        critique: boolean;
        minAnswerLength: number;
        minCitations: number;
}

export interface SelfRagRunContext {
        initialQuery: GraphRagQuery;
        runQuery: (query: GraphRagQuery) => Promise<GraphRagResult>;
}

export interface SelfRagMetrics {
        rounds: number;
        retrievalCalls: number;
        critiques: string[];
        finalQuery: GraphRagQuery;
}

export interface SelfRagOutput {
        result: GraphRagResult;
        metrics: SelfRagMetrics;
}

export interface SelfRagController {
        run(context: SelfRagRunContext): Promise<SelfRagOutput>;
}

const DEFAULT_POLICY: SelfRagPolicy = {
        enabled: true,
        maxRounds: 2,
        critique: true,
        minAnswerLength: 24,
        minCitations: 1,
};

const needsRetry = (result: GraphRagResult, policy: SelfRagPolicy): boolean => {
        if (!policy.enabled) return false;
        const answerLength = (result.answer ?? '').trim().length;
        const citationCount = result.citations?.length ?? 0;
        if (answerLength < policy.minAnswerLength) return true;
        if (citationCount < policy.minCitations) return true;
        return false;
};

const buildCritique = (
        result: GraphRagResult,
        round: number,
        policy: SelfRagPolicy,
): string => {
        const answerLength = (result.answer ?? '').trim().length;
        const citationCount = result.citations?.length ?? 0;
        const critiques: string[] = [];
        if (answerLength < policy.minAnswerLength) {
                critiques.push(`answer too short (${answerLength} chars)`);
        }
        if (citationCount < policy.minCitations) {
                critiques.push(`insufficient citations (${citationCount})`);
        }
        const message = critiques.join('; ') || 'no issues detected';
        return `Round ${round + 1}: ${message}`;
};

const adjustQuery = (query: GraphRagQuery, round: number): GraphRagQuery => {
        const nextK = Math.min(50, (query.k ?? 8) + 8 * (round + 1));
        const nextMaxHops = Math.min(3, (query.maxHops ?? 1) + 1);
        return {
                ...query,
                k: nextK,
                maxHops: nextMaxHops,
                includeCitations: true,
        } satisfies GraphRagQuery;
};

export const createSelfRagController = (policy?: Partial<SelfRagPolicy>): SelfRagController => {
        const merged: SelfRagPolicy = { ...DEFAULT_POLICY, ...policy };

        const run = async ({ initialQuery, runQuery }: SelfRagRunContext): Promise<SelfRagOutput> => {
                const critiques: string[] = [];
                let currentQuery: GraphRagQuery = { ...initialQuery };
                let currentResult: GraphRagResult | undefined;
                let retrievalCalls = 0;
                let rounds = 0;

                const maxRounds = Math.max(1, merged.maxRounds);

                while (true) {
                        retrievalCalls += 1;
                        currentResult = await runQuery(currentQuery);

                        const retry = needsRetry(currentResult, merged);
                        if (!retry || rounds >= maxRounds - 1) {
                                break;
                        }

                        if (merged.critique) {
                                critiques.push(buildCritique(currentResult, rounds, merged));
                        }

                        rounds += 1;
                        currentQuery = adjustQuery(currentQuery, rounds);
                }

                const metrics: SelfRagMetrics = {
                        rounds,
                        retrievalCalls,
                        critiques,
                        finalQuery: currentQuery,
                };

                return {
                        result: currentResult!,
                        metrics,
                } satisfies SelfRagOutput;
        };

        return { run } satisfies SelfRagController;
};
