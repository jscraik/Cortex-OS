# ADR-002: Local Model Selections (MLX & Ollama), Embeddings/Rerankers, and GLM (Z.AI) Integration

Status: ACCEPTED — 2025-09-03

Context

- We need sensible defaults for local models on Apple Silicon (MLX) and cross-platform via Ollama.
- We want faster, cheaper, and more accurate retrieval via embeddings + reranking.
- We also want optional access to the GLM-4.5 API via Z.AI’s Anthropic-compatible endpoint.

Decision

Top MLX models to support first (Apple Silicon, good quality at 4-bit where possible):

- MLX-1: GLM-4.5-mlx-4Bit — strong coding/agent performance, efficient on Apple Silicon.
- MLX-2: Qwen3-Coder-30B-A3B-Instruct-4bit — higher-quality coder model, quantized for feasible local use.

Top Ollama models to support first (broad installs, simple runtime):

- Ollama-1: Qwen2.5-Coder 7B — code-centric, great for TDD loops and repository edits.
- Ollama-2: Llama 3.1 8B Instruct — strong all-rounder with good local latency.

Embeddings & Rerankers for RAG

- Embeddings (Ollama backends):
  - Primary: mxbai-embed-large (high quality, popular)
  - Alt: bge-m3 (multilingual, versatile)
- Rerankers (Ollama backends):
  - Primary: BGE-Reranker-v2-m3 (fast, accurate reordering)
  - Alt: Qwen3-Reranker-0.6B (lightweight multilingual reranker)

GLM (Z.AI) API Integration

Use Anthropic-compatible endpoint so our existing Anthropic client wrapper can target GLM:

- Base URL: <https://api.z.ai/api/anthropic>
- Auth header: ANTHROPIC_AUTH_TOKEN=<Z.AI_API_KEY>

Environment example (from Z.AI docs):

export ANTHROPIC_BASE_URL=<https://api.z.ai/api/anthropic>
export ANTHROPIC_AUTH_TOKEN=YOUR_API_KEY

We’ll expose a provider preset `glm_zai` that reuses our Anthropic-compatible client, overriding base_url and token.

Architecture updates

- Add provider variants:
  - `LocalMlxProvider` with model id from config: ["mlx:glm-4.5-4bit", "mlx:qwen3-coder-30b-a3b-4bit"].
  - `OllamaProvider` with model id: ["qwen2.5-coder:7b", "llama3.1:8b"].
  - `AnthropicCompatibleProvider` with selectable base_url/auth (for GLM via Z.AI and vanilla Anthropic).
- Add traits:
  - `EmbeddingProvider::embed(&[String]) -> Vec<Vec<f32>>`.
  - `RerankerProvider::rerank(query: &str, docs: &[Doc]) -> Vec<Doc>` (stable sort with scores).

Config keys (example)

core.config:

- provider.default = "ollama"
- provider.ollama.model = "qwen2.5-coder:7b"
- provider.mlx.model = "glm-4.5-mlx-4bit" # or "qwen3-coder-30b-a3b-instruct-4bit"
- provider.glm_zai.enabled = false
- provider.glm_zai.base_url = "<https://api.z.ai/api/anthropic>"
- provider.glm_zai.api_key_env = "ZAI_API_KEY"
- embeddings.backend = "ollama"
- embeddings.model = "mxbai-embed-large"
- reranker.backend = "ollama"
- reranker.model = "bge-reranker-v2-m3"

macOS backend recommendation

- Default local backend for developers: Ollama
  - Rationale: one-line install, built-in REST and experimental OpenAI-compatible endpoints at `http://localhost:11434/v1`, easy model pulls, embeddings/reranking support.
- Performance-focused alternative: llama.cpp
  - Rationale: highly optimized for Apple Silicon (Accelerate/Metal), offers an OpenAI-compatible HTTP server (llama-server), finer control over quantization and threading.
- Guidance: start with Ollama for TDD and DX; switch to llama.cpp when you need max throughput or low-latency tuning. We will keep both documented.

Provider config quick reference

- OpenAI
  - Base URL: default SDK; optional override via config
  - Auth: `OPENAI_API_KEY` → `Authorization: Bearer <key>`
- Anthropic
  - Base URL: `https://api.anthropic.com`
  - Auth: `ANTHROPIC_API_KEY` as `x-api-key`, plus `anthropic-version`
- Anthropic-compatible (Z.AI GLM)
  - Base URL: `https://api.z.ai/api/anthropic`
  - Auth: `ZAI_API_KEY` as `x-api-key`, plus `anthropic-version`
- Google Gemini
  - Base URL: per SDK/REST (`https://generativelanguage.googleapis.com`)
  - Auth: `GEMINI_API_KEY`
- Qwen (DashScope)
  - Base URL: `https://dashscope.aliyuncs.com` (or SDK default)
  - Auth: `DASHSCOPE_API_KEY`

Test strategy (TDD)

- Providers
  - Unit: mock transport for Ollama, MLX runner shim, Anthropic-compatible client; verify request shaping and retries.
  - Integration: start Ollama locally (if available) behind feature flag; skip-by-default.
- Embeddings
  - Unit: deterministic output shape; dim > 0; stable ordering.
  - Integration: RAG small corpus; cosine-sim results place gold doc in top-3.
- Reranker
  - Unit: preserves doc set; strictly improves MRR/hr@k on toy set vs baseline.
  - Integration: end-to-end RAG shows rank improvements vs embeddings-only.
- GLM
  - Unit: base URL override applied; auth header set; model name passthrough.
  - Smoke: gated, runs one small completion against GLM-4.5 if ZAI_API_KEY present.

Rollout plan

1) Land abstraction traits + config plumbing + mocks/tests.
2) Wire Ollama LLM + embeddings + reranker; document model pull instructions.
3) Add MLX runner shim with the two default model ids.
4) Add Anthropic-compatible provider preset (`glm_zai`) with env overrides; document setup.
5) Add samples: minimal RAG pipeline with embedding + rerank; quick script in `examples/`.

Alternatives considered

- DeepSeek-R1 or QwQ for local reasoning: great, but often heavier and slower on laptops; can be added later as optional.
- Only embeddings without reranking: cheaper but reduces retrieval precision; reranking is worth the small cost.

Consequences

- Positive: clear defaults, consistent local dev, better RAG quality/latency.
- Negative: more config surface; must maintain 3 provider paths (MLX, Ollama, GLM-compatible).

References

- Z.AI GLM Anthropic-compatible docs: <https://docs.z.ai/scenario-example/develop-tools/claude>
- MLX Examples repo: <https://github.com/ml-explore/mlx-examples>
- Ollama model library: <https://ollama.com/library>
- Reranker examples on Ollama Search: <https://ollama.com/search?q=reranker>
