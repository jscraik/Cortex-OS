import { type Graph, topoSort, validateDAG } from './dag';

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
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

export interface RunOptions {
  concurrency?: number; // placeholder for future parallelization
  retry?: Partial<Record<string, RetryPolicy>>;
  signal?: AbortSignal;
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
    if (shouldSkipChild({ v, preds, branchNode, allTargets, chosenTargets, toSkip })) {
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
): Promise<void> {
  let attempt = 0;
  // retry loop
  for (;;) {
    if (signal?.aborted) throw new Error('Aborted');
    try {
      await fn({ signal });
      executed.push(node);
      return;
    } catch (err) {
      if (!policy || attempt >= policy.maxRetries) throw err;
      attempt++;
      const delay = policy.backoffMs || 0;
      if (delay) await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function handleBranch(
  workflow: Workflow,
  node: string,
  branch: BranchConfig,
  signal: AbortSignal | undefined,
  skipped: Set<string>,
  executed: string[],
): Promise<void> {
  const pred = await branch.predicate({ signal });
  const chosenTargets = new Set<string>(pred ? branch.trueTargets : branch.falseTargets);
  const allTargets = new Set<string>([...branch.trueTargets, ...branch.falseTargets]);
  const toSkip = computeBranchSkips(workflow.graph, node, chosenTargets, allTargets);
  for (const s of toSkip) skipped.add(s);
  const fn = workflow.steps[node];
  if (fn) {
    await executeStepWithRetry(node, fn, undefined, signal, executed);
  }
}

async function handleLoop<T>(
  node: string,
  loop: LoopConfig<T>,
  signal: AbortSignal | undefined,
  executed: string[],
): Promise<void> {
  const items = await loop.items({ signal });
  for (const item of items) {
    if (signal?.aborted) throw new Error('Aborted');
    await loop.body(item, { signal });
    executed.push(node);
  }
}

export async function run(
  workflow: Workflow,
  opts: RunOptions = {},
): Promise<string[]> {
  validateDAG(workflow.graph);
  const order = topoSort(workflow.graph);
  const executed: string[] = [];
  const skipped = new Set<string>();

  for (const node of order) {
    if (opts.signal?.aborted) throw new Error('Aborted');
    if (skipped.has(node)) continue;

    const branch = workflow.branches?.[node];
    if (branch) {
      await handleBranch(workflow, node, branch, opts.signal, skipped, executed);
      continue;
    }

    const loop = workflow.loops?.[node];
    if (loop) {
      await handleLoop(node, loop, opts.signal, executed);
      continue;
    }

    const fn = workflow.steps[node];
    if (!fn) continue; // allow structural nodes without a step function
    const policy = opts.retry?.[node];
    await executeStepWithRetry(node, fn, policy, opts.signal, executed);
  }
  return executed;
}
