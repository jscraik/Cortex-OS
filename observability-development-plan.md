# Observability TDD Development Plan

## Objective

Establish end-to-end observability for Cortex-OS services covering structured logging, distributed tracing, and metrics exposition.

## Engineering Principles

- **TDD:** write a failing test, implement minimal code, then refactor.
- **Micro-commits:** one logical change per commit with tests and implementation together.
- **Validation:** run `pre-commit run --files <changed>` and `pnpm lint && pnpm test` (or `pnpm docs:lint` for docs) before each commit.

## Roadmap

### 1. Structured Logging

1. Add failing test ensuring service logs emit JSON with level, timestamp, and context (no commit yet).
2. Implement `LogService` using `pino`; make test pass; commit `feat(observability): add structured logging`.
3. Document logging usage and configuration; commit `docs(observability): document structured logging`.

### 2. Distributed Tracing

1. Add failing integration test verifying HTTP requests create trace spans (no commit yet).
2. Instrument services with OpenTelemetry SDK and HTTP middleware; make test pass; commit `feat(observability): add distributed tracing`.
3. Document tracing setup and exporter configuration; commit `docs(observability): document tracing setup`.

### 3. Metrics & Health Endpoint

1. Add failing test expecting `/metrics` endpoint with request duration histogram (no commit yet).
2. Integrate Prometheus client to collect metrics and expose `/metrics`; make test pass; commit `feat(observability): expose metrics endpoint`.
3. Document metric naming conventions and health checks; commit `docs(observability): document metrics endpoint`.

### 4. Alerting Hooks (Nice-to-have)

1. Add failing test verifying error events trigger alert callbacks (no commit yet).
2. Implement alert hook interface with example callback (e.g., Webhook); make test pass; commit `feat(observability): add alert hook interface`.
3. Document alert configuration; commit `docs(observability): document alert hooks`.

## Milestones

1. **Logging Foundation** – Structured logging integrated across services.
2. **Tracing Coverage** – End-to-end traces for HTTP requests.
3. **Metrics Exposure** – Prometheus metrics and health endpoints.
4. **Alerting Hooks** – Optional integrations for external alerting systems.

## Deliverables & Checkpoints

- Green tests and lint for each commit.
- Updated documentation describing observability features.
- CI pipeline verifies observability modules in build.
