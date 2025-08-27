import type { Embedder } from "../ports/Embedder.js";
import { MLXEmbedder } from "./embedder.mlx.js";
import { OllamaEmbedder } from "./embedder.ollama.js";
import { OpenAIEmbedder } from "./embedder.openai.js";

export class CompositeEmbedder implements Embedder {
  private embedders: Embedder[] = [];
  private currentEmbedderIndex = 0;
  
  constructor() {
    // Try MLX first (preferred)
    try {
      this.embedders.push(new MLXEmbedder());
    } catch (error) {
      console.warn('MLX embedder not available:', error);
    }
    
    // Then try Ollama
    try {
      this.embedders.push(new OllamaEmbedder());
    } catch (error) {
      console.warn('Ollama embedder not available:', error);
    }
    
    // Finally fall back to OpenAI
    try {
      this.embedders.push(new OpenAIEmbedder());
    } catch (error) {
      console.warn('OpenAI embedder not available:', error);
    }
    
    if (this.embedders.length === 0) {
      throw new Error('No embedders available');
    }
  }

  name(): string {
    return `composite-${this.embedders.map(e => e.name()).join('|')}`;
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Try each embedder in order until one succeeds
    for (let i = 0; i < this.embedders.length; i++) {
      try {
        const embeddings = await this.embedders[i].embed(texts);
        this.currentEmbedderIndex = i; // Remember successful embedder
        return embeddings;
      } catch (error) {
        console.warn(`Embedder ${this.embedders[i].name()} failed:`, error);
        // Continue to next embedder
      }
    }
    
    throw new Error('All embedders failed');
  }
  
  /**
   * Get the currently active embedder
   */
  getCurrentEmbedder(): Embedder {
    return this.embedders[this.currentEmbedderIndex];
  }
  
  /**
   * Test which embedders are available
   */
  async testEmbedders(): Promise<Array<{name: string, available: boolean}>> {
    const results: Array<{name: string, available: boolean}> = [];
    
    for (const embedder of this.embedders) {
      try {
        await embedder.embed(['test']);
        results.push({ name: embedder.name(), available: true });
      } catch (error) {
        results.push({ name: embedder.name(), available: false });
      }
    }
    
    return results;
  }
}