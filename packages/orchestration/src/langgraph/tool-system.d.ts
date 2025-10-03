import {
	type Subagent,
	type SubagentConfig,
	type Tool as SubagentToolDefinition,
} from '@cortex-os/agent-contracts';
import type { HookResult } from '@cortex-os/hooks';
import { type BindKernelToolsOptions, type KernelToolBinding } from '@cortex-os/kernel';
import {
	type MemoryCompactionOptions,
	type MemoryCompactionResult,
	type N0Budget,
	type N0Session,
	type N0State,
} from './n0-state.js';
import {
	type ToolDispatchJob,
	type ToolDispatchOptions,
	type ToolDispatchProgressHandler,
	type ToolDispatchResult,
} from './tool-dispatch.js';
export interface HookRunner {
	run: (
		event: 'PreToolUse' | 'PostToolUse' | 'PreCompact',
		ctx: Record<string, unknown>,
	) => Promise<HookResult[]>;
}
export interface HookAwareDispatcherOptions {
	session: N0Session;
	budget?: N0Budget;
	concurrency?: number;
	allowList?: string[];
	hooks?: HookRunner;
	onProgress?: ToolDispatchProgressHandler;
}
export interface HookAwareDispatcher {
	dispatch<T>(
		jobs: ToolDispatchJob<T>[],
		overrides?: Partial<ToolDispatchOptions<T>>,
	): Promise<ToolDispatchResult<T>[]>;
}
export declare function createHookAwareDispatcher(
	options: HookAwareDispatcherOptions,
): HookAwareDispatcher;
export interface UnifiedToolSystemOptions {
	kernel: BindKernelToolsOptions;
	session: N0Session;
	hooks?: HookRunner;
	budget?: N0Budget;
	concurrency?: number;
	allowList?: string[];
	onProgress?: ToolDispatchProgressHandler;
	subagents?: Map<string, Subagent>;
	autoDelegate?: boolean;
	selectSubagents?: (task: string, k: number) => Promise<SubagentConfig[]>;
	compaction?: Omit<MemoryCompactionOptions, 'hooks' | 'session'>;
}
export interface UnifiedToolSystem {
	kernel: KernelToolBinding;
	agentTools: SubagentToolDefinition[];
	metadata: {
		kernelSurfaces: string[];
		agentNames: string[];
	};
	dispatcher: HookAwareDispatcher;
	dispatch<T>(
		jobs: ToolDispatchJob<T>[],
		overrides?: Partial<ToolDispatchOptions<T>>,
	): Promise<ToolDispatchResult<T>[]>;
	compact(state: N0State): Promise<MemoryCompactionResult>;
}
export declare function createUnifiedToolSystem(
	options: UnifiedToolSystemOptions,
): UnifiedToolSystem;
//# sourceMappingURL=tool-system.d.ts.map
