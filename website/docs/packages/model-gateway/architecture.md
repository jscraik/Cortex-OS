---
title: Architecture
sidebar_label: Architecture
---

# Architecture

The gateway is composed of modular components:

- **Server** - Fastify application exposing REST endpoints, health checks, and metrics.
- **Model Router** - Prioritizes MLX models and routes to Ollama or MCP adapters as needed. Supports privacy mode.
- **Adapters** - Provider-specific modules for MLX, Ollama, and MCP.
- **Advanced Policy Router** - Evaluates policy rules before model invocation.
- **Audit Module** - Records request metadata for compliance.

```
Request -> Policy Router -> Model Router -> Adapter -> Provider

```