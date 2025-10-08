# 1Password Env Integration — TDD Plan

## Objectives

- Provide a reusable loader that avoids draining 1Password FIFO env pipes and exposes consistent
  logging with brAInwav branding.
- Apply the loader to Node tooling scripts and TypeScript services.
- Harden shell scripts and update documentation/tests to cover the new behavior.

## Assumptions

- `dotenv` is already listed as a dependency and available to Node scripts.
- Scripts run in ESM environments, so the loader must export ESM-friendly APIs.
- Tests will run under Vitest with filesystem mocks.

## Test Matrix

1. **Loader default order**
   - Given `.env.local` exists and is a regular file, loader should load it.
   - Given `.env.local` missing and `.env` exists, loader should load `.env`.
   - Given `BRAINWAV_ENV_FILE` points to a regular file, loader should prioritize it.
2. **FIFO detection**
   - When a candidate path is a FIFO, the loader should skip `dotenv.config`, log a warning with
     brAInwav branding, and return `{ skipped: true }`.
   - When the path does not exist, the loader should emit a debug log (if enabled) or remain
     silent.
3. **Script integration**
   - `nx-smart.mjs`, `vitest-safe.mjs`, `mlx/verify.mjs`, and `mlx/doctor.mjs` import the loader
     and call it once.
   - Integration logs continue honoring existing debug flags such as `NX_SMART_DEBUG_BOOT`.
4. **Shell scripts**
   - `deploy-production.sh` and `docker-dev.sh` check files with `test -p` before reading and emit
     guidance when encountering FIFOs.
5. **TypeScript wrapper**
   - Provide `@cortex-os/env/loadDotenv` (or similar) returning loader results and confirm it
     compiles under TypeScript while including brAInwav-branded logging.

## Implementation Checklist

1. Scaffold `scripts/utils/dotenv-loader.mjs` with named export `loadDotenv` returning structured
   results `{ path, source, skipped, reason }`.
2. Update Node scripts to `import { loadDotenv }` and remove duplicated dotenv logic while
   preserving debug logs.
3. Update shell deployment scripts to respect FIFOs and reference loader guidance in comments.
4. Create a TypeScript helper under the appropriate shared package that reuses the loader or
   mirrors the logic in TypeScript.
5. Write Vitest unit tests for the loader and the TypeScript wrapper.
6. Add documentation under `docs/development/1password-env.md`, linking from `README.md` and quick
   start docs.
7. Update `CHANGELOG.md` with a summary of the integration.
8. Run `pnpm lint`, `pnpm test`, `pnpm security:scan`, and `pnpm structure:validate`.
