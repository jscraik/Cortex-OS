import { createAutoDelegateTool, materializeSubagentTool } from '@cortex-os/agent-contracts';
import { bindKernelTools } from '@cortex-os/kernel';
import { compactN0State } from './n0-state.js';
import { dispatchTools } from './tool-dispatch.js';
export function createHookAwareDispatcher(options) {
	const hooksRef = options.hooks;
	const hookAdapter = hooksRef
		? {
				run: (event, ctx) => hooksRef.run(event, ctx),
			}
		: undefined;
	return {
		async dispatch(jobs, overrides = {}) {
			let progress;
			if (overrides.onProgress) {
				// Wrap the generic handler to a non-generic form that the dispatcher expects
				progress = (event) => overrides.onProgress?.(event);
			} else if (options.onProgress) {
				progress = (event) => options.onProgress?.(event);
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
export function createUnifiedToolSystem(options) {
	const hooksRef = options.hooks;
	const kernel = bindKernelTools(options.kernel);
	const agentTools = [];
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
		compact(state) {
			const compactionOpts = {
				...options.compaction,
				hooks: hooksRef ? { run: (event, ctx) => hooksRef.run(event, ctx) } : undefined,
				session: options.session,
			};
			return compactN0State(state, compactionOpts);
		},
	};
}
//# sourceMappingURL=tool-system.js.map
