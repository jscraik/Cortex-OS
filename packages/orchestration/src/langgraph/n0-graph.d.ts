import {
	type Subagent as ContractSubagent,
	type LoadedSubagents,
	type LoadSubagentsOptions,
	type SubagentToolsOptions,
} from '@cortex-os/agent-contracts';
import { runSlash as defaultRunSlash, type RunSlashOptions } from '@cortex-os/commands';
import { type HookContext, type HookEvent, type HookResult } from '@cortex-os/hooks';
import type { LoadOptions as HookLoadOptions } from '@cortex-os/hooks/src/loaders.js';
import {
	type BindKernelToolsOptions,
	type KernelTool,
	type KernelToolBinding,
} from '@cortex-os/kernel';
import { type BaseMessage } from '@langchain/core/messages';
import { type StructuredTool } from '@langchain/core/tools';
import type { z } from 'zod';
import type { N0Session, N0State } from './n0-state.js';
import { type ToolDispatchHooks } from './tool-dispatch.js';
export declare const N0Annotation: import('@langchain/langgraph').AnnotationRoot<{
	input: import('@langchain/langgraph').BinaryOperatorAggregate<string, string>;
	session: import('@langchain/langgraph').BinaryOperatorAggregate<
		{
			model: string;
			id: string;
			cwd: string;
			user: string;
			brainwavSession?: string | undefined;
		},
		{
			model: string;
			id: string;
			cwd: string;
			user: string;
			brainwavSession?: string | undefined;
		}
	>;
	ctx: import('@langchain/langgraph').BinaryOperatorAggregate<
		Record<string, unknown>,
		Record<string, unknown>
	>;
	output: import('@langchain/langgraph').BinaryOperatorAggregate<
		string | undefined,
		string | undefined
	>;
	budget: import('@langchain/langgraph').BinaryOperatorAggregate<
		| {
				tokens: number;
				depth: number;
				timeMs: number;
		  }
		| undefined,
		| {
				tokens: number;
				depth: number;
				timeMs: number;
		  }
		| undefined
	>;
	messages: import('@langchain/langgraph').BinaryOperatorAggregate<
		BaseMessage[],
		import('@langchain/langgraph').Messages
	>;
}>;
export interface ToolCallableModel {
	bindTools(tools: StructuredTool[]): ToolCallableModel;
	invoke(messages: BaseMessage[], options?: unknown): Promise<BaseMessage>;
}
export interface ToolExecutionContext {
	session: N0Session;
	state: N0State;
	callId: string;
}
export interface ToolExecutionOutput {
	content: string;
	status?: 'success' | 'error';
	metadata?: Record<string, unknown>;
	artifact?: unknown;
}
export interface ToolDefinition {
	name: string;
	description: string;
	schema: z.ZodTypeAny;
	execute: (input: unknown, context: ToolExecutionContext) => Promise<ToolExecutionOutput>;
	metadata?: Record<string, unknown>;
}
export interface HookRunner {
	run(event: HookEvent, ctx: HookContext | Record<string, unknown>): Promise<HookResult[]>;
	init?(options?: HookLoadOptions): Promise<void>;
}
export interface PlanDecision {
	strategy: 'plan' | 'direct';
	rationale?: string;
}
export type StreamEvent =
	| {
			type: 'chunk';
			content: string;
	  }
	| {
			type: 'final';
			content: string;
	  };
export interface BuildN0Options {
	model: ToolCallableModel;
	hooks?: HookRunner;
	hookLoadOptions?: HookLoadOptions;
	runSlash?: typeof defaultRunSlash;
	runSlashOptions?: RunSlashOptions;
	kernelBinding?: KernelToolBinding;
	kernelTools?: KernelTool[];
	kernelOptions?: BindKernelToolsOptions;
	subagents?: Map<string, ContractSubagent>;
	subagentOptions?: LoadSubagentsOptions;
	subagentToolOptions?: SubagentToolsOptions;
	disableSubagentDiscovery?: boolean;
	orchestratorTools?: ToolDefinition[];
	toolHooks?: ToolDispatchHooks;
	toolAllowList?: string[];
	toolConcurrency?: number;
	systemPrompt?: string;
	planResolver?: (state: N0State) => PlanDecision;
	compaction?: {
		maxMessages?: number;
		maxChars?: number;
	};
	logger?: Pick<Console, 'info' | 'warn' | 'error'>;
	streamPublisher?: (event: StreamEvent) => Promise<void> | void;
}
export interface BuildN0Result {
	graph: unknown;
	hooks: HookRunner;
	tools: Map<string, ToolDefinition>;
	subagentManager?: LoadedSubagents['manager'];
}
export declare function buildN0(options: BuildN0Options): Promise<BuildN0Result>;
//# sourceMappingURL=n0-graph.d.ts.map
