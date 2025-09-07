# RAG TDD Development Plan

## Objective

Upgrade `packages/rag` to operational readiness by implementing missing requirements (citation bundling and freshness routing) and hardening existing modules.

## Engineering Principles

- **TDD:** write a failing test, implement the minimal code to pass, then refactor.
- **Micro-commits:** one logical change per commit with tests and implementation together.
- **Validation:** run `pre-commit run --files <changed>` and `pnpm lint && pnpm test` (or `pnpm docs:lint` for docs) before each commit.

## Roadmap

### 1. Citation Bundling with References

1. Add failing unit test verifying `retrieve` returns citation metadata (do not commit yet).
2. Implement `CitationBundler` to aggregate chunks and citation data; make test pass; commit `feat(rag): bundle retrieval results with citations`.
3. Integrate bundler into `RAGPipeline.retrieve`; add integration test; commit `feat(rag): integrate citation bundling`.
4. Document citation bundle usage in README and examples; commit `docs(rag): document citation bundles`.

### 2. Freshness Routing

1. Add failing test for freshness metadata and routing logic (no commit).
2. Capture `updated_at` metadata during ingest; make test pass; commit `feat(rag): track document freshness`.
3. Implement router that prefers freshest sources; add tests; commit `feat(rag): add freshness-based routing`.
4. Document configuration and deployment notes; commit `docs(rag): describe freshness routing`.

### 3. Operational Upgrades

1. Expand chunker edge-case tests and refactor accordingly; commit `test(rag): cover chunker edge cases`.
2. Validate `RAGPipeline` interface with error handling and mocks; add tests; commit `feat(rag): harden pipeline interface`.
3. Improve `Qwen3Reranker` with timeout/batch validation and benchmarks; tests; commit `feat(rag): harden reranker gateway`.
4. End-to-end test from ingest to reranked retrieval; commit `test(rag): add pipeline e2e test`.
5. Final README section: operational readiness checklist; commit `docs(rag): add readiness checklist`.

## Commit Cadence

- Each numbered step above maps to a single commit after all checks pass.
- Push commits frequently for review.
