---
title: Architecture
sidebar_label: Architecture
---

# Architecture

PRP Runner is composed of:

- **Orchestrator** - schedules sub-agent execution and maintains state.
- **Sub-agents** - pluggable modules that perform atomic tasks.
- **Adapters** - bridge to external models such as Ollama or MLX.
- **Enforcement Hooks** - validate inputs and outputs before execution.

The runner exposes TypeScript APIs in `src/` for extension.
