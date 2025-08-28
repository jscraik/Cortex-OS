import type { Embedder } from '../ports/Embedder.js';
import axios from 'axios';

const DEFAULT_OLLAMA_MODEL = 'nomic-embed-text';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export class OllamaEmbedder implements Embedder {
  private readonly modelName: string;
  private readonly client: any;

  constructor(modelName?: string) {
    this.modelName = modelName || DEFAULT_OLLAMA_MODEL;
    this.client = axios.create({
      baseURL: OLLAMA_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  name(): string {
    return `ollama-${this.modelName}`;
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];

      // Ollama doesn't have a native batch API, so we'll process sequentially
      for (const text of texts) {
        const response = await this.client.post('/api/embeddings', {
          model: this.modelName,
          prompt: text,
        });

        if (response.data && Array.isArray(response.data.embedding)) {
          embeddings.push(response.data.embedding);
        } else {
          throw new Error('Invalid response from Ollama embedding API');
        }
      }

      return embeddings;
    } catch (error) {
      console.error('Ollama embedding failed:', error);
      throw error;
    }
  }
}
