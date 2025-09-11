import type { IModelRouter as ModelRouter } from './model-router';

export function embeddingsHandler(
	router: ModelRouter,
	body: { model?: string; texts: string[] },
) {
	const { texts, model } = body;

	if (texts.length === 1) {
		return router
			.generateEmbedding({ text: texts[0], model })
			.then((result) => ({
				vectors: [result.embedding],
				dimensions: result.embedding.length,
				modelUsed: result.model,
			}));
	}

	return router.generateEmbeddings({ texts, model }).then((result) => ({
		vectors: result.embeddings,
		dimensions: result.embeddings[0]?.length || 0,
		modelUsed: result.model,
	}));
}

export async function rerankHandler(
	router: ModelRouter,
	body: { model?: string; query: string; docs: string[]; topK?: number },
) {
	const result = await router.rerank({
		query: body.query,
		documents: body.docs,
		model: body.model,
	});
	// Build ranked results from the rerank response
	const ranked = (result.documents || [])
		.map((content, index) => ({
			index: index,
			score: result.scores?.[index] ?? 0,
			content,
		}))
		.sort((a, b) => b.score - a.score);

	return {
		rankedItems: ranked.slice(0, body.topK ?? ranked.length),
		modelUsed: result.model,
	};
}

export function chatHandler(
	router: ModelRouter,
	body: {
		model?: string;
		msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
		tools?: unknown;
	},
) {
	if (!router.hasCapability('chat')) {
		throw new Error('No chat models available');
	}

	return router
		.generateChat({
			messages: body.msgs,
			model: body.model,
			max_tokens: 1000,
			temperature: 0.7,
		})
		.then((result) => ({
			content: result.content,
			modelUsed: result.model,
		}));
}
