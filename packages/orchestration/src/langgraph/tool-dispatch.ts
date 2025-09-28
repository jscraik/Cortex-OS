import { generateRunId, recordLatency, recordOperation } from '@cortex-os/observability';
import type { HookResult } from '@cortex-os/hooks';
import { runSpool, type SpoolResult, type SpoolTask } from './spool.js';
import type { N0Budget, N0Session } from './n0-state.js';

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

export interface ToolDispatchOptions {
	session: N0Session;
	budget?: N0Budget;
	concurrency?: number;
	allowList?: string[];
	hooks?: ToolDispatchHooks;
}

export interface ToolDispatchResult<T = unknown> extends SpoolResult<T> {
	name: string;
	metadata?: Record<string, unknown>;
}

export async function dispatchTools<T = unknown>(
        jobs: ToolDispatchJob<T>[],
        opts: ToolDispatchOptions,
): Promise<ToolDispatchResult<T>[]> {
        const spoolJobs = await prepareJobs(jobs, opts);
        const results = new Array<ToolDispatchResult<T>>(jobs.length);
        const runId = generateRunId();
        for (const skipped of spoolJobs.skipped) {
                const enriched = enrichSkipped(skipped.job, skipped.result);
                results[skipped.index] = enriched;
                recordDispatchTelemetry(skipped.job, enriched, opts.session, runId);
        }
        if (spoolJobs.tasks.length > 0) {
                const taskQueue = spoolJobs.tasks.map((job) => job.task);
                const spoolResults = await runSpool(taskQueue, {
                        ms: opts.budget?.timeMs,
                        tokens: opts.budget?.tokens,
                        concurrency: opts.concurrency,
                });
                await handleSettled(spoolJobs.tasks, spoolResults, results, opts, runId);
        }
        return results;
}

interface PreparedJob<T> {
	task: SpoolTask<T>;
	index: number;
	metadata?: Record<string, unknown>;
	input: unknown;
}

interface PreparedJobs<T> {
        tasks: PreparedJob<T>[];
        skipped: Array<{ index: number; result: SpoolResult<T>; job: ToolDispatchJob<T> }>;
}

async function prepareJobs<T>(
	jobs: ToolDispatchJob<T>[],
	opts: ToolDispatchOptions,
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
        opts: ToolDispatchOptions,
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
        opts: ToolDispatchOptions,
        runId: string,
): Promise<void> {
        for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                const settled = spoolResults[i];
                const enriched = enrichResult(job, settled);
                results[job.index] = enriched;
                recordDispatchTelemetry(jobToDispatch(job), enriched, opts.session, runId);
                if (opts.hooks && settled.started) {
                        await opts.hooks.run(
                                'PostToolUse',
                                buildHookCtx(jobToDispatch(job), opts.session, job.input, 'PostToolUse'),
                        );
                }
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
                name: job.task.name ?? job.task.id,
                metadata: job.metadata,
        };
}

function enrichSkipped<T>(job: ToolDispatchJob<T>, settled: SpoolResult<T>): ToolDispatchResult<T> {
        return {
                ...settled,
                name: job.name,
                metadata: job.metadata,
        };
}

function jobToDispatch<T>(job: PreparedJob<T>): ToolDispatchJob<T> {
	return {
		id: job.task.id,
		name: job.task.name ?? job.task.id,
		estimateTokens: job.task.estimateTokens,
		execute: job.task.execute,
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

function recordDispatchTelemetry(
        job: Pick<ToolDispatchJob, 'name' | 'metadata'>,
        result: ToolDispatchResult,
        session: N0Session,
        runId: string,
): void {
        try {
                const labels = {
                        component: 'orchestration',
                        tool: job.name,
                        provider: typeof job.metadata?.provider === 'string' ? job.metadata.provider : 'unknown',
                        outcome: result.status,
                        session_id: session.id,
                } as Record<string, string>;
                recordOperation('orchestration.tool_dispatch', result.status === 'fulfilled', runId, labels);
                if (result.started) {
                        recordLatency('orchestration.tool_dispatch', result.durationMs, labels);
                }
        } catch (error) {
                console.warn('[brAInwav][dispatchTelemetry] failed to record metrics', {
                        error,
                        tool: job.name,
                });
        }
}
