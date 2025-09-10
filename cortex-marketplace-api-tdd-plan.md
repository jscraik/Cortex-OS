# Cortex Marketplace API Review & TDD Plan

This document summarizes a security-focused review of `apps/cortex-marketplace-api` and a roadmap for production readiness using strict Test-Driven Development (TDD).

## Technical Review

- **Registry management** with caching and allowlisted domains for SSRF protection.
- **Install command generator** for Claude and JSON clients.
- **MLX integration** for embeddings, semantic search, reranking, and safety checks.
- **Type safety** via Zod schemas and TypeScript.
- **Tests** cover basic URL validation and install utilities but lack coverage for registry operations, MLX workflows, and HTTP endpoints.
- **Gaps**
  - Hardcoded registry allowlist and no cryptographic signature verification.
  - Cache freshness and error paths untested.
  - MLX service only tested for disabled state; no safety or embedding behaviour tests.
  - No Fastify API layer or request validation tests.
  - Documentation is missing for configuration, security posture, and deployment steps.

## Engineering Principle

> **Security-by-Design** – Every external marketplace interaction must validate, authenticate, and cryptographically verify data before use. Unverified data **must never** enter the runtime.

- All network calls must pass domain allowlisting **and** Ed25519 signature checks.
- Every new module requires unit tests that enforce the above checks.
- Configuration must flow through explicit environment variables with sane defaults.

## TDD Roadmap

### 1. Registry Integrity

- test(marketplace): fetching registry with invalid signature fails.
- feat(marketplace): verify registry `signing` block using Ed25519.
- test(marketplace): load registry from cache when fresh; refetch when stale.

### 2. Search & Filtering

- test(marketplace): `searchServers` filters by category, capabilities, verified flag, and pagination.
- feat(marketplace): implement/adjust search logic to satisfy tests.

### 3. MLX Service Safety

- test(marketplace): `validateSafety` flags unsafe text.
- feat(marketplace): handle safety result parsing and errors deterministically.
- test(marketplace): `semanticSearch` ranks more relevant servers higher using mocked embeddings.
- feat(marketplace): expose deterministic mock path for testing.

### 4. HTTP API Layer

- test(marketplace): Fastify route `/v1/servers` returns paginated results with schema validation.
- feat(marketplace): minimal Fastify server wired to `MarketplaceRegistry` and Zod schemas.

### 5. Documentation & Configuration

- docs(marketplace): README describing setup, env variables, security model.
- docs(marketplace): API reference for `/v1/servers` and MLX options.

## Milestones

- **M1 – Registry Trust**: Signature verification and cache logic.
- **M2 – Rich Search**: Filtering and pagination tests covered.
- **M3 – MLX Reliability**: Safety and semantic search validated.
- **M4 – HTTP API**: Fastify endpoints with request validation.
- **M5 – Docs & Config**: Usage and deployment guides complete.

## Verification Checklist for Each Commit

1. `pre-commit run --files <changed files>`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm docs:lint` (docs updates)
