# Cortex-OS GitHub Workflows (Consolidated Overview)

This document summarizes the updated CI/CD & security pipeline after consolidation.

## Key Changes

* Composite action `./.github/actions/setup-env` centralizes environment setup (Node, pnpm, caching, optional Python & Rust).
* Consolidated CI in `verify.yml` with docs-only short circuit & dist artifact publishing.
* Unified security (`unified-security.yml`) + scheduled CodeQL job (schedule-only) to reduce PR latency (now scanning JS/TS/Python weekly).
* Added deep scheduled heavy scanning (`deep-security.yml`) for extended Semgrep & OWASP Dependency Check.
* Introduced docs-only fast path (`docs-fastlane.yml`).
* Added reusable workflow (`reusable-setup.yml`) for cross-repo adoption via `workflow_call` (now supports optional `python-version` & `rust` inputs).
* Optimized `release.yml` to reuse prior CI build artifacts when available.
* Removed legacy redundant workflows (security*, compliance, license, gitleaks, advanced-ci) after stabilization window.
* Normalized Node 20 & pnpm 10.16.0 consistent with `packageManager` field; added pip cache for Bandit.
* Added early `affected-fastcheck` job in CI to short-circuit or surface quicker feedback on changed projects prior to full run.
* PR annotation lists Nx affected projects for transparency.\n*Dist artifact reuse smoke test on push (`artifact-reuse-smoke`).\n* CI provenance attestation (`provenance` job) generates SLSA build metadata for `dist/**` with paired SBOM attestation.\n*Security workflow now supports severity-based Slack failure notifications (secrets/SAST only; expects `SLACK_WEBHOOK` env at runtime).\n* Bandit scanning prefers `uvx` execution (faster, cached) with pip fallback.\n*uv environment caching added to Python workflows for faster tool installations.\n* Container provenance template prepared (commented) for future container builds.\n* Affected fast checks now enforce stricter discipline (removed `|| true` fallbacks).
* Concurrency controls added for CI, security, deep scans.
* Artifact retention kept lean (5 days for dist artifacts) to manage storage.

## Recommended Follow Ups

1. Gradually integrate reusable workflow into external repos to standardize setup.
2. Add caching for Python `uv` environments if Python build times become a bottleneck.
3. Evaluate extending provenance attestations to release SBOM & container images (if built).
4. Add selective Slack routing (severity-based) to reduce noise further.
5. Consider Matrix OS dimension (macos, windows) if cross-platform runtime surfaces expand.
6. Optionally gate `provenance` job behind label or environment if pushing to forks.

## Rationale

Multiple prior workflows duplicated environment setup & security scanning,
increasing runtime, maintenance overhead, and risk of divergence (different
pnpm versions, missing cache). A composite action enforces a single source for
setup while keeping job definitions readable.

## Rollback Plan

Reintroduce any removed workflow by restoring from git history (all deletions are in prior commits). Core behavior is now centralized; rollback rarely needed:

* Environment logic: revert to direct inline setup if composite action issues occur.
* Release artifact reuse: disable artifact download step to force rebuild.
* Docs fastlane bypass: remove `detect-docs-only` job from CI.

---
Last updated: 2025-09-13 UTC
