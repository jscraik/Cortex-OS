import type { HookResult } from '@cortex-os/hooks';
import { generateRunId, recordLatency, recordOperation } from '@cortex-os/observability';
import type { N0Budget, N0Session } from './n0-state.js';
import { runSpool, type SpoolResult, type SpoolTask } from './spool.js';
import {
	recordDispatchOutcome,
	recordDispatchSkip,
	recordDispatchStart,
} from './tool-dispatch-metrics.js';

export interface ToolDispatchHooks {
	run: (event: 'PreToolUse' | 'PostToolUse', ctx: Record<string, unknown>) => Promise<HookResult[]>;
}

export interface ToolDispatchJob<T = unknown> {
	id: string;
	name: string;
	execute: (input: unknown) => Promise<T>;
	input?: unknown;
	estimateTokens?: number;
	metadata?: Record<string, unknown>;
}

export interface ToolDispatchProgressEvent<T = unknown> {
	type: 'start' | 'settle' | 'skip';
	job: ToolDispatchJob<T>;
	index: number;
	result?: ToolDispatchResult<T>;
}

export type ToolDispatchProgressHandler<T = unknown> = (
	event: ToolDispatchProgressEvent<T>,
) => void;

export interface ToolDispatchOptions<T = unknown> {
	session: N0Session;
	budget?: N0Budget;
	concurrency?: number;
	allowList?: string[];
	hooks?: ToolDispatchHooks;
	onProgress?: ToolDispatchProgressHandler<T>;
}

export interface ToolDispatchResult<T = unknown> extends SpoolResult<T> {
	name: string;
	metadata?: Record<string, unknown>;
}

export async function dispatchTools<T = unknown>(
	jobs: ToolDispatchJob<T>[],
	opts: ToolDispatchOptions<T>,
): Promise<ToolDispatchResult<T>[]> {
	const spoolJobs = await prepareJobs(jobs, opts);
	const results = new Array<ToolDispatchResult<T>>(jobs.length);
	const runId = generateRunId();
	const startTimes = new Map<string, number>();

	for (const skipped of spoolJobs.skipped) {
		const enriched = enrichSkipped(skipped.job, skipped.result);
		results[skipped.index] = enriched;
		opts.onProgress?.({ type: 'skip', job: skipped.job, index: skipped.index, result: enriched });
		recordDispatchSkip(skipped.job.name, skipped.job.metadata, opts.session);
		recordOperation('orchestration.tool_dispatch', false, runId, toMetricLabels(skipped.job));
	}

	if (spoolJobs.tasks.length > 0) {
		const taskQueue = spoolJobs.tasks.map((job) => job.task);
		const taskMap = new Map<string, PreparedJob<T>>();
		for (const job of spoolJobs.tasks) {
			taskMap.set(job.task.id, job);
		}

		const spoolResults = await runSpool(taskQueue, {
			ms: opts.budget?.timeMs,
			tokens: opts.budget?.tokens,
			concurrency: opts.concurrency,
			onStart: (task) => {
				const job = taskMap.get(task.id);
				if (job) {
					startTimes.set(task.id, Date.now());
					opts.onProgress?.({ type: 'start', job: job.job, index: job.index });
					recordDispatchStart(job.job.name, job.metadata, opts.session);
				}
			},
		});

		await handleSettled(spoolJobs.tasks, spoolResults, results, opts, runId, startTimes);
	}

	return results;
}

interface PreparedJob<T> {
	job: ToolDispatchJob<T>;
	task: SpoolTask<T>;
	index: number;
	metadata?: Record<string, unknown>;
	input: unknown;
}

interface PreparedJobs<T> {
	tasks: PreparedJob<T>[];
	skipped: Array<{ index: number; job: ToolDispatchJob<T>; result: SpoolResult<T> }>;
}

async function prepareJobs<T>(
	jobs: ToolDispatchJob<T>[],
	opts: ToolDispatchOptions<T>,
): Promise<PreparedJobs<T>> {
	const prepared: PreparedJobs<T> = { tasks: [], skipped: [] };
	for (let index = 0; index < jobs.length; index++) {
		const job = jobs[index];
		if (opts.allowList && !opts.allowList.includes(job.name)) {
			prepared.skipped.push({
				index,
				job,
				result: createSkip(job, 'allowlist', `brAInwav blocked tool ${job.name}`),
			});
			continue;
		}
		const input = await applyPreHooks(job, index, opts, prepared);
		if (input === undefined) continue;
		prepared.tasks.push({
			job,
			index,
			metadata: job.metadata,
			input,
			task: {
				id: job.id,
				name: job.name,
				estimateTokens: job.estimateTokens,
				execute: () => job.execute(input),
			},
		});
	}
	return prepared;
}

async function applyPreHooks<T>(
	job: ToolDispatchJob<T>,
	jobIndex: number,
	opts: ToolDispatchOptions<T>,
	prepared: PreparedJobs<T>,
): Promise<unknown | undefined> {
	if (!opts.hooks) return job.input;
	const ctx = buildHookCtx(job, opts.session, job.input, 'PreToolUse');
	const results = await opts.hooks.run('PreToolUse', ctx);
	for (const res of results) {
		if (res.action === 'deny') {
			prepared.skipped.push({
				index: jobIndex,
				job,
				result: createSkip(job, 'policy', res.reason ?? 'brAInwav policy denied tool use'),
			});
			return undefined;
		}
		if (res.action === 'allow' && 'input' in res && res.input !== undefined) {
			return res.input;
		}
	}
	return job.input;
}

async function handleSettled<T>(
	jobs: PreparedJob<T>[],
	spoolResults: SpoolResult<T>[],
	results: ToolDispatchResult<T>[],
	opts: ToolDispatchOptions<T>,
	runId: string,
	startTimes: Map<string, number>,
): Promise<void> {
	for (let i = 0; i < jobs.length; i++) {
		const job = jobs[i];
		const settled = spoolResults[i];
		const enriched = enrichResult(job, settled);
		results[job.index] = enriched;
		const labels = toMetricLabels(job.job);
		const duration = typeof settled.durationMs === 'number' ? settled.durationMs : undefined;
		const tokensUsed = typeof settled.tokensUsed === 'number' ? settled.tokensUsed : undefined;
		const outcome = settled.status;
		recordDispatchOutcome(job.job.name, outcome, duration, tokensUsed, job.metadata, opts.session);
		const startedAt = startTimes.get(job.task.id);
		if (duration !== undefined) {
			recordLatency('orchestration.tool_dispatch', duration, {
				...labels,
				outcome,
			});
		} else if (startedAt !== undefined) {
			recordLatency('orchestration.tool_dispatch', Date.now() - startedAt, {
				...labels,
				outcome,
			});
		}
		recordOperation('orchestration.tool_dispatch', outcome === 'fulfilled', runId, {
			...labels,
			outcome,
		});
		if (opts.hooks && settled.started) {
			await opts.hooks.run(
				'PostToolUse',
				buildHookCtx(jobToDispatch(job), opts.session, job.input, 'PostToolUse'),
			);
		}
		opts.onProgress?.({ type: 'settle', job: job.job, index: job.index, result: enriched });
	}
}

function createSkip<T>(job: ToolDispatchJob<T>, code: string, message: string): SpoolResult<T> {
	return {
		id: job.id,
		status: 'skipped',
		reason: new Error(`${message} [${code}]`),
		durationMs: 0,
		tokensUsed: 0,
		started: false,
	};
}

function enrichResult<T>(job: PreparedJob<T>, settled: SpoolResult<T>): ToolDispatchResult<T> {
	return {
		...settled,
		name: job.job.name,
		metadata: job.metadata,
	};
}

function enrichSkipped<T>(job: ToolDispatchJob<T>, result: SpoolResult<T>): ToolDispatchResult<T> {
	return {
		...result,
		name: job.name,
		metadata: job.metadata,
	};
}

function jobToDispatch<T>(job: PreparedJob<T>): ToolDispatchJob<T> {
	return {
		id: job.job.id,
		name: job.job.name,
		estimateTokens: job.job.estimateTokens,
		execute: job.job.execute,
		metadata: job.metadata,
	};
}

function buildHookCtx(
	job: ToolDispatchJob,
	session: N0Session,
	input: unknown,
	event: 'PreToolUse' | 'PostToolUse',
) {
	return {
		event,
		tool: { id: job.id, name: job.name, input },
		cwd: session.cwd,
		user: session.user,
		session,
		metadata: job.metadata ?? {},
		provider: job.metadata?.provider,
		tags: job.metadata?.tags ?? ['orchestration'],
	};
}

function toMetricLabels(job: ToolDispatchJob): Record<string, string> {
	const provider = typeof job.metadata?.provider === 'string' ? job.metadata.provider : 'unknown';
	return {
		tool: job.name,
		provider,
	};
}
