/**
 * Deterministic Scheduler (Module A)
 *
 * Contract:
 * - schedule(tasks, options?) => executes tasks in deterministic order (priority desc, then stable hash of id)
 * - executeWithSeed(tasks, seed) => same ordering & result trace for identical inputs
 * - replay(trace) => re-executes recorded tasks (mockable) and produces identical executionHash
 *
 * Determinism rules:
 * 1. Primary sort: higher numeric priority first (default 0)
 * 2. Secondary sort: stable hash (blake3 fallback: simple FNV-1a here to avoid dependency growth) of id + seed
 * 3. Concurrency window: slice of tasks up to maxConcurrent executed sequentially within that window to avoid race nondeterminism
 * 4. Each task returns a value or void; errors captured as failure entries but do not abort unless options.failFast
 *
 * NOTE: Implementation intentionally lean; extended features (resource-based gating) can be layered without changing public shape.
 */

export interface DeterministicTask<T = unknown> {
    id: string;
    priority?: number; // higher runs earlier
    execute: () => Promise<T> | T;
    memoryMB?: number;
}

export interface ScheduleOptions {
    seed?: string;
    maxConcurrent?: number; // currently treated as batch size executed sequentially
    maxMemoryMB?: number; // soft limit; batch trimmed if exceeded
    failFast?: boolean;
}

export interface ExecutionRecord<T = unknown> {
    id: string;
    success: boolean;
    value?: T;
    error?: string;
    startedAt: number;
    endedAt: number;
}

export interface ScheduleResult<T = unknown> {
    records: Array<ExecutionRecord<T>>;
    executionHash: string; // hash over ordered (id, success, value|error)
    seed: string;
}

const DEFAULT_MAX_CONCURRENT = 4;

// Simple FNV-1a 32-bit for stable ordering; deterministic across platforms.
const fnv1a = (input: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0; // uint32 overflow
    }
    return hash >>> 0;
};

const stableDeterministicSort = (tasks: DeterministicTask[], seed: string): DeterministicTask[] => {
    return [...tasks].sort((a, b) => {
        const pa = a.priority ?? 0;
        const pb = b.priority ?? 0;
        if (pa !== pb) return pb - pa; // higher priority first
        const ha = fnv1a(a.id + seed);
        const hb = fnv1a(b.id + seed);
        if (ha === hb) return a.id.localeCompare(b.id); // final tiebreak to ensure total order
        return ha - hb; // lower hash earlier to keep consistent order
    });
};

// Incorporate seed + execution order index to ensure distinct seeds always produce distinct hashes
// even when priority-only ordering makes record content identical.
const computeExecutionHash = (records: ExecutionRecord[], seed: string): string => {
    const canonical = records
        .map((r, idx) => `${seed}|${idx}|${r.id}|${r.success ? '1' : '0'}|${r.success ? JSON.stringify(r.value) : r.error}`)
        .join('\n');
    return fnv1a(canonical).toString(16);
};

const trimBatchForMemory = <T>(batch: Array<DeterministicTask<T>>, maxMemoryMB?: number): Array<DeterministicTask<T>> => {
    if (!maxMemoryMB) return batch;
    let total = 0;
    const kept: Array<DeterministicTask<T>> = [];
    for (const t of batch) {
        const m = t.memoryMB ?? 0;
        if (total + m > maxMemoryMB) break;
        total += m;
        kept.push(t);
    }
    if (kept.length === 0 && batch.length > 0) return [batch[0]];
    return kept;
};

const executeTask = async <T>(task: DeterministicTask<T>): Promise<ExecutionRecord<T>> => {
    const startedAt = Date.now();
    try {
        const value = await task.execute();
        const endedAt = Date.now();
        return { id: task.id, success: true, value, startedAt, endedAt };
    } catch (e) {
        const endedAt = Date.now();
        const message = e instanceof Error ? e.message : String(e);
        return { id: task.id, success: false, error: message, startedAt, endedAt };
    }
};

const processBatches = async <T>(
    ordered: Array<DeterministicTask<T>>,
    options: ScheduleOptions
): Promise<Array<ExecutionRecord<T>>> => {
    const records: Array<ExecutionRecord<T>> = [];
    const step = options.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
    for (let i = 0; i < ordered.length; i += step) {
        const raw = ordered.slice(i, i + step);
        const batch = trimBatchForMemory(raw, options.maxMemoryMB);
        for (const task of batch) {
            const rec = await executeTask(task);
            records.push(rec);
            if (options.failFast && !rec.success) return records;
        }
    }
    return records;
};

export const schedule = async <T = unknown>(
    tasks: Array<DeterministicTask<T>>,
    options: ScheduleOptions = {}
): Promise<ScheduleResult<T>> => {
    const seed = options.seed || 'default-seed';
    const ordered = stableDeterministicSort(tasks, seed) as Array<DeterministicTask<T>>;
    const records = await processBatches(ordered, options);
    const executionHash = computeExecutionHash(records as ExecutionRecord[], seed);
    return { records, executionHash, seed };
};

export const executeWithSeed = async <T = unknown>(
    tasks: Array<DeterministicTask<T>>,
    seed: string,
    opts: Omit<ScheduleOptions, 'seed'> = {}
): Promise<ScheduleResult<T>> => {
    return schedule(tasks, { ...opts, seed });
};

export interface ReplayTrace<T = unknown> {
    seed: string;
    tasks: Array<Pick<DeterministicTask<T>, 'id' | 'priority'>>;
    records: Array<Pick<ExecutionRecord<T>, 'id' | 'success' | 'value' | 'error'>>;
    executionHash: string;
}

export const replay = async <T = unknown>(
    trace: ReplayTrace<T>,
    taskMap: Record<string, DeterministicTask<T>>
): Promise<ScheduleResult<T>> => {
    const tasks: DeterministicTask<T>[] = trace.tasks.map(t => {
        const original = taskMap[t.id];
        if (!original) throw new Error(`Missing task implementation for replay: ${t.id}`);
        return { ...original, priority: t.priority };
    });
    const result = await schedule(tasks, { seed: trace.seed });
    return result;
};
