# Code Analysis Agent

- Purpose: Analyze source code for complexity, performance, security, and maintainability.
- Capability: `code-analysis`

## Inputs

- `sourceCode`: string (required)
- `language`: one of javascript|typescript|python|java|go|rust|csharp|php|ruby
- `analysisType`: review|refactor|optimize|architecture|security
- `focus`: [complexity|performance|security|maintainability] (default: complexity, maintainability)
- `seed`: number (optional, deterministic behavior)
- `maxTokens`: number (optional, hard‑capped at 4096)

## Outputs

- `suggestions`: typed list with type, message, line?, severity, category
- `complexity`: cyclomatic, cognitive?, maintainability
- `security`: vulnerabilities[], riskLevel
- `performance`: bottlenecks[], memoryUsage, algorithmicComplexity?
- `confidence`, `analysisTime` (ms)

## Limits & Policies

- Token cap: `maxTokens ≤ 4096` (enforced)
- Determinism: optional `seed` propagated to provider
- Timeouts: default 30s
- Retries: provider‑specific (e.g., HTTP 5xx retry with backoff)

## Events

- `agent.started`, `agent.completed`, `agent.failed` (ISO‑8601 timestamps)
- `provider.fallback` (when applicable)

## Error Model

- `agent.failed` includes `error` and optional `errorCode`/`status` from providers (Problem+JSON mapping)

## Memory

- No direct FS writes. Event outbox persists via governed MemoryStore; `redactPII` by default.

## Recommended Models

- MLX chat/instruct class models:
  - `models/gpt-oss-20b-mlx.md`
  - `models/smollm-135m-mlx.md`
