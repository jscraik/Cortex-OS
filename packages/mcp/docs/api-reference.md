# API Reference

The server exposes a REST and WebSocket interface via FastAPI.

## Base URL
`http://<host>:<port>` (default `http://localhost:8000`)

## Endpoints
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe |
| `POST` | `/v1/context` | Submit context updates |
| `WS` | `/ws` | Real‑time message channel |

Authentication uses JSON Web Tokens through the `Authorization: Bearer <token>` header.
