import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { trace } from '@opentelemetry/api';
import { createOrchestrationBus } from '../events/orchestration-bus.js';
import { OrchestrationEventTypes } from '../events/orchestration-events.js';
import { selectFrontierModel, selectMLXModel, selectOllamaModel } from '../lib/model-selection.js';
import { evaluatePersonaCompliance, loadPersona } from '../persona/persona-loader.js';

type ModelRef = {
	provider: 'mlx' | 'ollama' | 'openai' | 'anthropic' | 'unknown';
	model: string;
	fallbackReason?: string;
};

const CerebrumAnnotation = Annotation.Root({
	input: Annotation<string>({ reducer: (_x, y) => y }),
	output: Annotation<string | undefined>({ reducer: (_x, y) => y }),
	task: Annotation<string | undefined>({ reducer: (_x, y) => y }),
	selectedModel: Annotation<ModelRef | undefined>({ reducer: (_x, y) => y }),
	violations: Annotation<string[]>({
		reducer: (x, y) => (y?.length ? [...(x ?? []), ...y] : (x ?? [])),
	}),
});

/**
 * Minimal LangGraph factory to establish foundations for later phases.
 */
export function createCerebrumGraph() {
	const bus = createOrchestrationBus();
	const builder = new StateGraph(CerebrumAnnotation)
		// Guard node enforces persona/policy requirements (WCAG/security)
		.addNode('guard', async () => {
			const tracer = trace.getTracer('orchestration');
			return await tracer.startActiveSpan('guard', async (span) => {
				const persona = await loadPersona();
				const comp = evaluatePersonaCompliance(persona);
				span.setAttribute('policy.a11y', comp.a11y);
				span.setAttribute('policy.security', comp.security);
				if (!comp.a11y || !comp.security) {
					const reason = comp.reasons.join('; ');
					await bus.publish(OrchestrationEventTypes.DecisionMade, {
						decisionId: 'policy.guard',
						outcome: 'policy.guard.failed',
						metadata: { reasons: comp.reasons, persona: persona.name },
					});
					throw new Error(`Policy guard failed: ${reason}`);
				}
				await bus.publish(OrchestrationEventTypes.DecisionMade, {
					decisionId: 'policy.guard',
					outcome: 'policy.guard.passed',
					metadata: { persona: persona.name },
				});
				return { violations: [] as string[] };
			});
		})
		// Model selection: MLX → Ollama → Frontier APIs
		.addNode('selectModel', async (state: typeof CerebrumAnnotation.State) => {
			const tracer = trace.getTracer('orchestration');
			return await tracer.startActiveSpan('selectModel', async (span) => {
				const task = state.task ?? 'chat';

				// 1. Try MLX first (Apple Silicon optimized)
				let selected: ModelRef;
				try {
					// Check if MLX is available and has suitable model
					const mlxModel = await selectMLXModel(task);
					if (mlxModel) {
						selected = { provider: 'mlx', model: mlxModel };
						span.setAttribute('model.selection.strategy', 'mlx-primary');
					} else {
						throw new Error('No suitable MLX model available');
					}
				} catch {
					// 2. Fallback to Ollama (local models)
					try {
						const ollamaModel = await selectOllamaModel(task);
						if (ollamaModel) {
							selected = {
								provider: 'ollama',
								model: ollamaModel,
								fallbackReason: 'mlx-unavailable',
							};
							span.setAttribute('model.selection.strategy', 'ollama-fallback');
						} else {
							throw new Error('No suitable Ollama model available');
						}
					} catch {
						// 3. Final fallback to Frontier model APIs
						const frontierModel = selectFrontierModel(task);
						selected = {
							provider: frontierModel.provider as 'openai' | 'anthropic',
							model: frontierModel.model,
							fallbackReason: 'local-models-unavailable',
						};
						span.setAttribute('model.selection.strategy', 'frontier-fallback');
					}
				}

				span.setAttribute('model.selection.task', task);
				span.setAttribute('model.selection.provider', selected.provider);
				span.setAttribute('model.selection.model', selected.model);
				if (selected.fallbackReason) {
					span.setAttribute('model.selection.fallback_reason', selected.fallbackReason);
				}

				await bus.publish(OrchestrationEventTypes.DecisionMade, {
					decisionId: 'model.selection',
					outcome: 'model.selected',
					metadata: {
						provider: selected.provider,
						model: selected.model,
						task,
						fallbackReason: selected.fallbackReason,
					},
				});
				return { selectedModel: selected };
			});
		})
		// Minimal chat node that consumes selectedModel (placeholder for streaming)
		.addNode('chat', async (state: typeof CerebrumAnnotation.State) => {
			// In future, stream tokens using selectedModel provider
			if (state.selectedModel) {
				// placeholder: could log or set attributes
			}
			return { output: state.input };
		})
		// For now, echo returns input as output
		.addNode('echo', async (state: typeof CerebrumAnnotation.State) => {
			return { output: state.input };
		})
		.addEdge(START, 'guard')
		.addEdge('guard', 'selectModel')
		.addEdge('selectModel', 'chat')
		.addEdge('chat', 'echo')
		.addEdge('echo', END);
	return builder.compile();
}
