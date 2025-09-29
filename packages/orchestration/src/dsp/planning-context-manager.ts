import { PlanningContext } from '../utils/dsp.js';

export interface PlanningContextManagerOptions {
        maxContexts?: number;
        historyLimit?: number;
        stepLimit?: number;
        clock?: () => Date;
}

interface StoredContext {
        context: PlanningContext;
        updatedAt: number;
        revision: number;
}

export class PlanningContextManager {
        private readonly maxContexts: number;
        private readonly historyLimit: number;
        private readonly stepLimit: number;
        private readonly clock: () => Date;
        private readonly contexts = new Map<string, StoredContext>();
        private readonly order: string[] = [];

        constructor(options: PlanningContextManagerOptions = {}) {
                this.maxContexts = Math.max(1, options.maxContexts ?? 8);
                this.historyLimit = Math.max(1, options.historyLimit ?? 25);
                this.stepLimit = Math.max(1, options.stepLimit ?? 25);
                this.clock = options.clock ?? (() => new Date());
        }

        register(taskId: string, context: PlanningContext): void {
                const trimmed = this.trimContext(context);
                const stored: StoredContext = {
                        context: this.cloneContext(trimmed),
                        updatedAt: this.clock().getTime(),
                        revision: (this.contexts.get(taskId)?.revision ?? 0) + 1,
                };
                this.contexts.set(taskId, stored);
                this.touch(taskId);
                this.evictIfNeeded();
        }

        isolate(_taskId: string, context: PlanningContext): PlanningContext {
                const trimmed = this.trimContext(context);
                return this.cloneContext(trimmed);
        }

        snapshot(taskId: string): PlanningContext | undefined {
                const stored = this.contexts.get(taskId);
                if (!stored) {
                        return undefined;
                }
                return this.cloneContext(stored.context);
        }

        clear(taskId: string): void {
                this.contexts.delete(taskId);
                const index = this.order.indexOf(taskId);
                if (index >= 0) {
                        this.order.splice(index, 1);
                }
        }

        clearAll(): void {
                this.contexts.clear();
                this.order.length = 0;
        }

        get size(): number {
                return this.contexts.size;
        }

        private trimContext(context: PlanningContext): PlanningContext {
                const trimmed = this.cloneContext(context);

                if (trimmed.history.length > this.historyLimit) {
                        trimmed.history = trimmed.history.slice(-this.historyLimit);
                }

                if (trimmed.steps.length > this.stepLimit) {
                        trimmed.steps = trimmed.steps.slice(-this.stepLimit);
                }

                trimmed.history = trimmed.history.map((entry) => ({
                        ...entry,
                        timestamp: new Date(entry.timestamp),
                }));
                trimmed.steps = trimmed.steps.map((step) => ({
                        ...step,
                        timestamp: new Date(step.timestamp),
                }));
                trimmed.metadata = {
                        ...trimmed.metadata,
                        createdAt: new Date(trimmed.metadata.createdAt),
                        updatedAt: new Date(trimmed.metadata.updatedAt),
                };

                return trimmed;
        }

        private cloneContext(context: PlanningContext): PlanningContext {
                if (typeof structuredClone === 'function') {
                        return structuredClone(context);
                }
                return JSON.parse(JSON.stringify(context, jsonDateReplacer), jsonDateReviver);
        }

        private touch(taskId: string): void {
                const index = this.order.indexOf(taskId);
                if (index >= 0) {
                        this.order.splice(index, 1);
                }
                this.order.push(taskId);
        }

        private evictIfNeeded(): void {
                while (this.order.length > this.maxContexts) {
                        const oldest = this.order.shift();
                        if (oldest) {
                                this.contexts.delete(oldest);
                        }
                }
        }
}

function jsonDateReplacer(_key: string, value: unknown): unknown {
        if (value instanceof Date) {
                return value.toISOString();
        }
        return value;
}

function jsonDateReviver(_key: string, value: unknown): unknown {
        if (typeof value === 'string') {
                const timestamp = Date.parse(value);
                if (!isNaN(timestamp)) {
                        return new Date(value);
                }
        }
        return value;
}
