import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

type ModelRef = {
	provider: 'unknown';
	model: string;
};

const CerebrumAnnotation = Annotation.Root({
	input: Annotation<string>({ reducer: (_prev, next) => next }),
	output: Annotation<string | undefined>({ reducer: (_prev, next) => next }),
	selectedModel: Annotation<ModelRef | undefined>({ reducer: (_prev, next) => next }),
});

/**
 * Minimal LangGraph factory that keeps structure extensible without pulling in
 * the legacy orchestration stack. The nodes simply echo the input while setting
 * placeholder model-selection metadata so downstream tests can assert shape.
 */
export function createCerebrumGraph() {
	const builder = new StateGraph(CerebrumAnnotation)
		.addNode('selectModel', async () => {
			return {
				selectedModel: {
					provider: 'unknown',
					model: 'placeholder',
				},
			};
		})
		.addNode('respond', async (state: typeof CerebrumAnnotation.State) => {
			return { output: state.input };
		})
		.addEdge(START, 'selectModel')
		.addEdge('selectModel', 'respond')
		.addEdge('respond', END);

	return builder.compile();
}
