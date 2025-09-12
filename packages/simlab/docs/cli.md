# CLI Reference

SimLab exposes pnpm scripts for common workflows:

| Command | Description |
|---------|-------------|
| `pnpm simlab:smoke` | Run smoke test suite (50–100 scenarios) |
| `pnpm simlab:critical` | Execute critical scenarios only |
| `pnpm simlab:full` | Run full suite |
| `pnpm simlab:report` | Generate comprehensive report |
| `pnpm simlab:gates` | Check quality gates |
| `pnpm sim:status` | View simulation status and metrics |

All commands accept `--output <file>` to specify a report destination.

