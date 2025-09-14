# Architecture

Cortex-OS is a governed monorepo built around packages and services.

## Components
- **apps/** – runnable applications (CLI, API, web UI).
- **packages/** – reusable libraries and features.
- **services/** – backend services such as memory stores.
- **libs/** – shared contracts and utilities.

Event-driven communication uses A2A events and MCP tools. Governance is enforced via ESLint and Nx boundaries.
