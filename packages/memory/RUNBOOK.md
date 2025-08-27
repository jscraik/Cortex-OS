# @cortex-os/memory — Runbook

## Purpose

This document explains how to install, test, and troubleshoot the Memory package used by Cortex OS agents (Qdrant + Neo4j adapters + embedder). It contains fast reproduction steps and common fixes.

## Prerequisites

- Node.js v18+ (matching workspace engines)
- pnpm
- For integration tests only: Qdrant, Neo4j, Docker (not required for unit tests)

## Quick install (repo root)

Run from the repo root:

```bash
pnpm install
```

## Package-local install

From the package directory:

```bash
cd apps/cortex-os/packages/memory
pnpm install
```

## Run unit tests (fast)

From the package directory:

```bash
pnpm test
```

This runs Vitest for the memory package only. The suite is fast and uses fakes/mocks for Qdrant/Neo4j.

## Troubleshooting

- `Cannot find package 'undici'` — run `pnpm add undici` in the package directory or `pnpm install` at repo root.
- Docker / system tool failures (clamscan, yara, binwalk) — those failures appear when running full-workspace or security integration suites. For focused memory tests, run the package-local `pnpm test`.
- `ModuleNotFoundError` for Python bridges — integration tests that call Python require environment setup; unit tests do not.

## Developer notes

- The Qdrant adapter persists `expireAt` in payload and uses tenant-scoped queries.
- Neo4j adapter validates labels/types via regex to avoid Cypher injection.
- If adding new dependencies, prefer package-local additions (to avoid workspace churn) and add test coverage for new behavior.

## Contact

For questions or to request a PR with the minimal diffs & tests, open an issue or ping the package owner in the repo.
