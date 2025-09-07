# Cortex-Py MLX Server Operational Readiness Plan

## Overview

This plan outlines incremental tasks to deliver fully featured, host-native MLX
servers for `apps/cortex-py`. It follows strict Test-Driven Development (TDD)
and conventional commit workflows.

## Engineering Principles

- **TDD Workflow**: write a failing test, implement minimal code to pass,
  refactor with tests green.
- **Small Commits**: each commit addresses a single requirement and contains both
  tests and implementation.
- **Quality Gates**: run `pre-commit run --files <changed>` and `pnpm test` for
  code changes or `pnpm docs:lint` for docs.
- **Security**: include thermal and memory guard coverage and avoid unchecked
  resource usage.

## Task Breakdown

| Stage | Goal                                   | Key Tests                                       | Commit Message Example                        |
| ----: | -------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
|     1 | Add `/healthz` endpoint                | responds 200 with service status                | `feat(cortex-py): add health endpoint`        |
|     2 | Introduce thermal & memory guards      | guard activation when limits exceeded           | `feat(cortex-py): add resource guards`        |
|     3 | Implement KV cache with batch support  | cached responses reused across calls            | `feat(cortex-py): add kv-cache with batching` |
|     4 | Expose `/embed` batching & caching     | batched embeddings respect cache                | `feat(cortex-py): batch embed with cache`     |
|     5 | Add `/chat` endpoint                   | conversation state maintained, kv-cache applied | `feat(cortex-py): add chat endpoint`          |
|     6 | Add `/rerank` endpoint                 | reranked results match model output             | `feat(cortex-py): add rerank endpoint`        |
|     7 | Support low-VRAM mode                  | tests run under constrained memory              | `feat(cortex-py): enable low-vram mode`       |
|     8 | Paged KV reuse                         | cache survives process restarts                 | `feat(cortex-py): reuse paged kv cache`       |
|     9 | Speculative decoding                   | latency reduced vs baseline in tests            | `feat(cortex-py): speculative decoding`       |
|    10 | Add `/healthz` and resource guard docs | documentation lint passes                       | `docs(cortex-py): document health and guards` |

## Milestones

1. **MVP**: Stages 1–4 provide baseline health, guards, and embedding service.
2. **Full Feature Set**: Stages 5–9 cover chat, rerank, caching strategies, and
   performance enhancements.
3. **Documentation**: Stage 10 ensures operational and user guidance.

## Verification

- Automated tests cover endpoints, guard logic, caching, and performance
  characteristics.
- Documentation explains usage, configuration, and guard limits.
- CI passes with lint, test, and docs checks.
