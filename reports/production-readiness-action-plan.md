
# Production Readiness Action Plan

This plan outlines tasks to raise each package and quality area to **90%** readiness using strict Test-Driven Development (TDD) and established software engineering principles.

## a2a

- **Architecture**: Refactor modules to follow SOLID principles and enforce domain boundaries.
- **Reliability**: Introduce structured error handling and retry logic for message delivery.
- **Security**: Validate all cross-agent messages with Zod schemas and sanitize inputs.
- **Testing**: Adopt TDD; create unit tests for message routing and contract enforcement targeting 80%+ coverage.
- **Documentation**: Produce detailed README and API usage examples.
- **Accessibility**: Provide CLI help with clear descriptions and consider screen-reader friendly output.

## a2a-services

- **Architecture**: Modularize services with clear interfaces and dependency inversion.
- **Reliability**: Add health checks and observable logging around service calls.
- **Security**: Implement token-based auth for service boundaries and run dependency vulnerability scans.
- **Testing**: Drive development with failing tests for service contracts and concurrency handling.
- **Documentation**: Document service endpoints and configuration options.
- **Accessibility**: Ensure any CLI or API responses use plain language and proper markdown semantics.

## asbr

- **Architecture**: Decompose monolithic logic into layered components.
- **Reliability**: Implement circuit breakers for external integrations.
- **Security**: Apply least-privilege to credentials and audit logging.
- **Testing**: Write integration tests around boundary adapters following TDD.
- **Documentation**: Provide architecture diagrams and setup guides.
- **Accessibility**: Use descriptive variable names and include alt text for diagrams.

## kernel

- **Architecture**: Enforce module boundaries between core subsystems.
- **Reliability**: Add watchdog timers and comprehensive logging.
- **Security**: Harden memory management and perform static analysis (Semgrep).
- **Testing**: Build regression test suite for scheduler and I/O primitives.
- **Documentation**: Expand developer guides covering extension points.
- **Accessibility**: Ensure command-line flags have long and short forms with documentation.

## mcp

- **Architecture**: Stabilize plugin interface and separate transport from protocol logic.
- **Reliability**: Provide backpressure handling for high-load scenarios.
- **Security**: Enforce TLS for all network links and rotate secrets.
- **Testing**: Use contract tests for plugins with mock transports.
- **Documentation**: Add versioned API reference.
- **Accessibility**: Offer example configurations with comments for screen readers.

## mcp-bridge

- **Architecture**: Introduce adapter pattern for cross-protocol compatibility.
- **Reliability**: Implement retry with exponential backoff on bridge failures.
- **Security**: Validate all incoming/outgoing data and sanitize logs.
- **Testing**: Develop end-to-end tests simulating bridge scenarios.
- **Documentation**: Write integration tutorials for connecting systems.
- **Accessibility**: Ensure log output uses structured key=value pairs for parsing.

## mcp-registry

- **Architecture**: Split registry logic into repositories and services.
- **Reliability**: Add data integrity checks and transaction rollbacks.
- **Security**: Require auth for registry mutations and enable audit trail.
- **Testing**: Build migration tests and repository unit tests via TDD.
- **Documentation**: Document registry schema and migration process.
- **Accessibility**: Provide clear error messages and CLI usage hints.

## mcp-server

- **Architecture**: Extract middleware pipeline for request handling.
- **Reliability**: Add health endpoints and graceful shutdown.
- **Security**: Enable rate limiting and request validation.
- **Testing**: Create integration tests for middleware chain and routing.
- **Documentation**: Include server configuration examples.
- **Accessibility**: Ensure server logs are concise and structured.

## memories

- **Architecture**: Introduce repository pattern for memory stores.
- **Reliability**: Persist snapshots and handle persistence failures.
- **Security**: Encrypt sensitive memory segments and restrict access.
- **Testing**: TDD around CRUD operations with in-memory and persistent backends.
- **Documentation**: Describe memory lifecycle and retention policies.
- **Accessibility**: Provide descriptive config names and comments.

## model-gateway

- **Architecture**: Separate model adapters from gateway core.
- **Reliability**: Add timeout management for model calls.
- **Security**: Mask tokens in logs and enforce HTTPS.
- **Testing**: Write adapter contract tests using mocks.
- **Documentation**: Include examples for adding new model providers.
- **Accessibility**: Offer verbose logging mode for debugging with readable formatting.

## mvp

- **Architecture**: Modularize proof-of-concept components into maintainable units.
- **Reliability**: Add basic monitoring and fallback behavior.
- **Security**: Remove hardcoded secrets and use environment configs.
- **Testing**: Establish baseline unit tests for critical paths.
- **Documentation**: Clarify project scope and quickstart steps.
- **Accessibility**: Ensure README headings follow semantic order.

## mvp-core

- **Architecture**: Apply clean architecture boundaries between domain and infrastructure.
- **Reliability**: Implement error propagation strategies.
- **Security**: Audit dependencies for vulnerabilities.
- **Testing**: Use TDD for core domain logic and achieve high coverage.
- **Documentation**: Create developer guide for extending core.
- **Accessibility**: Provide inline comments explaining core abstractions.

## mvp-server

- **Architecture**: Refactor server components to use dependency injection.
- **Reliability**: Add graceful shutdown and request timeout handling.
- **Security**: Implement input sanitation on all endpoints.
- **Testing**: Write integration tests for REST endpoints.
- **Documentation**: Provide API reference with examples.
- **Accessibility**: Ensure error responses are human-readable.

## orchestration

- **Architecture**: Adopt event-driven architecture with explicit contracts.
- **Reliability**: Integrate distributed tracing for job orchestration.
- **Security**: Encrypt inter-service messages.
- **Testing**: TDD workflows with mock orchestrators and assert invariants.
- **Documentation**: Maintain sequence diagrams for orchestrated flows.
- **Accessibility**: Use descriptive names for workflows and steps.

## prp-runner

- **Architecture**: Streamline pipeline stages into separate modules.
- **Reliability**: Add checkpointing and failure recovery.
- **Security**: Sign runner artifacts and verify integrity.
- **Testing**: Build pipeline simulation tests driven by specs.
- **Documentation**: Document runner setup and environment variables.
- **Accessibility**: Provide verbose mode with clear step delineation.

## rag

- **Architecture**: Implement clear separation between retrieval and generation layers.
- **Reliability**: Add caching with fallback strategies.
- **Security**: Sanitize retrieved data before generation.
- **Testing**: Use TDD for retrieval indexing and generation pipelines.
- **Documentation**: Explain configuration of data sources.
- **Accessibility**: Ensure all examples include alt text for diagrams.

## registry

- **Architecture**: Normalize registry modules and apply repository/service layers.
- **Reliability**: Introduce consistency checks and replication.
- **Security**: Implement role-based access control.
- **Testing**: Write transaction tests and repository mocks.
- **Documentation**: Provide schema diagrams and usage walkthrough.
- **Accessibility**: Use clear, spaced CLI output.

## security

- **Architecture**: Maintain separation of security concerns from business logic.
- **Reliability**: Monitor security events and integrate alerting.
- **Security**: Expand static and dynamic analysis coverage.
- **Testing**: Write security-focused unit and integration tests.
- **Documentation**: Document threat models and mitigation steps.
- **Accessibility**: Ensure security warnings are understandable.

## simlab

- **Architecture**: Break monolithic simulation code into modular packages.
- **Reliability**: Add deterministic simulation modes with seed control.
- **Security**: Validate simulation inputs and sandbox execution.
- **Testing**: Build scenario tests with expected outcomes following TDD.
- **Documentation**: Provide simulation scenario library and guides.
- **Accessibility**: Include captions/alt text for simulation visuals.

## cortex-api

- **Architecture**: Establish a service layer separating request parsing from core logic.
- **Reliability**: Implement health endpoints and automatic retries for downstream failures.
- **Security**: Enforce strict input validation and rate limiting on all endpoints.
- **Testing**: Use TDD for each route with contract and error-path tests.
- **Documentation**: Publish OpenAPI docs and quick-start examples.
- **Accessibility**: Ensure API responses include descriptive error messages.

## cortex-cli

- **Architecture**: Organize commands into modular subcommands with clear interfaces.
- **Reliability**: Implement consistent error handling and exit codes.
- **Security**: Sanitize all user-provided arguments and avoid command injection.
- **Testing**: Use TDD to cover command parsing and execution paths.
- **Documentation**: Offer comprehensive CLI usage examples and help output.
- **Accessibility**: Support colorless mode and screen-reader-friendly text.

## cortex-marketplace

- **Architecture**: Separate frontend and backend concerns with well-defined APIs.
- **Reliability**: Add health checks and graceful fallback for service outages.
- **Security**: Enforce authentication flows and validate marketplace inputs.
- **Testing**: Develop end-to-end tests for listing and purchase workflows.
- **Documentation**: Provide deployment and configuration guides.
- **Accessibility**: Ensure UI components meet WCAG 2.2 AA standards.

## cortex-marketplace-api

- **Architecture**: Design RESTful endpoints with clear resource boundaries.
- **Reliability**: Implement rate limiting and structured logging.
- **Security**: Require JWT auth and validate payloads with Zod.
- **Testing**: Write API contract and negative tests following TDD.
- **Documentation**: Publish OpenAPI specs and usage examples.
- **Accessibility**: Return descriptive error messages.

## cortex-os

- **Architecture**: Modularize core subsystems and enforce domain boundaries.
- **Reliability**: Add startup self-checks and recovery routines.
- **Security**: Sandbox user code and enforce permission checks.
- **Testing**: Build integration tests for kernel services via TDD.
- **Documentation**: Expand installation and configuration manuals.
- **Accessibility**: Provide verbose logging with plain language.

## cortex-py

- **Architecture**: Structure as a standard Python package with clear entry points.
- **Reliability**: Handle import and runtime errors gracefully.
- **Security**: Run dependency vulnerability scans and pin versions.
- **Testing**: Add pytest suites with coverage targets.
- **Documentation**: Include docstrings and usage notebooks.
- **Accessibility**: Ensure logs and CLI outputs are readable.

## cortex-web

- **Architecture**: Use component-based design with reusable modules.
- **Reliability**: Add error boundaries and service-worker fallbacks.
- **Security**: Implement CSRF protection and sanitize user inputs.
- **Testing**: Write unit and accessibility tests for components.
- **Documentation**: Maintain developer and user guides with screenshots.
- **Accessibility**: Run automated axe-core audits and support keyboard navigation.

## vscode-extension

- **Architecture**: Modularize extension commands and leverage VS Code APIs via a service layer.
- **Reliability**: Handle activation failures and provide fallback messaging.
- **Security**: Validate user inputs and restrict file system access permissions.
- **Testing**: Use the VS Code test harness with TDD for command and UI interactions.
- **Documentation**: Include usage examples and troubleshooting steps in README.
- **Accessibility**: Ensure all commands have keyboard shortcuts and descriptive titles.
=======
# Production Readiness Action Plan (TDD-first)This plan drives each package to 95-100% across Testing, Reliability, Security, Architecture, Docs, and Accessibility using strict TDD and engineering principles.## Quality gates (global, enforced)- Test coverage: statements/branch/functions/lines >= 95% per package; target 100% where feasible- Lint/typecheck: zero errors; warnings fail CI for changed files- Static analysis: ESLint, Knip, TS config strict; Python: ruff/mypy- Security: `pnpm audit` (or `npm audit --omit=dev` parity) clean; `semgrep` and secret scan zero findings; SBOM present- Commit hygiene: conventional commits; commitlint + semantic-release dry run in CI- Docs: README per package includes quickstart, API surface, config, examples- a11y: Playwright a11y checks for web surfaces; axe minimum WCAG AA on critical paths- Build reproducibility: lockfiles up to date; pinned Docker images where used## TDD workflow (applies to every change)1. Write failing unit tests (Vitest/Jest in TS; PyTest in Python) for the behavior2. Implement the minimal code to pass tests3. Refactor with characterization tests for legacy paths4. Add integration tests using contracts in `libs/typescript/contracts` and A2A events5. Ensure mocks/stubs follow DI boundaries (no cross-feature imports; use broker interfaces)6. Update package README and examples## Packages and priority focusPrioritize lowest scoring packages first while unblocking critical path runtimes: `mvp`, `mvp-server`, `prp-runner`, `simlab`, `memories`, `asbr`.For each package, apply the checklist below and raise scores to 95%+.### Per-package TDD checklist template- Tests - [ ] Unit tests cover all public functions/classes - [ ] Contract tests for A2A messages (publish/subscribe) with zod schemas - [ ] Integration tests for DI wiring in ASBR runtime (where applicable) - [ ] Error paths and edge cases (timeouts, retries, invalid input) - [ ] Coverage >= 95% statements/branches/functions/lines- Reliability - [ ] Idempotency/retry policies defined (exponential backoff) - [ ] Deterministic seeds for non-deterministic logic - [ ] Resource caps: timeouts, memory, concurrency - [ ] Logging with correlation IDs- Security - [ ] Input validation with Zod; output typed - [ ] No secrets in repo; dotenv schema validation - [ ] Least privilege for tool integrations (MCP) - [ ] Semgrep and dependency audit clean- Architecture - [ ] ESM only, boundary-safe imports - [ ] Interfaces in `libs/typescript/contracts`; utils from `libs/typescript/utils` - [ ] No cross-feature imports; use A2A or service interfaces via DI- Documentation - [ ] README with quickstart, API, config, examples - [ ] CHANGELOG updated by semantic-release- Accessibility (web UIs only) - [ ] Playwright a11y tests for critical flows - [ ] Axe rule violations addressed or waived with rationale## Concrete tasks by domain1. Testing and coverage - Create per-package `vitest.config.ts` inheriting from workspace; add `test:pkg` targets - Add boundary tests for A2A broker publish/subscribe using fake broker - Contract enforcements with zod: schema.parse in tests on emitted events - Add Playwright tests in `apps/cortex-web` for a11y2. Reliability - Introduce `p-retry` wrappers and circuit breakers for external calls (MCP manager) - Add timeouts with `AbortController` and test cancellations3. Security - Add `semgrep` ruleset and CI step; fix findings - Validate env via `zod` schema per package; fail fast tests for missing vars - Generate SBOM with `pnpm sbom` or `cyclonedx-npm` and store in `sbom/`4. Architecture - Move contracts to `libs/typescript/contracts` when found local - Replace direct imports with A2A messages or DI service interfaces5. Docs - Add `README.md` skeletons where missing - Wire `docs/LAUNCH.md` and package quickstarts## Success criteria- All targeted packages at or above 95% coverage and passing gates- CI shows zero high/critical vulnerabilities, zero secret leaks, and green a11y checks- Unified launch doc verified end-to-end locally## Implementation cadence- Week 1: mvp, mvp-server, prp-runner- Week 2: asbr, memories, simlab- Week 3: a2a, mcp-bridge, registry- Week 4: long-tail packages and polish---Refer to `docs/LAUNCH.md` for runbooks and how to execute coverage and checks.

## Quick launch checklist (local + CI parity)

- pnpm install
- pnpm build
- pnpm test
- pnpm test:coverage
- pnpm pw:test # accessibility checks
- pnpm ci:governance # repo-wide governance parity (lint, audits, etc.)
- Python: uv sync; uv run pytest (where applicable)

## Developer-proposed per-package actions (merged)

The following concrete actions provided by the team are now part of the plan. They complement the global quality gates and TDD workflow above and should be executed package-by-package until each area reaches ≥95%.

### a2a

- Architecture: Refactor modules to follow SOLID principles and enforce domain boundaries.
- Reliability: Introduce structured error handling and retry logic for message delivery.
- Security: Validate all cross-agent messages with Zod schemas and sanitize inputs.
- Testing: Adopt TDD; create unit tests for message routing and contract enforcement targeting 80%+ coverage on first pass, then raise to 95%.
- Documentation: Produce detailed README and API usage examples.
- Accessibility: Provide CLI help with clear descriptions and consider screen-reader friendly output.

### a2a-services

- Architecture: Modularize services with clear interfaces and dependency inversion.
- Reliability: Add health checks and observable logging around service calls.
- Security: Implement token-based auth for service boundaries and run dependency vulnerability scans.
- Testing: Drive development with failing tests for service contracts and concurrency handling.
- Documentation: Document service endpoints and configuration options.
- Accessibility: Ensure any CLI or API responses use plain language and proper markdown semantics.

### asbr

- Architecture: Decompose monolithic logic into layered components.
- Reliability: Implement circuit breakers for external integrations.
- Security: Apply least-privilege to credentials and audit logging.
- Testing: Write integration tests around boundary adapters following TDD.
- Documentation: Provide architecture diagrams and setup guides.
- Accessibility: Use descriptive variable names and include alt text for diagrams.

### kernel

- Architecture: Enforce module boundaries between core subsystems.
- Reliability: Add watchdog timers and comprehensive logging.
- Security: Harden memory management and perform static analysis (Semgrep)
- Testing: Build regression test suite for scheduler and I/O primitives.
- Documentation: Expand developer guides covering extension points.
- Accessibility: Ensure command-line flags have long and short forms with documentation.

### mcp

- Architecture: Stabilize plugin interface and separate transport from protocol logic.
- Reliability: Provide back-pressure handling for high-load scenarios.
- Security: Enforce TLS for all network links and rotate secrets.
- Testing: Use contract tests for plugins with mock transports.
- Documentation: Add versioned API reference.
- Accessibility: Offer example configurations with comments for screen readers.

### mcp-bridge

- Architecture: Introduce adapter pattern for cross-protocol compatibility.
- Reliability: Implement retry with exponential backoff on bridge failures.
- Security: Validate all incoming/outgoing data and sanitize logs.
- Testing: Develop end-to-end tests simulating bridge scenarios.
- Documentation: Write integration tutorials for connecting systems.
- Accessibility: Ensure log output uses structured key=value pairs for parsing.

### mcp-registry

- Architecture: Split registry logic into repositories and services.
- Reliability: Add data integrity checks and transaction rollbacks.
- Security: Require auth for registry mutations and enable audit trail.
- Testing: Build migration tests and repository unit tests via TDD.
- Documentation: Document registry schema and migration process.
- Accessibility: Provide clear error messages and CLI usage hints.

### mcp-server

- Architecture: Extract middleware pipeline for request handling.
- Reliability: Add health endpoints and graceful shutdown.
- Security: Enable rate limiting and request validation.
- Testing: Create integration tests for middleware chain and routing.
- Documentation: Include server configuration examples.
- Accessibility: Ensure server logs are concise and structured.

### memories

- Architecture: Introduce repository pattern for memory stores.
- Reliability: Persist snapshots and handle persistence failures.
- Security: Encrypt sensitive memory segments and restrict access.
- Testing: TDD around CRUD operations with in-memory and persistent backends.
- Documentation: Describe memory lifecycle and retention policies.
- Accessibility: Provide descriptive config names and comments.

### model-gateway

- Architecture: Separate model adapters from gateway core.
- Reliability: Add timeout management for model calls.
- Security: Mask tokens in logs and enforce HTTPS.
- Testing: Write adapter contract tests using mocks.
- Documentation: Include examples for adding new model providers.
- Accessibility: Offer verbose logging mode for debugging with readable formatting.

### mvp

- Architecture: Modularize proof-of-concept components into maintainable units.
- Reliability: Add basic monitoring and fallback behavior.
- Security: Remove hardcoded secrets and use environment configs.
- Testing: Establish baseline unit tests for critical paths.
- Documentation: Clarify project scope and quickstart steps.
- Accessibility: Ensure README headings follow semantic order.

### mvp-core

- Architecture: Apply clean architecture boundaries between domain and infrastructure.
- Reliability: Implement error propagation strategies.
- Security: Audit dependencies for vulnerabilities.
- Testing: Use TDD for core domain logic and achieve high coverage.
- Documentation: Create developer guide for extending core.
- Accessibility: Provide inline comments explaining core abstractions.

### mvp-server

- Architecture: Refactor server components to use dependency injection.
- Reliability: Add graceful shutdown and request timeout handling.
- Security: Implement input sanitation on all endpoints.
- Testing: Write integration tests for REST endpoints.
- Documentation: Provide API reference with examples.
- Accessibility: Ensure error responses are human-readable.

### orchestration

- Architecture: Adopt event-driven architecture with explicit contracts.
- Reliability: Integrate distributed tracing for job orchestration.
- Security: Encrypt inter-service messages.
- Testing: TDD workflows with mock orchestrators and assert invariants.
- Documentation: Maintain sequence diagrams for orchestrated flows.
- Accessibility: Use descriptive names for workflows and steps.

### prp-runner

- Architecture: Streamline pipeline stages into separate modules.
- Reliability: Add check-pointing and failure recovery.
- Security: Sign runner artifacts and verify integrity.
- Testing: Build pipeline simulation tests driven by specs.
- Documentation: Document runner setup and environment variables.
- Accessibility: Provide verbose mode with clear step delineation.

### rag

- Architecture: Implement clear separation between retrieval and generation layers.
- Reliability: Add caching with fallback strategies.
- Security: Sanitize retrieved data before generation.
- Testing: Use TDD for retrieval indexing and generation pipelines.
- Documentation: Explain configuration of data sources.
- Accessibility: Ensure all examples include alt text for diagrams.

### registry

- Architecture: Normalize registry modules and apply repository/service layers.
- Reliability: Introduce consistency checks and replication.
- Security: Implement role-based access control.
- Testing: Write transaction tests and repository mocks.
- Documentation: Provide schema diagrams and usage walkthrough.
- Accessibility: Use clear, spaced CLI output.

### security

- Architecture: Maintain separation of security concerns from business logic.
- Reliability: Monitor security events and integrate alerting.
- Security: Expand static and dynamic analysis coverage.
- Testing: Write security-focused unit and integration tests.
- Documentation: Document threat models and mitigation steps.
- Accessibility: Ensure security warnings are understandable.

### sim-lab-mono

- Architecture: Break monolithic simulation code into modular packages.
- Reliability: Add deterministic simulation modes with seed control.
- Security: Validate simulation inputs and sandbox execution.
- Testing: Build scenario tests with expected outcomes following TDD.
- Documentation: Provide simulation scenario library and guides.
- Accessibility: Include captions/alt text for simulation visuals.

