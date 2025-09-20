# Deployment Guides

A Dockerfile is provided:

```bash
docker build -t cortex-os-app .
```

Run with required environment variables mounted or passed via `--env` flags.

## Optimistic Locking Semantics

The runtime enforces optimistic locking for mutable resources (tasks, profiles, artifacts, evidence).

- Each GET/POST/PUT response includes a `digest` representing the current persisted state.
- Updates must supply `expectedDigest`. If the digest mismatches, the server returns `409`
  with code `OPTIMISTIC_LOCK` and `{ expected, actual }`.

Recommended client pattern:

1. Read the resource (or capture digest from the last write).
2. Attempt the update with `expectedDigest`.
3. If `409` is returned, re-fetch the latest state and decide whether to retry with backoff or reconcile.

Example retry (pseudo):

```ts
async function updateWithRetry(doFetch, doUpdate, max=3) {
  let attempt = 0;
  let latest = await doFetch();
  while (attempt < max) {
    try {
      return await doUpdate({ expectedDigest: latest.digest });
    } catch (e) {
      if (e?.code !== 'OPTIMISTIC_LOCK') throw e;
      await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt++)));
      latest = await doFetch();
    }
  }
  throw new Error('conflict-not-resolved');
}
```

Operational tips:

- Keep updates narrow (merge vs replace) to reduce contention windows.
- Prefer idempotent operations and include context for server-side reconciliation where feasible.
