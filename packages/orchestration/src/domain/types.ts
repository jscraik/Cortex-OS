export type UUID = string;

export type StepKind = "agent" | "http" | "delay" | "branch" | "map";
export type Status =
	| "pending"
	| "running"
	| "succeeded"
	| "failed"
	| "canceled";

export interface RetryPolicy {
	maxRetries: number;
	backoffMs: number;
	jitter: boolean;
}

export interface Step {
	id: string;
	name: string;
	kind: StepKind;
	input?: unknown;
	agentId?: string;
	toolAllowlist?: string[];
	retry?: RetryPolicy;
	timeoutMs?: number;
	next?: string | null;
	branches?: { when: string; to: string }[];
}

export interface Workflow {
	id: UUID;
	name: string;
	version: string;
	entry: string;
	steps: Record<string, Step>;
	budget?: { wallClockMs: number; maxSteps: number; costUSD?: number };
	metadata?: Record<string, unknown>;
}

export interface Token {
	wfId: UUID;
	runId: UUID;
	stepId: string;
	attempt: number;
}

export interface RunState {
	wf: Workflow;
	runId: UUID;
	status: Status;
	cursor: string;
	startedAt: string;
	updatedAt: string;
	context: Record<string, unknown>;
}
