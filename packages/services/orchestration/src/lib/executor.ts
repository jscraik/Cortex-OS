import { generateRunId, recordLatency, recordOperation } from '@cortex-os/observability';
import {
	CancellationController,
	CancellationError,
	type CancellationOptions,
	isCancellationError,
} from './cancellation.js';
import type { CompensationManager } from './compensation.js';
import { type Graph, topoSort, validateDAG } from './dag.js';
import type { HookManager } from './hooks.js';

export type StepFn = (ctx: { signal?: AbortSignal }) => Promise<void>;

export interface BranchConfig {
	// decide which targets to keep; true => keep trueTargets, false => keep falseTargets
	predicate: (ctx: { signal?: AbortSignal }) => boolean | Promise<boolean>;
	trueTargets: string[];
	falseTargets: string[];
}

export interface LoopConfig<T = unknown> {
	// supply the items to iterate over
	items: (ctx: { signal?: AbortSignal }) => T[] | Promise<T[]>;
	// body invoked for each item
	body: (item: T, ctx: { signal?: AbortSignal }) => Promise<void> | void;
}

export interface Workflow {
	graph: Graph;
	steps: Record<string, StepFn | undefined>;
	// optional branching and loop semantics keyed by node id
	branches?: Record<string, BranchConfig>;
	loops?: Record<string, LoopConfig<unknown>>;
	// optional hooks manager for lifecycle events
	hooks?: HookManager;
	// optional compensation manager for rollback/undo operations
	compensation?: CompensationManager;
}

export interface RetryPolicy {
	maxRetries: number;
	backoffMs: number;
}

export interface RunOptions {
	concurrency?: number; // placeholder for future parallelization
	retry?: Partial<Record<string, RetryPolicy>>;
	signal?: AbortSignal;
	workflowId?: string;
	cancellation?: CancellationOptions;
}

// Build reverse adjacency (predecessors) mapping for a graph
function buildPredecessors(graph: Graph): Record<string, Set<string>> {
	const preds: Record<string, Set<string>> = {};
	for (const [u, outs] of Object.entries(graph)) {
		if (!preds[u]) preds[u] = new Set();
		for (const v of outs) {
			if (!preds[v]) preds[v] = new Set();
			preds[v].add(u);
		}
	}
	// ensure all nodes appear
	for (const u of Object.keys(graph)) if (!preds[u]) preds[u] = new Set();
	return preds;
}

// Compute the set of nodes to skip when a branch chooses only a subset of its direct targets.
// We skip the unchosen direct targets and any downstream nodes for which all predecessors are
// effectively skipped (treating the disabled edge from the branch node as "skipped" for that child).
function computeBranchSkips(
	graph: Graph,
	branchNode: string,
	chosenTargets: Set<string>,
	allTargets: Set<string>,
): Set<string> {
	const toSkip = new Set<string>();
	const queue: string[] = [];
	const preds = buildPredecessors(graph);

	// seed queue with unchosen direct targets
	for (const t of allTargets) if (!chosenTargets.has(t)) seedSkip(t, toSkip, queue);

	while (queue.length) {
		const u = queue.shift();
		if (!u) break;
		enqueueChildrenIfAllPredsSkipped({
			graph,
			preds,
			node: u,
			branchNode,
			allTargets,
			chosenTargets,
			toSkip,
			queue,
		});
	}

	return toSkip;
}

function seedSkip(node: string, toSkip: Set<string>, queue: string[]): void {
	if (!toSkip.has(node)) {
		toSkip.add(node);
		queue.push(node);
	}
}

function enqueueChildrenIfAllPredsSkipped(args: {
	graph: Graph;
	preds: Record<string, Set<string>>;
	node: string;
	branchNode: string;
	allTargets: Set<string>;
	chosenTargets: Set<string>;
	toSkip: Set<string>;
	queue: string[];
}): void {
	const { graph, preds, node: u, branchNode, allTargets, chosenTargets, toSkip, queue } = args;
	for (const v of graph[u] ?? []) {
		if (
			shouldSkipChild({
				v,
				preds,
				branchNode,
				allTargets,
				chosenTargets,
				toSkip,
			})
		) {
			seedSkip(v, toSkip, queue);
		}
	}
}

function shouldSkipChild(args: {
	v: string;
	preds: Record<string, Set<string>>;
	branchNode: string;
	allTargets: Set<string>;
	chosenTargets: Set<string>;
	toSkip: Set<string>;
}): boolean {
	const { v, preds, branchNode, allTargets, chosenTargets, toSkip } = args;
	const pset = preds[v] ?? new Set<string>();
	for (const p of pset) {
		if (p === branchNode) {
			// branch -> v considered skipped only if v is an unchosen direct target
			if (allTargets.has(v) && !chosenTargets.has(v)) continue;
			return false;
		}
		if (!toSkip.has(p)) return false;
	}
	return true;
}

async function executeStepWithRetry(
	node: string,
	fn: StepFn,
	policy: RetryPolicy | undefined,
	signal: AbortSignal | undefined,
	executed: string[],
	hooks?: HookManager,
	workflowId?: string,
): Promise<void> {
	let attempt = 0;
	const runId = generateRunId();
	const hookContext = {
		stepId: node,
		signal,
		metadata: { attempt, workflowId },
	};

	// Execute pre-step hooks
	if (hooks) {
		await hooks.executePreStepHooks(hookContext);
	}

	// retry loop
	for (;;) {
		if (signal?.aborted) throw new Error('Aborted');
		const attemptNumber = attempt + 1;
		const attemptStartedAt = Date.now();
		try {
			await fn({ signal });
			executed.push(node);

			// Execute post-step hooks on success
			if (hooks) {
				await hooks.executePostStepHooks({
					...hookContext,
					metadata: { ...hookContext.metadata, attempt, success: true },
				});
			}
			recordRetryTelemetry({
				success: true,
				attempt: attemptNumber,
				durationMs: Date.now() - attemptStartedAt,
				node,
				runId,
				workflowId,
			});
			return;
		} catch (err) {
			recordRetryTelemetry({
				success: false,
				attempt: attemptNumber,
				durationMs: Date.now() - attemptStartedAt,
				node,
				runId,
				workflowId,
				error: err,
			});
			if (!policy || attempt >= policy.maxRetries) {
				// Execute error hooks on final failure
				if (hooks) {
					await hooks.executeStepErrorHooks({
						...hookContext,
						metadata: { ...hookContext.metadata, attempt, error: err },
					});
				}
				throw err;
			}
			attempt++;
			const delay = policy.backoffMs || 0;
			if (delay) await new Promise((r) => setTimeout(r, delay));

			// Update hook context for retry
			hookContext.metadata = { ...hookContext.metadata, attempt };
		}
	}
}

interface RetryTelemetryInput {
	success: boolean;
	attempt: number;
	durationMs: number;
	node: string;
	runId: string;
	workflowId?: string;
	error?: unknown;
}

function recordRetryTelemetry({
	success,
	attempt,
	durationMs,
	node,
	runId,
	workflowId,
	error,
}: RetryTelemetryInput): void {
	const labels = {
		component: 'services.orchestration',
		step: node,
		attempt: String(attempt),
		workflow_id: workflowId ?? 'unknown',
		outcome: success ? 'success' : 'failure',
		error_type: success ? 'none' : error instanceof Error ? (error.name ?? 'Error') : typeof error,
	} as Record<string, string>;
	try {
		recordOperation('services.orchestration.retry', success, runId, labels);
		recordLatency('services.orchestration.retry', durationMs, labels);
	} catch (telemetryError) {
		console.warn('[brAInwav][services-orchestration] retry telemetry failed', {
			telemetryError,
			step: node,
			attempt,
		});
	}
}

async function handleBranch(
	workflow: Workflow,
	node: string,
	branch: BranchConfig,
	signal: AbortSignal | undefined,
	skipped: Set<string>,
	executed: string[],
	workflowId?: string,
): Promise<void> {
	const pred = await branch.predicate({ signal });
	const chosenTargets = new Set<string>(pred ? branch.trueTargets : branch.falseTargets);
	const allTargets = new Set<string>([...branch.trueTargets, ...branch.falseTargets]);
	const toSkip = computeBranchSkips(workflow.graph, node, chosenTargets, allTargets);
	for (const s of toSkip) skipped.add(s);
	const fn = workflow.steps[node];
	if (fn) {
		await executeStepWithRetry(node, fn, undefined, signal, executed, workflow.hooks, workflowId);
	}
}

async function handleLoop<T>(
	node: string,
	loop: LoopConfig<T>,
	signal: AbortSignal | undefined,
	executed: string[],
	_hooks?: HookManager,
	_workflowId?: string,
): Promise<void> {
	const items = await loop.items({ signal });
	for (const item of items) {
		if (signal?.aborted) throw new Error('Aborted');
		await loop.body(item, { signal });
		executed.push(node);
	}
}

export async function run(workflow: Workflow, opts: RunOptions = {}): Promise<string[]> {
	validateDAG(workflow.graph);
	const order = topoSort(workflow.graph);
	const executed: string[] = [];
	const skipped = new Set<string>();

	// Set up cancellation controller
	const cancellationController = opts.signal
		? CancellationController.fromSignal(opts.signal, opts.cancellation)
		: new CancellationController(opts.cancellation);

	const signal = cancellationController.signal;

	// Execute pre-workflow hooks
	if (workflow.hooks && opts.workflowId) {
		await workflow.hooks.executePreWorkflowHooks({
			workflowId: opts.workflowId,
			signal,
		});
	}

	try {
		for (const node of order) {
			if (signal.aborted) {
				// Execute cancellation hooks
				if (workflow.hooks && opts.workflowId) {
					await workflow.hooks.executeWorkflowCancelledHooks({
						workflowId: opts.workflowId,
						signal,
						metadata: { reason: cancellationController.reason },
					});
				}
				throw new CancellationError(
					cancellationController.reason,
					cancellationController.cancelledAt,
				);
			}

			if (skipped.has(node)) continue;

			const branch = workflow.branches?.[node];
			if (branch) {
				// Track step for potential compensation before execution
				if (workflow.compensation) {
					workflow.compensation.trackExecution(node, { type: 'branch' });
				}
				await handleBranch(workflow, node, branch, signal, skipped, executed, opts.workflowId);
				continue;
			}

			const loop = workflow.loops?.[node];
			if (loop) {
				// Track step for potential compensation before execution
				if (workflow.compensation) {
					workflow.compensation.trackExecution(node, { type: 'loop' });
				}
				await handleLoop(node, loop, signal, executed, workflow.hooks, opts.workflowId);
				continue;
			}

			const fn = workflow.steps[node];
			if (!fn) continue; // allow structural nodes without a step function

			// Track step for potential compensation before execution
			if (workflow.compensation) {
				workflow.compensation.trackExecution(node, { type: 'step' });
			}

			const policy = opts.retry?.[node];
			await executeStepWithRetry(
				node,
				fn,
				policy,
				signal,
				executed,
				workflow.hooks,
				opts.workflowId,
			);
		}

		// Execute post-workflow hooks
		if (workflow.hooks && opts.workflowId) {
			await workflow.hooks.executePostWorkflowHooks({
				workflowId: opts.workflowId,
				signal,
				metadata: { result: executed },
			});
		}

		return executed;
	} catch (error) {
		const isCancelled = isCancellationError(error);

		// Execute compensation rollback if manager is available
		if (workflow.compensation) {
			try {
				// Trigger compensation manager to rollback all actions
				const compensationResult = await workflow.compensation.compensate({
					workflowId: opts.workflowId,
					signal: isCancelled ? undefined : signal, // Don't use cancelled signal for compensation
					error,
				});

				// Track rolled back steps in cancellation controller if cancelled
				if (isCancelled) {
					for (const stepId of compensationResult.compensatedSteps) {
						cancellationController.addRolledBackStep(stepId);
					}
				}

				// Log compensation errors if any occurred
				if (compensationResult.errors.length > 0) {
					for (const compError of compensationResult.errors) {
						console.error('Compensation failed:', compError.error);
						if (isCancelled) {
							cancellationController.addCleanupError(
								new Error(`Compensation failed for ${compError.stepId}: ${compError.error}`),
							);
						}
					}
				}
			} catch (compensationError) {
				// Log compensation error but don't suppress original error
				console.error('Compensation failed:', compensationError);
				if (isCancelled && compensationError instanceof Error) {
					cancellationController.addCleanupError(compensationError);
				}
			}
		}

		// Execute appropriate error hooks
		if (workflow.hooks && opts.workflowId) {
			if (isCancelled) {
				await workflow.hooks.executeWorkflowCancelledHooks({
					workflowId: opts.workflowId,
					signal: undefined, // Don't use cancelled signal for cleanup hooks
					metadata: {
						error,
						cancellationResult: cancellationController.getResult(),
					},
				});
			} else {
				await workflow.hooks.executeWorkflowErrorHooks({
					workflowId: opts.workflowId,
					signal,
					metadata: { error },
				});
			}
		}

		throw error;
	}
}
