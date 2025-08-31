/**
 * Minimal Ollama adapter stub for the model gateway.
 * Provides a lightweight implementation used by the router and tests.
 */

import type { ChatResponse, Message } from './types.js';

export interface OllamaAdapterApi {
  isAvailable(model?: string): Promise<boolean>;
  listModels(): Promise<string[]>;
  generateEmbedding(text: string, model?: string): Promise<{ embedding: number[]; model: string }>;
  generateEmbeddings(
    texts: string[],
    model?: string,
  ): Promise<{ embedding: number[]; model: string }[]>;
  generateChat(
    request:
      | { messages: Message[]; model?: string; temperature?: number; max_tokens?: number }
      | Message[],
    model?: string,
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<ChatResponse>;
  rerank?(
    query: string,
    documents: string[],
    model?: string,
  ): Promise<{ scores: number[]; model: string }>;
}

/**
 * Factory creator. In real deployments this would call the local Ollama HTTP API.
 * Here we provide a conservative, no-network stub that can be overridden in tests.
 */
export function createOllamaAdapter(): OllamaAdapterApi {
  // Allow forcing availability via env for tests/local runs
  const forced = process.env.OLLAMA_AVAILABLE?.toLowerCase();
  const forcedAvailable = forced === '1' || forced === 'true';

  const defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'nomic-embed-text';

  return {
    async isAvailable(): Promise<boolean> {
      // Default to false to avoid accidental network calls in CI; can be forced via env
      return forcedAvailable;
    },
    async listModels(): Promise<string[]> {
      // Return a minimal set; callers typically check for existence
      return forcedAvailable ? [defaultModel, 'llama2'] : [];
    },
    async generateEmbedding(text: string, model?: string) {
      const usedModel = model || defaultModel;
      // Return a tiny deterministic vector for smoke tests; real impl would call Ollama
      const hash = Array.from(text).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
      const vec = new Array(8).fill(0).map((_, i) => ((hash >> i % 8) & 0xff) / 255);
      return { embedding: vec, model: usedModel };
    },
    async generateEmbeddings(texts: string[], model?: string) {
      const usedModel = model || defaultModel;
      return Promise.all(texts.map((t) => this.generateEmbedding(t, usedModel)));
    },
    async generateChat(
      req:
        | { messages: Message[]; model?: string; temperature?: number; max_tokens?: number }
        | Message[],
      model?: string,
      options?: { temperature?: number; max_tokens?: number },
    ) {
      const messages = Array.isArray(req) ? req : req.messages;
      const usedModel = (Array.isArray(req) ? model : req.model) || model || 'llama2';
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const content = lastUser ? `echo(${lastUser.content.slice(0, 64)})` : 'ok';
      return { content, model: usedModel };
    },
    async rerank(query: string, documents: string[], model?: string) {
      // Simple lexical scoring for smoke tests
      const q = query.toLowerCase();
      const scores = documents.map((d) => {
        const dl = d.toLowerCase();
        let s = 0;
        for (const token of q.split(/\s+/)) if (token && dl.includes(token)) s += 1;
        return s / Math.max(1, q.split(/\s+/).length);
      });
      return { scores, model: model || defaultModel };
    },
  };
}

// Class wrapper for tests that expect a constructible adapter
export class OllamaAdapter implements OllamaAdapterApi {
  private readonly impl = createOllamaAdapter();

  isAvailable(model?: string): Promise<boolean> {
    return this.impl.isAvailable(model);
  }
  listModels(): Promise<string[]> {
    return this.impl.listModels();
  }
  generateEmbedding(text: string, model?: string): Promise<{ embedding: number[]; model: string }> {
    return this.impl.generateEmbedding(text, model);
  }
  generateEmbeddings(
    texts: string[],
    model?: string,
  ): Promise<{ embedding: number[]; model: string }[]> {
    return this.impl.generateEmbeddings(texts, model);
  }
  generateChat(
    request:
      | { messages: Message[]; model?: string; temperature?: number; max_tokens?: number }
      | Message[],
    model?: string,
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<ChatResponse> {
    return this.impl.generateChat(request as any, model, options);
  }
  rerank(
    query: string,
    documents: string[],
    model?: string,
  ): Promise<{ scores: number[]; model: string }> {
    return this.impl.rerank!(query, documents, model) as any;
  }
}
