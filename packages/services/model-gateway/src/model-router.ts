/**
 * MLX-first model router for the model gateway
 */

import { z } from "zod";
import { MLXAdapter, type MLXAdapterApi } from "./adapters/mlx-adapter.js";
import {
  OllamaAdapter,
  type OllamaAdapterApi,
} from "./adapters/ollama-adapter.js";
import type { Message } from "./adapters/types.js";

// Minimal interface for optional MCP adapter
interface MCPAdapterApi {
  generateEmbedding(
    request: EmbeddingRequest,
  ): Promise<{ embedding: number[]; model: string }>;
  generateEmbeddings(
    request: EmbeddingBatchRequest,
  ): Promise<{ embeddings: number[][]; model: string }>;
  generateChat(
    request: ChatRequest,
  ): Promise<{ content: string; model: string }>;
}

// Helper type for optional Ollama rerank API to avoid `any`
type OllamaRerankApi = {
  rerank: (
    query: string,
    documents: string[],
    model: string,
  ) => Promise<{ scores: number[] }>;
};

export type ModelCapability = "embedding" | "chat" | "reranking";
export type ModelProvider = "mlx" | "ollama" | "mcp";

export interface ModelConfig {
  name: string;
  provider: ModelProvider;
  capabilities: ModelCapability[];
  priority: number;
  fallback?: string[];
}

const EmbeddingRequestSchema = z.object({
  text: z.string(),
  model: z.string().optional(),
});
const EmbeddingBatchRequestSchema = z.object({
  texts: z.array(z.string()),
  model: z.string().optional(),
});
const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    }),
  ),
  model: z.string().optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
});
const RerankRequestSchema = z.object({
  query: z.string(),
  documents: z.array(z.string()),
  model: z.string().optional(),
});

export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;
export type EmbeddingBatchRequest = z.infer<typeof EmbeddingBatchRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type RerankRequest = z.infer<typeof RerankRequestSchema>;

/** Interface exported for other modules/tests that consume the router */
export interface IModelRouter {
  initialize(): Promise<void>;
  generateEmbedding(
    request: EmbeddingRequest,
  ): Promise<{ embedding: number[]; model: string }>;
  generateEmbeddings(
    request: z.infer<typeof EmbeddingBatchRequestSchema>,
  ): Promise<{ embeddings: number[][]; model: string }>;
  generateChat(
    request: z.infer<typeof ChatRequestSchema>,
  ): Promise<{ content: string; model: string }>;
  rerank(
    request: z.infer<typeof RerankRequestSchema>,
  ): Promise<{ documents: string[]; scores: number[]; model: string }>;
  getAvailableModels(capability: ModelCapability): ModelConfig[];
  hasAvailableModels(capability: ModelCapability): boolean;
  hasCapability(capability: ModelCapability): boolean;
}

export class ModelRouter implements IModelRouter {
  private readonly mlxAdapter: MLXAdapterApi;
  private readonly ollamaAdapter: OllamaAdapterApi;
  private mcpAdapter: MCPAdapterApi | null = null;
  private mcpLoaded = false;
  private readonly availableModels: Map<ModelCapability, ModelConfig[]> =
    new Map();
  private readonly preferOllamaFallback: boolean;

  constructor(
    mlxAdapter: MLXAdapterApi = new MLXAdapter(),
    ollamaAdapter: OllamaAdapterApi = new OllamaAdapter(),
  ) {
    this.mlxAdapter = mlxAdapter;
    this.ollamaAdapter = ollamaAdapter;
    this.preferOllamaFallback =
      (process.env.PREFER_OLLAMA_FALLBACK || "").toLowerCase() === "true";
  }

  async initialize(): Promise<void> {
    const mlxAvailable = await this.mlxAdapter.isAvailable();
    const ollamaAvailable = await this.ollamaAdapter.isAvailable();
    const mcpAvailable = await this.ensureMcpLoaded();

    this.availableModels.set(
      "embedding",
      this.buildEmbeddingModels(mlxAvailable, ollamaAvailable, mcpAvailable),
    );
    this.availableModels.set(
      "chat",
      await this.buildChatModels(mlxAvailable, ollamaAvailable, mcpAvailable),
    );
    this.availableModels.set(
      "reranking",
      this.buildRerankingModels(mlxAvailable, ollamaAvailable, mcpAvailable),
    );
  }

  // Try to lazy-load MCP adapter; return boolean available
  private async ensureMcpLoaded(): Promise<boolean> {
    if (this.mcpLoaded) return !!this.mcpAdapter;
    try {
      // Use non-literal dynamic import to avoid hard compile-time dependency
      const mPath = "./adapters/" + "mcp-adapter.js";
      const mod = (await import(mPath)) as unknown as {
        createMCPAdapter: () => MCPAdapterApi;
      };
      // createMCPAdapter returns a synchronous adapter object
      this.mcpAdapter = mod.createMCPAdapter();
      this.mcpLoaded = true;
      return true;
    } catch {
      this.mcpLoaded = false;
      return false;
    }
  }

  private buildEmbeddingModels(
    mlxAvailable: boolean,
    ollamaAvailable: boolean,
    mcpAvailable: boolean,
  ): ModelConfig[] {
    const embeddingModels: ModelConfig[] = [];
    if (mlxAvailable) {
      const ollamaFallback = ollamaAvailable ? ["nomic-embed-text"] : [];
      embeddingModels.push(
        {
          name: "qwen3-embedding-4b-mlx",
          provider: "mlx",
          capabilities: ["embedding"],
          priority: 100,
          fallback: ["qwen3-embedding-8b-mlx", ...ollamaFallback],
        },
        {
          name: "qwen3-embedding-8b-mlx",
          provider: "mlx",
          capabilities: ["embedding"],
          priority: 90,
          fallback: ["qwen3-embedding-4b-mlx", ...ollamaFallback],
        },
      );
    }
    if (ollamaAvailable) {
      embeddingModels.push({
        name: "nomic-embed-text",
        provider: "ollama",
        capabilities: ["embedding"],
        priority: mlxAvailable ? 50 : 100,
        fallback: [],
      });
    }
    if (!mlxAvailable && !ollamaAvailable && mcpAvailable) {
      embeddingModels.push({
        name: "mcp-embeddings",
        provider: "mcp",
        capabilities: ["embedding"],
        priority: 80,
        fallback: [],
      });
    }
    return embeddingModels;
  }

  private async buildChatModels(
    mlxAvailable: boolean,
    ollamaAvailable: boolean,
    mcpAvailable: boolean,
  ): Promise<ModelConfig[]> {
    const chatModels: ModelConfig[] = [];
    // Prefer MLX-first when available
    if (mlxAvailable) {
      const mlxDesired: Array<{
        name: string;
        priority: number;
        fallback: string[];
      }> = [
          { name: "mixtral-8x7b-mlx", priority: 100, fallback: [] },
          { name: "gpt-oss-20b-mlx", priority: 95, fallback: [] },
          { name: "qwen3-coder-30b-mlx", priority: 90, fallback: [] },
          { name: "gemma2-2b-mlx", priority: 80, fallback: [] },
          { name: "phi3-mini-mlx", priority: 70, fallback: [] },
        ];
      for (const m of mlxDesired) {
        // MLX models are local; we optimistically register. Fallbacks can include MCP if present.
        if (this.preferOllamaFallback && ollamaAvailable) {
          // Prefer Ollama chain as fallback when available
          m.fallback = [
            "gpt-oss:20b",
            "qwen3-coder:30b",
            "phi4-mini-reasoning",
            "gemma3n:e4b",
            ...(mcpAvailable ? ["mcp-chat"] : []),
          ];
        } else if (mcpAvailable) {
          m.fallback = ["mcp-chat"];
        }
        chatModels.push({
          name: m.name,
          provider: "mlx",
          capabilities: ["chat"],
          priority: m.priority,
          fallback: m.fallback,
        });
      }
    }
    if (ollamaAvailable) {
      const ollamaModels = await this.ollamaAdapter
        .listModels()
        .catch(() => []);
      const desiredChat = [
        { name: "gpt-oss:20b", priority: 100, fallback: [] as string[] },
        { name: "qwen3-coder:30b", priority: 95, fallback: [] as string[] },
        { name: "phi4-mini-reasoning", priority: 90, fallback: [] as string[] },
        { name: "gemma3n:e4b", priority: 85, fallback: [] as string[] },
        { name: "deepseek-coder:6.7b", priority: 80, fallback: [] as string[] },
        { name: "llama2", priority: 70, fallback: [] as string[] },
      ];

      if (mcpAvailable) {
        chatModels.push({
          name: "mcp-chat",
          provider: "mcp",
          capabilities: ["chat"],
          priority: 60,
          fallback: [],
        });
      }

      for (const m of desiredChat) {
        if (
          ollamaModels.some(
            (name: string) => name === m.name || name.startsWith(m.name),
          )
        ) {
          if (mcpAvailable) m.fallback = ["mcp-chat"];
          chatModels.push({
            name: m.name,
            provider: "ollama",
            capabilities: ["chat"],
            priority: m.priority,
            fallback: m.fallback,
          });
        } else {
          console.log(
            "[model-router] Ollama model not installed; skipping",
            { model: m.name },
          );
        }
      }
    }
    if (!mlxAvailable && !ollamaAvailable && mcpAvailable) {
      chatModels.push({
        name: "mcp-chat",
        provider: "mcp",
        capabilities: ["chat"],
        priority: 70,
        fallback: [],
      });
    }
    return chatModels;
  }

  private buildRerankingModels(
    mlxAvailable: boolean,
    ollamaAvailable: boolean,
    mcpAvailable: boolean,
  ): ModelConfig[] {
    const rerankingModels: ModelConfig[] = [];
    if (mlxAvailable) {
      rerankingModels.push({
        name: "qwen3-reranker-4b-mlx",
        provider: "mlx",
        capabilities: ["reranking"],
        priority: 100,
        fallback: ollamaAvailable ? ["nomic-embed-text"] : [],
      });
    }
    if (ollamaAvailable) {
      rerankingModels.push({
        name: "nomic-embed-text",
        provider: "ollama",
        capabilities: ["reranking"],
        priority: mlxAvailable ? 80 : 100,
        fallback: [],
      });
    }
    if (!mlxAvailable && !ollamaAvailable && mcpAvailable) {
      rerankingModels.push({
        name: "mcp-rerank",
        provider: "mcp",
        capabilities: ["reranking"],
        priority: 60,
        fallback: [],
      });
    }
    return rerankingModels;
  }

  private selectModel(
    capability: ModelCapability,
    requestedModel?: string,
  ): ModelConfig | null {
    const models = this.availableModels.get(capability);
    if (!models || models.length === 0) return null;
    if (requestedModel) {
      const requested = models.find((m) => m.name === requestedModel);
      if (requested) return requested;
    }
    return [...models].sort((a, b) => b.priority - a.priority)[0];
  }

  hasCapability(capability: ModelCapability): boolean {
    const models = this.availableModels.get(capability);
    return !!models && models.length > 0;
  }

  async generateEmbedding(
    request: EmbeddingRequest,
  ): Promise<{ embedding: number[]; model: string }> {
    const model = this.selectModel("embedding", request.model);
    if (!model) throw new Error("No embedding models available");

    const tryModel = async (
      m: ModelConfig,
    ): Promise<{ embedding: number[]; model: string }> => {
      if (m.provider === "mlx") {
        const response = await this.mlxAdapter.generateEmbedding({
          text: request.text,
          model: m.name,
        });
        return { embedding: response.embedding, model: m.name };
      } else if (m.provider === "ollama") {
        const response = await this.ollamaAdapter.generateEmbedding(
          request.text,
          m.name,
        );
        return { embedding: response.embedding, model: m.name };
      } else {
        // MCP adapter path (ensure loaded earlier)
        const response = await (this.mcpAdapter as MCPAdapterApi).generateEmbedding(
          request,
        );
        return { embedding: response.embedding, model: response.model };
      }
    };

    try {
      return await tryModel(model);
    } catch (error) {
      console.warn(
        "Primary embedding model failed; attempting fallback",
        { model: model.name, error },
      );
      for (const fallbackName of model.fallback || []) {
        const fallbackModel = this.availableModels
          .get("embedding")
          ?.find((m) => m.name === fallbackName);
        if (!fallbackModel) continue;
        try {
          return await tryModel(fallbackModel);
        } catch (fallbackError) {
          console.warn(
            "Fallback embedding model also failed",
            { fallback: fallbackName, error: fallbackError },
          );
        }
      }
      throw new Error(
        `All embedding models failed. Last error: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async generateEmbeddings(
    request: EmbeddingBatchRequest,
  ): Promise<{ embeddings: number[][]; model: string }> {
    const model = this.selectModel("embedding", request.model);
    if (!model) throw new Error("No embedding models available");

    const tryModel = async (
      m: ModelConfig,
    ): Promise<{ embeddings: number[][]; model: string }> => {
      if (m.provider === "mlx") {
        const responses = await this.mlxAdapter.generateEmbeddings(
          request.texts,
          m.name,
        );
        return {
          embeddings: responses.map((r: { embedding: number[] }) => r.embedding),
          model: m.name,
        };
      } else if (m.provider === "ollama") {
        const responses = await this.ollamaAdapter.generateEmbeddings(
          request.texts,
          m.name,
        );
        return {
          embeddings: responses.map((r: { embedding: number[] }) => r.embedding),
          model: m.name,
        };
      } else {
        const res = await (this.mcpAdapter as MCPAdapterApi).generateEmbeddings(
          request,
        );
        return { embeddings: res.embeddings, model: res.model };
      }
    };

    try {
      return await tryModel(model);
    } catch (error) {
      console.warn(
        "Primary batch embedding model failed; attempting fallback",
        { model: model.name, error },
      );
      for (const fallbackName of model.fallback || []) {
        const fallbackModel = this.availableModels
          .get("embedding")
          ?.find((m) => m.name === fallbackName);
        if (!fallbackModel) continue;
        try {
          return await tryModel(fallbackModel);
        } catch (fallbackError) {
          console.warn(
            "Fallback batch embedding model also failed",
            { fallback: fallbackName, error: fallbackError },
          );
        }
      }
      throw new Error(
        `All batch embedding models failed. Last error: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async generateChat(
    request: ChatRequest,
  ): Promise<{ content: string; model: string }> {
    const model = this.selectModel("chat", request.model);
    if (!model) throw new Error("No chat models available");

    const tryModel = async (
      m: ModelConfig,
    ): Promise<{ content: string; model: string }> => {
      if (m.provider === "ollama") {
        const response = await this.ollamaAdapter.generateChat({
          messages: request.messages as unknown as Message[],
          model: m.name,
          max_tokens: request.max_tokens,
          temperature: request.temperature,
        });
        return { content: response.content, model: m.name };
      } else if (m.provider === "mcp") {
        // Lazy load MCP to avoid hard dependency for tests
        const mPath = "./adapters/" + "mcp-adapter.js";
        const response = await (await import(mPath))
          .createMCPAdapter()
          .generateChat(request);
        return { content: response.content, model: response.model };
      } else {
        throw new Error("MLX chat not routed via gateway");
      }
    };

    try {
      return await tryModel(model);
    } catch (error) {
      console.warn(
        "Primary chat model failed; attempting fallback",
        { model: model.name, error },
      );
      for (const fallbackName of model.fallback || []) {
        const fallbackModel = this.availableModels
          .get("chat")
          ?.find((m) => m.name === fallbackName);
        if (!fallbackModel) continue;
        try {
          return await tryModel(fallbackModel);
        } catch (fallbackError) {
          console.warn(
            "Fallback chat model also failed",
            { fallback: fallbackName, error: fallbackError },
          );
        }
      }
      throw new Error(
        `All chat models failed. Last error: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async rerank(
    request: RerankRequest,
  ): Promise<{ documents: string[]; scores: number[]; model: string }> {
    const model = this.selectModel("reranking", request.model);
    if (!model) throw new Error("No reranking models available");

    const tryModel = async (
      m: ModelConfig,
    ): Promise<{ documents: string[]; scores: number[]; model: string }> => {
      if (m.provider === "mlx") {
        const response = await this.mlxAdapter.rerank(
          request.query,
          request.documents,
          m.name,
        );
        return {
          documents: request.documents,
          scores: response.scores,
          model: m.name,
        };
      } else {
        const response = await (
          this.ollamaAdapter as unknown as OllamaRerankApi
        ).rerank(
          request.query,
          request.documents,
          m.name,
        );
        return {
          documents: request.documents,
          scores: response.scores,
          model: m.name,
        };
      }
    };

    try {
      return await tryModel(model);
    } catch (error) {
      console.warn(
        "Primary reranking model failed; attempting fallback",
        { model: model.name, error },
      );
      for (const fallbackName of model.fallback || []) {
        const fallbackModel = this.availableModels
          .get("reranking")
          ?.find((m) => m.name === fallbackName);
        if (!fallbackModel) continue;
        try {
          return await tryModel(fallbackModel);
        } catch (fallbackError) {
          console.warn(
            "Fallback reranking model also failed",
            { fallback: fallbackName, error: fallbackError },
          );
        }
      }
      throw new Error(
        `All reranking models failed. Last error: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  getAvailableModels(capability: ModelCapability): ModelConfig[] {
    return this.availableModels.get(capability) || [];
  }

  hasAvailableModels(capability: ModelCapability): boolean {
    const models = this.availableModels.get(capability);
    return !!models && models.length > 0;
  }
}

/** Factory to create a model router using default adapters */
export function createModelRouter(
  mlxAdapter: MLXAdapterApi = new MLXAdapter(),
  ollamaAdapter: OllamaAdapterApi = new OllamaAdapter(),
): IModelRouter {
  return new ModelRouter(mlxAdapter, ollamaAdapter);
}
