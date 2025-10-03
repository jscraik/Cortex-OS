import { performance } from 'node:perf_hooks';
import { meter } from '../observability/otel.js';

let integrationHistogram;
function recordIntegrationDuration(durationMs, attributes) {
	if (!integrationHistogram) {
		integrationHistogram = meter.createHistogram('brAInwav.integration.duration_ms', {
			description: 'Duration of LangGraph integration runs',
			unit: 'ms',
		});
	}
	integrationHistogram.record(durationMs, attributes);
}
export async function runSpool(tasks, opts = {}) {
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
function initContext(tasks, options) {
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
function createWorkers(context, concurrency) {
	const slots = Math.max(1, Math.min(concurrency, context.queue.length || 1));
	return Array.from({ length: slots }, (_value, _index) => workerLoop(context));
}
async function workerLoop(context) {
	for (;;) {
		const job = takeNextJob(context);
		if (!job) return;
		const result = await executeJob(job);
		context.results[job.index] = result;
		context.options.onSettle?.(result);
	}
}
function takeNextJob(context) {
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
async function executeJob(job) {
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
function createSkipped(job, type, message) {
	return {
		id: job.task.id,
		status: 'skipped',
		reason: new Error(`${message} [${type}]`),
		durationMs: 0,
		tokensUsed: 0,
		started: false,
	};
}
function toError(value, id) {
	const message = `brAInwav tool execution failed for ${id}: ${value instanceof Error ? value.message : String(value)}`;
	return new Error(message, { cause: value });
}
//# sourceMappingURL=spool.js.map
