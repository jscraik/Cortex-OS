# Applications

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](../README.md#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)](../README.md#testing)

**Executable interfaces and services built on Cortex-OS**
</div>

---

## Overview
The `apps` workspace hosts runnable applications that deliver the Cortex-OS runtime through various interfaces such as terminal UIs, web dashboards, and API gateways. Each app adheres to repository governance and uses the shared build system.

## Included Apps
- **api** – REST gateway exposing core runtime capabilities.
- **cortex-cli** – Command-line interface for managing agents.
- **cortex-code** – Terminal user interface (TUI) for interactive development.
- **cortex-webui** – Web dashboard for orchestrating agents.
- **cortex-marketplace** – Frontend for discovering extensions.
- **cortex-marketplace-api** – Backend services powering the marketplace.
- **cortex-os** – Reference host application for the runtime.
- **cortex-py** – Python-based host and tooling.
- **cortex-code-backup** – Legacy TUI experiments preserved for reference.

## Development
Each app provides its own README with detailed setup instructions. Common tasks are executed through the monorepo tooling:

```bash
pnpm install       # install dependencies
pnpm build         # build all apps
pnpm test          # run unit tests
```

## License
Distributed under the [MIT License](../LICENSE).

