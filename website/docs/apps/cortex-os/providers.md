---
title: Providers
sidebar_label: Providers
---

# Providers & Setup

Set provider-specific environment variables:

## MLX

Ensure `MLX_MODEL` and `PYTHON_EXEC` point to a local MLX service.

## Ollama

On macOS, install and run Ollama via Homebrew (recommended):

```bash
brew install ollama
brew services start ollama

# Pull at least one model (examples)
ollama pull llama3.2
ollama pull qwen3-coder:7b
```

Then set the environment variables so Cortex-OS services can find it:

```bash
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_MODEL=llama3.2
```

If you prefer containers or are not on macOS, use Docker as a fallback:

```bash
docker run -d --name ollama \
 -p 11434:11434 \
 -v ollama_data:/root/.ollama \
 ollama/ollama:0.12.0
```

The included `services/ml-inference/docker-compose.yml` also provisions `ollama` (pinned to `0.12.0`).
