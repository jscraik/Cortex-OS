# Codemap Generator Investigation

## Objective

Design and integrate a brAInwav-compliant codemap generator that produces machine-readable and human-oriented snapshots.
Outputs must include `out/codemap.json` and `out/codemap.md`.
The map must capture repository structure, hotspots, complexity, tests, endpoints, and operations metadata.
We need to tailor the Python reference implementation to the Cortex-OS Nx monorepo (NestJS, Prisma, K8s, multi-language stack).

## Existing Signals

- `tools/scripts/generate-code-map.ts` currently implements a lightweight TypeScript-based map focused on imports/functions/docstrings.
- `package.json` exposes an npm script `codemap` pointing to the TypeScript tool (`tsx tools/scripts/generate-code-map.ts`).
- No Python codemap generator exists under `scripts/` yet; the folder is populated predominantly with shell, Node, and tooling helpers.
- `Makefile` is MCP-focused and lacks a codemap target.
- CI instructions in `.github/copilot-instructions.md` prohibit unauthorised workflow edits.
- The user explicitly requested a GitHub Actions automation for codemap artifacts.

## Constraints & Requirements

- Honor brAInwav production standards: include "brAInwav" branding in all script outputs/logs; avoid placeholder messaging.
- Maintain ASCII output unless existing files justify non-ASCII; follow CODESTYLE for tests/docs.
- Use named exports only rule is irrelevant to Python but function length and clarity still apply.
- Ensure script gracefully degrades when optional tools (`lizard`, `madge`, `depcheck`, etc.) are missing and records availability in JSON.
- Avoid touching unrelated files; preserve existing MCP-focused Makefile behavior while adding new targets safely.
- Follow agentic workflow: create TDD plan, implement tests, verify via pnpm lint/test/security/structure where applicable.

## Tailoring Considerations

- Nx monorepo layout: need ignore defaults for `dist`, `node_modules`, `apps/*/dist`, `packages/*/dist`, `coverage`, generated docs, etc.
- Primary backend stack: NestJS + Prisma + FastAPI/Flask variations.
- Ensure HTTP heuristics cover Nest decorators, Express routers, FastAPI path ops, and Prisma schema signals for ops detection.
- Ops artifacts: repo contains numerous Dockerfiles (`Dockerfile.optimized`, infra compose) and Kubernetes manifests under `infra/` and `ops/`.
- Ensure the detector scans these directories.
- Testing footprint: mix of Vitest, pytest, Go tests; coverage files present (`coverage/coverage-summary.json`, `coverage.xml`, `coverage/lcov.info`).
- Git churn window should default to 180 days but remain configurable.

## Open Questions / Risks

- Need to decide how to handle pre-existing `codemap` npm script—whether to rewire it to new Python tool or keep both in parallel.
- Determine best way to merge "deeper cut" add-ons (madge import graph, depcheck, go/jdeps outputs) into JSON while keeping file <2 MB.
- Confirm CI integration respects prohibition guidelines and add new workflow only if required by request.
- Identify appropriate unit/integration tests (likely pytest) for new Python script to support TDD.
