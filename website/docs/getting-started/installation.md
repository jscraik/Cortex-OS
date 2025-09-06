# Installation

Get Cortex-OS running on your local machine in minutes.

## Prerequisites

| Tool    | Version  | Notes                                     |
| ------- | -------- | ----------------------------------------- |
| Node.js | 20+      | Uses global `crypto` APIs                 |
| pnpm    | 9.9.0    | Pinned for workspace determinism          |
| Git     | 2.40+    | Hooks automation relies on modern flags   |
| Docker  | Optional | For containerized + service orchestration |

## Quick Install

```bash
# Clone the repository
git clone https://github.com/jamiescottcraik/Cortex-OS.git
cd Cortex-OS

# Run automated setup (installs deps, ensures tools, lints, validates)
./scripts/dev-setup.sh

# Verify installation
pnpm readiness:check
```

## Alternative Setup

If you need to skip automatic efficiency tooling (e.g. restricted environment):

```bash
export CORTEX_EFFICIENCY_SETUP_SKIP=1
pnpm install
```

## Environment Configuration

```bash
# (Optional) customize configuration root
export CORTEX_OS_HOME="$HOME/.Cortex-OS"

# Load development environment
pnpm env:load
```

## Verify Installation

Check that everything is working:

```bash
# Run tests
pnpm test

# Build the project
pnpm build

# Start development server
pnpm dev
```

## Next Steps

- [Project Structure](./structure) - Understand the codebase
- [Quick Start](./quick-start) - Build your first agent
