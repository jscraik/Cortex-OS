# Memory Guard

A unified Node-based memory guard replacing multiple shell scripts.

## Usage

```bash
node scripts/memory-guard.mjs --max 1024 --interval 5000
```

### Options

- `--pid <pid...>`: monitor specific process IDs
- `--pattern <pattern>`: process command pattern (default `node`)
- `--max <mb>`: RSS limit in megabytes
- `--interval <ms>`: polling interval in milliseconds

When a process exceeds the limit, the guard sends `SIGUSR2` to request garbage collection.
If memory remains above the threshold on the next check, the process is terminated with `SIGKILL`.
All events are logged to stdout as JSON for metrics collection.

The development helper `scripts/dev-with-memory-guard.sh` now uses this utility.


## Test suite integration

Run the Vitest suite under memory protection:

```bash
pnpm test:safe:monitored
```

This spawns `scripts/test-safe.sh` which launches the guard against `vitest` processes.

## VS Code considerations

The guard targets `node` processes exceeding the configured RSS limit. Extensions such as the TypeScript server are automatically restarted by VS Code if terminated, but you can avoid interruptions by either:

- Raising the limit when working in VS Code: `MEMORY_THRESHOLD_MB=6144 pnpm dev`
- Narrowing the watch pattern to your dev server: `node scripts/memory-guard.mjs --pattern vitest`
