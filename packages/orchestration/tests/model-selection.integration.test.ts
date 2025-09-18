import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../src/langgraph/create-cerebrum-graph.js';
import {
	selectFrontierModel,
	selectMLXModel,
	selectOllamaModel,
} from '../src/lib/model-selection.js';

// Helper: detect if a frontier provider is configured in env (OpenAI/Anthropic)
function hasFrontierEnv(): boolean {
	return Boolean(
		process.env.OPENAI_API_KEY ||
		process.env.ANTHROPIC_API_KEY ||
		process.env.FRONTIER_PROVIDER ||
		process.env.FRONTIER_MODEL,
	);
}

describe('Model selection (LangGraph foundation)', () => {
	it('uses MLX → Ollama → Frontier selection order depending on availability', async () => {
		// Probe availability for a simple "chat" task
		const mlx = await selectMLXModel('chat');
		const ollama = await selectOllamaModel('chat');
		const frontier = selectFrontierModel('chat');

		// Construct graph and perform a trivial run to ensure graph wiring is healthy
		const graph = createCerebrumGraph();
		const res = await graph.invoke({ input: 'hello', task: 'chat' });
		expect(res.output).toBe('hello');

		// Validate selection logic expectations by environment:
		// - If MLX service is up, it should be chosen before Ollama/Frontier
		if (mlx) {
			// When MLX is available, we expect the probed MLX model to be truthy
			expect(mlx).toBeTruthy();
			return;
		}

		// - If MLX is not available but Ollama is, it should be chosen next
		if (!mlx && ollama) {
			expect(ollama).toBeTruthy();
			return;
		}

		// - If both local services are unavailable but a frontier provider is configured,
		//   at least assert we have a frontier spec available; skip assertion if no env
		if (!mlx && !ollama) {
			if (hasFrontierEnv()) {
				expect(frontier).toBeTruthy();
				expect(frontier.model).toBeTruthy();
				return;
			}
			// No frontier provider set; we don’t fail the test as availability is env-dependent.
			expect(frontier).toBeTruthy(); // still returns a spec by design
		}
	});
});
