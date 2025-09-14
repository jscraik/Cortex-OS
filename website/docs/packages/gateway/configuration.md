---
title: Configuration
sidebar_label: Configuration
---

# Configuration

The gateway reads configuration from environment variables and optional `.env` files.

## Key Variables
| Variable | Description |
| ---------- | ------------- |
| `PORT` | HTTP port (default `3333`) |
| `MCP_TRANSPORT` | Transport for MCP proxy (`http` or `ws`) |
| `MCP_SERVER_URL` | URL of upstream MCP server |
| `ENABLE_METRICS` | Set to `true` to expose Prometheus metrics |

Create a `.env` file in the package root or export variables before launching the server.
