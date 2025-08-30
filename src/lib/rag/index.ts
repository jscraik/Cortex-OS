/**
 * RAG helper functions: retrieval, reranking, prompt assembly, generation, and orchestrator.
 */

export interface EmbeddingResult {
  text: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingAdapter {
  similaritySearch(args: {
    text: string;
    topK: number;
    threshold: number;
  }): Promise<EmbeddingResult[]>;
}

export interface RerankerResult {
  text: string;
  score: number;
  originalIndex: number;
}

export interface RerankerAdapter {
  rerank(query: string, documents: string[], topK?: number): Promise<RerankerResult[]>;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

export type GenerateFn = (prompt: string, options: GenerationOptions) => Promise<string>;

/**
 * Retrieve relevant documents using embedding similarity search.
 */
export async function retrieve(
  query: string,
  embedding: EmbeddingAdapter,
  topK: number,
  threshold: number,
): Promise<EmbeddingResult[]> {
  return embedding.similaritySearch({ text: query, topK, threshold });
}

/**
 * Rerank retrieved documents using optional reranker.
 */
export async function rerank(
  query: string,
  results: EmbeddingResult[],
  reranker?: RerankerAdapter,
  topK?: number,
): Promise<EmbeddingResult[]> {
  if (!reranker || results.length === 0) {
    return results;
  }

  const reranked = await reranker.rerank(
    query,
    results.map((r) => r.text),
    topK,
  );
  return reranked.map((rr) => ({
    ...results[rr.originalIndex],
    similarity: rr.score,
  }));
}

/**
 * Build prompt with optional system prompt and context.
 */
export function assemblePrompt(query: string, context: string[], systemPrompt?: string): string {
  const contextSection =
    context.length > 0
      ? `Context information:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n\n')}\n\n`
      : '';

  const system = systemPrompt
    ? `${systemPrompt}\n\n`
    : "You are a helpful AI assistant. Answer the question based on the provided context. If the context doesn't contain enough information, say so clearly.\n\n";

  return `${system}${contextSection}Question: ${query}\n\nAnswer:`;
}

/**
 * Generate answer using provided generation function.
 */
export async function generateAnswer(
  prompt: string,
  options: GenerationOptions,
  generate: GenerateFn,
): Promise<string> {
  return generate(prompt, options);
}

export interface RAGConfig {
  topK?: number;
  similarityThreshold?: number;
  rerankTopK?: number;
}

export interface RAGQueryArgs {
  query: string;
  systemPrompt?: string;
}

export interface RAGSource {
  text: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface RAGResult {
  answer: string;
  sources: RAGSource[];
  prompt: string;
  confidence: number;
}

function calculateConfidence(sources: RAGSource[]): number {
  if (sources.length === 0) return 0;
  const avg = sources.reduce((sum, s) => sum + s.similarity, 0) / sources.length;
  const top = sources[0].similarity;
  return (avg + top) / 2;
}

/**
 * Orchestrate full RAG workflow.
 */
export async function ragQuery(
  args: RAGQueryArgs,
  deps: {
    embedding: EmbeddingAdapter;
    reranker?: RerankerAdapter;
    generate: GenerateFn;
    rag?: RAGConfig;
  },
): Promise<RAGResult> {
  const ragCfg = deps.rag ?? {};
  const retrieved = await retrieve(
    args.query,
    deps.embedding,
    ragCfg.topK ?? 5,
    ragCfg.similarityThreshold ?? 0.3,
  );
  const reranked = await rerank(args.query, retrieved, deps.reranker, ragCfg.rerankTopK ?? 3);
  const prompt = assemblePrompt(
    args.query,
    reranked.map((r) => r.text),
    args.systemPrompt,
  );
  const answer = await generateAnswer(prompt, { temperature: 0.3, maxTokens: 1024 }, deps.generate);
  const sources = reranked.map(({ text, similarity, metadata }) => ({
    text,
    similarity,
    metadata,
  }));
  return { answer, sources, prompt, confidence: calculateConfidence(sources) };
}
