import { createHash } from 'node:crypto';
import { z } from 'zod';

export interface WorkflowStep {
	id: string;
	name: string;
	kind: string;
	next?: string;
	branches?: Array<{ when: string; to: string }>;
}

const stepZ = z.object({
	id: z.string(),
	name: z.string(),
	kind: z.enum(['agent', 'http', 'delay', 'branch', 'map']),
	next: z.string().optional(),
	branches: z.array(z.object({ when: z.string(), to: z.string() })).optional(),
});

const workflowZ = z.object({
	id: z.string().uuid(),
	name: z.string(),
	version: z.string(),
	entry: z.string(),
	steps: z.record(stepZ),
});

type Workflow = z.infer<typeof workflowZ>;

export interface WorkflowStats {
	totalSteps: number;
	unreachableSteps: string[];
	maxDepth: number;
	cycleDetected: boolean;
}

export interface ValidationResult {
	workflow: z.infer<typeof workflowZ>;
	stats: WorkflowStats;
}

export const MAX_WORKFLOW_DEPTH = 1000;
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000;

const validationCache = new Map<
	string,
	{ valid: boolean; result?: ValidationResult; error?: Error }
>();
let cacheCleanupTimer: NodeJS.Timeout | null = null;

function createWorkflowHash(workflow: Workflow): string {
	const structureData = JSON.stringify({
		entry: workflow.entry,
		steps: Object.keys(workflow.steps).sort(),
		connections: Object.fromEntries(
			Object.entries(workflow.steps).map(
				([id, step]: [string, WorkflowStep]) => [
					id,
					{
						next: step.next,
						branches: step.branches?.map((b) => b.to).sort(),
					},
				],
			),
		),
	});
	return createHash('sha256').update(structureData, 'utf8').digest('hex');
}

function initializeCacheCleanup(): void {
	if (cacheCleanupTimer) return;
	cacheCleanupTimer = setInterval(() => {
		validationCache.clear();
	}, CACHE_CLEANUP_INTERVAL);
	if (cacheCleanupTimer.unref) cacheCleanupTimer.unref();
}

function validateReferences(wf: Workflow, stepIds: Set<string>): void {
	if (!stepIds.has(wf.entry)) {
		throw new Error(`Entry step '${wf.entry}' does not exist`);
	}
	for (const [id, step] of Object.entries(wf.steps) as [
		string,
		WorkflowStep,
	][]) {
		if (step.next && !stepIds.has(step.next)) {
			throw new Error(
				`Step '${id}' references non-existent next step: ${step.next}`,
			);
		}
		if (step.branches) {
			for (const b of step.branches) {
				if (!stepIds.has(b.to)) {
					throw new Error(
						`Step '${id}' has branch to non-existent step: ${b.to}`,
					);
				}
			}
		}
	}
}

export interface TraversalResult {
	visited: Set<string>;
	maxDepth: number;
	cycleDetected: boolean;
}

export function traverseWorkflow(wf: Workflow): TraversalResult {
	const visited = new Set<string>();
	const stack = new Set<string>();
	let maxDepth = 0;
	let cycleDetected = false;

	function dfs(id: string, depth: number): void {
		if (depth > MAX_WORKFLOW_DEPTH) {
			throw new Error(`Workflow depth exceeds limit of ${MAX_WORKFLOW_DEPTH}`);
		}
		if (stack.has(id)) {
			cycleDetected = true;
			return;
		}
		if (visited.has(id)) return;
		visited.add(id);
		stack.add(id);
		maxDepth = Math.max(maxDepth, depth);
		const step = wf.steps[id];
		if (!step) return;
		if (step.branches) {
			for (const b of step.branches) {
				dfs(b.to, depth + 1);
			}
		}
		if (step.next) {
			dfs(step.next, depth + 1);
		}
		stack.delete(id);
	}

	dfs(wf.entry, 1);
	return { visited, maxDepth, cycleDetected };
}

export function aggregateStats(
	wf: Workflow,
	traversal: TraversalResult,
): WorkflowStats {
	const totalSteps = Object.keys(wf.steps).length;
	const unreachableSteps = Object.keys(wf.steps).filter(
		(s) => !traversal.visited.has(s),
	);
	return {
		totalSteps,
		unreachableSteps,
		maxDepth: traversal.maxDepth,
		cycleDetected: traversal.cycleDetected,
	};
}

function validateWorkflowStructure(wf: Workflow): ValidationResult {
	const stepIds = new Set(Object.keys(wf.steps));
	validateReferences(wf, stepIds);
	const traversal = traverseWorkflow(wf);
	const stats = aggregateStats(wf, traversal);
	return { workflow: wf, stats };
}

export function validateWorkflow(input: unknown): ValidationResult {
	const wf = workflowZ.parse(input);
	const cacheKey = createWorkflowHash(wf);
	if (validationCache.has(cacheKey)) {
		const cached = validationCache.get(cacheKey)!;
		if (cached.valid) {
			return cached.result!;
		}
		throw cached.error!;
	}
	initializeCacheCleanup();
	try {
		const result = validateWorkflowStructure(wf);
		validationCache.set(cacheKey, { valid: true, result });
		return result;
	} catch (error) {
		validationCache.set(cacheKey, { valid: false, error: error as Error });
		throw error;
	}
}

export function clearValidationCache(): void {
	validationCache.clear();
}

export function getValidationCacheStats(): { size: number } {
	return { size: validationCache.size };
}
