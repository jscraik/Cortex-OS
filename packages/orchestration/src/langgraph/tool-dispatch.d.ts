import type { HookResult } from '@cortex-os/hooks';
import type { N0Budget, N0Session } from './n0-state.js';
import { type SpoolResult } from './spool.js';
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
export declare function dispatchTools<T = unknown>(
	jobs: ToolDispatchJob<T>[],
	opts: ToolDispatchOptions<T>,
): Promise<ToolDispatchResult<T>[]>;
//# sourceMappingURL=tool-dispatch.d.ts.map
