import type { SuiteOutcome } from '../types';
import { createModelRouter } from '@cortex-os/model-gateway/src/model-router';

// Lightweight stubs to avoid external deps and ensure deterministic behavior
const ok = async () => true;
const fail = async () => false;

const makeStubs = (opts?: { mlx?: boolean; ollama?: boolean; mcp?: boolean }) => {
  const mlx = {
    isAvailable: opts?.mlx ? ok : fail,
    generateEmbedding: async ({ text }: any) => ({ embedding: [text.length], model: 'qwen3-embedding-4b-mlx' }),
    generateEmbeddings: async (texts: string[]) => texts.map((t) => ({ embedding: [t.length] })),
    rerank: async (_q: string, _docs: string[], _model: string) => ({ scores: _docs.map((_, i) => 1 / (i + 1)) }),
  } as any;
  const ollama = {
    isAvailable: opts?.ollama ? ok : fail,
    listModels: async () => ['gpt-oss:20b', 'llama2'],
    generateEmbedding: async (text: string) => ({ embedding: [text.length] }),
    generateEmbeddings: async (texts: string[]) => texts.map((t) => ({ embedding: [t.length] })),
    generateChat: async ({ messages }: any) => ({ content: messages[messages.length - 1]?.content ?? '' }),
    rerank: async (_q: string, docs: string[], _m: string) => ({ scores: docs.map((_, i) => 1 / (i + 1)) }),
  } as any;
  return { mlx, ollama };
};

export async function runRouterSuite(name: string): Promise<SuiteOutcome> {
  const { mlx, ollama } = makeStubs({ mlx: true, ollama: true });
  const r = createModelRouter(mlx, ollama);
  await r.initialize();

  const emb = await r.generateEmbedding({ text: 'hi' });
  const chat = await r.generateChat({ messages: [{ role: 'user', content: 'ping' } as any] });
  const rerank = await r.rerank({ query: 'q', documents: ['a', 'b', 'c'] });

  const metrics = {
    hasEmbedding: r.hasAvailableModels('embedding') ? 1 : 0,
    hasChat: r.hasAvailableModels('chat') ? 1 : 0,
    hasRerank: r.hasAvailableModels('reranking') ? 1 : 0,
    embedDim: emb.embedding.length,
    chatNonEmpty: chat.content.length > 0 ? 1 : 0,
    rerankScores: rerank.scores.length,
  } as Record<string, number>;

  const pass = metrics.hasEmbedding && metrics.hasChat && metrics.hasRerank && metrics.chatNonEmpty ? true : false;

  return { name, pass, metrics, notes: ['Deterministic stubs; verifies routing and fallbacks compile'] };
}

