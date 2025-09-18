# LangGraph Orchestration (MLX‑first) — Integration Summary

## 🎯 Objective Achieved

The orchestration stack has been consolidated to be LangGraph‑only. Model selection is MLX → Ollama → Frontier (OpenAI/Anthropic) and the persona is loaded from `cerebrum.yaml`.

## 📦 Core Components (current)

1. Cerebrum LangGraph
- File: `packages/orchestration/src/langgraph/create-cerebrum-graph.ts`
- Role: Builds the LangGraph graph and wires tools/nodes. It consumes persona configuration and the selected chat/embedding model.

1. Model Selection Utility
- File: `packages/orchestration/src/lib/model-selection.ts`
- Role: Performs real health checks and chooses the first available provider in order: MLX (localhost:8765) → Ollama (localhost:11434) → Frontier API (if env configured). Returns strongly‑typed client bindings for the graph to use.

1. Persona Loader
- File: `packages/orchestration/src/persona/persona-loader.ts`
- Role: Loads `.cortex/library/personas/cerebrum.yaml` and validates shape. The graph enforces a persona guard to ensure required fields are present before execution.

1. Contracts & Config (supporting)
- Files: `packages/orchestration/src/config/model-catalog.ts`, `packages/orchestration/src/config/schemas.ts`
- Role: Central registry/types for supported models and configuration schemas used by the selection and graph wiring.

All legacy/hybrid orchestrators, providers, routers, and demos have been removed. Public exports are LangGraph‑only.

## ⚙️ How Model Selection Works

Order of preference at graph initialization:
- MLX service reachable at `http://localhost:8765` (primary)
- Ollama service reachable at `http://localhost:11434` (fallback)
- Frontier API (e.g., OpenAI, Anthropic) if corresponding env vars are present

Health checks are real network probes. If a tier is unavailable, the selector transparently falls back to the next one. Failures surface as explicit, typed errors with context when no providers are reachable.

## 🧠 Persona Configuration

- Source: `.cortex/library/personas/cerebrum.yaml`
- Validation: Loaded via the persona loader and verified against a schema. The LangGraph construction will refuse to start without a valid persona.

## � Services & Environment

- MLX (primary): `http://localhost:8765`
- Ollama (fallback): `http://localhost:11434`
- Frontier APIs (optional): provide the appropriate environment variables, for example:
  - `OPENAI_API_KEY` for OpenAI
  - `ANTHROPIC_API_KEY` for Anthropic

Start local services when using local tiers:

```bash
# Start MLX (example model shown)
mlx_lm.server --model /Volumes/ExternalSSD/huggingface_cache/models--mlx-community--Qwen2.5-0.5B-Instruct

# Start Ollama
ollama serve
```

## 🚀 Quick Start

1) Ensure MLX and/or Ollama are running, or export your frontier API key(s).
2) Use the orchestration package’s public API to create the Cerebrum graph and invoke it. The graph will use the selected provider and the `cerebrum.yaml` persona automatically.
3) Run validation gates during development:

```bash
# Dry-run previews (affected-only)
pnpm -w op:build:dry

# Execute affected lint / typecheck / test / build
pnpm -w op:build
```

Notes:
- The integration test for model selection is parameterized to work in MLX‑only, Ollama‑only, or Frontier‑only environments.
- Public API is LangGraph‑only; no provider or coordinator classes need to be imported directly.

## 📈 Behavior & Guarantees

- Deterministic provider order: MLX → Ollama → Frontier
- Real service probes with clear, actionable error messages
- Persona guard at graph build time
- Strong typing across selection and graph wiring (no `any` shortcuts)

## 🛡️ Reliability

- Graceful tiered fallback between providers
- Timeouts and health checks avoid long hangs
- Strict schema validation for persona/config

## 🗑️ What Was Removed (legacy)

- Provider, router, and coordinator implementations unrelated to LangGraph
- A2A “intelligent router” integration examples
- Demo files and tests referencing the removed classes

This package now exposes a single, clear orchestration path: LangGraph with MLX‑first model selection, optional fallbacks, and a validated Cerebrum persona.
