---
title: Providers
sidebar_label: Providers
---

# Providers Setup

## MLX

Runs on-device and is selected automatically when available.

## Ollama

Set `OLLAMA_AVAILABLE&#61;true` and ensure the daemon is reachable at `OLLAMA_URL`.

## MCP

Configure `MCP_TRANSPORT` and related variables:

```bash
export MCP_TRANSPORT=tcp
export MCP_ENDPOINT=127.0.0.1:9000
```

Adapters are initialized at startup; misconfiguration will surface in logs.
