import { ModelRouter } from './model-router';

export type EmbeddingsBody = { model?: string; texts: string[] };
export type RerankBody = { model?: string; query: string; docs: string[]; topK?: number };
export type ChatBody = {
  model?: string;
  msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  tools?: unknown;
};

export async function embeddingsHandler(router: ModelRouter, body: EmbeddingsBody) {
  const { texts, model } = body;
  if (!Array.isArray(texts) || texts.length === 0) {
    const err = new Error('texts must be a non-empty array');
    (err as any).status = 400;
    throw err;
  }
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

export async function rerankHandler(router: ModelRouter, body: RerankBody) {
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

export async function chatHandler(router: ModelRouter, body: ChatBody) {
  if (!router.hasCapability('chat')) {
    const err = new Error('No chat models available');
    (err as any).status = 503;
    throw err;
  }
  const result = await router.generateChat({
    messages: body.msgs,
    model: body.model,
    max_tokens: 1000,
    temperature: 0.7,
  });
  return { content: result.content, modelUsed: result.model };
}
