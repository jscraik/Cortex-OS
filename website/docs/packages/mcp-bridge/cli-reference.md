---
title: Cli Reference
sidebar_label: Cli Reference
---

# CLI Reference

Run `mcp-bridge --help` for full options.

| Flag | Description |
| ------ | ------------- |
| `--outbound-url` | Required HTTP endpoint to forward JSON lines. |
| `--rate` | Optional messages‑per‑second limit. |
| `--queue-limit` | Maximum queued messages before applying drop strategy (default 100). |
| `--drop-strategy` | `drop_newest`, `drop_oldest`, or `block` when queue is full. |
| `--sse-subscribe-url` | Optional SSE endpoint to read events and emit to stdout. |

Ctrl+C stops the bridge gracefully.
