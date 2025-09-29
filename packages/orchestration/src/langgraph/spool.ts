import { performance } from 'node:perf_hooks';
import type { Histogram } from '@opentelemetry/api';
import { meter } from '../observability/otel.js';

type TaskExecutor<T> = () => Promise<T>;

export interface SpoolTask<T> {
	id: string;
	name?: string;
	estimateTokens?: number;
	execute: TaskExecutor<T>;
}

export interface SpoolRunOptions {
	ms?: number;
	tokens?: number;
	concurrency?: number;
	signal?: AbortSignal;
	onStart?: (task: SpoolTask<unknown>) => void;
	onSettle?: (result: SpoolResult<unknown>) => void;
	integrationMetrics?: IntegrationMetricOptions;
}

export type SpoolStatus = 'fulfilled' | 'rejected' | 'skipped';

export interface SpoolResult<T> {
	id: string;
	status: SpoolStatus;
	value?: T;
	reason?: Error;
	durationMs: number;
	tokensUsed: number;
	started: boolean;
}

export interface IntegrationMetricOptions {
	enabled?: boolean;
	attributes?: Record<string, string>;
	onRecord?: (durationMs: number, attributes: Record<string, string>) => void;
}

interface InternalJob<T> {
	index: number;
	task: SpoolTask<T>;
	tokens: number;
}

interface RunContext<T> {
	queue: InternalJob<T>[];
	results: SpoolResult<T>[];
	options: SpoolRunOptions;
	deadline?: number;
	remainingTokens: number;
	cursor: number;
}

let integrationHistogram: Histogram | undefined;

function recordIntegrationDuration(durationMs: number, attributes: Record<string, string>): void {
	if (!integrationHistogram) {
		integrationHistogram = meter.createHistogram('brAInwav.integration.duration_ms', {
			description: 'Duration of LangGraph integration runs',
			unit: 'ms',
		});
	}
	integrationHistogram.record(durationMs, attributes);
}

export async function runSpool<T>(
	tasks: SpoolTask<T>[],
	opts: SpoolRunOptions = {},
): Promise<SpoolResult<T>[]> {
	const startedAt = performance.now();
	const context = initContext(tasks, opts);
	const workers = createWorkers(context, opts.concurrency ?? tasks.length);
	await Promise.all(workers);
	if (opts.integrationMetrics?.enabled) {
		const duration = performance.now() - startedAt;
		const attributes = {
			scenario: 'default',
			...(opts.integrationMetrics.attributes ?? {}),
		};
		try {
			recordIntegrationDuration(duration, attributes);
		} catch (error) {
			console.warn('brAInwav integration metrics recording failed', error);
		}
		try {
			opts.integrationMetrics.onRecord?.(duration, attributes);
		} catch {
			/* noop */
		}
	}
	return context.results;
}

function initContext<T>(tasks: SpoolTask<T>[], options: SpoolRunOptions): RunContext<T> {
	const queue = tasks.map((task, index) => ({
		index,
		task,
		tokens: task.estimateTokens ?? 0,
	}));
	return {
		queue,
		results: new Array(queue.length),
		options,
		deadline: options.ms ? Date.now() + options.ms : undefined,
		remainingTokens: options.tokens ?? Number.POSITIVE_INFINITY,
		cursor: 0,
	};
}

function createWorkers<T>(context: RunContext<T>, concurrency: number): Promise<void>[] {
	const slots = Math.max(1, Math.min(concurrency, context.queue.length || 1));
	return Array.from({ length: slots }, (_value, _index) => workerLoop(context));
}

async function workerLoop<T>(context: RunContext<T>): Promise<void> {
	for (;;) {
		const job = takeNextJob(context);
		if (!job) return;
		const result = await executeJob(job);
		context.results[job.index] = result;
		context.options.onSettle?.(result);
	}
}

function takeNextJob<T>(context: RunContext<T>): InternalJob<T> | null {
	while (context.cursor < context.queue.length) {
		const job = context.queue[context.cursor++];
		if (context.options.signal?.aborted) {
			context.results[job.index] = createSkipped(job, 'abort', 'brAInwav spool aborted by signal');
			context.options.onSettle?.(context.results[job.index]);
			continue;
		}
		if (context.deadline && Date.now() >= context.deadline) {
			context.results[job.index] = createSkipped(
				job,
				'timeout',
				'brAInwav spool time budget exceeded',
			);
			context.options.onSettle?.(context.results[job.index]);
			continue;
		}
		if (context.remainingTokens < job.tokens) {
			context.results[job.index] = createSkipped(
				job,
				'tokens',
				'brAInwav spool token budget exhausted',
			);
			context.options.onSettle?.(context.results[job.index]);
			continue;
		}
		context.remainingTokens -= job.tokens;
		context.options.onStart?.(job.task);
		return job;
	}
	return null;
}

async function executeJob<T>(job: InternalJob<T>): Promise<SpoolResult<T>> {
	const startedAt = Date.now();
	try {
		const value = await job.task.execute();
		return {
			id: job.task.id,
			status: 'fulfilled',
			value,
			durationMs: Date.now() - startedAt,
			tokensUsed: job.tokens,
			started: true,
		};
	} catch (error) {
		return {
			id: job.task.id,
			status: 'rejected',
			reason: toError(error, job.task.id),
			durationMs: Date.now() - startedAt,
			tokensUsed: job.tokens,
			started: true,
		};
	}
}

function createSkipped<T>(
	job: InternalJob<T>,
	type: 'timeout' | 'tokens' | 'abort',
	message: string,
): SpoolResult<T> {
	return {
		id: job.task.id,
		status: 'skipped',
		reason: new Error(`${message} [${type}]`),
		durationMs: 0,
		tokensUsed: 0,
		started: false,
	};
}

function toError(value: unknown, id: string): Error {

        const message = `brAInwav tool execution failed for ${id}: ${value instanceof Error ? value.message : String(value)}`;
        return new Error(message, { cause: value });

}
