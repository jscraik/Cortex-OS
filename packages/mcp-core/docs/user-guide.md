# User Guide

## Calling a Tool over HTTP

1. Start an MCP server exposing an HTTP endpoint.
2. Configure the client with transport `streamableHttp`.
3. Invoke `callTool` with the tool name and arguments.

## Using the stdio Transport

1. Provide `command` and optional `args` & `env`.
2. `callTool` serializes requests on stdin and reads JSON lines from stdout.

### Keyboard Shortcuts

N/A (no interactive UI).
