---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

The server exposes a REST and WebSocket interface via FastAPI.

## Base URL
`http://&lt;host&gt;:&lt;port&gt;` (default `http://localhost:8000`)

## Endpoints
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe |
| `POST` | `/v1/context` | Submit context updates |
| `WS` | `/ws` | Real‑time message channel |

Authentication uses JSON Web Tokens through the `Authorization: Bearer &lt;token&gt;` header.
