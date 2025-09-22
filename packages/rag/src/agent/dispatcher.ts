export interface Strategy {
    id: string;
    // Simple matcher over document metadata (e.g., docType/category)
    matches(meta: Record<string, unknown> | undefined): boolean;
}

export interface DispatcherOptions {
    epsilon?: number; // exploration probability for A/B (0..1)
    learningRate?: number; // weight update step
}

export interface FeedbackEvent {
    docType?: string;
    strategyId: string;
    success: boolean;
    magnitude?: number; // optional weight of feedback
}

interface WeightTable {
    [strategyId: string]: number;
}

import { generateRunId, recordOperation } from '@cortex-os/observability';

export class AgenticDispatcher {
    private readonly strategies: Strategy[];
    private readonly eps: number;
    private readonly lr: number;
    private readonly weights = new Map<string, WeightTable>(); // by docType

    constructor(strategies: Strategy[], options?: DispatcherOptions) {
        this.strategies = strategies.slice();
        this.eps = clamp01(options?.epsilon ?? 0.1);
        this.lr = Math.max(0.0001, options?.learningRate ?? 0.05);
    }

    choose(meta?: Record<string, unknown>): Strategy {
        const docType = getDocType(meta);
        if (Math.random() < this.eps) return this.randomStrategy();
        return this.bestStrategyFor(docType);
    }

    chooseWithMetrics(meta: Record<string, unknown> | undefined, label = 'rag.dispatch'): Strategy {
        const s = this.choose(meta);
        // Record a decision as a successful operation (selection event)
        recordOperation(`${label}.decision`, true, generateRunId(), {
            strategyId: s.id,
            docType: getDocType(meta),
        });
        return s;
    }

    recordFeedback(ev: FeedbackEvent): void {
        const docType = ev.docType ?? 'default';
        const table = this.ensureWeights(docType);
        const delta = (ev.success ? 1 : -1) * (ev.magnitude ?? 1) * this.lr;
        table[ev.strategyId] = (table[ev.strategyId] ?? 0) + delta;
        // Emit a success/failure operation
        recordOperation('rag.dispatch.feedback', ev.success, generateRunId(), {
            strategyId: ev.strategyId,
            docType,
        });
    }

    getWeights(docType?: string): Record<string, number> {
        const t = this.weights.get(docType ?? 'default') ?? {};
        return { ...t };
    }

    private bestStrategyFor(docType: string): Strategy {
        const table = this.ensureWeights(docType);
        let best: Strategy | null = null;
        let bestW = -Infinity;
        for (const s of this.strategies) {
            const w = table[s.id] ?? 0;
            if (w > bestW) {
                best = s;
                bestW = w;
            }
        }
        return best ?? this.strategies[0];
    }

    private randomStrategy(): Strategy {
        const i = Math.floor(Math.random() * Math.max(1, this.strategies.length));
        return this.strategies[Math.min(i, this.strategies.length - 1)];
    }

    private ensureWeights(docType: string): WeightTable {
        const key = docType || 'default';
        let t = this.weights.get(key);
        if (!t) {
            t = {};
            for (const s of this.strategies) t[s.id] = 0; // start neutral
            this.weights.set(key, t);
        }
        return t;
    }
}

function getDocType(meta?: Record<string, unknown>): string {
    const v = meta?.docType ?? meta?.category;
    return typeof v === 'string' && v ? v : 'default';
}

function clamp01(x: number): number {
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
}

export function createAgenticDispatcher(strategies: Strategy[], options?: DispatcherOptions) {
    return new AgenticDispatcher(strategies, options);
}
