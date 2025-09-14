---
title: Architecture
sidebar_label: Architecture
---

# Architecture

The gateway is a Fastify application composed of discrete plugins:

- **Core server** - boots Fastify and registers routes.
- **MCP proxy** - forwards `/mcp` requests to an upstream Model Control Protocol server.
- **A2A messaging** - handles agent-to-agent messages through `/a2a`.
- **RAG module** - exposes retrieval-augmented generation endpoints under `/rag`.
- **Simulation lab** - experimental `/simlab` sandbox for agent behavior.
- **Metrics plugin** - exposes Prometheus metrics at `/metrics`.
- **OpenAPI generator** - builds `openapi.json` from route schemas during tests.

Each plugin is located under `src/` and registered in `src/main.ts`.
