import { Buffer } from 'node:buffer';
import type { IModelRouter as ModelRouter } from './model-router.js';
import { createAttentionBridgeFromEnv } from './kv/attention-bridge.js';

export async function embeddingsHandler(
	router: ModelRouter,
	body: { model?: string; texts: string[] },
) {
	const { texts, model } = body;

	if (texts.length === 1) {
		const result = await router.generateEmbedding({ text: texts[0], model });
		return {
			vectors: [result.embedding],
			dimensions: result.embedding.length,
			modelUsed: result.model,
		};
	}

	const result = await router.generateEmbeddings({ texts, model });
	return {
		vectors: result.embeddings,
		dimensions: result.embeddings[0]?.length || 0,
		modelUsed: result.model,
	};
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

export async function chatHandler(
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

	const attentionBridge = createAttentionBridgeFromEnv();
	const bridgeRun = await attentionBridge.prepareRun(
		`chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		{ model: body.model },
	);

	const result = await router.generateChat({
		messages: body.msgs,
		model: body.model,
		max_tokens: 1000,
		temperature: 0.7,
	});

	const content = result.content ?? '';
	const tokens = Math.max(0, Math.floor(content.trim().split(/\s+/).length * 1.3));
	await attentionBridge.captureKV(
		{ step: 'chat-completion', role: 'assistant' },
		bridgeRun,
		{
			tokensCaptured: tokens,
			bytesCaptured: Buffer.byteLength(content, 'utf8'),
			source: 'chat.output',
		},
	);
	await attentionBridge.emitReceipt(bridgeRun);
	await attentionBridge.close();

	return {
		content: result.content,
		modelUsed: result.model,
	};
}
