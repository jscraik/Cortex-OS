# Development Plan: packages/agents (Single-focus Agents)

This plan outlines incremental tasks to bring the `packages/agents` module to operational readiness using strict software engineering principles and Test-Driven Development (TDD).

## Guiding Principles

1. **TDD Cycle**: Red-Green-Refactor for every behavior.
2. **Micro-commits**: Each commit represents one logical change with corresponding tests and docs.
3. **Operational Readiness**: Security, observability, and reliability baked into each feature.

## Phases & Tasks

| Phase | Task                                              | TDD Steps                                                                                                                                                                                                   | Example Commit                                           |
| ----- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1     | Establish proof-based business flows              | 1. Write failing integration test modeling a sample business flow with cryptographic proof.<br>2. Implement minimal orchestrator to satisfy test.<br>3. Refactor for clarity and add docs.                  | `feat(agents): orchestrate proof-based flow`             |
| 1     | Add security, observability, and governed memory  | 1. Add failing tests for authZ/audit hooks and memory policies.<br>2. Implement middleware emitting audit events and memory store integration.<br>3. Refactor and document.                                 | `feat(agents): add audit middleware and memory policies` |
| 1     | Multi-framework support with capability discovery | 1. Add failing tests for LangGraph, CrewAI, and AutoGen executors with capability registration and health checks.<br>2. Implement adapters and health monitoring.<br>3. Refactor and document.              | `feat(agents): add multi-framework executors`            |
| 2     | Deterministic execution and model gateway routing | 1. Add failing tests for seed-based determinism, max token enforcement, and model gateway routing.<br>2. Implement seed and token caps and route MLX provider through gateway.<br>3. Refactor and document. | `feat(agents): enforce deterministic execution`          |
| 2     | Golden output regression framework                | 1. Introduce failing golden tests capturing baseline outputs.<br>2. Implement snapshot utilities.<br>3. Refactor and document usage.                                                                        | `test(agents): add golden output snapshots`              |
| 2     | Streaming execution support                       | 1. Write failing test expecting token-stream responses.<br>2. Implement streaming provider abstraction.<br>3. Refactor and document API.                                                                    | `feat(agents): support streaming tokens`                 |
| 3     | Interactive correction workflow                   | 1. Add failing e2e test for correction loop.<br>2. Implement UI/CLI allowing stepwise fixes.<br>3. Refactor and document patterns.                                                                          | `feat(agents): enable interactive corrections`           |
| 3     | Polish code-analysis & test-gen agents            | 1. Add failing tests covering edge cases.<br>2. Harden implementations.<br>3. Refactor and update docs.                                                                                                     | `fix(agents): harden analysis and test-gen`              |
| 4     | Comprehensive documentation                       | 1. Create failing docs lint check referencing missing sections.<br>2. Write guides and examples.<br>3. Refactor structure for clarity.                                                                      | `docs(agents): expand usage guides`                      |
| 4     | Final operational readiness review                | 1. Add acceptance tests verifying security, observability, and reliability.<br>2. Run full regression suite.<br>3. Tag release candidate.                                                                   | `chore(agents): prepare release`                         |

## Regular Commit Rhythm

- Aim for commits no larger than ~50 lines.
- Run `pre-commit run --files <file>` and `pnpm test` (or `pnpm docs:lint` for docs) before each commit.

## Testing Strategy

- Unit tests for individual agent behaviors.
- Integration tests for business flows with proofs.
- Regression snapshots for golden outputs.
- E2E tests for interactive correction UX.

## Documentation

- Maintain `docs/agents` with architecture diagrams and usage examples.
- Update README sections to reference new capabilities.

## Milestones

1. **Prototype**: Proof-based flow orchestrated with tests passing.
2. **Beta**: Streaming and golden tests implemented; docs draft ready.
3. **RC**: Interactive correction workflow and hardened agents.
4. **GA**: All tests green, docs polished, release tagged.
