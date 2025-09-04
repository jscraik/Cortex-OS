# Cortex Gateway

Fastify-based HTTP gateway exposing Cortex agent endpoints (`/mcp`, `/a2a`, `/rag`, `/simlab`).

## Features
- Zod-validated request bodies and query params
- Automatic OpenAPI spec generation (`openapi.json`)
- Prometheus metrics at `/metrics`

## Development
```bash
pnpm install
pnpm --filter @cortex-os/gateway dev    # start server on port 3333
pnpm --filter @cortex-os/gateway test   # run tests and regenerate OpenAPI
```

The gateway expects an MCP server configuration via environment variables (`MCP_TRANSPORT`, etc.) to proxy `/mcp` requests.
