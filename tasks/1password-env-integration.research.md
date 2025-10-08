# 1Password Env Integration — Research Notes

## Goal

Centralize environment variable loading for local development tools and services. The aim is to
help brAInwav engineers who rely on 1Password Secrets Automation pipes (FIFOs) avoid blocking
reads while still supporting traditional `.env` and `.env.local` files.

## Current State Assessment

- `scripts/nx-smart.mjs`, `scripts/vitest-safe.mjs`, `scripts/mlx/verify.mjs`, and
  `scripts/mlx/doctor.mjs` each call `dotenv.config` inline. They allow silent failure when
  `dotenv` is missing and have no guard against FIFOs, so pointing them at a 1Password pipe causes
  the script to hang.
- Deployment scripts under `scripts/deployment/` source files without checking whether the target
  is a FIFO, which risks draining long-lived 1Password pipes.
- Service entrypoints in `packages/cortex-ai-github`, `packages/cortex-semgrep-github`, and
  `packages/cortex-structure-github` currently load `.env` via local helpers; they need a shared
  utility for consistent pipe-safe behavior.
- Workspace linting disallows empty catch blocks, so any helper must log failures with brAInwav
  branding.

## Constraints & Requirements

- Follow CODESTYLE.md: named exports only, functions ≤ 40 LOC, async/await usage when needed, and
  include "brAInwav" in logs and errors.
- Provide fallback order `.env.local` → `.env` while honoring `BRAINWAV_ENV_FILE` overrides when
  they reference a regular file.
- Detect FIFOs via `fs.Stats#isFIFO()` and skip auto-loading. Emit a branded warning instructing
  users to run `op run` or the corresponding 1Password CLI command instead.
- Support optional debug output controlled through an environment flag so scripts can trace
  loading decisions when required.
- Place the shared loader under `scripts/utils/` and ensure it can be consumed from ESM scripts and
  TypeScript entrypoints.
- Provide a TypeScript-friendly wrapper or declarations to reuse the logic from application code.
- Document end-to-end usage in developer guides and link from the README.

## External References

- Node.js `fs.Stats#isFIFO()` for pipe detection.
- 1Password CLI guidance: `op run --env-file=<path> -- <command>` uses pipes when `<path>` points to
  `op://` references.
- Dotenv package behavior: blocks on FIFO reads unless the consumer handles pipes explicitly.

## Open Questions

- Should the loader cache stat lookups to avoid repeated filesystem checks? (Probably unnecessary
  at current scale.)
- How should the TypeScript packages integrate the helper—dynamic import of ESM or a dedicated TS
  version compiled by tsc?

## Next Steps

1. Design a `loadDotenv` helper that performs FIFO detection and follows the desired fallback
   order.
2. Update Node tooling scripts to consume the helper instead of hand-rolled `dotenv.config` logic.
3. Harden shell deployment scripts to respect FIFOs and avoid draining 1Password pipes.
4. Provide TypeScript entrypoints with an ergonomic wrapper around the loader.
5. Add Vitest coverage for normal files, missing files, and FIFO detection.
6. Document the workflow and record changes in the CHANGELOG.
