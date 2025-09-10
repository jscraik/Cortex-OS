# Model Gateway Operational Readiness Plan

## Engineering Principles

- **Strict TDD**: begin each feature with a failing test, implement the minimal code to pass, then refactor while keeping tests green.
- **Micro-commits**: one focused change per commit (test and implementation together).
- **Continuous validation**: run `pre-commit run --files <changed-files>` and `pnpm lint && pnpm test` (or `pnpm docs:lint` for docs) before each commit.

## Development Roadmap

### 1. Frontier adapter support

- test(gateway): integration tests for `/chat`, `/embeddings`, and `/rerank` using a Frontier stub.
- feat(gateway): add Frontier adapter and wire it into `ModelRouter`.
- refactor(gateway): handle Frontier feature flags in provider configuration.

### 2. Parity contracts

- test(gateway): contract tests validating responses against shared schemas and OpenAPI definitions.
- feat(gateway): runtime validation layer enforcing schema parity across providers.
- chore(ci): run contract tests for every provider in CI.

### 3. Circuit breakers

- test(gateway): simulate provider failure and expect requests to trip a breaker.
- feat(gateway): wrap provider calls with an `opossum` circuit breaker.
- feat(metrics): export breaker metrics for observability.

### 4. Sticky sessions

- test(gateway): ensure requests with the same session ID hit the same backend.
- feat(gateway): implement session-affinity middleware with in-memory mapping and TTL.
- feat(gateway): persist mapping to Redis for horizontal scalability.

### 5. VRAM/token budget enforcement

- test(gateway): reject requests exceeding `performance-config.json` budgets.
  > **Note:** `performance-config.json` defines per-model VRAM and token budgets. See `docs/performance-config.schema.json` for the schema and documentation.
- feat(gateway): budget manager enforcing VRAM and token thresholds per request.
- feat(metrics): emit metrics and alerts when budgets are breached.

### 6. Health and quality scores

- test(gateway): `/health` endpoint exposes per-provider health and quality metrics.
- feat(gateway): collect latency/success-rate data to compute quality scores.
- feat(metrics): expose metrics endpoint and integrate with monitoring.

### 7. Multi-GPU sharding

- test(gateway): distribute requests across multiple GPUs and verify isolation.
- feat(gateway): sharding layer mapping sessions/models to GPU shards.
- test(load): add load tests validating throughput and failover.

### 8. Documentation & examples

- docs(gateway): update `README` and examples with usage and new features after each milestone.
- docs(gateway): maintain CHANGELOG entries following Conventional Commits.

## Verification Checklist for Each Commit

1. `pre-commit run --files <changed files>`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm docs:lint` for documentation updates

## Milestones & Commit Cadence

| Milestone                        | Key Deliverables                           | Expected Commit Sequence    |
| -------------------------------- | ------------------------------------------ | --------------------------- |
| M1: Frontier adapter & contracts | Frontier support with schema parity        | test → impl → refactor      |
| M2: Resilience features          | circuit breakers & sticky sessions         | test → impl → metrics       |
| M3: Resource governance          | budget enforcement & health/quality scores | test → impl → observability |
| M4: Scalability                  | multi-GPU sharding                         | test → impl → load tests    |
| M5: Docs & polish                | updated docs, examples, changelog          | docs updates per milestone  |

Each bullet above represents a minimal, reviewable commit. Follow repository AGENTS guidelines for commit messages and validation.
