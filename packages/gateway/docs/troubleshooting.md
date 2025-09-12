# Troubleshooting Guide

## Common Errors
- **`EADDRINUSE`**: The configured port is already in use. Stop conflicting services or change `PORT`.
- **Missing `openapi.json`**: Run tests to regenerate the specification.
- **Upstream connection failures**: Verify `MCP_SERVER_URL` and network connectivity.

## Diagnostic Tips
- Start the server with `DEBUG=*` to enable verbose Fastify logs.
- Check Prometheus metrics for high error rates.
