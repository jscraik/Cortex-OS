import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

type ModelRef = {
	provider: 'unknown';
	model: string;
};

const CerebrumAnnotation = Annotation.Root({
        input: Annotation<string>({ reducer: (_prev, next) => next }),
        output: Annotation<string | undefined>({ reducer: (_prev, next) => next }),
        selectedModel: Annotation<ModelRef | undefined>({ reducer: (_prev, next) => next }),
        planning: Annotation<
                | {
                          taskId?: string;
                          phases: Array<{ phase: string; duration: number; status: string }>;
                          recommendations?: string[];
                  }
                | undefined
        >({ reducer: (_prev, next) => next }),
        coordination: Annotation<
                | {
                          strategy: string;
                          assignments: Array<{ agentId: string; role: string; weight: number }>;
                          confidence: number;
                  }
                | undefined
        >({ reducer: (_prev, next) => next }),
});

/**
 * Minimal LangGraph factory that keeps structure extensible without pulling in
 * the legacy orchestration stack. The nodes simply echo the input while setting
 * placeholder model-selection metadata so downstream tests can assert shape.
 */
export function createCerebrumGraph() {
	const builder = new StateGraph(CerebrumAnnotation)
                .addNode('selectModel', async (state: typeof CerebrumAnnotation.State) => {
                        return {
                                selectedModel: {
                                        provider: 'unknown',
                                        model: 'placeholder',
                                },
                                planning: state.planning,
                                coordination: state.coordination,
                        };
                })
                .addNode('respond', async (state: typeof CerebrumAnnotation.State) => {
                        return {
                                output: state.input,
                                planning: state.planning,
                                coordination: state.coordination,
                        };
                })
		.addEdge(START, 'selectModel')
		.addEdge('selectModel', 'respond')
		.addEdge('respond', END);

	return builder.compile();
}
