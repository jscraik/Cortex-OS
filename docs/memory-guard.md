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
