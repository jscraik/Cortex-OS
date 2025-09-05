# Quick Start

> Fast path to a working Cortex-OS development environment.

## Prerequisites

| Tool    | Version  | Notes                                     |
| ------- | -------- | ----------------------------------------- |
| Node.js | 20+      | Uses global `crypto` APIs                 |
| pnpm    | 9.9.0    | Pinned for workspace determinism          |
| Git     | 2.40+    | Hooks automation relies on modern flags   |
| Docker  | Optional | For containerized + service orchestration |

## Clone & Setup

```bash
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os

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
pnpm build             # Build all packages
pnpm test:coverage     # Run tests w/ coverage gates
pnpm lint              # ESLint + formatting checks
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
| Git hooks not running   | `git config --local core.hooksPath .githooks`         |
| Lint errors after merge | Run `pnpm lint --fix` then commit                     |
| Slow first install      | Enable corepack: `corepack enable`                    |

## Next Steps

- Read the [Architecture Overview](./architecture.md)
- Explore [Development Setup](./development-setup.md)
- Learn about [Python Integration](./python-integration.md)
- Review [Contributing Guidelines](../CONTRIBUTING.md)

---

Return to: [Root README](../README.md)
