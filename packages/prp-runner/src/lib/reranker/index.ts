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
  provider: RerankerConfig['provider'] = 'mock',
): RerankerState => {
  const configs: Record<RerankerConfig['provider'], RerankerConfig> = {
    transformers: {
      provider: 'transformers',
      model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
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
      return rerankWithTransformers(query, documents, topK);
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

const rerankWithTransformers = async (
  query: string,
  documents: string[],
  topK?: number,
): Promise<RerankerResult[]> => {
  console.warn('Transformers reranking not implemented, falling back to mock');
  return rerankWithMock(query, documents, topK);
};

const rerankWithLocal = async (
  query: string,
  documents: string[],
  topK?: number,
): Promise<RerankerResult[]> => {
  console.warn('Local reranking not implemented, falling back to mock');
  return rerankWithMock(query, documents, topK);
};
