import { withSpan } from '../observability/otel';
import { auditEvent, record } from './audit';
import {
	type Checkpoint,
	loadLatestCheckpoint,
	saveCheckpoint,
} from './checkpoints';
import { requiresApproval, waitForApproval } from './hitl';
import { enforce, loadGrant } from '@cortex-os/policy';

export type Node =
	| 'plan'
	| 'gather'
	| 'critic'
	| 'synthesize'
	| 'verify'
	| 'done';

export interface RetryPolicy {
	maxRetries: number;
	backoffMs: number;
	jitter?: boolean;
}
export interface RuntimeLimits {
	deadlineMs?: number;
}
export interface RunContext {
	runId: string;
	threadId: string;
	signal?: AbortSignal;
}

export interface SupervisorOptions {
	retry?: Partial<Record<Node, RetryPolicy>>;
	limits?: Partial<Record<Node, RuntimeLimits>>;
	handlers?: Partial<Record<Node, NodeFn>>;
}

type NodeFn = (state: any, ctx: RunContext) => Promise<any>;

// Placeholder functions - to be implemented by integrators or replaced in DI
async function planFn(state: any, _ctx: RunContext) {
	return state;
}
async function gatherFn(state: any, _ctx: RunContext) {
	return state;
}
async function criticFn(state: any, _ctx: RunContext) {
	return state;
}
async function buildArtifactProposal(_state: any) {
	return { path: '/tmp/test', content: 'test' };
}
async function commitArtifact(_proposal: any) {
	return {};
}
async function verifyFn(state: any, _ctx: RunContext) {
	return state;
}

const nodeFns: Record<Node, NodeFn> = {
	plan: planFn,
	gather: gatherFn,
	critic: criticFn,
	synthesize: async (state, ctx) => {
		const proposal = await buildArtifactProposal(state);
		if (requiresApproval(proposal)) {
			const ok = await waitForApproval(ctx.runId, 'synthesize', proposal);
			if (!ok) throw new Error('Approval denied');
		}
		enforce(await loadGrant('fs.write'), 'write', {
			path: (proposal as any).path,
		});
		record(
			auditEvent(
				'fs',
				'write',
				{ runId: ctx.runId },
				{ path: (proposal as any).path },
			),
		);
		const next = await commitArtifact(proposal);
		return next;
	},
	verify: verifyFn,
	done: async (s) => s,
};

const edges: Record<Node, Node | null> = {
	plan: 'gather',
	gather: 'critic',
	critic: 'synthesize',
	synthesize: 'verify',
	verify: 'done',
	done: null,
};

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

// Maximum backoff time to prevent infinite delays (30 seconds)
const MAX_BACKOFF_MS = 30000;

async function withRetry(
	_node: Node,
	fn: () => Promise<any>,
	policy?: RetryPolicy,
) {
	const rp = policy ?? { maxRetries: 0, backoffMs: 0, jitter: true };
	let attempt = 0;
	// First attempt + retries
	// attempt 0: initial, then 1..maxRetries for retries
	for (;;) {
		try {
			return await fn();
		} catch (err) {
			if (attempt >= rp.maxRetries) throw err;
			attempt++;

			// Calculate backoff with jitter and cap
			const jitter = rp.jitter ? Math.floor(Math.random() * rp.backoffMs) : 0;
			const backoffTime = Math.min(rp.backoffMs + jitter, MAX_BACKOFF_MS);

			await sleep(backoffTime);
		}
	}
}

function withDeadline<T>(
	promise: Promise<T>,
	deadlineMs?: number,
	signal?: AbortSignal,
): Promise<T> {
	if (!deadlineMs && !signal) return promise;
	return new Promise<T>((resolve, reject) => {
		let to: NodeJS.Timeout | undefined;
		const onAbort = () => {
			clearTimeout(to as any);
			reject(new Error('Operation aborted'));
		};
		if (signal) {
			if (signal.aborted) return onAbort();
			signal.addEventListener('abort', onAbort, { once: true });
		}
		if (deadlineMs) {
			to = setTimeout(() => {
				if (signal) signal.removeEventListener('abort', onAbort);
				reject(new Error('Deadline exceeded'));
			}, deadlineMs);
		}
		promise.then(
			(v) => {
				if (to) clearTimeout(to);
				if (signal) signal.removeEventListener('abort', onAbort);
				resolve(v);
			},
			(e) => {
				if (to) clearTimeout(to);
				if (signal) signal.removeEventListener('abort', onAbort);
				reject(e);
			},
		);
	});
}

export interface RunOptions extends SupervisorOptions {
	startAt?: Node;
}

export async function runSupervisor(
	initialState: any,
	ctx: RunContext,
	opts: RunOptions = {},
) {
	// Idempotency: if a latest checkpoint exists at or after startAt, resume from it
	const latest = await loadLatestCheckpoint(ctx.runId);
	let node: Node = opts.startAt ?? 'plan';
	let state = initialState;
	if (latest) {
		// resume from the next node after the last completed checkpoint
		node = edges[latest.node] ?? 'done';
		state = latest.state;
	}

	while (node) {
		const fn = opts.handlers?.[node] ?? nodeFns[node];
		if (!fn) throw new Error(`No node function for ${node}`);

		const retry = opts.retry?.[node];
		const limits = opts.limits?.[node];

		state = await withSpan(
			`orchestration.${node}`,
			async () => {
				const exec = () => fn(state, ctx);
				const execWithRetry = () => withRetry(node, exec, retry);
				const result = await withDeadline(
					execWithRetry(),
					limits?.deadlineMs,
					ctx.signal,
				);
				// checkpoint after each successful node
				const cp: Checkpoint = {
					runId: ctx.runId,
					threadId: ctx.threadId,
					node,
					state: result,
					ts: new Date().toISOString(),
				};
				await saveCheckpoint(cp);
				return result;
			},
			{ node, runId: ctx.runId },
		);

		const next = edges[node];
		if (!next) break;
		node = next;
	}

	return state;
}
