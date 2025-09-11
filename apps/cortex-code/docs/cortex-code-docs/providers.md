# Providers Setup (OpenAI, Anthropic, Z.ai, Ollama, MLX)

This guide explains how to configure provider credentials and select providers in cortex-code.

## TL;DR

- Put keys in environment variables; do not store secrets in config files.
- Anthropic: `ANTHROPIC_API_KEY` (optional `ANTHROPIC_BASE_URL`)
- Z.ai: `ZAI_API_KEY` (optional `ZAI_BASE_URL`, `ZAI_ANTHROPIC_VERSION`)
- OpenAI/ChatGPT: `OPENAI_API_KEY` or `codex login` (ChatGPT)
- Ollama: no key; defaults to `http://127.0.0.1:11434`
- MLX (OpenAI-compatible): `MLX_BASE_URL` (e.g., `http://127.0.0.1:8080/v1`)

## Setting Credentials

Export in your shell (temporary):

```bash
export OPENAI_API_KEY="sk-..."          # Optional for OpenAI
export ANTHROPIC_API_KEY="sk-ant-..."   # Required for Anthropic
export ZAI_API_KEY="zk-..."             # Required for Z.ai

# Optional endpoint overrides
export ANTHROPIC_BASE_URL="https://api.anthropic.com"
export ZAI_BASE_URL="https://api.z.ai/api/anthropic"
export ZAI_ANTHROPIC_VERSION="2023-06-01"
export MLX_BASE_URL="http://127.0.0.1:8080/v1"   # OpenAI-compatible local endpoint
```

Persist by adding lines to `~/.zshrc` or `~/.bashrc` and restarting your terminal.

## Selecting Providers

One-off selection (CLI flags):

```bash
# OpenAI (default when authenticated)
codex chat "Hello"

# Anthropic (overlay path, single-turn chat)
codex chat --provider anthropic "Hello"

# Z.ai (overlay path, single-turn chat)
codex chat --provider zai "Hello"

# Exec/TUI (full overlay routing)
codex-exec -c model_provider=anthropic "Hello"
codex-exec -c model_provider=zai "Hello"
codex -c model_provider=anthropic
codex -c model_provider=zai

# Ollama (OpenAI-compatible local daemon)
codex -c model_provider=oss chat "Hello"
# or alias
codex -c model_provider=ollama chat "Hello"

# MLX (OpenAI-compatible local endpoint)
codex -c model_provider=mlx chat "Hello"
```

Persistent selection (config): `~/.codex/config.toml`

```toml
model_provider = "anthropic"           # or "zai", "openai", "oss", "ollama", "mlx"
model = "claude-3-5-sonnet-20240620"

# You can also add custom providers under [model_providers.*] to override defaults.
```

Secrets remain in environment variables; `config.toml` configures selection and behavior only.

## How cortex-code uses these values

- Anthropic and Z.ai requests include `x-api-key` and `anthropic-version: 2023-06-01`. Streaming uses SSE and renders deltas in the CLI/TUI.
- Ollama auto-detect: When no provider is set, cortex-code checks `http://127.0.0.1:11434/api/tags` and defaults to `oss` if running.
- MLX uses `MLX_BASE_URL` as an OpenAI-compatible base (e.g., `/v1/chat/completions`).

## Verifying Setup

```bash
# Anthropic
export ANTHROPIC_API_KEY=... && codex-exec -c model_provider=anthropic "Say hello"

# Z.ai
export ZAI_API_KEY=... && codex-exec -c model_provider=zai "Say hello"

# TUI sessions
codex -c model_provider=anthropic
codex -c model_provider=zai

# Ollama
ollama serve &
codex -c model_provider=oss chat "Hello"

# MLX
export MLX_BASE_URL=http://127.0.0.1:8080/v1
codex -c model_provider=mlx chat "Hello"
```

If something looks off, run with higher logging (e.g., `RUST_LOG=info`) and check your environment variables.

