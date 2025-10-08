# brAInwav 1Password Environment Integration

The brAInwav Cortex-OS toolchain must handle `.env` secrets provided through 1Password FIFO streams without blocking. This guide explains the shared dotenv loader and how to integrate it across Node.js tooling, TypeScript services, and shell automation.

## Shared Loader

The canonical implementation lives in `scripts/utils/dotenv-loader.mjs` and provides:

- **FIFO protection** – skips named pipes created by `op run` and emits a branded warning.
- **Deterministic resolution** – honors `BRAINWAV_ENV_FILE`, `.env.local`, then `.env` in that order.
- **Structured results** – returns `{ path, source, skipped, reason, parsed }` so callers can branch on behavior.
- **Debug logging** – enable via `BRAINWAV_ENV_DEBUG=1`.

### Usage from Node scripts

```ts
import { loadDotenv } from '../utils/dotenv-loader.mjs';

await loadDotenv({ debug: process.env.MY_DEBUG_FLAG === '1' });
```

Only call the loader once per process and avoid caching dotenv imports elsewhere.

### Usage from TypeScript packages

TypeScript projects should import the wrapper exposed by `@cortex-os/utils`:

```ts
import { loadDotenv } from '@cortex-os/utils';

await loadDotenv();
```

The wrapper reuses the Node implementation and keeps typings consistent.

## Shell Automation

Deployment scripts (`scripts/deployment/docker-dev.sh`, `deploy-production.sh`) call `load_env_overrides` / `load_local_env` helpers that:

- Respect `BRAINWAV_ENV_FILE` when set.
- Check candidates with `test -p` to detect FIFOs.
- Emit `[brAInwav][env]` guidance so operators know to use `op run`.

## Testing

Vitest coverage lives in `tests/tools/dotenv-loader.test.ts` and includes:

- Candidate selection via `BRAINWAV_ENV_FILE`.
- FIFO detection behavior.
- TypeScript wrapper delegation.

Run the suite through the standard quality gates:

```
pnpm test --filter dotenv-loader
```

## Operational Notes

- Never call `dotenv.config()` directly in new code paths; rely on the shared loader.
- Avoid committing generated `.env` files; instead document required variables.
- For CI scenarios, set `BRAINWAV_ENV_FILE` to a temporary file if secrets are materialized from vault tooling.
- When debugging env resolution, set `BRAINWAV_ENV_DEBUG=1` to emit `[brAInwav][dotenv-loader]` traces.
