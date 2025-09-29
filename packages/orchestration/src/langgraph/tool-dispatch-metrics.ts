import type { N0Session } from './n0-state.js';
import { meter } from '../observability/otel.js';

interface DispatchMetricAttributes {
        tool: string;
        provider: string;
        sessionId?: string;
        tags?: string;
}

interface DispatchSnapshot {
        started: number;
        active: number;
        outcomes: Record<'fulfilled' | 'rejected' | 'skipped', number>;
        tokens: number;
}

const activeDispatchGauge = meter.createUpDownCounter('brAInwav.tool_dispatch.active', {
        description: 'Number of LangGraph tool dispatches currently in flight',
});

const completedCounter = meter.createCounter('brAInwav.tool_dispatch.completed_total', {
        description: 'Total LangGraph tool dispatch completions by outcome',
});

const skippedCounter = meter.createCounter('brAInwav.tool_dispatch.skipped_total', {
        description: 'Total LangGraph tool dispatches skipped before execution',
});

const durationHistogram = meter.createHistogram('brAInwav.tool_dispatch.duration_ms', {
        description: 'Duration of LangGraph tool dispatch executions',
        unit: 'ms',
});

const tokenCounter = meter.createCounter('brAInwav.tool_dispatch.tokens_total', {
        description: 'Aggregate token usage reported by LangGraph tool dispatch',
});

const snapshot: DispatchSnapshot = {
        started: 0,
        active: 0,
        outcomes: {
                fulfilled: 0,
                rejected: 0,
                skipped: 0,
        },
        tokens: 0,
};

function toAttributes(tool: string, metadata: Record<string, unknown> | undefined, session?: N0Session): DispatchMetricAttributes {
        const provider = typeof metadata?.provider === 'string' ? metadata.provider : 'unknown';
        const tags = Array.isArray(metadata?.tags)
                ? metadata?.tags.filter((tag): tag is string => typeof tag === 'string').join(',')
                : undefined;
        return {
                tool,
                provider,
                sessionId: session?.id,
                tags,
        };
}

function addToGauge(delta: number, attributes: DispatchMetricAttributes): void {
        activeDispatchGauge.add(delta, {
                tool: attributes.tool,
                provider: attributes.provider,
                session_id: attributes.sessionId,
                tags: attributes.tags,
        });
}

export function recordDispatchStart(
        tool: string,
        metadata: Record<string, unknown> | undefined,
        session: N0Session,
): void {
        snapshot.started += 1;
        snapshot.active += 1;
        const attributes = toAttributes(tool, metadata, session);
        addToGauge(1, attributes);
}

export function recordDispatchSkip(
        tool: string,
        metadata: Record<string, unknown> | undefined,
        session: N0Session,
): void {
        recordDispatchOutcome(tool, 'skipped', undefined, undefined, metadata, session);
}

export function recordDispatchOutcome(
        tool: string,
        outcome: 'fulfilled' | 'rejected' | 'skipped',
        durationMs: number | undefined,
        tokensUsed: number | undefined,
        metadata: Record<string, unknown> | undefined,
        session: N0Session,
): void {
        const attributes = toAttributes(tool, metadata, session);
        if (outcome !== 'skipped') {
                snapshot.active = Math.max(0, snapshot.active - 1);
                addToGauge(-1, attributes);
        }

        snapshot.outcomes[outcome] += 1;

        const labels = {
                tool: attributes.tool,
                provider: attributes.provider,
                session_id: attributes.sessionId,
                outcome,
                tags: attributes.tags,
        } as Record<string, string | undefined>;

        if (outcome === 'skipped') {
                skippedCounter.add(1, labels);
                return;
        }

        completedCounter.add(1, labels);

        if (typeof durationMs === 'number' && Number.isFinite(durationMs)) {
                durationHistogram.record(Math.max(0, durationMs), labels);
        }

        if (typeof tokensUsed === 'number' && Number.isFinite(tokensUsed)) {
                tokenCounter.add(Math.max(0, tokensUsed), labels);
                snapshot.tokens += Math.max(0, tokensUsed);
        }
}

export function getDispatchMetricsSnapshot(): DispatchSnapshot {
        return {
                started: snapshot.started,
                active: snapshot.active,
                outcomes: { ...snapshot.outcomes },
                tokens: snapshot.tokens,
        };
}

export function resetDispatchMetricsSnapshot(): void {
        snapshot.started = 0;
        snapshot.active = 0;
        snapshot.outcomes.fulfilled = 0;
        snapshot.outcomes.rejected = 0;
        snapshot.outcomes.skipped = 0;
        snapshot.tokens = 0;
}
