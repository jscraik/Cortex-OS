# Agents Package - Production Readiness Review

Date: 2025-08-29

## Summary

- Package: `@cortex-os/agents` (internal)
- Review scope: implementation in `packages/agents` evaluated against the agent standards in `.cortex/context/agents/*`.
- Final readiness score: **67 / 100**

## Quick verdict

The `agents` package shows strong architecture, TypeScript typing, Zod validation, and a tested event bus and utilities. However, production readiness is held back by security gaps (secrets and command invocation), runtime hardening and safety (circuit-breakers, quotas, durable audit/metrics), and some CI/packaging issues. With prioritized remediation (security-first), reaching 95% is achievable.

## Score breakdown (weighted)

- Correctness & Types / Contracts (15%): 14 / 15
- Validation & Input Sanity (10%): 9 / 10
- Observability & Events (10%): 7.5 / 10
- Fault tolerance (retries/fallbacks) (15%): 11 / 15
- Security & Secrets (20%): 6 / 20
- Testing & CI (15%): 10 / 15
- Packaging / Build / Release (5%): 3.5 / 5
- Performance & Resource Safety (10%): 6 / 10

Total: 67 / 100

## Evidence & files inspected

- Package and scripts: `packages/agents/package.json`
- Public exports and status: `packages/agents/src/index.ts`
- Core types: `packages/agents/src/lib/types.ts`
- Validation utilities: `packages/agents/src/lib/validate.ts`
- Utilities (timeouts, retry, tokens): `packages/agents/src/lib/utils.ts`
- Event bus: `packages/agents/src/lib/event-bus.ts`
- Event schemas: `packages/agents/src/events/agent-events.ts`
- Agents (implementations):
  - `packages/agents/src/agents/documentation-agent.ts`
  - `packages/agents/src/agents/test-generation-agent.ts`
  - `packages/agents/src/agents/code-analysis-agent.ts`
- Providers:
  - `packages/agents/src/providers/mlx-provider/index.ts` (thermal/memory checks, HTTP gateway)
  - `packages/agents/src/providers/mcp-provider.ts`
- Tests (unit): `packages/agents/tests/unit/**` (utils, event-bus, agent unit tests)
- Repo audit artifacts: `reports/misc/agents.audit.comprehensive.md`, `reports/scorecards/agents.production-readiness-scorecard.md`

## Major findings (priority order)

1. Security & secrets (critical)
   - No integrated secret management for provider credentials.
   - Legacy provider used inline Python subprocess; replaced by `packages/agents/src/providers/mlx-provider/index.ts` HTTP gateway. Ensure prompts are sanitized.
   - No consistent redaction of secrets in logs or masked outputs.

2. MLX & runtime hardening (critical)
   - MLX provider uses per-request Python spawn with inline script; operationally fragile and platform-dependent (macOS `sysctl` and `vm_stat` usages seen).
   - Lacks circuit-breakers, concurrent-request quotas, or a token-bucket; potential for resource exhaustion under load.

3. Observability & audit durability (high)
   - Event bus emits CloudEvents, but metrics/tracing export and durable audit logs are missing (in-process buffers only).
   - Tracing (W3C) not propagated from agents -> providers.

4. Fallbacks & retries (medium)
   - `retry()` util exists; fallback chains exist, but fallback usage is not enforced consistently and errors are sometimes generic instead of typed (ProviderError/AgentError).

5. CI & coverage (medium)
   - Unit tests exist and are strong for many components; repo-level CI may not run these tests for `packages/agents` due to missing project inclusion (reports reference this gap).

6. Packaging / release checks (low-medium)
   - Sonar/CI flagged missing `dist/` entries during scans; build-before-scan ordering or config tweaks required.

## Concrete remediation plan (short-term, 30-day focus)

### Priority A — Immediate (1–7 days)

- Legacy inline Python MLX provider removed; HTTP gateway (`packages/agents/src/providers/mlx-provider/index.ts`) handles prompts via JSON, eliminating shell injection risk.
- Add a `redactSecrets` helper and use it for all logs that might include provider identifiers, tokens, or sensitive data. (small change)
- Ensure agents use typed errors (`ProviderError`, `AgentError`) consistently so retry/backoff and failover logic can operate on error types. (small change)

### Priority B — Short (7–21 days)

- Implement a simple circuit-breaker and a concurrency semaphore for MLX calls (per-process or per-provider). Add request-queue capacity and fail-fast behavior when saturated.
- Add secret store integration interface (env-backed + Vault/KMS adapter) and update `mcp-provider` and `mlx-provider` to accept credentials through that interface.
- Add tests simulating thermal and memory pressure for `mlx-provider` and ensure failover to MCP providers.

### Priority C — Medium (21–60 days)

- Integrate distributed tracing (W3C traceparent) and export to tracing backend; include traceId in CloudEvents and provider calls.
- Export Prometheus metrics for agent counts, latencies, provider errors, throttles, and queue lengths; add a basic metrics adapter.
- Add durable audit log: write CloudEvents to a JSON-lines file or forward to a logging/Audit API with retry.
- Ensure `packages/agents` is added to root Vitest projects and add coverage gates to repo CI.

## Low-risk quick wins (can be done now)

- Legacy MLX shell invocation removed; verify HTTP gateway rejects malicious prompt content.
- Add traceId to provider generate calls and CloudEvents.
- Update root test configuration to include `packages/agents` in `vitest.workspace.ts` to ensure tests run in CI.

## OrbStack & A2A Workers (Dev Runbook)

- Use the new `agents-workers` service (Compose profile: `workers`) to run long-lived A2A consumers:
  - `docker compose --env-file infra/compose/.env.dev -f infra/compose/docker-compose.dev.yml --profile workers up --build -d`
- Requirements:
  - NATS JetStream (Compose profile brings up `nats` automatically when `workers` is selected)
  - Configure `NATS_URL` for workers; default is `nats://nats:4222` in Compose
- Notes:
  - Keep worker `mem_limit` conservative (default 384m) and adjust `NODE_OPTIONS=--max-old-space-size=256` as needed
  - For MLX-backed actions, workers communicate with host-native MLX via services that call the model-gateway; do not run MLX in a container on macOS

## Quality gates & verification

- Build: `pnpm -w -C packages/agents build` (ensure tsup build success)
- Tests: `pnpm -w -C packages/agents test` (unit tests should pass locally)
- Lint/Format: `pnpm -w -C packages/agents lint` and `pnpm -w -C packages/agents format`
- Security check: Run static analysis on `providers/mlx-provider/index.ts` for unescaped inputs; ensure HTTP requests are sanitized.

## Acceptance criteria to reach 95% readiness

1. No prompt or untrusted input is passed via interpolated shell arguments; all provider invocations accept stdin or secure IPC.
2. Secrets are managed via a documented interface (env + vault/KMS) and never logged in plain text.
3. Providers have circuit-breakers and concurrency quotas; fallback chaining is enforced for retryable errors.
4. Distributed tracing and Prometheus-style metrics exported; CloudEvents persisted to durable audit.
5. Package tests run in CI with coverage gates; coverage threshold met.

## Appendix: recommended first PRs

1. `fix(mlx): pass prompt via stdin to child process + add unit tests` — small, high-impact.
2. `chore(secrets): add redactSecrets helper and use in logs` — small.
3. `ci(tests): include packages/agents in root vitest.projects` — one-line CI change.

If you want, I can implement the first quick PRs now (stdin-based MLX invocation, redact helper, add trace propagation, and enable package tests in root CI) and run the unit tests — tell me which PR to start with and I'll proceed.
