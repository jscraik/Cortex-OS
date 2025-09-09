# Qwen3 MLX Embedding Integration TDD Plan

This plan describes a test-driven approach to add Qwen3 MLX embedding support served locally via Ollama to the `@cortex-os/memories` package. Each task corresponds to a single commit containing tests, implementation, and documentation. Run `pre-commit run --files <file>` and `pnpm docs:lint` for documentation-only changes, or `pnpm lint`/`pnpm test` when code is modified.

## Guiding Principles

- Follow strict TDD: write a failing test, implement the minimal code, then refactor.
- One logical change per commit with a conventional message.
- Keep all CI checks green before moving to the next task.

## Milestones & Tasks

| Milestone                      | Tasks (each task = one commit)                                                                                                                                                                                                                                                            | Goal                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **1. Provider Contract**       | 1. Add failing tests specifying an `EmbeddingProvider` interface returning fixed-length float arrays.<br>2. Implement the interface and export it for package-wide use.                                                                                                                   | Establish a pluggable embedding abstraction.       |
| **2. Qwen3 MLX Provider**      | 1. Write failing tests using HTTP mocks that expect the model's vector length (e.g., 4096) from `qwen3-mlx-embed`.<br>2. Implement `QwenMlxProvider` calling Ollama's `/api/embeddings` with model name from config.<br>3. Add docs describing required Ollama setup and any rate limits. | Generate embeddings via local MLX/Ollama.          |
| **3. Memories Integration**    | 1. Write failing tests proving memories can ingest/search using `QwenMlxProvider` through the SQLite adapter.<br>2. Wire the provider into `@cortex-os/memories` configuration options.<br>3. Provide an example script demonstrating ingestion and search.                               | Enable MLX-backed semantic recall.                 |
| **4. Optional Python Service** | 1. Sketch tests for calling an external Python MLX service over HTTP (HTTP is preferred for security and maintainability; avoid `child_process` unless absolutely necessary and document all security implications if used).<br>2. Implement a lightweight client to call the service, reusing the provider contract.<br>3. Document service deployment instructions.                                                         | Support environments without Ollama.               |
| **5. Documentation & Release** | 1. Update `README` and examples with MLX/Ollama provider instructions.<br>2. Add an ADR describing the provider architecture and trade-offs.<br>3. Prepare release notes.                                                                                                                 | Ensure users understand and can adopt the feature. |

## Delivery Cadence

- Target commits every 1–2 days per task.
- Merge through PRs once checks pass and reviews are addressed.

## Verification Checklist

For each commit:

1. Write or extend failing tests.
2. Implement minimal code to pass tests.
3. Run `pre-commit run --files <changed files>`.
4. Run `pnpm lint` and `pnpm test` when code changes; `pnpm docs:lint` for docs only.
5. Submit PR with summary and related issue links.
