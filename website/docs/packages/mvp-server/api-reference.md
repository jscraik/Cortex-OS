---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

## Authentication
No authentication by default. JWT bearer tokens planned for future releases.

## Endpoints
| Method | Path | Description |
| -------- | ------ | ------------- |
| `GET` | `/health` | Liveness probe |
| `GET` | `/metrics` | Prometheus metrics |
| `POST` | `/v1/echo` | Returns posted payload |

### Example
```bash
curl -X POST http://localhost:3000/v1/echo -d '{"hello":"world"}' -H 'Content-Type: application/json'

```