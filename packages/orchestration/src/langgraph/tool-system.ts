import {
	createAutoDelegateTool,
	materializeSubagentTool,
	type Subagent,
	type SubagentConfig,
	type Tool as SubagentToolDefinition,
} from '@cortex-os/agent-contracts';
import type { HookResult } from '@cortex-os/hooks';
import {
	type BindKernelToolsOptions,
	bindKernelTools,
	type KernelToolBinding,
} from '@cortex-os/kernel';
import {
	compactN0State,
	type MemoryCompactionOptions,
	type MemoryCompactionResult,
	type N0Budget,
	type N0Session,
	type N0State,
} from './n0-state.js';
import {
	dispatchTools,
	type ToolDispatchHooks,
	type ToolDispatchJob,
	type ToolDispatchOptions,
	type ToolDispatchProgressEvent,
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

export function createHookAwareDispatcher(
	options: HookAwareDispatcherOptions,
): HookAwareDispatcher {
	const hooksRef = options.hooks;
	const hookAdapter: ToolDispatchHooks | undefined = hooksRef
		? {
				run: (event, ctx) => hooksRef.run(event, ctx),
			}
		: undefined;
	return {
		async dispatch<T>(
			jobs: ToolDispatchJob<T>[],
			overrides: Partial<ToolDispatchOptions<T>> = {},
		): Promise<ToolDispatchResult<T>[]> {
			let progress: ToolDispatchProgressHandler<unknown> | undefined;
			if (overrides.onProgress) {
				// Wrap the generic handler to a non-generic form that the dispatcher expects
				progress = (event: ToolDispatchProgressEvent<unknown>) =>
					overrides.onProgress?.(event as ToolDispatchProgressEvent<T>);
			} else if (options.onProgress) {
				progress = (event: ToolDispatchProgressEvent<unknown>) => options.onProgress?.(event);
			} else {
				progress = undefined;
			}
			return dispatchTools(jobs, {
				session: overrides.session ?? options.session,
				budget: overrides.budget ?? options.budget,
				concurrency: overrides.concurrency ?? options.concurrency,
				allowList: overrides.allowList ?? options.allowList,
				hooks: overrides.hooks ?? hookAdapter,
				onProgress: progress,
			});
		},
	};
}

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

export function createUnifiedToolSystem(options: UnifiedToolSystemOptions): UnifiedToolSystem {
	const hooksRef = options.hooks;
	const kernel = bindKernelTools(options.kernel);
	const agentTools: SubagentToolDefinition[] = [];

	if (options.subagents && options.subagents.size > 0) {
		for (const subagent of options.subagents.values()) {
			agentTools.push(materializeSubagentTool(subagent.config, subagent));
		}
		if (options.autoDelegate) {
			agentTools.push(createAutoDelegateTool(options.subagents, options.selectSubagents));
		}
	}

	const dispatcher = createHookAwareDispatcher({
		session: options.session,
		budget: options.budget,
		concurrency: options.concurrency,
		allowList: options.allowList,
		hooks: options.hooks,
		onProgress: options.onProgress,
	});

	return {
		kernel,
		agentTools,
		metadata: {
			kernelSurfaces: kernel.tools.map((tool) => tool.name),
			agentNames: agentTools.map((tool) => tool.name),
		},
		dispatcher,
		dispatch: dispatcher.dispatch,
		compact(state: N0State) {
			const compactionOpts: MemoryCompactionOptions = {
				...options.compaction,
				hooks: hooksRef ? { run: (event, ctx) => hooksRef.run(event, ctx) } : undefined,
				session: options.session,
			};
			return compactN0State(state, compactionOpts);
		},
	};
}
