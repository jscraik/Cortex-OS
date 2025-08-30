import type {
  ChatResponse,
  Embedding,
  MLXAdapterInterface,
  Message,
  OllamaAdapterInterface,
} from '../../packages/model-gateway/src/adapters/types';

// Types are imported from the shared adapters `types.ts` above; no direct adapter-specific types needed here

// Minimal typed mock implementations matching the real adapters' exported shapes
export class MockMLXAdapter implements MLXAdapterInterface {
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generateEmbedding(request: { text: string; model?: string }): Promise<Embedding> {
    return {
      embedding: new Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      model: request.model || 'qwen3-embedding-4b-mlx',
    } as Embedding;
  }

  async generateEmbeddings(request: { texts: string[]; model?: string }): Promise<Embedding[]> {
    return request.texts.map(
      (_, index) =>
        ({
          embedding: new Array(1536).fill(0).map((_, i) => Math.sin((i + index) * 0.1)),
          model: request.model || 'qwen3-embedding-4b-mlx',
        }) as Embedding,
    );
  }

  async generateChat(request: {
    messages: Message[];
    model?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<ChatResponse> {
    return {
      content: `Mock MLX response to: ${request.messages[request.messages.length - 1]?.content}`,
      model: request.model || 'qwen3-chat-mlx',
    } as ChatResponse;
  }
}

export class MockOllamaAdapter implements OllamaAdapterInterface {
  async isAvailable(model?: string): Promise<boolean> {
    return true;
  }

  async generateEmbedding(text: string, model?: string): Promise<Embedding> {
    return {
      embedding: new Array(1536).fill(0).map((_, i) => Math.cos(i * 0.1)),
      model: model || 'nomic-embed-text',
    } as Embedding;
  }

  async generateEmbeddings(texts: string[], model?: string): Promise<Embedding[]> {
    return texts.map(
      (_, index) =>
        ({
          embedding: new Array(1536).fill(0).map((_, i) => Math.cos((i + index) * 0.1)),
          model: model || 'nomic-embed-text',
        }) as Embedding,
    );
  }

  async generateChat(
    messages: Message[],
    model?: string,
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<ChatResponse> {
    return {
      content: `Mock Ollama response to: ${messages[messages.length - 1]?.content}`,
      model: model || 'llama3.2',
    } as ChatResponse;
  }

  async rerank(
    query: string,
    documents: string[],
    model?: string,
  ): Promise<{ scores: number[]; model: string }> {
    const scores = documents.map(() => Math.random() * 0.5 + 0.5);
    return {
      scores,
      model: model || 'rerank-model',
    };
  }

  async listModels(): Promise<string[]> {
    return ['llama2', 'llama3', 'codellama', 'llama3.2'];
  }
}

export class UnavailableMLXAdapter implements MLXAdapterInterface {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async generateEmbedding(request: { text: string; model?: string }): Promise<Embedding> {
    throw new Error('MLX adapter is not available');
  }

  async generateEmbeddings(request: { texts: string[]; model?: string }): Promise<Embedding[]> {
    throw new Error('MLX adapter is not available');
  }

  async generateChat(request: {
    messages: Message[];
    model?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<ChatResponse> {
    throw new Error('MLX adapter is not available');
  }
}
