# Lockfile Sync

Synchronize dependency versions between the Node `pnpm-lock.yaml` and Python `uv.lock` files.

## Usage

```bash
node tools/lockfile-sync/sync.mjs        # perform sync check
node tools/lockfile-sync/sync.mjs --check  # exit with code 1 on mismatch
```

The script compares full semantic versions for shared dependencies. Run with `--check` in CI to fail on mismatches.
