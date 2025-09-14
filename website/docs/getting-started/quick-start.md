---
sidebar_position: 1
---

# Quick Start

Fast path to a working Cortex-OS development environment.

## Prerequisites

| Tool    | Version  | Notes                                     |
| ------- | -------- | ----------------------------------------- |
| Node.js | 20+      | Uses global `crypto` APIs                 |
| pnpm    | 9.9.0    | Pinned for workspace determinism          |
| Git     | 2.40+    | Hooks automation relies on modern flags   |
| Docker  | Optional | For containerized + service orchestration |

## Clone & Setup

```bash
git clone https://github.com/jamiescottcraik/Cortex-OS.git
cd Cortex-OS

# Run automated setup (installs deps, ensures tools, lints, validates)
./scripts/dev-setup.sh

# (Optional) customize configuration root
export CORTEX_OS_HOME="$HOME/.Cortex-OS"

# Verify readiness
pnpm readiness:check
```

If you need to skip automatic efficiency tooling (e.g. restricted env):

```bash
export CORTEX_EFFICIENCY_SETUP_SKIP=1
pnpm install
```

## Development Workflow

```bash
# Start the core runtime (Nx/Turbo orchestrated)
pnpm dev

# Terminal UI (Rust) – in a separate shell
cd apps/cortex-code && cargo run

# Web UI
cd apps/cortex-webui && pnpm dev

# GitHub Apps (diagnose + launch)
./github-apps-diagnostic.sh
./start-github-apps.sh
./free-ports.sh all   # Free ports if blocked
```

## Port Registry

Centralized port allocation (change via `config/ports.env` or `CORTEX_OS_HOME` overrides):

| Service       | Default Port | Notes                           |
| ------------- | ------------ | ------------------------------- |
| MCP Server    | 3000         | Reserved for Cloudflare tunnel  |
| GitHub AI App | 3001         | Application integration         |
| Semgrep App   | 3002         | Security analysis orchestration |
| Structure App | 3003         | Structural governance           |

List or free ports:

```bash
./free-ports.sh list
./free-ports.sh 3001 3002
```

## Everyday Commands

```bash
pnpm build:smart        # Build affected packages only
pnpm test:smart         # Run tests on changed code
pnpm lint:smart         # Lint affected files
pnpm format            # Apply formatting
pnpm security:scan     # OWASP-focused Semgrep scan
pnpm structure:validate# Governance / import boundaries
pnpm nx graph          # Visualize dependency graph
```

## Troubleshooting

| Symptom                 | Fix                                                   |
| ----------------------- | ----------------------------------------------------- |
| Ports in use            | `./free-ports.sh all` then retry                      |
| Missing tools           | `pnpm ensure:tools` or rerun `./scripts/dev-setup.sh` |
| Git hooks not running   | `git config --local core.hooksPath .husky`            |
| Lint errors after merge | Run `pnpm lint --fix` then commit                     |
| Slow first install      | Enable corepack: `corepack enable`                    |

## Next Steps

- Read the [Architecture Overview](./architecture-overview)
- Explore [Python Integration](./python-integration)
- Learn about [Agent Development](../agents/overview)
