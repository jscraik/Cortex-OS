import { type ThermalGuardState } from './middleware/thermal-guard.js';
import { ThermalPolicy } from './thermal/thermal-policy.js';
export interface CerebrumGraphConfig {
	thermalPolicy?: ThermalPolicy;
	clock?: () => number;
}
type ModelRef = {
	provider: string;
	model: string;
};
export declare function createCerebrumGraph(
	config?: CerebrumGraphConfig,
): import('@langchain/langgraph').CompiledStateGraph<
	{
		input: string;
		output: string | undefined;
		selectedModel: ModelRef | undefined;
		ctx: Record<string, unknown>;
		session:
			| {
					model: string;
					id: string;
					cwd: string;
					user: string;
					brainwavSession?: string | undefined;
			  }
			| undefined;
		budget:
			| {
					tokens: number;
					depth: number;
					timeMs: number;
			  }
			| undefined;
	},
	{
		input?: string | undefined;
		output?: string | undefined;
		selectedModel?: ModelRef | undefined;
		ctx?: Record<string, unknown> | undefined;
		session?:
			| {
					model: string;
					id: string;
					cwd: string;
					user: string;
					brainwavSession?: string | undefined;
			  }
			| undefined;
		budget?:
			| {
					tokens: number;
					depth: number;
					timeMs: number;
			  }
			| undefined;
	},
	'__start__' | 'bootstrap' | 'selectModel' | 'respond',
	{
		input: import('@langchain/langgraph').BinaryOperatorAggregate<string, string>;
		output: import('@langchain/langgraph').BinaryOperatorAggregate<
			string | undefined,
			string | undefined
		>;
		selectedModel: import('@langchain/langgraph').BinaryOperatorAggregate<
			ModelRef | undefined,
			ModelRef | undefined
		>;
		ctx: import('@langchain/langgraph').BinaryOperatorAggregate<
			Record<string, unknown>,
			Record<string, unknown>
		>;
		session: import('@langchain/langgraph').BinaryOperatorAggregate<
			| {
					model: string;
					id: string;
					cwd: string;
					user: string;
					brainwavSession?: string | undefined;
			  }
			| undefined,
			| {
					model: string;
					id: string;
					cwd: string;
					user: string;
					brainwavSession?: string | undefined;
			  }
			| undefined
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
	},
	{
		input: import('@langchain/langgraph').BinaryOperatorAggregate<string, string>;
		output: import('@langchain/langgraph').BinaryOperatorAggregate<
			string | undefined,
			string | undefined
		>;
		selectedModel: import('@langchain/langgraph').BinaryOperatorAggregate<
			ModelRef | undefined,
			ModelRef | undefined
		>;
		ctx: import('@langchain/langgraph').BinaryOperatorAggregate<
			Record<string, unknown>,
			Record<string, unknown>
		>;
		session: import('@langchain/langgraph').BinaryOperatorAggregate<
			| {
					model: string;
					id: string;
					cwd: string;
					user: string;
					brainwavSession?: string | undefined;
			  }
			| undefined,
			| {
					model: string;
					id: string;
					cwd: string;
					user: string;
					brainwavSession?: string | undefined;
			  }
			| undefined
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
	},
	import('@langchain/langgraph').StateDefinition,
	{
		bootstrap: {
			session: {
				model: string;
				id: string;
				cwd: string;
				user: string;
				brainwavSession?: string | undefined;
			};
			budget: {
				tokens: number;
				depth: number;
				timeMs: number;
			};
			ctx: Record<string, unknown>;
		};
		selectModel: Partial<ThermalGuardState>;
		respond: {
			output: string;
		};
	}
>;
//# sourceMappingURL=create-cerebrum-graph.d.ts.map
