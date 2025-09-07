# Memories Package Development Plan

This plan outlines a strict, test-driven approach to complete and harden the `@cortex-os/memories` package. Work is divided into micro-commits, each containing tests and implementation, and validated via `pre-commit`, `pnpm lint`, and `pnpm test`.

## Guiding Principles

- Follow TDD: write failing tests, implement minimal code, refactor with tests green.
- One logical change per commit.
- Use conventional commit messages (e.g., `feat(memories): add encryption support`).
- Run required checks before each commit.

## Milestones & Tasks

| Milestone                         | Tasks (each task = one commit)                                                                                                                                                                | Description                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **1. Baseline & Test Coverage**   | 1. Add foundational unit tests for existing store operations.<br>2. Add tests for TTL expiry and vector search to document current behaviour.                                                 | Ensure existing features are covered and stable before new work. |
| **2. Namespace Isolation**        | 1. Write failing tests for per-namespace isolation in CRUD operations.<br>2. Implement namespace support in `InMemoryStore` and interfaces.<br>3. Refactor query logic to respect namespaces. | Enables multi-tenant usage.                                      |
| **3. Short vs. Long-Term Stores** | 1. Design tests distinguishing short- and long-term stores with provenance.<br>2. Implement layered store abstraction.<br>3. Provide migration utilities and docs.                            | Separates ephemeral vs. durable memories.                        |
| **4. Encryption**                 | 1. Define tests for encrypted persistence and retrieval.<br>2. Integrate pluggable encryption service (with in-memory mock for tests).<br>3. Document key management expectations.            | Protects sensitive data at rest.                                 |
| **5. Consolidation Jobs**         | 1. Add tests for scheduled consolidation of short-term into long-term store.<br>2. Implement consolidation job runner and hooks.<br>3. Expose configuration options.                          | Maintains long-term durability and reduces clutter.              |
| **6. Decay Heuristics**           | 1. Specify tests for decay logic affecting retrieval priority.<br>2. Implement decay scoring and pruning utilities.<br>3. Add configuration for decay rates.                                  | Supports memory lifecycle management.                            |
| **7. Documentation & Examples**   | 1. Create usage examples demonstrating new features.<br>2. Update README with API and configuration guidance.<br>3. Add architecture decision record for major design choices.                | Ensures operational readiness and clarity.                       |

## Delivery Cadence

- Target commits every 1–2 days per task, merging via PR once checks pass.
- Review each milestone after completion to ensure requirements are met before moving on.

## Verification Checklist

For each commit:

1. Write/extend failing tests.
2. Implement minimal code to pass tests.
3. Run `pre-commit run --files <changed files>`.
4. Run `pnpm lint` and `pnpm test` (or `pnpm docs:lint` for docs-only).
5. Open a PR describing scope and linking related issues.
