# Model Gateway

The **Model Gateway** exposes `/chat`, `/embeddings`, and `/rerank` endpoints with
MLX-first routing and fallback adapters for Ollama and MCP.

## Prerequisites

- Python 3.13 with the ML stack:
  `numpy`, `mlx`, `mlx-lm`, `mlx-vlm`, `torch`, `instructor`, `openai`
- [Ollama](https://ollama.com/) running locally **or** `OLLAMA_AVAILABLE=true`
- Optional MCP adapter configuration via `MCP_TRANSPORT` and related env vars

## Setup

```bash
pnpm install
pnpm --filter @cortex-os/model-gateway build
```

## Development

```bash
pnpm --filter @cortex-os/model-gateway dev
```

## Production

```bash
pnpm --filter @cortex-os/model-gateway start
```

The `prestart` hook runs `build` automatically.
