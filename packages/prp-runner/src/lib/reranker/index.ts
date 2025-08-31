import { pipeline } from '@xenova/transformers';

export interface RerankerConfig {
  provider: 'transformers' | 'local' | 'mock';
  model?: string;
  batchSize?: number;
}

export interface RerankerResult {
  text: string;
  score: number;
  originalIndex: number;
}

export interface RerankerState {
  config: RerankerConfig;
}

export const createRerankerState = (
  provider: RerankerConfig['provider'] = 'transformers',
): RerankerState => {
  const configs: Record<RerankerConfig['provider'], RerankerConfig> = {
    transformers: {
      provider: 'transformers',
      model: 'Qwen/Qwen2.5-coder-cross-encoder',
    },
    local: {
      provider: 'local',
      model: 'local-reranker-model',
    },
    mock: {
      provider: 'mock',
    },
  };
  const config = configs[provider];
  if (!config) {
    throw new Error(`Unsupported reranker provider: ${provider}`);
  }
  return { config };
};

export const rerank = async (
  state: RerankerState,
  query: string,
  documents: string[],
  topK?: number,
): Promise<RerankerResult[]> => {
  switch (state.config.provider) {
    case 'transformers':
      return rerankWithTransformers(query, documents, topK, state.config.model);
    case 'local':
      return rerankWithLocal(query, documents, topK);
    case 'mock':
      return rerankWithMock(query, documents, topK);
    default:
      throw new Error(`Reranking not implemented for provider: ${state.config.provider}`);
  }
};

const rerankWithMock = async (
  query: string,
  documents: string[],
  topK?: number,
): Promise<RerankerResult[]> => {
  const queryLower = query.toLowerCase();
  const results: RerankerResult[] = documents.map((doc, index) => {
    const docLower = doc.toLowerCase();
    const queryWords = new Set(queryLower.split(/\s+/));
    const docWords = new Set(docLower.split(/\s+/));
    const intersection = new Set([...queryWords].filter((w) => docWords.has(w)));
    const overlap = intersection.size;
    const union = new Set([...queryWords, ...docWords]).size;
    const jaccardSimilarity = union === 0 ? 0 : overlap / union;
    const substringBoost = docLower.includes(queryLower) ? 0.2 : 0;
    const score = jaccardSimilarity + substringBoost;
    return { text: doc, score, originalIndex: index };
  });
  results.sort((a, b) => b.score - a.score);
  return topK ? results.slice(0, topK) : results;
};

let crossEncoder: any | null = null;

const rerankWithTransformers = async (
  query: string,
  documents: string[],
  topK?: number,
  model = 'Qwen/Qwen2.5-coder-cross-encoder',
): Promise<RerankerResult[]> => {
  if (!crossEncoder) {
    crossEncoder = await pipeline('text-classification', model, { quantized: true });
  }
  const inputs = documents.map((doc) => ({ text: query, text_pair: doc }));
  const outputs = await crossEncoder(inputs);
  const results: RerankerResult[] = outputs.map((out: any, index: number) => ({
    text: documents[index],
    score: out[0].score,
    originalIndex: index,
  }));
  results.sort((a, b) => b.score - a.score);
  return topK ? results.slice(0, topK) : results;
};

const rerankWithLocal = async (
  query: string,
  documents: string[],
  topK?: number,
): Promise<RerankerResult[]> => {
  console.warn('Local reranking not implemented, falling back to mock');
  return rerankWithMock(query, documents, topK);
};
