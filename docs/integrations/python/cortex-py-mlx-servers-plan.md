# Cortex-Py MLX Server Operational Readiness Plan

## Overview

The `apps/cortex-py` package will ship with host-native MLX model servers that mirror the HTTP interface exposed by the current Python stack. This document describes the stepwise tasks required to reach that goal while preserving reliability and maintainability.

## Engineering Principles

  Optionally, use `pnpm biome:staged` (staged format/lint) and `pnpm test:safe` (quick tests) locally.
  Husky hooks run automatically on commit.

## Staged Implementation

| Stage | Goal                                     | Key Tests                                               | Commit Message Example                        |
| ----: | ---------------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
|     0 | Scaffold MLX runtime and server skeleton | server boots; `/healthz` returns 503 while initializing | `feat(cortex-py): scaffold mlx server`        |
|     1 | Add `/healthz` endpoint                  | responds 200 with service status                        | `feat(cortex-py): add health endpoint`        |
|     2 | Introduce thermal & memory guards        | guard activation when limits exceeded                   | `feat(cortex-py): add resource guards`        |
|     3 | Implement KV cache with batch support    | cached responses reused across calls                    | `feat(cortex-py): add kv-cache with batching` |
|     4 | Expose `/embed` batching & caching       | batched embeddings respect cache                        | `feat(cortex-py): batch embed with cache`     |
|     5 | Add `/chat` endpoint                     | conversation state maintained, kv-cache applied         | `feat(cortex-py): add chat endpoint`          |
|     6 | Add `/rerank` endpoint                   | reranked results match model output                     | `feat(cortex-py): add rerank endpoint`        |
|     7 | Support low-VRAM mode                    | tests run under constrained memory                      | `feat(cortex-py): enable low-vram mode`       |
|     8 | Paged KV reuse                           | cache survives process restarts                         | `feat(cortex-py): reuse paged kv cache`       |
|     9 | Speculative decoding                     | latency reduced vs baseline in tests                    | `feat(cortex-py): speculative decoding`       |
|    10 | Add `/healthz` and resource guard docs   | documentation lint passes                               | `docs(cortex-py): document health and guards` |

## Milestones

1. **MVP**: Stages 0–4 provide baseline health checks, guard rails, and embedding service.
2. **Full Feature Set**: Stages 5–9 cover chat, rerank, caching strategies, and performance enhancements.
3. **Documentation**: Stage 10 ensures operational and user guidance.

## Verification

- Automated tests cover endpoints, guard logic, caching, and performance characteristics.
- Documentation explains usage, configuration, and guard limits.
- CI passes with lint, test, and docs checks.

## Deployment Considerations

- Build with cross-platform `uv` environments.
- Expose HTTP server through the same ports used by existing Python implementation.
- Provide sample configuration for running standalone or within the Cortex runtime.
