# Getting Started

## Prerequisites

- Python 3.13 with ML tooling: `numpy`, `mlx`, `mlx-lm`, `mlx-vlm`, `torch`, `instructor`, `openai`
- [Ollama](https://ollama.com/) running locally or set `OLLAMA_AVAILABLE=true`
- Optional MCP transport configuration

## Installation

```bash
pnpm install
pnpm --filter @cortex-os/model-gateway build
```

## First Launch

```bash
pnpm --filter @cortex-os/model-gateway start
```

The server listens on `http://127.0.0.1:8081` by default.
