import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export interface PerformanceHistoryEntry {
        target: string;
        durationMs: number;
        timestamp: string;
        metadata?: Record<string, unknown>;
}

const HISTORY_FILE = process.env.PERF_HISTORY_FILE
        ? resolve(process.cwd(), process.env.PERF_HISTORY_FILE)
        : resolve(process.cwd(), 'performance-history.json');

const HISTORY_LIMIT = Number.parseInt(process.env.PERF_HISTORY_LIMIT ?? '200', 10);

export async function appendPerformanceHistory(entry: PerformanceHistoryEntry): Promise<void> {
        try {
                if (!existsSync(dirname(HISTORY_FILE))) {
                        mkdirSync(dirname(HISTORY_FILE), { recursive: true });
                }
                let history: PerformanceHistoryEntry[] = [];
                if (existsSync(HISTORY_FILE)) {
                        try {
                                const contents = await readFile(HISTORY_FILE, 'utf8');
                                history = JSON.parse(contents) as PerformanceHistoryEntry[];
                                if (!Array.isArray(history)) history = [];
                        } catch {
                                history = [];
                        }
                }
                history.push(entry);
                if (history.length > HISTORY_LIMIT) {
                        history = history.slice(history.length - HISTORY_LIMIT);
                }
                await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
                console.info('[brAInwav][perf-history] appended entry', {
                        file: HISTORY_FILE,
                        target: entry.target,
                        durationMs: entry.durationMs,
                });
        } catch (error) {
                console.warn('[brAInwav][perf-history] failed to append entry', { error });
        }
}
