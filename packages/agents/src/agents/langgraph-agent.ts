import { Annotation, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import type { Agent, ExecutionContext } from '../lib/types.js';
import { generateAgentId } from '../lib/utils.js';
import { validateSchema } from '../lib/validate.js';

export const langGraphInputSchema = z.object({
	count: z.number().int(),
});

export const langGraphOutputSchema = z.object({
	count: z.number().int(),
});

export type LangGraphInput = z.infer<typeof langGraphInputSchema>;
export type LangGraphOutput = z.infer<typeof langGraphOutputSchema>;

/**
 * Agent that uses LangGraph.js to increment a numeric counter.
 */
export const createLangGraphAgent = (): Agent<
	LangGraphInput,
	LangGraphOutput
> => {
	const agentId = generateAgentId();

	const CountAnnotation = Annotation.Root({
		count: Annotation<number>({
			reducer: (_left, right) => right,
			default: () => 0,
		}),
	});

	const graph = new StateGraph(CountAnnotation)
		.addNode('increment', (state: typeof CountAnnotation.State) => ({
			count: state.count + 1,
		}))
		.addEdge('__start__', 'increment')
		.addEdge('increment', '__end__')
		.compile();

	return {
		id: agentId,
		name: 'langgraph-agent',
		capabilities: [
			{
				name: 'increment',
				description: 'Increment a counter using LangGraph state graph',
			},
		],
		execute: async (
			context: ExecutionContext<LangGraphInput> | LangGraphInput,
		): Promise<LangGraphOutput> => {
			// Type guard for ExecutionContext
			const input: LangGraphInput =
				typeof context === 'object' && context !== null && 'input' in context
					? (context as ExecutionContext<LangGraphInput>).input
					: (context as LangGraphInput);
			const parsed = validateSchema(langGraphInputSchema, input);
			const result = await graph.invoke({ count: parsed.count });
			const data = validateSchema(langGraphOutputSchema, result);
			return { count: data.count };
		},
	};
};
