export type StreamLane = 'hot' | 'heavy';

export interface Envelope {
	id: string;
	type: string;
	payload: unknown;
	occurredAt: string;
	sessionId?: string;
	source?: string;
	traceId?: string;
	ttlMs?: number;
	headers?: Record<string, unknown>;
}

export type TaskStatus = 'idle' | 'running' | 'blocked' | 'completed' | 'failed' | 'cancelled';

export interface TaskContext {
	locale?: string;
	agentRole?: string;
	metadata?: Record<string, unknown>;
}

export interface Task {
	id: string;
	sessionId: string;
	name: string;
	input: unknown;
	status: TaskStatus;
	createdAt: string;
	updatedAt: string;
	priority?: number;
	context?: TaskContext;
	budgetId?: string;
}

export type PlanStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed';

export interface PlanStep {
	id: string;
	description: string;
	status: PlanStepStatus;
	dependsOn?: string[];
	notes?: string;
	toolCallId?: string;
}

export interface Plan {
	id: string;
	taskId: string;
	revision: number;
	author: string;
	createdAt: string;
	updatedAt: string;
	steps: PlanStep[];
	summary?: string;
}

export type ToolCallStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ToolCall {
	id: string;
	sessionId: string;
	taskId: string;
	toolName: string;
	arguments: unknown;
	issuedAt: string;
	status: ToolCallStatus;
	deadlineMs?: number;
	metadata?: Record<string, unknown>;
}

export interface ToolResult {
	id: string;
	toolCallId: string;
	completedAt: string;
	output: unknown;
	logs?: string[];
	error?: ErrorShape;
}

export interface ErrorShape {
	code: string;
	message: string;
	details?: Record<string, unknown>;
	retryable?: boolean;
}

export interface StreamPatchSummary {
	path: string;
	changeType: 'created' | 'modified' | 'deleted';
	additions: number;
	deletions: number;
	preview?: string;
}

interface StreamEventBase {
	id: string;
	sessionId: string;
	timestamp: string;
	traceId?: string;
}

export interface TokenStreamEvent extends StreamEventBase {
	type: 'token';
	sequence: number;
	content: string;
	lane: StreamLane;
	source: 'model' | 'tool';
}

export interface StatusStreamEvent extends StreamEventBase {
	type: 'status';
	status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
	message?: string;
}

export interface ToolStartStreamEvent extends StreamEventBase {
	type: 'tool_start';
	toolCall: ToolCall;
}

export interface ToolEndStreamEvent extends StreamEventBase {
	type: 'tool_end';
	toolResult: ToolResult;
}

export interface PatchStreamEvent extends StreamEventBase {
	type: 'patch';
	patch: StreamPatchSummary;
}

export interface ErrorStreamEvent extends StreamEventBase {
	type: 'error';
	error: ErrorShape;
}

export interface DoneStreamEvent extends StreamEventBase {
	type: 'done';
	durationMs?: number;
	outcome?: 'success' | 'failure' | 'cancelled';
}

export type StreamEvent =
	| TokenStreamEvent
	| StatusStreamEvent
	| ToolStartStreamEvent
	| ToolEndStreamEvent
	| PatchStreamEvent
	| ErrorStreamEvent
	| DoneStreamEvent;

export type BudgetMeterKind = 'tokens' | 'time' | 'tools' | 'network' | 'filesystem';

export interface BudgetMeter {
	kind: BudgetMeterKind;
	limit: number;
	used: number;
	windowMs?: number;
	lastUpdated: string;
}

export interface Budget {
	id: string;
	sessionId: string;
	meters: BudgetMeter[];
	expiresAt?: string;
}

export interface SessionLabels {
	tags?: string[];
	owner?: string;
	environment?: 'dev' | 'ci' | 'prod' | 'test';
}

export interface SessionSnapshot {
	id: string;
	createdAt: string;
	updatedAt: string;
	labels?: SessionLabels;
	metadata?: Record<string, unknown>;
	parentId?: string;
}

export interface JsonSchemaDefinition {
	$id?: string;
	title?: string;
	type?: string;
	properties?: Record<string, JsonSchemaDefinition>;
	required?: string[];
	items?: JsonSchemaDefinition | JsonSchemaDefinition[];
	additionalProperties?: boolean | JsonSchemaDefinition;
	anyOf?: JsonSchemaDefinition[];
	allOf?: JsonSchemaDefinition[];
	oneOf?: JsonSchemaDefinition[];
	enum?: unknown[];
	const?: unknown;
	format?: string;
	minimum?: number;
	maximum?: number;
	pattern?: string;
}

export interface AgentResultMeta {
	prompt_id: string;
	prompt_version?: string;
	prompt_hash?: string;
	run_id?: string;
	model?: string;
	ts?: string;
	[key: string]: unknown;
}

export interface AgentResult<T = unknown> {
	data: T;
	meta: AgentResultMeta;
}
