---
title: Configuration
sidebar_label: Configuration
---

# Configuration

The bridge is configured through CLI flags or corresponding environment variables.

| Option | Environment | Description |
|--------|-------------|-------------|
| `--outbound-url` | `MCP_BRIDGE_OUTBOUND_URL` | HTTP endpoint receiving POST requests. |
| `--rate` | `MCP_BRIDGE_RATE` | Messages per second limit; unset means unlimited. |
| `--queue-limit` | `MCP_BRIDGE_QUEUE_LIMIT` | Maximum number of pending messages. |
| `--drop-strategy` | `MCP_BRIDGE_DROP_STRATEGY` | `drop_newest`, `drop_oldest`, or `block`. |
| `--sse-subscribe-url` | `MCP_BRIDGE_SSE_URL` | Optional SSE source for inbound events. |

Configuration files are not required; set environment variables or pass flags to ensure consistent environments.
