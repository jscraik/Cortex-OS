# 🚨 EMERGENCY MEMORY TRIAGE

## Immediate Actions (High Memory/Process Count)

```bash
# 1. Count current processes
pnpm pnpm:count

# 2. Emergency kill runaway pnpm processes
pnpm pnpm:emergency:kill

# 3. Kill all watch processes
pnpm watch:kill-all

# 4. Check memory budget (32GB total, 85% threshold)
pnpm memory:budget

# 5. Clean orphaned pnpm processes
pnpm pnpm:orphan:kill

# 6. Reset Nx daemon and cache
pnpm nx:reset
```

## Safe Development Commands

```bash
# Use these instead of regular dev commands
pnpm dev:no-daemon       # Build without daemon
pnpm dev:single         # Single process with memory limit
pnpm install:budget     # Install with memory checks
```

## Monitoring Commands

```bash
pnpm pnpm:list          # Show top 20 node/pnpm processes
pnpm process:snapshot   # Save full process snapshot to logs/
```

## Node Version Enforcement

```bash
pnpm node:enforce-version  # Ensure Node 20.x is active
```

## When Memory Issues Persist

1. Run full emergency sequence:

```bash
pnpm pnpm:emergency:kill && pnpm watch:kill-all && pnpm nx:reset
```

1. Check VS Code extensions (disable non-essential ones)

1. Close/restart VS Code if needed

1. Use `pnpm dev:single` for development instead of regular commands

## For AI Agents/LLMs

Always run these commands in this order when encountering memory issues:

1. `pnpm memory:budget` (check status)
1. `pnpm pnpm:count` (count processes)
1. `pnpm pnpm:emergency:kill` (if >20 processes)
1. `pnpm nx:reset` (clean state)
1. Use `pnpm dev:single` or `pnpm dev:no-daemon` for subsequent operations

See `docs/memory-tuning.md` for full documentation.
